"""Normalize heterogeneous alumni.csv schemas to ConXn internal columns."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pandas as pd

YEAR = datetime.now().year


def normalize_alumni_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Return a dataframe with unified columns for search, graph, and profile text."""
    if "alumni_name" in df.columns:
        gy = pd.to_numeric(df["alumni_graduation_year"], errors="coerce").fillna(
            YEAR - 5
        )
        gy = gy.astype(int)
        exp = (YEAR - gy).clip(lower=0, upper=60)
        out = pd.DataFrame(
            {
                "name": df["alumni_name"].astype(str),
                "company": df["alumni_current_company"].astype(str),
                "skills": df["skills"].astype(str),
                "location": df["alumni_location"].astype(str),
                "college": (
                    df["alumni_major"].astype(str)
                    + " ("
                    + df["alumni_degree"].astype(str)
                    + ")"
                ),
                "position": df["alumni_position"].astype(str),
                "job_role": (
                    df["job_role"].astype(str)
                    if "job_role" in df.columns
                    else pd.Series(["Professional"] * len(df))
                ),
                "email": (
                    df["alumni_email"].astype(str)
                    if "alumni_email" in df.columns
                    else pd.Series([""] * len(df))
                ),
                "graduation_year": gy,
                "experience": exp,
            }
        )
        if "alumni_id" in df.columns:
            out["source_id"] = df["alumni_id"].astype(str)
        return out

    required = ["name", "college", "company", "skills", "location"]
    for c in required:
        if c not in df.columns:
            raise ValueError(
                f"alumni.csv must include column {c!r} (or use extended alumni_* schema)"
            )
    out = df.copy()
    if "experience" not in out.columns:
        out["experience"] = 0
    if "position" not in out.columns:
        out["position"] = ""
    if "job_role" not in out.columns:
        out["job_role"] = "Professional"
    if "email" not in out.columns:
        out["email"] = ""
    if "graduation_year" not in out.columns:
        exp_num = pd.to_numeric(out["experience"], errors="coerce").fillna(0).clip(
            0, 60
        )
        out["graduation_year"] = (YEAR - exp_num).round().astype(int)
    out["experience"] = pd.to_numeric(out["experience"], errors="coerce").fillna(0)
    return out


def profile_text_from_row(row: pd.Series) -> str:
    name = str(row["name"])
    company = str(row["company"])
    skills = str(row["skills"])
    location = str(row["location"])
    college = str(row["college"])
    pos = row.get("position")
    if pos is None or (isinstance(pos, float) and pd.isna(pos)):
        pos = ""
    else:
        pos = str(pos).strip()
    jr = row.get("job_role")
    if jr is None or (isinstance(jr, float) and pd.isna(jr)):
        jr = ""
    else:
        jr = str(jr).strip()
    try:
        exp = int(float(row["experience"]))
    except (TypeError, ValueError):
        exp = 0
    headline = ", ".join(x for x in (jr, pos) if x)
    if not headline:
        headline = "Alumni"
    return (
        f"{name} - {headline} at {company} in {location}. "
        f"Skills: {skills}. Academic focus: {college}. "
        f"About {exp} years since graduation."
    )


def append_alumni_record(path: Path, body) -> None:
    """Append a manually added profile; preserve extended CSV shape when present."""
    raw = pd.read_csv(path)
    display_name = (str(getattr(body, "name", "") or "").strip()) or (
        f"New profile {len(raw) + 1}"
    )
    if "alumni_name" in raw.columns:
        row = {c: pd.NA for c in raw.columns}
        row.update(
            {
                "alumni_id": f"MNL-{100000 + len(raw):05d}",
                "alumni_name": display_name,
                "alumni_degree": "Other",
                "alumni_major": body.college,
                "alumni_current_company": body.company,
                "alumni_position": "Professional",
                "alumni_location": body.location,
                "alumni_email": "",
                "job_role": "Other",
                "skills": body.skills,
            }
        )
        try:
            ex = int(body.experience)
            row["alumni_graduation_year"] = max(1980, YEAR - ex)
        except (TypeError, ValueError):
            row["alumni_graduation_year"] = YEAR - 4
        raw = pd.concat([raw, pd.DataFrame([row])], ignore_index=True)
    else:
        raw = pd.concat(
            [
                raw,
                pd.DataFrame(
                    [
                        {
                            "name": display_name,
                            "college": body.college,
                            "company": body.company,
                            "skills": body.skills,
                            "location": body.location,
                            "experience": body.experience,
                        }
                    ]
                ),
            ],
            ignore_index=True,
        )
    raw.to_csv(path, index=False)
