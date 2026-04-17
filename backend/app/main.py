import asyncio
import json
import math
import re
from pathlib import Path
from types import SimpleNamespace
from typing import Callable, Literal

import httpx
import networkx as nx
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer, util

from app.config import DATA_PATH, SOCIAL_STORE_PATH, settings
from app import organization_store
from app.data_loader import (
    append_alumni_record,
    normalize_alumni_dataframe,
    profile_text_from_row,
)
from app.social_store import SocialStore, pair_key

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

app = FastAPI(title="ConXn API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_df: pd.DataFrame | None = None
_alumni: list[dict] = []
_embeddings = None
_model: SentenceTransformer | None = None
_graph: nx.Graph | None = None
social_store = SocialStore(SOCIAL_STORE_PATH)
_org_bundle_cache: dict[str, tuple[list[dict], object, nx.Graph]] = {}


def _records_from_normalized_df(df: pd.DataFrame) -> list[dict]:
    records: list[dict] = []
    for idx, row in df.iterrows():
        r = row.to_dict()
        r["id"] = str(idx)
        r["profile_text"] = profile_text_from_row(row)
        records.append(r)
    return records


def parse_skills(skills: str) -> set[str]:
    return {s.strip().lower() for s in str(skills).split(",") if s.strip()}


def _display_role(alum: dict) -> str:
    for k in ("position", "job_role"):
        v = alum.get(k)
        if v is None:
            continue
        if isinstance(v, float) and (math.isnan(v) or pd.isna(v)):
            continue
        s = str(v).strip()
        if s and s.lower() != "nan":
            return s
    return "Professional"


def build_graph(rows: list[dict]) -> nx.Graph:
    g = nx.Graph()
    for a in rows:
        g.add_node(
            a["id"],
            label=a["name"],
            name=a["name"],
            company=a["company"],
            college=a["college"],
            location=a["location"],
        )
    n = len(rows)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = rows[i], rows[j]
            reasons: list[str] = []
            if a["college"] == b["college"]:
                reasons.append("same_college")
            if a["company"] == b["company"]:
                reasons.append("same_company")
            sa, sb = parse_skills(a["skills"]), parse_skills(b["skills"])
            shared = sa & sb
            if shared:
                reasons.append("shared_skills")
            if reasons:
                g.add_edge(
                    a["id"],
                    b["id"],
                    reasons=reasons,
                    shared_skills=sorted(shared) if shared else [],
                )
    return g


async def load_state() -> None:
    global _df, _alumni, _embeddings, _model, _graph
    if _model is not None:
        return
    loop = asyncio.get_event_loop()
    raw = pd.read_csv(DATA_PATH)
    _df = normalize_alumni_dataframe(raw)
    _alumni = _records_from_normalized_df(_df)
    _graph = build_graph(_alumni)

    def _encode():
        m = SentenceTransformer(MODEL_NAME)
        texts = [a["profile_text"] for a in _alumni]
        emb = m.encode(texts, convert_to_tensor=True, show_progress_bar=False)
        return m, emb

    _model, _embeddings = await loop.run_in_executor(None, _encode)


@app.on_event("startup")
async def startup() -> None:
    await load_state()
    social_store.ensure_rich_demo(len(_alumni))


def neighbors_of(node_id: str) -> list[dict]:
    if _graph is None or node_id not in _graph:
        return []
    out = []
    for nid in _graph.neighbors(node_id):
        edge = _graph.get_edge_data(node_id, nid) or {}
        out.append(
            {
                "id": nid,
                "name": _graph.nodes[nid].get("name", nid),
                "relationships": edge.get("reasons", []),
            }
        )
    return out


def org_neighbors_from(graph: nx.Graph, node_id: str) -> list[dict]:
    """Graph neighbors for an organization-local roster graph."""
    if node_id not in graph:
        return []
    out = []
    for nid in graph.neighbors(node_id):
        edge = graph.get_edge_data(node_id, nid) or {}
        out.append(
            {
                "id": nid,
                "name": graph.nodes[nid].get("name", nid),
                "relationships": edge.get("reasons", []),
            }
        )
    return out


async def llm_complete(prompt: str, max_tokens: int = 400) -> str:
    if settings.gemini_api_key:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
        )
        body = {"contents": [{"parts": [{"text": prompt}]}]}
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(45.0, connect=5.0)
        ) as client:
            r = await client.post(url, json=body)
            if r.status_code == 200:
                data = r.json()
                try:
                    return (
                        data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    )
                except (KeyError, IndexError):
                    pass
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(45.0, connect=3.0)
        ) as client:
            r = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": max_tokens},
                },
            )
            if r.status_code == 200:
                data = r.json()
                return (data.get("response") or "").strip()
    except Exception:
        pass
    return ""


def _strip_json_fences(raw: str) -> str:
    t = (raw or "").strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.I)
        t = re.sub(r"\s*```\s*$", "", t)
    return t.strip()


async def parse_search_criteria(q: str) -> dict:
    """LLM JSON extraction with heuristic fallback (works offline)."""
    blank = {
        "roles": [],
        "skills": [],
        "colleges": [],
        "locations": [],
        "companies": [],
        "embedding_focus": q.strip(),
        "notes": "",
    }
    prompt = (
        "You extract structured alumni search criteria from a user query.\n"
        "Return ONLY valid JSON (no markdown, no commentary) with exactly these keys:\n"
        '{"roles":[],"skills":[],"colleges":[],"locations":[],"companies":[],'
        '"embedding_focus":"","notes":""}\n'
        "- roles: job titles as FULL phrases when possible (e.g. 'AI engineer', "
        "'ML engineer') — never split into generic words like 'engineer' alone\n"
        "- skills: technologies or domains (Python, ML, NLP, cloud)\n"
        "- colleges: universities or abbreviations (SRM, IIT Madras, BITS)\n"
        "- locations: cities or regions (Chennai, Bangalore)\n"
        "- companies: only if the user names an employer\n"
        "- embedding_focus: ONE concise English sentence describing the ideal "
        "profile for semantic vector search (include all important constraints)\n"
        f"Query: {q!r}\nJSON:"
    )
    raw = (await llm_complete(prompt, max_tokens=400)) or ""
    text = _strip_json_fences(raw)
    if text:
        try:
            i0, i1 = text.find("{"), text.rfind("}")
            if i0 >= 0 and i1 > i0:
                obj = json.loads(text[i0 : i1 + 1])
                out = dict(blank)
                for key in blank:
                    if key not in obj:
                        continue
                    v = obj[key]
                    if key == "embedding_focus":
                        out[key] = str(v).strip() if v is not None else ""
                        continue
                    if isinstance(v, str):
                        out[key] = [v.strip()] if v.strip() else []
                    elif isinstance(v, list):
                        out[key] = [str(x).strip() for x in v if str(x).strip()]
                    else:
                        out[key] = []
                if not out["embedding_focus"]:
                    out["embedding_focus"] = q.strip()
                out["notes"] = str(obj.get("notes", "") or "").strip()
                return out
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    return _heuristic_criteria(q)


