from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent.parent
_INTERNAL_SAMPLE = BASE_DIR / "data" / "alumni.csv"
_ROOT_CSV = REPO_ROOT / "alumni.csv"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    alumni_csv: str | None = None

    ollama_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.2"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""


settings = Settings()


def get_data_path() -> Path:
    """Prefer repo-root alumni.csv; allow ALUMNI_CSV / settings.alumni_csv override."""
    if settings.alumni_csv:
        p = Path(settings.alumni_csv)
        return p if p.is_absolute() else (REPO_ROOT / p).resolve()
    if _ROOT_CSV.is_file():
        return _ROOT_CSV
    return _INTERNAL_SAMPLE


# Resolved once at import (restart server to pick up new file location env)
DATA_PATH = get_data_path()
SOCIAL_STORE_PATH = BASE_DIR / "data" / "platform_social.json"
