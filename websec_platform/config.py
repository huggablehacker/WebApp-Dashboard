"""
WebSec Platform — configuration.

Values are read from environment variables or a .env file in the
project root (loaded automatically via python-dotenv when present).
"""
from __future__ import annotations

import os
from pathlib import Path

# Load .env if python-dotenv is available
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).parent.parent / ".env"
    if _env_path.exists():
        load_dotenv(_env_path)
except ImportError:
    pass


class Config:
    # ── app ─────────────────────────────────────────────────────────────────
    APP_VERSION: str = "1.0.0"
    SECRET_KEY: str = os.environ.get("SECRET_KEY", os.urandom(32).hex())
    DEBUG: bool = os.environ.get("DEBUG", "false").lower() == "true"

    # ── server ──────────────────────────────────────────────────────────────
    HOST: str = os.environ.get("HOST", "127.0.0.1")
    PORT: int = int(os.environ.get("PORT", "5000"))

    # ── anthropic ───────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
    MAX_TOKENS: int = int(os.environ.get("MAX_TOKENS", "4096"))


class DevelopmentConfig(Config):
    DEBUG = True
    HOST = "0.0.0.0"


class ProductionConfig(Config):
    DEBUG = False


def get_config(env: str | None = None) -> Config:
    env = env or os.environ.get("FLASK_ENV", "production")
    return {"development": DevelopmentConfig, "production": ProductionConfig}.get(
        env, Config
    )()