def _heuristic_criteria(q: str) -> dict:
    text = q.strip()
    low = text.lower()
    roles: list[str] = []
    colleges: list[str] = []
    locations: list[str] = []
    m = re.search(r"(.+?)\s+from\s+(.+?)\s+in\s+(.+)$", low, re.I | re.S)
    if m:
        roles = [m.group(1).strip().strip(".,;")]
        colleges = [m.group(2).strip().strip(".,;")]
        locations = [m.group(3).strip().strip(".,;")]
    else:
        m2 = re.search(r"(.+?)\s+in\s+([a-z][a-z\s,.-]{2,40})$", low, re.I)
        if m2:
            roles = [m2.group(1).strip().strip(".,;")]
            locations = [m2.group(2).strip().strip(".,;")]
    school_pat = (
        r"\b(srm|iit\s*[\w\s-]{0,18}|nit\s*[\w\s-]{0,12}|bits|iisc|vit|"
        r"manipal|lpu|amity|iiit|jnu|du|jadavpur)\b"
    )
    if not colleges:
        sm = re.search(school_pat, low, re.I)
        if sm:
            colleges = [sm.group(0).strip()]
    skills: list[str] = []
    m_ai_eng = re.search(
        r"\b(ai|ml|machine learning)\s+engineer\b|\bai\s+researcher\b|"
        r"\bmachine learning engineer\b",
        low,
        re.I,
    )
    if m_ai_eng and not roles:
        roles = [m_ai_eng.group(0).strip()]
    for blob in re.findall(
        r"\b(python|java|go|react|ml|ai|nlp|cloud|kubernetes|data science|"
        r"pytorch|tensorflow|backend|frontend|devops|llm|genai)\b",
        low,
        re.I,
    ):
        skills.append(blob)
    skills = list(dict.fromkeys(skills))[:10]
    focus_parts = [p for p in (roles + skills + colleges + locations) if p]
    embedding_focus = (
        ". ".join(focus_parts) if focus_parts else text
    )[:500]
    return {
        "roles": roles[:6],
        "skills": skills[:10],
        "colleges": colleges[:5],
        "locations": locations[:5],
        "companies": [],
        "embedding_focus": embedding_focus or text,
        "notes": "heuristic",
    }


def _norm_blob(s: str) -> str:
    return re.sub(r"\s+", " ", str(s).lower()).strip()


GENERIC_ROLE_TOKENS = frozenset(
    {
        "engineer",
        "engineering",
        "developer",
        "developers",
        "manager",
        "lead",
        "analyst",
        "scientist",
        "consultant",
        "specialist",
        "architect",
        "intern",
        "head",
        "director",
        "officer",
        "associate",
        "professional",
        "executive",
        "vp",
    }
)

_AI_QUERY_RE = re.compile(
    r"\b(ai engineer|ml engineer|machine learning|deep learning|nlp\b|llm|"
    r"genai|neural net|computer vision|pytorch|tensorflow|llmops|mlops|"
    r"openai|anthropic|huggingface|transformer|generative|applied scientist|"
    r"research scientist|data scientist|staff engineer\s+ai|ai\s+research)\b",
    re.I,
)

_ALUMNI_AI_SIGNAL_RE = re.compile(
    r"\b(ai\b|artificial intelligence|machine learning|deep learning|nlp\b|"
    r"llm|genai|neural|pytorch|tensorflow|keras|jax|transformer|computer vision|"
    r"mlops|reinforcement|generative|large language|openai|anthropic|hugging|"
    r"data scientist|ml engineer|ai engineer|research scientist|llms?|"
    r"vector embeddings|embedding model|fine-?tuning)\b",
    re.I,
)

_NON_AI_ENGINEERING_RE = re.compile(
    r"\b(site engineer|civil engineer|structural engineer|geotechnical|"
    r"quantity survey|highway engineer|construction engineer|"
    r"hardware engineer|hardware verification|pcb design|plant engineer|"
    r"utilities engineer|mechanical engineer|electrical engineer)\b",
    re.I,
)


def _is_ai_focused_query(q: str, crit: dict) -> bool:
    blob = " ".join(
        [
            q,
            " ".join(crit.get("roles") or []),
            " ".join(crit.get("skills") or []),
            str(crit.get("embedding_focus") or ""),
        ]
    )
    return bool(_AI_QUERY_RE.search(blob))


def _alumni_has_ai_signals(alum: dict) -> bool:
    h = _norm_blob(_alumni_role_haystack(alum))
    return bool(_ALUMNI_AI_SIGNAL_RE.search(h))


def _alumni_non_ai_engineering_profile(alum: dict) -> bool:
    h = _norm_blob(_alumni_role_haystack(alum))
    if _ALUMNI_AI_SIGNAL_RE.search(h):
        return False
    return bool(_NON_AI_ENGINEERING_RE.search(h))


def _role_needle_hits(needles: list[str], hay_raw: str) -> tuple[float, list[str]]:
    """Avoid matching generic 'engineer' to unrelated domains (civil, site, etc.)."""
    needles = [n for n in needles if len(_norm_blob(n)) >= 2]
    if not needles:
        return 1.0, []
    h = _norm_blob(hay_raw)
    sigs: list[str] = []
    scores: list[float] = []
    for raw in needles:
        n = _norm_blob(raw)
        if n in h:
            scores.append(1.0)
            sigs.append(raw[:48])
            continue
        toks = [t for t in re.split(r"[\s,/|+&\-]+", n) if len(t) >= 2]
        if not toks:
            continue
        non_g = [t for t in toks if t not in GENERIC_ROLE_TOKENS]
        gen = [t for t in toks if t in GENERIC_ROLE_TOKENS]
        if non_g:
            ng_hit = sum(1 for t in non_g if t in h) / len(non_g)
            gen_ok = all(t in h for t in gen) if gen else True
            if ng_hit >= 0.99 and gen_ok:
                scores.append(1.0)
                sigs.append(raw[:48])
            elif ng_hit >= 0.5 and gen_ok:
                scores.append(0.55)
                sigs.append(raw[:48])
            else:
                scores.append(0.08 + 0.2 * ng_hit)
        else:
            scores.append(0.22 if any(t in h for t in gen) else 0.0)
    if not scores:
        return 0.0, []
    return sum(scores) / len(scores), sigs


