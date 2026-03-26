"""
WebSec Platform — Flask application factory.

Requires Python 3.9+
"""
from __future__ import annotations

import logging
import os
import re
from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request

from .config import Config

# Path to the .env file (project root)
_ENV_PATH = Path(__file__).parent.parent / ".env"


def _write_env_key(key: str, value: str) -> None:
    """Upsert a key=value line in the .env file."""
    _ENV_PATH.touch(exist_ok=True)
    text = _ENV_PATH.read_text()

    pattern = re.compile(rf"^{re.escape(key)}\s*=.*$", re.MULTILINE)
    new_line = f"{key}={value}"

    if pattern.search(text):
        text = pattern.sub(new_line, text)
    else:
        text = text.rstrip("\n") + f"\n{new_line}\n"

    _ENV_PATH.write_text(text)


def create_app(config: Config | None = None) -> Flask:
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
        static_url_path="/static",
    )

    cfg = config or Config()
    app.config.from_object(cfg)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s %(message)s",
        datefmt="%H:%M:%S",
    )
    log = logging.getLogger(__name__)

    # ── routes ──────────────────────────────────────────────────────────────

    @app.route("/")
    def index():
        return render_template(
            "index.html",
            app_version=cfg.APP_VERSION,
            has_api_key=bool(cfg.ANTHROPIC_API_KEY),
        )

    @app.route("/api/config")
    def api_config():
        """Return safe client-side configuration."""
        return jsonify(
            {
                "has_api_key":     bool(cfg.ANTHROPIC_API_KEY),
                "app_version":     cfg.APP_VERSION,
                "anthropic_model": cfg.ANTHROPIC_MODEL,
            }
        )

    @app.route("/api/settings", methods=["GET"])
    def get_settings():
        """Return current (non-secret) settings."""
        return jsonify(
            {
                "has_api_key":     bool(cfg.ANTHROPIC_API_KEY),
                "api_key_preview": (
                    cfg.ANTHROPIC_API_KEY[:8] + "..." + cfg.ANTHROPIC_API_KEY[-4:]
                    if cfg.ANTHROPIC_API_KEY else ""
                ),
                "anthropic_model": cfg.ANTHROPIC_MODEL,
                "host":            cfg.HOST,
                "port":            cfg.PORT,
            }
        )

    @app.route("/api/settings/apikey", methods=["POST"])
    def save_api_key():
        """
        Save the Anthropic API key to .env and reload it into the
        running config — no server restart required.
        """
        body = request.get_json(silent=True) or {}
        key  = (body.get("api_key") or "").strip()

        if not key:
            return jsonify({"error": "api_key is required"}), 400

        # Basic format sanity-check (sk-ant-... prefix)
        if not key.startswith("sk-ant-"):
            return jsonify(
                {"error": "Key doesn't look right — Anthropic keys start with sk-ant-"}
            ), 400

        try:
            _write_env_key("ANTHROPIC_API_KEY", key)
        except OSError as exc:
            log.error("Could not write .env: %s", exc)
            return jsonify({"error": f"Could not save to .env: {exc}"}), 500

        # Hot-reload into the running config and process env
        cfg.ANTHROPIC_API_KEY = key
        os.environ["ANTHROPIC_API_KEY"] = key
        log.info("ANTHROPIC_API_KEY updated via settings UI")

        return jsonify(
            {
                "ok":          True,
                "has_api_key": True,
                "preview":     key[:8] + "..." + key[-4:],
            }
        )

    @app.route("/api/settings/apikey", methods=["DELETE"])
    def clear_api_key():
        """Remove the API key from config and .env."""
        try:
            _write_env_key("ANTHROPIC_API_KEY", "")
        except OSError as exc:
            return jsonify({"error": str(exc)}), 500

        cfg.ANTHROPIC_API_KEY = ""
        os.environ["ANTHROPIC_API_KEY"] = ""
        log.info("ANTHROPIC_API_KEY cleared via settings UI")
        return jsonify({"ok": True, "has_api_key": False})

    @app.route("/api/settings/test", methods=["POST"])
    def test_api_key():
        """Send a minimal request to verify the key actually works."""
        try:
            import anthropic
        except ImportError:
            return jsonify({"error": "anthropic package not installed"}), 500

        if not cfg.ANTHROPIC_API_KEY:
            return jsonify({"error": "No API key set"}), 400

        try:
            client = anthropic.Anthropic(api_key=cfg.ANTHROPIC_API_KEY)
            msg = client.messages.create(
                model=cfg.ANTHROPIC_MODEL,
                max_tokens=16,
                messages=[{"role": "user", "content": "reply with: ok"}],
            )
            return jsonify({"ok": True, "response": msg.content[0].text.strip()})
        except Exception as exc:
            return jsonify({"ok": False, "error": str(exc)}), 400

    @app.route("/api/generate-report", methods=["POST"])
    def generate_report():
        """Proxy the Anthropic API call server-side."""
        try:
            import anthropic
        except ImportError:
            return (
                jsonify({"error": "anthropic package not installed. Run: pip install anthropic"}),
                500,
            )

        if not cfg.ANTHROPIC_API_KEY:
            return (
                jsonify({"error": "ANTHROPIC_API_KEY not set — use the Settings tab to add it."}),
                400,
            )

        body   = request.get_json(silent=True) or {}
        prompt = body.get("prompt", "")
        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        try:
            client  = anthropic.Anthropic(api_key=cfg.ANTHROPIC_API_KEY)
            message = client.messages.create(
                model=cfg.ANTHROPIC_MODEL,
                max_tokens=cfg.MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
            )
            text = "".join(
                block.text for block in message.content if hasattr(block, "text")
            )
            return jsonify({"text": text})
        except Exception as exc:
            log.error("Anthropic API error: %s", exc)
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/generate-script", methods=["POST"])
    def generate_script():
        """Return the kickoff shell script as a downloadable file."""
        body    = request.get_json(silent=True) or {}
        content = body.get("script", "")
        if not content:
            return jsonify({"error": "No script content provided"}), 400
        return Response(
            content,
            mimetype="text/x-shellscript",
            headers={"Content-Disposition": "attachment; filename=websec-kickoff.sh"},
        )

    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "version": cfg.APP_VERSION})

    log.info(
        "WebSec Platform v%s ready — http://%s:%s",
        cfg.APP_VERSION, cfg.HOST, cfg.PORT,
    )
    return app
