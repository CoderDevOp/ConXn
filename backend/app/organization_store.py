"""File-backed organization workspaces: each org owns an alumni roster CSV."""

from __future__ import annotations

import io
import json
import re
import uuid
from pathlib import Path

import pandas as pd

from app.data_loader import append_alumni_record, normalize_alumni_dataframe

ORGS_ROOT = Path(__file__).resolve().parent / "data" / "orgs"
REGISTRY_PATH = ORGS_ROOT / "registry.json"

MINIMAL_CSV_HEADER = "name,college,company,skills,location,experience\n"


def _norm_blob(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower()).strip()


def ensure_orgs_root() -> None:
    ORGS_ROOT.mkdir(parents=True, exist_ok=True)


def _load_registry() -> dict:
    if not REGISTRY_PATH.exists():
        return {"orgs": []}
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def _save_registry(data: dict) -> None:
    ensure_orgs_root()
    REGISTRY_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def new_org_id() -> str:
    return "org_" + uuid.uuid4().hex[:12]


def create_organization(name: str, affiliated_colleges: list[str] | None = None) -> dict:
    ensure_orgs_root()
    oid = new_org_id()
    org_dir = ORGS_ROOT / oid
    org_dir.mkdir(parents=False)
    csv_path = org_dir / "alumni.csv"
    csv_path.write_text(MINIMAL_CSV_HEADER, encoding="utf-8")
    colleges = [c.strip() for c in (affiliated_colleges or []) if c and str(c).strip()]
    entry = {
        "id": oid,
        "name": (name or "").strip() or "Organization",
        "affiliated_colleges": colleges,
    }
    data = _load_registry()
    data.setdefault("orgs", []).append(entry)
    _save_registry(data)
    return entry


def get_organization(org_id: str) -> dict | None:
    for o in _load_registry().get("orgs", []):
        if o.get("id") == org_id:
            return o
    return None


def org_csv_path(org_id: str) -> Path:
    return ORGS_ROOT / org_id / "alumni.csv"


def college_matches_org_scope(college: str, affiliated_colleges: list[str]) -> bool:
    if not affiliated_colleges:
        return True
    c = _norm_blob(str(college))
    if not c:
        return False
    for tag in affiliated_colleges:
        t = _norm_blob(tag)
        if t and t in c:
            return True
    return False


def read_org_normalized_dataframe(org_id: str) -> pd.DataFrame | None:
    """Load org CSV, normalize, apply college scope; None if org missing."""
    if not get_organization(org_id):
        return None
    path = org_csv_path(org_id)
    if not path.is_file():
        return pd.DataFrame()
    raw = pd.read_csv(path)
    if raw.empty:
        return pd.DataFrame()
    meta = get_organization(org_id) or {}
    df = normalize_alumni_dataframe(raw)
    tags = meta.get("affiliated_colleges") or []
    if tags:
        mask = df["college"].astype(str).apply(
            lambda s: college_matches_org_scope(s, tags)
        )
        df = df[mask].copy()
    return df.reset_index(drop=True)


def append_organization_alumni(org_id: str, body) -> None:
    if not get_organization(org_id):
        raise ValueError("Unknown organization")
    meta = get_organization(org_id) or {}
    tags = meta.get("affiliated_colleges") or []
    col = str(getattr(body, "college", "") or "")
    if tags and not college_matches_org_scope(col, tags):
        raise ValueError(
            "College does not match this organization's affiliated colleges — "
            "broaden the scope or use a college string that contains those terms."
        )
    path = org_csv_path(org_id)
    if not path.is_file():
        ensure_orgs_root()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(MINIMAL_CSV_HEADER, encoding="utf-8")
    append_alumni_record(path, body)


def organization_roster_count(org_id: str) -> int:
    df = read_org_normalized_dataframe(org_id)
    if df is None:
        return -1
    return len(df)