def _needle_hits(needles: list[str], hay: str) -> tuple[float, list[str]]:
    """Fraction of needles with a fuzzy hit in haystack; also human-readable signals."""
    needles = [n for n in needles if len(_norm_blob(n)) >= 2]
    if not needles:
        return 1.0, []
    h = _norm_blob(hay)
    sigs: list[str] = []
    hit = 0.0
    for raw in needles:
        n = _norm_blob(raw)
        ok = False
        if len(n) >= 2 and n in h:
            ok = True
        else:
            for tok in re.split(r"[\s,/|+&-]+", n):
                if len(tok) >= 2 and tok in h:
                    ok = True
                    break
        if ok:
            hit += 1.0
            sigs.append(raw[:48])
    return hit / len(needles), sigs


def _alumni_role_haystack(alum: dict) -> str:
    return " ".join(
        str(alum.get(k, "") or "")
        for k in ("position", "job_role", "skills", "company")
    )


def _dimension_bundle(alum: dict, crit: dict) -> dict[str, tuple[float, list[str]]]:
    return {
        "roles": _role_needle_hits(
            crit.get("roles") or [], _alumni_role_haystack(alum)
        ),
        "skills": _needle_hits(crit.get("skills") or [], str(alum.get("skills", ""))),
        "colleges": _needle_hits(
            crit.get("colleges") or [], str(alum.get("college", ""))
        ),
        "locations": _needle_hits(
            crit.get("locations") or [], str(alum.get("location", ""))
        ),
        "companies": _needle_hits(
            crit.get("companies") or [], str(alum.get("company", ""))
        ),
    }


def _aggregate_structure(
    dims: dict[str, tuple[float, list[str]]], crit: dict
) -> tuple[float, float, list[str]]:
    """Mean / min over dimensions the user actually constrained."""
    active_scores: list[float] = []
    all_sigs: list[str] = []
    for key in ("roles", "skills", "colleges", "locations", "companies"):
        if crit.get(key):
            sc, sigs = dims[key]
            active_scores.append(sc)
            for s in sigs[:2]:
                all_sigs.append(f"{key}:{s}")
    if not active_scores:
        return 1.0, 1.0, []
    return (
        sum(active_scores) / len(active_scores),
        min(active_scores),
        all_sigs[:12],
    )


def _match_tier(sim: float, mean_s: float, min_s: float) -> str:
    if min_s >= 0.55 and sim >= 0.22:
        return "strong"
    if mean_s >= 0.45 or (min_s >= 0.35 and sim >= 0.3):
        return "good"
    if sim >= 0.35:
        return "semantic"
    return "broad"


def _tier_from_similarity_only(sim: float) -> str:
    if sim >= 0.48:
        return "good"
    if sim >= 0.32:
        return "semantic"
    return "broad"


def _interpretation_line(crit: dict, original: str) -> str:
    bits: list[str] = []
    if crit.get("roles"):
        bits.append("looking for " + ", ".join(crit["roles"][:3]))
    if crit.get("skills"):
        bits.append("skills like " + ", ".join(crit["skills"][:4]))
    if crit.get("colleges"):
        bits.append("from " + ", ".join(crit["colleges"][:3]))
    if crit.get("locations"):
        bits.append("in " + ", ".join(crit["locations"][:3]))
    if crit.get("companies"):
        bits.append("at " + ", ".join(crit["companies"][:2]))
    if bits:
        return "We read your search as: " + " · ".join(bits) + "."
    return f"Matching alumni for: {original.strip()[:160]}"


def fallback_explanation(query: str, alum: dict) -> str:
    bits = []
    if query and any(
        w in alum["location"].lower() for w in query.lower().split() if len(w) > 3
    ):
        bits.append(f"based in {alum['location']}")
    bits.append(f"works at {alum['company']}")
    bits.append(f"skills align with {alum['skills']}")
    return "Matches your search: " + "; ".join(bits) + "."


def fallback_email(student_context: str, alum: dict) -> str:
    return (
        f"Hi {alum['name']},\n\n"
        f"I came across your profile on ConXn and was impressed by your work at "
        f"{alum['company']} and your background in {alum['skills']}.\n\n"
        f"{student_context}\n\n"
        f"I would love to connect and learn from your experience.\n\n"
        f"Best regards"
    )


class SearchResponseItem(BaseModel):
    id: str
    name: str
    role_company: str
    location: str
    skills: str
    skills_tags: list[str]
    college: str
    similarity: float
    explanation: str
    connections: list[dict]
    match_tier: str = "semantic"
    match_signals: list[str] = Field(default_factory=list)
    combined_score: float | None = None


@app.get("/health")
async def health():
    await load_state()
    return {"status": "ok", "alumni_count": len(_alumni)}


@app.get("/search", response_model=list[SearchResponseItem])
async def search(q: str, limit: int = 8):
    await load_state()
    if not q.strip():
        raise HTTPException(400, "Query required")
    if _model is None or _embeddings is None:
        raise HTTPException(503, "Model not ready")

    loop = asyncio.get_event_loop()
    q_emb = await loop.run_in_executor(
        None, lambda: _model.encode(q, convert_to_tensor=True)
    )
    sims = util.cos_sim(q_emb, _embeddings)[0].cpu().numpy()
    top_idx = np.argsort(-sims)[:limit]

    async def explain_one(alum: dict) -> str:
        explain_prompt = (
            f"You are ConXn, an alumni networking assistant. In 2 short sentences, "
            f"explain why this person is a good match for this search query. "
            f"Be specific (location, skills, company). No fluff.\n\n"
            f"Query: {q}\n"
            f"Person: {alum['profile_text']}\n\n"
            f"Recommendation:"
        )
        explanation = (await llm_complete(explain_prompt, max_tokens=120)).strip()
        return explanation if explanation else fallback_explanation(q, alum)

    batch = [(_alumni[int(i)], float(sims[int(i)])) for i in top_idx]
    # LLM for top matches only — rest use fast fallback (keeps demo snappy offline).
    llm_n = min(3, len(batch))
    llm_parts = await asyncio.gather(*[explain_one(a) for a, _ in batch[:llm_n]])
    explanations = list(llm_parts) + [
        fallback_explanation(q, a) for a, _ in batch[llm_n:]
    ]

    items: list[SearchResponseItem] = []
    for (alum, score), explanation in zip(batch, explanations):
        items.append(
            SearchResponseItem(
                id=alum["id"],
                name=alum["name"],
                role_company=f"{_display_role(alum)} · {alum['company']}",
                location=alum["location"],
                skills=alum["skills"],
                skills_tags=[s.strip() for s in str(alum["skills"]).split(",")][:8],
                college=alum["college"],
                similarity=round(score, 4),
                explanation=explanation,
                connections=neighbors_of(alum["id"]),
                match_tier=_tier_from_similarity_only(float(score)),
                match_signals=[],
                combined_score=round(float(score), 4),
            )
        )
    return items


