# WebApp Dashboard

A self-contained web application security testing toolkit built for information security professionals. Runs locally as a Python web app — open a browser, run tests, generate reports.

![Python 3.9+](https://img.shields.io/badge/python-3.9%2B-blue)
![Flask](https://img.shields.io/badge/framework-Flask-lightgrey)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **OWASP Top 10 (2021) Checklist** — structured test coverage across all 10 categories with per-item pass/fail/finding tracking
- **12 Tool Integrations** — Nmap, OWASP ZAP, Nikto, SQLMap, Gobuster, SSLScan, Burp Suite, WPScan, Subfinder, Nuclei, Hydra, FFUF
- **Kickoff Script Generator** — generates a ready-to-run Bash script that installs or updates every selected tool, with per-OS support (Kali, Ubuntu/Debian, macOS, Arch/BlackArch)
- **Findings Tracker** — log findings by severity (Critical → Informational), tool, CVSS score, evidence, and remediation
- **AI Report Generation** — powered by Claude; synthesizes your target config, checklist results, and findings into a professional pentest report
- **Zero cloud dependency** — runs entirely on your local machine; the only network call is the Anthropic API for report generation (optional)

---

## Quick Start

### Requirements

- Python **3.9** or higher (3.10 / 3.11 / 3.12 / 3.13 all supported)
- `pip`
- An Anthropic API key (optional — only needed for AI report generation)

### Install

```bash
git clone https://github.com/yourusername/websec-platform.git
cd websec-platform
chmod +x install.sh
./install.sh
```

The installer:
1. Creates a Python virtual environment (`.venv/`)
2. Installs all dependencies
3. Creates a `.env` config file
4. Wires up the `websec` CLI command

### Configure

Edit `.env` and add your Anthropic API key:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Get a free key at [console.anthropic.com](https://console.anthropic.com/).

### Run

```bash
websec                      # http://127.0.0.1:5000
websec --port 8080          # custom port
websec --open               # auto-open in browser
websec --host 0.0.0.0       # expose on your local network
```

Or run directly without installing the command:

```bash
python -m websec_platform
python -m websec_platform --port 8080 --open
```
---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/` | Main application UI |
| `GET`  | `/api/config` | Returns safe client-side config (has_api_key, model) |
| `POST` | `/api/generate-report` | Proxies Anthropic API call; body: `{ "prompt": "..." }` |
| `POST` | `/api/generate-script` | Returns kickoff script as downloadable `.sh` |
| `GET`  | `/health` | Health check: `{ "status": "ok", "version": "1.0.0" }` |

The Anthropic API key is kept server-side and never exposed to the browser.

---

## Kickoff Script

The **Kickoff Script** tab generates a Bash script for your selected OS that:

- Updates the system package index
- Installs Go / Ruby runtimes if needed by selected tools
- For each selected tool: checks if installed → updates if yes, installs if no
- Optionally downloads SecLists wordlists and Nuclei templates
- Logs all output to a configurable log file
- Prints a color-coded summary on completion

Supported platforms:

| Platform | Package manager | Go tools | Gem tools |
|----------|----------------|----------|-----------|
| Kali Linux | `apt` | `go install` | `apt` |
| Ubuntu / Debian | `apt`, `snap` | `go install` | `gem` |
| macOS | `brew` | `brew` | `brew` |
| Arch / BlackArch | `pacman` | `go install` | `gem` |

---

## Configuration Reference

All settings can be set in `.env` or as environment variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | *(empty)* | Anthropic API key — required for report generation |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Model to use for reports |
| `MAX_TOKENS` | `4096` | Max tokens for report generation |
| `HOST` | `127.0.0.1` | Bind address |
| `PORT` | `5000` | Bind port |
| `DEBUG` | `false` | Enable Flask debug mode |
| `SECRET_KEY` | *(random)* | Flask secret key — set a stable value for production |

---

## Development

```bash
# Install with dev dependencies
./install.sh --dev

# Run tests
pytest

# Lint + format (ruff replaces black, flake8, and isort)
ruff check .
ruff format .
```

### Running in development mode

```bash
FLASK_ENV=development websec --open
# or
DEBUG=true python -m websec_platform --open
```

---

## Deployment Notes

WebSec Platform is designed for **local use on a secured machine**. If you need to expose it on a network:

- Set a strong `SECRET_KEY` in `.env`
- Run behind a reverse proxy (nginx, Caddy) with TLS
- Restrict access to authorized users only
- Never expose the platform on a public network without authentication

The application uses [Waitress](https://docs.pylonsproject.org/projects/waitress/en/stable/) as its production WSGI server — no separate Gunicorn/uWSGI setup required.

---

## Legal Notice

This tool is intended for **authorized security testing only**. Always obtain written authorization before testing any system you do not own. The authors are not responsible for misuse.

---

## License

MIT — see [LICENSE](LICENSE).
