"""
WebSec Platform — Flask application factory.

Requires Python 3.9+
"""
from __future__ import annotations

import logging

from flask import Flask, Response, jsonify, render_template, request

from .config import Config


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

    @app.route("/api/generate-report", methods=["POST"])
    def generate_report():
        """
        Proxy the Anthropic API call server-side so the key is
        never exposed to the browser.
        """
        try:
            import anthropic
        except ImportError:
            return (
                jsonify({"error": "anthropic package not installed. Run: pip install anthropic"}),
                500,
            )

        if not cfg.ANTHROPIC_API_KEY:
            return (
                jsonify({"error": "ANTHROPIC_API_KEY not set — add it to your .env file."}),
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
        cfg.APP_VERSION,
        cfg.HOST,
        cfg.PORT,
    )
    return app