class SmartSearchRequest(BaseModel):
    q: str = Field(..., min_length=1)
    limit: int = 10


class SmartSearchSuggestion(BaseModel):
    title: str
    subtitle: str = ""
    items: list[SearchResponseItem]


class SmartSearchResponse(BaseModel):
    criteria: dict
    interpretation_line: str
    filtered: list[SearchResponseItem]
    recommended: list[SearchResponseItem]
    suggestions: list[SmartSearchSuggestion]


def _passes_strict_filter(
    alum: dict,
    sim: float,
    dims: dict[str, tuple[float, list[str]]],
    crit: dict,
    ai_focused: bool,
) -> bool:
    """True only when active structured fields (and AI intent when relevant) align."""
    if sim < 0.235:
        return False
    if ai_focused:
        if _alumni_non_ai_engineering_profile(alum):
            return False
        if not _alumni_has_ai_signals(alum):
            return False
    active = [
        k
        for k in ("roles", "skills", "colleges", "locations", "companies")
        if crit.get(k)
    ]
    if not active:
        return sim >= 0.38

    # Treat role/college/location/company as hard constraints and keep skills softer.
    hard_keys = [k for k in ("roles", "colleges", "locations", "companies") if crit.get(k)]
    soft_keys = [k for k in ("skills",) if crit.get(k)]

    # If all active hard constraints are very strong, accept as strict even when
    # extracted skills are noisy / over-specific.
    if hard_keys and all(dims[k][0] >= 0.72 for k in hard_keys):
        return True

    # Hard constraints must generally match, but allow fuzzy city/college wording.
    for k in hard_keys:
        if dims[k][0] < 0.36:
            return False

    # Skills are helpful but should not veto an otherwise exact hard match.
    # Only reject when skills are explicitly present and completely unrelated.
    for k in soft_keys:
        if dims[k][0] < 0.08 and len(hard_keys) <= 1:
            return False

    # Final gate: keep strict bucket meaningful without being brittle.
    hard_mean = (
        sum(dims[k][0] for k in hard_keys) / len(hard_keys)
        if hard_keys
        else 1.0
    )
    all_mean = sum(dims[k][0] for k in active) / len(active)
    return hard_mean >= 0.45 and all_mean >= 0.34


def _row_to_search_item(
    row: tuple,
    alum: dict,
    explanation: str,
    *,
    connections: list[dict] | None = None,
) -> SearchResponseItem:
    _i, sim, _mean_s, _min_s, cscore, tier, sigs = row[:7]
    conns = connections if connections is not None else neighbors_of(alum["id"])
    return SearchResponseItem(
        id=alum["id"],
        name=alum["name"],
        role_company=f"{_display_role(alum)} · {alum['company']}",
        location=alum["location"],
        skills=alum["skills"],
        skills_tags=[s.strip() for s in str(alum["skills"]).split(",")][:8],
        college=alum["college"],
        similarity=round(sim, 4),
        explanation=explanation,
        connections=conns,
        match_tier=tier,
        match_signals=sigs,
        combined_score=round(cscore, 4),
    )