def read_org_storage_raw_normalized(org_id: str) -> pd.DataFrame:
    """All rows on disk for this org, normalized (no affiliated-college filter)."""
    if not get_organization(org_id):
        raise ValueError("Unknown organization")
    path = org_csv_path(org_id)
    if not path.is_file():
        return pd.DataFrame()
    raw = pd.read_csv(path)
    if raw.empty:
        return pd.DataFrame()
    return normalize_alumni_dataframe(raw).reset_index(drop=True)


def _dedupe_concat(existing: pd.DataFrame, incoming: pd.DataFrame) -> pd.DataFrame:
    a = existing.copy()
    b = incoming.copy()
    for df in (a, b):
        for col in ("name", "college", "company"):
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()
    if a.empty:
        return b.reset_index(drop=True)
    if b.empty:
        return a.reset_index(drop=True)
    merged = pd.concat([a, b], ignore_index=True)
    return merged.drop_duplicates(
        subset=["name", "college", "company"], keep="first"
    ).reset_index(drop=True)


def write_org_roster_from_normalized(org_id: str, df: pd.DataFrame) -> None:
    """Persist org roster as the simple 6-column CSV (private to this workspace)."""
    path = org_csv_path(org_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    if df.empty:
        path.write_text(MINIMAL_CSV_HEADER, encoding="utf-8")
        return
    out = pd.DataFrame(
        {
            "name": df["name"].astype(str),
            "college": df["college"].astype(str),
            "company": df["company"].astype(str),
            "skills": df["skills"].astype(str),
            "location": df["location"].astype(str),
            "experience": pd.to_numeric(df["experience"], errors="coerce")
            .fillna(0)
            .clip(0, 60)
            .astype(int),
        }
    )
    out.to_csv(path, index=False)


def merge_upload_bytes_into_org(
    org_id: str,
    data: bytes,
    *,
    replace: bool = False,
) -> dict:
    """
    Parse CSV bytes, normalize, apply college scope, merge into org-only CSV.
    Returns stats including ``share_candidates`` (list of row dicts) for optional
    ConXn global publish — caller must pop before JSON response.
    """
    if not get_organization(org_id):
        raise ValueError("Unknown organization")
    meta = get_organization(org_id) or {}
    try:
        incoming = pd.read_csv(io.BytesIO(data))
    except Exception as e:
        raise ValueError(f"Could not parse CSV: {e}") from e
    if incoming.empty:
        raise ValueError("CSV has no data rows")
    try:
        inc_norm = normalize_alumni_dataframe(incoming)
    except ValueError as e:
        raise ValueError(str(e)) from e

    tags = meta.get("affiliated_colleges") or []
    skipped_scope = 0
    if tags:
        mask = inc_norm["college"].astype(str).apply(
            lambda s: college_matches_org_scope(s, tags)
        )
        skipped_scope = int((~mask).sum())
        inc_norm = inc_norm[mask].copy().reset_index(drop=True)
    if inc_norm.empty:
        raise ValueError(
            "No rows left after applying your workspace college scope — "
            "broaden affiliated colleges or fix college text in the file."
        )

    share_candidates = []
    for _, row in inc_norm.iterrows():
        share_candidates.append(
            {
                "name": str(row["name"] or ""),
                "college": str(row["college"] or ""),
                "company": str(row["company"] or ""),
                "skills": str(row["skills"] or ""),
                "location": str(row["location"] or ""),
                "experience": float(
                    pd.to_numeric(row["experience"], errors="coerce") or 0
                ),
            }
        )

    existing = read_org_storage_raw_normalized(org_id)
    if replace:
        merged = inc_norm.copy().reset_index(drop=True)
        dup_skipped = 0
        new_rows_added = len(merged)
    else:
        prior_len = len(existing)
        merged = _dedupe_concat(existing, inc_norm)
        dup_skipped = max(0, len(inc_norm) - (len(merged) - prior_len))
        new_rows_added = len(merged) - prior_len

    write_org_roster_from_normalized(org_id, merged)
    return {
        "roster_total": len(merged),
        "skipped_college_scope": skipped_scope,
        "rows_accepted_from_file": len(inc_norm),
        "duplicates_skipped_vs_existing": dup_skipped,
        "new_rows_added": new_rows_added,
        "share_candidates": share_candidates,
    }