async def _smart_search_impl(
    q: str,
    limit: int,
    alumni: list[dict],
    embeddings,
    get_connections: Callable[[dict], list[dict]],
) -> SmartSearchResponse:
    """Same ranking as global /smart-search over an arbitrary alumni pool + embedding matrix."""
    q = (q or "").strip()
    if not q:
        raise HTTPException(400, "Query required")
    if not alumni:
        crit = await parse_search_criteria(q)
        return SmartSearchResponse(
            criteria=crit,
            interpretation_line=(
                "No alumni in this pool yet — add records (or broaden college scope) to search."
            ),
            filtered=[],
            recommended=[],
            suggestions=[],
        )
    if _model is None or embeddings is None:
        raise HTTPException(503, "Model not ready")

    crit = await parse_search_criteria(q)
    embed_q = (crit.get("embedding_focus") or q).strip() or q
    loop = asyncio.get_event_loop()
    q_emb = await loop.run_in_executor(
        None, lambda: _model.encode(embed_q, convert_to_tensor=True)
    )
    sims = util.cos_sim(q_emb, embeddings)[0].cpu().numpy()
    ai_focused = _is_ai_focused_query(q, crit)

    n = len(alumni)
    ranked: list[
        tuple[int, float, float, float, float, str, list[str], dict]
    ] = []
    for i in range(n):
        sim = float(sims[i])
        alum = alumni[i]
        dims = _dimension_bundle(alum, crit)
        mean_s, min_s, sigs = _aggregate_structure(dims, crit)
        cscore = 0.42 * sim + 0.33 * mean_s + 0.25 * min_s
        if ai_focused:
            if _alumni_non_ai_engineering_profile(alum):
                cscore *= 0.1
            elif not _alumni_has_ai_signals(alum):
                cscore *= 0.26
        tier = _match_tier(sim, mean_s, min_s)
        ranked.append((i, sim, mean_s, min_s, cscore, tier, sigs, dims))
    ranked.sort(key=lambda x: -x[4])

    lim = min(max(1, limit), 25)
    filtered_rows: list[tuple] = []
    filtered_ids: set[int] = set()
    for row in ranked:
        idx = int(row[0])
        if idx in filtered_ids:
            continue
        if len(filtered_rows) >= lim:
            break
        alum = alumni[idx]
        sim, dims = row[1], row[7]
        if _passes_strict_filter(alum, sim, dims, crit, ai_focused):
            filtered_rows.append(row)
            filtered_ids.add(idx)

    recommended_rows: list[tuple] = []
    recommended_ids: set[int] = set()
    for row in ranked:
        idx = int(row[0])
        if idx in filtered_ids:
            continue
        if len(recommended_rows) >= lim:
            break
        if row[4] < 0.11:
            continue
        alum = alumni[idx]
        sim, dims = row[1], row[7]
        if _passes_strict_filter(alum, sim, dims, crit, ai_focused):
            continue
        recommended_rows.append(row)
        recommended_ids.add(idx)

    async def explain_smart(alum: dict) -> str:
        crit_json = json.dumps(crit, ensure_ascii=False)[:600]
        explain_prompt = (
            f"You are ConXn. In 2 short sentences, explain why this alum fits the search. "
            f"Mention concrete signals (college, city, role, skills) when true.\n\n"
            f"Original query: {q}\n"
            f"Parsed criteria (JSON): {crit_json}\n"
            f"Person: {alum['profile_text']}\n\n"
            f"Recommendation:"
        )
        explanation = (await llm_complete(explain_prompt, max_tokens=140)).strip()
        return explanation if explanation else fallback_explanation(q, alum)

    async def explain_batch(rows: list[tuple], llm_cap: int) -> list[str]:
        if not rows:
            return []
        alums = [alumni[int(r[0])] for r in rows]
        llm_n = min(llm_cap, len(alums))
        head = await asyncio.gather(*[explain_smart(alums[j]) for j in range(llm_n)])
        tail = [
            fallback_explanation(q, alums[j]) for j in range(llm_n, len(alums))
        ]
        return list(head) + tail

    fe = await explain_batch(filtered_rows, 4)
    re_ = await explain_batch(recommended_rows, 2)

    filtered_items = [
        _row_to_search_item(
            row,
            alumni[int(row[0])],
            fe[i],
            connections=get_connections(alumni[int(row[0])]),
        )
        for i, row in enumerate(filtered_rows)
    ]
    recommended_items = [
        _row_to_search_item(
            row,
            alumni[int(row[0])],
            re_[i],
            connections=get_connections(alumni[int(row[0])]),
        )
        for i, row in enumerate(recommended_rows)
    ]

    # If a "recommended" item clearly satisfies all hard constraints in signals,
    # promote it into filtered so obvious exact hits are not shown as partial fit.
    hard_keys = {
        k for k in ("roles", "colleges", "locations", "companies") if crit.get(k)
    }
    if hard_keys and len(filtered_items) < lim:
        promoted: list[SearchResponseItem] = []
        kept: list[SearchResponseItem] = []
        for item in recommended_items:
            if len(filtered_items) + len(promoted) >= lim:
                kept.append(item)
                continue
            signal_keys = {
                s.split(":", 1)[0]
                for s in (item.match_signals or [])
                if ":" in s
            }
            if hard_keys.issubset(signal_keys) and item.similarity >= 0.22:
                promoted.append(item)
            else:
                kept.append(item)
        if promoted:
            filtered_items.extend(promoted)
            recommended_items = kept

    used_ids = set(filtered_ids) | set(recommended_ids)
    suggestions: list[SmartSearchSuggestion] = []

    def pick_suggestion(
        title: str,
        subtitle: str,
        pred,
        max_k: int = 5,
    ) -> None:
        nonlocal used_ids
        picked: list[tuple[tuple, dict]] = []
        for row in ranked:
            idx = int(row[0])
            if idx in used_ids:
                continue
            alum = alumni[idx]
            if not pred(alum, row):
                continue
            picked.append((row, alum))
            if len(picked) >= max_k:
                break
        if not picked:
            return
        items = [
            _row_to_search_item(
                row,
                alum,
                fallback_explanation(q, alum),
                connections=get_connections(alum),
            )
            for row, alum in picked
        ]
        for row, _ in picked:
            used_ids.add(int(row[0]))
        suggestions.append(
            SmartSearchSuggestion(title=title, subtitle=subtitle, items=items)
        )

    if crit.get("colleges"):
        pick_suggestion(
            "Same college (relaxed)",
            "Profiles that overlap your school terms even if role or city differ.",
            lambda a, r: _needle_hits(crit["colleges"], str(a.get("college", "")))[
                0
            ]
            >= 0.34,
        )

    if crit.get("locations"):
        pick_suggestion(
            "Same location (relaxed)",
            "Alumni in or near the places you named.",
            lambda a, r: _needle_hits(
                crit["locations"], str(a.get("location", ""))
            )[0]
            >= 0.34,
        )

    best_c = filtered_rows[0][4] if filtered_rows else 0.0
    if best_c < 0.36 or len(filtered_items) < 2:
        near: list[tuple[tuple, dict]] = []
        for row in ranked:
            idx = int(row[0])
            if idx in used_ids:
                continue
            if row[4] < 0.2:
                continue
            near.append((row, alumni[idx]))
            if len(near) >= 5:
                break
        if near:
            items = [
                _row_to_search_item(
                    row,
                    alum,
                    fallback_explanation(q, alum),
                    connections=get_connections(alum),
                )
                for row, alum in near
            ]
            for row, _ in near:
                used_ids.add(int(row[0]))
            suggestions.append(
                SmartSearchSuggestion(
                    title="Semantic near-matches",
                    subtitle="Similar overall profiles when strict filters leave few hits.",
                    items=items,
                )
            )

    return SmartSearchResponse(
        criteria=crit,
        interpretation_line=_interpretation_line(crit, q),
        filtered=filtered_items,
        recommended=recommended_items,
        suggestions=suggestions,
    )


@app.post("/smart-search", response_model=SmartSearchResponse)
async def smart_search(body: SmartSearchRequest):
    """LLM + embeddings; AI queries downrank unrelated *engineer* roles; split strict vs recommended."""
    await load_state()
    if _model is None or _embeddings is None:
        raise HTTPException(503, "Model not ready")
    q = body.q.strip()
    if not q:
        raise HTTPException(400, "Query required")
    return await _smart_search_impl(
        q,
        body.limit,
        _alumni,
        _embeddings,
        lambda a: neighbors_of(a["id"]),
    )


async def _load_org_search_bundle(org_id: str) -> tuple[list[dict], object | None, nx.Graph]:
    await load_state()
    if organization_store.get_organization(org_id) is None:
        raise HTTPException(404, "Organization not found")
    if org_id in _org_bundle_cache:
        return _org_bundle_cache[org_id]
    df = organization_store.read_org_normalized_dataframe(org_id)
    if df is None:
        raise HTTPException(404, "Organization not found")
    records = _records_from_normalized_df(df)
    for i, r in enumerate(records):
        r["id"] = f"org:{org_id}:{i}"
    g = build_graph(records)
    if not records:
        tup: tuple[list[dict], object | None, nx.Graph] = ([], None, g)
        _org_bundle_cache[org_id] = tup
        return tup
    loop = asyncio.get_event_loop()

    def enc():
        texts = [a["profile_text"] for a in records]
        return _model.encode(texts, convert_to_tensor=True, show_progress_bar=False)

    emb = await loop.run_in_executor(None, enc)
    tup = (records, emb, g)
    _org_bundle_cache[org_id] = tup
    return tup


class CreateOrganizationBody(BaseModel):
    name: str = "My alumni network"
    affiliated_colleges: list[str] = Field(default_factory=list)


class OrganizationSummary(BaseModel):
    id: str
    name: str
    affiliated_colleges: list[str]
    roster_in_scope: int


@app.post("/organizations", response_model=OrganizationSummary)
async def create_organization_route(body: CreateOrganizationBody):
    entry = organization_store.create_organization(
        body.name, body.affiliated_colleges
    )
    n = organization_store.organization_roster_count(entry["id"])
    return OrganizationSummary(
        id=entry["id"],
        name=entry["name"],
        affiliated_colleges=entry.get("affiliated_colleges") or [],
        roster_in_scope=max(0, n),
    )


@app.get("/organizations/{org_id}", response_model=OrganizationSummary)
async def get_organization_summary(org_id: str):
    meta = organization_store.get_organization(org_id)
    if not meta:
        raise HTTPException(404, "Organization not found")
    n = organization_store.organization_roster_count(org_id)
    return OrganizationSummary(
        id=meta["id"],
        name=meta["name"],
        affiliated_colleges=meta.get("affiliated_colleges") or [],
        roster_in_scope=max(0, n),
    )


@app.post("/organizations/{org_id}/smart-search", response_model=SmartSearchResponse)
async def organization_smart_search(org_id: str, body: SmartSearchRequest):
    await load_state()
    if _model is None:
        raise HTTPException(503, "Model not ready")
    q = body.q.strip()
    if not q:
        raise HTTPException(400, "Query required")
    records, emb, g = await _load_org_search_bundle(org_id)
    return await _smart_search_impl(
        q,
        body.limit,
        records,
        emb,
        lambda a: org_neighbors_from(g, a["id"]),
    )


class MentorRequest(BaseModel):
    goal: str = Field(..., min_length=2)
    limit: int = 8


@app.post("/mentor-match", response_model=list[SearchResponseItem])
async def mentor_match(body: MentorRequest):
    await load_state()
    q = (
        f"Mentor for career goal: {body.goal}. "
        f"Prefer experienced professionals in data science, ML, AI, or related fields "
        f"who can guide and mentor."
    )
    return await search(q=q, limit=body.limit)


class EmailRequest(BaseModel):
    query: str = ""
    student_note: str = ""
    """Rough notes: what the student wants to say and why they are reaching out."""
    draft_notes: str = ""
    alumni_id: str
    tone: str = ""  # formal, friendly, etc.
    current_message: str | None = None


class EmailResponse(BaseModel):
    email: str
    used_llm: bool


async def _resolve_alumni_for_email(alumni_id: str) -> dict | None:
    if alumni_id.startswith("org:") and alumni_id.count(":") >= 2:
        parts = alumni_id.split(":", 2)
        org_id = parts[1]
        records, _, _ = await _load_org_search_bundle(org_id)
        return next((a for a in records if a["id"] == alumni_id), None)
    return next((a for a in _alumni if a["id"] == alumni_id), None)


@app.post("/generate-email", response_model=EmailResponse)
async def generate_email(body: EmailRequest):
    await load_state()
    alum = await _resolve_alumni_for_email(body.alumni_id)
    if not alum:
        raise HTTPException(404, "Alumni not found")

    tone = body.tone or "warm and professional"
    base = (body.current_message or "").strip()
    notes = (body.draft_notes or "").strip()
    ctx = " | ".join(
        x
        for x in (body.student_note.strip(), body.query.strip())
        if x
    )
    notes_block = notes if notes else "(No separate rough notes — infer from context below.)"
    prompt = (
        f"You are ConXn. Turn the student's rough notes into a concise cold outreach email "
        f"to this alumni contact (2–5 short paragraphs, tight prose).\n\n"
        f"Tone: {tone}.\n"
        f"Background context (search / dashboard): {ctx or 'general networking on ConXn'}\n\n"
        f"The student explained in their own words what they want to send and WHY they are "
        f"reaching out to this person (purpose, ask, any shared connection they mentioned):\n"
        f"---\n{notes_block}\n---\n\n"
        f"Existing email draft in the editor (rewrite or merge so it reflects the notes above; "
        f"may be empty or a stub):\n"
        f"---\n{base or '(empty)'}\n---\n\n"
        f"Recipient profile: {alum['profile_text']}\n\n"
        f"Rules:\n"
        f"- Start with Hi {alum['name']},\n"
        f"- Mention ConXn naturally once.\n"
        f"- Preserve the student's intent and specific asks; do not invent achievements or lies.\n"
        f"- If notes are thin, still produce a polite, specific-sounding email using the profile.\n"
        f"Output the email body only — no subject line, no markdown fences, no leading/trailing quotes."
    )
    text = (await llm_complete(prompt, max_tokens=450)).strip()
    used = bool(text)
    if not text:
        fb_ctx = notes or body.student_note or body.query or "I'd like to connect."
        text = fallback_email(fb_ctx, alum)
    else:
        text = re.sub(r"^[\"']|[\"']$", "", text)
    return EmailResponse(email=text, used_llm=used)


class SendEmailRequest(BaseModel):
    to_email: str
    subject: str = "Hello from ConXn"
    body: str


@app.post("/send-email")
async def send_email_endpoint(body: SendEmailRequest):
    if not settings.smtp_host or not settings.smtp_user:
        return {
            "ok": True,
            "message": "SMTP not configured — message copied locally (demo mode).",
        }
    try:
        import aiosmtplib
        from email.message import EmailMessage

        msg = EmailMessage()
        msg["From"] = settings.smtp_from or settings.smtp_user
        msg["To"] = body.to_email
        msg["Subject"] = body.subject
        msg.set_content(body.body)

        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        return {"ok": True, "message": "Sent"}
    except Exception as e:
        return {
            "ok": True,
            "message": f"Send failed ({e!s}); saved as draft in demo mode.",
        }


@app.get("/connections/{alumni_id}")
async def connections(alumni_id: str):
    await load_state()
    return {"alumni_id": alumni_id, "neighbors": neighbors_of(alumni_id)}


def _alumni_ids() -> set[str]:
    return {a["id"] for a in _alumni}


def _alumni_by_id() -> dict[str, dict]:
    return {a["id"]: a for a in _alumni}


class PlatformConnectBody(BaseModel):
    viewer_id: str
    peer_id: str


@app.get("/platform/connections/{alumni_id}")
async def platform_connections(alumni_id: str):
    """LinkedIn-style connections on ConXn (not graph neighbors)."""
    await load_state()
    by = _alumni_by_id()
    peers = social_store.list_connection_peer_ids(alumni_id)
    items: list[dict] = []
    for pid in peers:
        a = by.get(pid)
        if a:
            items.append(
                {
                    "id": a["id"],
                    "name": a["name"],
                    "college": a.get("college", ""),
                    "company": a.get("company", ""),
                    "location": a.get("location", ""),
                    "relationships": ["connected_on_conxn"],
                }
            )
        else:
            items.append(
                {
                    "id": pid,
                    "name": pid,
                    "college": "",
                    "company": "",
                    "location": "",
                    "relationships": ["connected_on_conxn"],
                }
            )
    return {"alumni_id": alumni_id, "peers": items}


@app.post("/platform/connect")
async def platform_connect(body: PlatformConnectBody):
    await load_state()
    ids = _alumni_ids()
    if body.viewer_id not in ids or body.peer_id not in ids:
        raise HTTPException(400, "viewer_id and peer_id must be valid alumni rows")
    created = social_store.connect(body.viewer_id, body.peer_id)
    return {"ok": True, "created": created, "already_connected": not created}


class PlatformMessageBody(BaseModel):
    from_alumni_id: str
    to_id: str
    body: str = Field(..., min_length=1)
    peer_label: str | None = None


@app.post("/platform/message")
async def platform_send_message(body: PlatformMessageBody):
    await load_state()
    ids = _alumni_ids()
    if body.from_alumni_id not in ids:
        raise HTTPException(400, "Unknown sender")
    peer = str(body.to_id).strip()
    if not peer.startswith("student:") and peer not in ids:
        raise HTTPException(400, "Unknown recipient")
    if not peer.startswith("student:"):
        if pair_key(body.from_alumni_id, peer) not in social_store.load()[
            "connections"
        ]:
            raise HTTPException(
                403,
                "Connect with this alumni on ConXn before sending a message.",
            )
    _, msgs = social_store.append_message(
        body.from_alumni_id,
        peer,
        body.from_alumni_id,
        body.body,
        peer_label=body.peer_label,
    )
    return {"ok": True, "messages": msgs}


class StudentThreadBootstrap(BaseModel):
    alumni_id: str
    student_key: str
    student_name: str
    initial_message: str = ""


@app.post("/platform/student-thread")
async def platform_student_thread(body: StudentThreadBootstrap):
    await load_state()
    key, msgs = social_store.ensure_student_thread(
        body.alumni_id,
        body.student_key,
        body.student_name,
        body.initial_message,
    )
    return {"ok": True, "thread_key": key, "messages": msgs}


class SeedMentorInboxBody(BaseModel):
    alumni_id: str


@app.post("/platform/seed-mentor-inbox")
async def platform_seed_mentor_inbox(body: SeedMentorInboxBody):
    await load_state()
    # Top up global demo (connections, peer chats, student threads) idempotently.
    social_store.ensure_rich_demo(len(_alumni))
    n = social_store.seed_mentor_inbox_demo(body.alumni_id)
    return {"ok": True, "new_threads": n}


@app.get("/platform/threads/{alumni_id}")
async def platform_list_threads(alumni_id: str):
    await load_state()
    return {
        "threads": social_store.list_thread_summaries(alumni_id, _alumni_by_id()),
    }


@app.get("/platform/mentor-requests/{alumni_id}")
async def platform_mentor_requests(alumni_id: str):
    """Student outreach only — excludes alumni–alumni chat threads."""
    await load_state()
    by = _alumni_by_id()
    rows = social_store.list_thread_summaries(alumni_id, by)
    out = [t for t in rows if str(t.get("peer_id", "")).startswith("student:")]
    return {"threads": out}


class MentorSeenBody(BaseModel):
    alumni_id: str
    peer_id: str
    seen: bool = True


@app.post("/platform/mentor-request/seen")
async def mentor_request_mark_seen(body: MentorSeenBody):
    await load_state()
    if not str(body.peer_id).startswith("student:"):
        raise HTTPException(400, "Only student request threads support seen state")
    social_store.set_mentor_seen(body.alumni_id, body.peer_id, body.seen)
    return {"ok": True}


class MentorAiDraftBody(BaseModel):
    alumni_id: str
    peer_id: str
    mode: Literal["reply", "decline"] = "reply"
    note: str = ""


class MentorAiDraftResponse(BaseModel):
    text: str
    used_llm: bool


def _fallback_mentor_ai_draft(
    mode: str, student_name: str, request_snip: str, alumni_name: str
) -> str:
    snip = (request_snip or "").strip()
    if len(snip) > 200:
        snip = snip[:200] + "…"
    if mode == "decline":
        return (
            f"Hi {student_name},\n\n"
            f"Thank you for reaching out through ConXn. I am not able to take this on right now, "
            f"but I appreciate you writing in and wish you the best with your next steps.\n\n"
            f"Best regards,\n{alumni_name}"
        )
    return (
        f"Hi {student_name},\n\n"
        f"Thanks for your message on ConXn. I read your note"
        + (f" about: {snip}" if snip else "")
        + ".\n\n"
        f"I would be glad to help — could you share a couple of times that work for a short call?\n\n"
        f"Best,\n{alumni_name}"
    )


@app.post("/platform/mentor-ai-draft", response_model=MentorAiDraftResponse)
async def mentor_ai_draft(body: MentorAiDraftBody):
    await load_state()
    if not str(body.peer_id).startswith("student:"):
        raise HTTPException(400, "AI drafts are only for student requests")
    alum = next((a for a in _alumni if a["id"] == body.alumni_id), None)
    if not alum:
        raise HTTPException(400, "Unknown alumni profile")
    detail = social_store.get_thread_detail(
        body.alumni_id, body.peer_id, _alumni_by_id()
    )
    req = SocialStore._first_message_from_peer(
        detail.get("messages") or [], body.peer_id
    )
    peer_name = detail.get("peer_name") or "there"
    note = (body.note or "").strip()
    prof = str(alum.get("profile_text", ""))[:400]
    mode = body.mode
    prompt = (
        f"You are {alum['name']}, an alumni mentor on ConXn writing to a student.\n"
        f"Student name: {peer_name}\n"
        f"Their request:\n---\n{req}\n---\n"
        f"Your background (for tone only): {prof}\n"
    )
    if note:
        prompt += f"Extra instructions from you (the alumni): {note}\n"
    if mode == "decline":
        prompt += (
            "Task: write a polite decline (2–5 short sentences). Thank them, be kind, no guilt. "
            "Do not promise future help unless generic good wishes.\n"
        )
    else:
        prompt += (
            "Task: write a helpful, concise reply (3–7 short sentences). Address their ask practically. "
            "You may suggest a short call or ask one clarifying question.\n"
        )
    fn = peer_name.split()[0] if peer_name.strip() else "there"
    prompt += (
        f"Output the email-style body only. Start with Hi {fn}, then a newline. "
        "No subject line. No markdown fences."
    )

    text = (await llm_complete(prompt, max_tokens=400)).strip()
    used = bool(text)
    if not text:
        text = _fallback_mentor_ai_draft(
            mode, peer_name.split()[0] if peer_name else "there", req, alum["name"]
        )
    else:
        text = re.sub(r"^[\"']|[\"']$", "", text)
    return MentorAiDraftResponse(text=text, used_llm=used)


@app.get("/platform/thread")
async def platform_thread_detail(viewer: str, peer: str):
    await load_state()
    return social_store.get_thread_detail(viewer, peer, _alumni_by_id())


@app.get("/graph")
async def graph_data():
    await load_state()
    if _graph is None:
        raise HTTPException(503, "Graph not ready")
    elements = []
    for nid, data in _graph.nodes(data=True):
        elements.append(
            {
                "data": {
                    "id": nid,
                    "label": data.get("name", nid),
                    "company": data.get("company", ""),
                }
            }
        )
    ei = 0
    for u, v, ed in _graph.edges(data=True):
        elements.append(
            {
                "data": {
                    "id": f"e{ei}",
                    "source": u,
                    "target": v,
                    "reasons": ",".join(ed.get("reasons", [])),
                }
            }
        )
        ei += 1
    return {"elements": elements}


class NewAlumni(BaseModel):
    name: str = ""
    college: str
    company: str
    skills: str
    location: str
    experience: int | str = 0


@app.post("/alumni")
async def add_alumni(body: NewAlumni):
    """Append row, rebuild embeddings (demo)."""
    await load_state()
    global _df, _alumni, _embeddings, _graph

    append_alumni_record(Path(DATA_PATH), body)

    raw = pd.read_csv(DATA_PATH)
    _df = normalize_alumni_dataframe(raw)
    _alumni = _records_from_normalized_df(_df)
    _graph = build_graph(_alumni)

    loop = asyncio.get_event_loop()

    def _reencode():
        texts = [a["profile_text"] for a in _alumni]
        return _model.encode(texts, convert_to_tensor=True, show_progress_bar=False)

    _embeddings = await loop.run_in_executor(None, _reencode)
    return {"ok": True, "id": _alumni[-1]["id"]}


@app.post("/organizations/{org_id}/alumni")
async def add_organization_alumni(org_id: str, body: NewAlumni):
    await load_state()
    if not organization_store.get_organization(org_id):
        raise HTTPException(404, "Organization not found")
    try:
        organization_store.append_organization_alumni(org_id, body)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    _org_bundle_cache.pop(org_id, None)
    n = organization_store.organization_roster_count(org_id)
    df = organization_store.read_org_normalized_dataframe(org_id)
    last_idx = max(0, len(df) - 1) if df is not None and len(df) else 0
    return {"ok": True, "id": f"org:{org_id}:{last_idx}", "roster_in_scope": max(0, n)}


def _share_rec_to_append_body(rec: dict) -> SimpleNamespace:
    try:
        ex = int(float(rec.get("experience", 0) or 0))
    except (TypeError, ValueError):
        ex = 0
    ex = max(0, min(60, ex))
    name = (str(rec.get("name") or "")).strip() or "Alumni"
    return SimpleNamespace(
        name=name,
        college=str(rec.get("college") or ""),
        company=(str(rec.get("company") or "")).strip() or "—",
        skills=str(rec.get("skills") or ""),
        location=str(rec.get("location") or ""),
        experience=ex,
    )


@app.post("/organizations/{org_id}/alumni/upload")
async def upload_organization_alumni_csv(
    org_id: str,
    file: UploadFile = File(...),
    replace: bool = Form(False),
    share_with_conxn: bool = Form(False),
):
    """Bulk CSV → organization-only roster; optional copy into global ConXn alumni."""
    global _df, _alumni, _embeddings, _graph
    await load_state()
    if not organization_store.get_organization(org_id):
        raise HTTPException(404, "Organization not found")
    raw_bytes = await file.read()
    if not raw_bytes or not raw_bytes.strip():
        raise HTTPException(400, "Empty file")
    try:
        stats = organization_store.merge_upload_bytes_into_org(
            org_id, raw_bytes, replace=replace
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    share_list = stats.pop("share_candidates", [])
    _org_bundle_cache.pop(org_id, None)
    shared_n = 0
    if share_with_conxn and share_list:
        for rec in share_list:
            append_alumni_record(Path(DATA_PATH), _share_rec_to_append_body(rec))
        raw = pd.read_csv(DATA_PATH)
        _df = normalize_alumni_dataframe(raw)
        _alumni = _records_from_normalized_df(_df)
        _graph = build_graph(_alumni)
        loop = asyncio.get_event_loop()

        def _reencode():
            texts = [a["profile_text"] for a in _alumni]
            return _model.encode(texts, convert_to_tensor=True, show_progress_bar=False)

        _embeddings = await loop.run_in_executor(None, _reencode)
        shared_n = len(share_list)

    n = organization_store.organization_roster_count(org_id)
    return {
        "ok": True,
        "roster_in_scope": max(0, n),
        "shared_to_conxn": shared_n,
        "replace": replace,
        **stats,
    }


class EventInviteRequest(BaseModel):
    alumni_id: str
    event_title: str
    event_details: str = ""
    student_name: str = "Student"


@app.post("/event-invite")
async def event_invite(body: EventInviteRequest):
    await load_state()
    alum = next((a for a in _alumni if a["id"] == body.alumni_id), None)
    if not alum:
        raise HTTPException(404, "Alumni not found")
    prompt = (
        f"Draft a brief, polite event invitation email from a student to an alumni.\n"
        f"Event: {body.event_title}\nDetails: {body.event_details}\n"
        f"Recipient: {alum['name']} at {alum['company']}\n"
        f"Mention ConXn. 3-4 sentences. No subject line."
    )
    draft = (await llm_complete(prompt, max_tokens=200)).strip()
    if not draft:
        draft = (
            f"Hi {alum['name']},\n\nI'm reaching out through ConXn about our event "
            f"\"{body.event_title}\". {body.event_details}\n\n"
            f"We would be honored by your participation.\n\nBest,\n{body.student_name}"
        )
    return {"ok": True, "draft": draft}


class MentorIntroRequest(BaseModel):
    alumni_id: str
    topic: str = "Mentorship request"
    ask_details: str = ""
    student_name: str = "Student"


@app.post("/mentor-intro-draft")
async def mentor_intro_draft(body: MentorIntroRequest):
    """LLM + fallback: cold outreach for mentorship (mirrors /event-invite)."""
    await load_state()
    alum = next((a for a in _alumni if a["id"] == body.alumni_id), None)
    if not alum:
        raise HTTPException(404, "Alumni not found")
    ask = (body.ask_details or "").strip() or "I'd appreciate a short conversation about your career path."
    prompt = (
        f"Draft a brief, polite cold email from a student to an alumni mentor on ConXn.\n"
        f"Topic / subject line idea: {body.topic}\n"
        f"What the student wants help with: {ask}\n"
        f"Recipient: {alum['name']} at {alum['company']}, background: {alum['profile_text'][:400]}\n"
        f"Mention ConXn once. 3–5 short sentences. Warm but professional. No subject line in output."
    )
    draft = (await llm_complete(prompt, max_tokens=220)).strip()
    if not draft:
        draft = (
            f"Hi {alum['name']},\n\n"
            f"I'm reaching out through ConXn about {body.topic}. {ask}\n\n"
            f"I would be grateful for any guidance you could share when you have a moment.\n\n"
            f"Best,\n{body.student_name}"
        )
    return {"ok": True, "draft": draft}
