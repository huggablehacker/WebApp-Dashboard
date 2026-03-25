#!/usr/bin/env bash
# =============================================================================
#  WebSec Platform — install.sh
#
#  Installs the platform in a Python 3.12+ virtual environment and wires up
#  the `websec` CLI command.
#
#  Usage:
#    chmod +x install.sh && ./install.sh
#    ./install.sh --dev          # also install dev/test dependencies
#    ./install.sh --no-venv      # install into current Python environment
#    ./install.sh --help
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ OK ]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERR ]${NC}  $*"; exit 1; }

# ── parse args ────────────────────────────────────────────────────────────────
USE_VENV=true
DEV_DEPS=false

for arg in "$@"; do
  case $arg in
    --dev)      DEV_DEPS=true ;;
    --no-venv)  USE_VENV=false ;;
    --help|-h)
      echo "Usage: ./install.sh [--dev] [--no-venv]"
      echo "  --dev       Install dev/testing dependencies (pytest, ruff, mypy)"
      echo "  --no-venv   Skip virtual environment creation"
      exit 0 ;;
    *) warn "Unknown option: $arg" ;;
  esac
done

# ── locate Python 3.10+ ───────────────────────────────────────────────────────
find_python39() {
  for cmd in python3.13 python3.12 python3.11 python3.10 python3 python; do
    if command -v "$cmd" &>/dev/null; then
      # Check version is >= 3.10
      ver_ok=$("$cmd" -c "import sys; print(sys.version_info >= (3,9))" 2>/dev/null)
      if [ "$ver_ok" = "True" ]; then
        echo "$cmd"
        return
      fi
    fi
  done
  echo ""
}

echo -e "\n${BOLD}WebSec Platform — Installer${NC}\n"

PYTHON=$(find_python39)

if [ -z "$PYTHON" ]; then
  err "Python 3.9+ not found.\n\
  Install it from https://www.python.org/downloads/\n\
  or via your package manager:\n\
    Kali/Ubuntu:  sudo apt install python3.11\n\
    macOS:        brew install python@3.11\n\
    Arch:         sudo pacman -S python"
fi

PY_VERSION=$("$PYTHON" --version)
ok "Found: $PY_VERSION at $(command -v "$PYTHON")"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
info "Project root: $SCRIPT_DIR"
cd "$SCRIPT_DIR"

# ── virtual environment ───────────────────────────────────────────────────────
VENV_DIR="$SCRIPT_DIR/.venv"
PIP=""

if $USE_VENV; then
  echo ""
  info "Setting up virtual environment..."

  if [ -d "$VENV_DIR" ]; then
    info "Existing .venv found — updating..."
  else
    "$PYTHON" -m venv "$VENV_DIR"
    ok "Virtual environment created at $VENV_DIR"
  fi

  # Activate (Unix / macOS)
  if [ -f "$VENV_DIR/bin/activate" ]; then
    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"
    PIP="$VENV_DIR/bin/pip"
  elif [ -f "$VENV_DIR/Scripts/activate" ]; then
    source "$VENV_DIR/Scripts/activate"
    PIP="$VENV_DIR/Scripts/pip"
  else
    err "Could not activate virtual environment"
  fi

  ok "Virtual environment activated  ($("$PIP" --version | cut -d' ' -f1-2))"
else
  PIP="$(command -v pip3 || command -v pip)"
  [ -z "$PIP" ] && err "pip not found"
  info "Skipping venv — using: $PIP"
fi

# ── upgrade pip ───────────────────────────────────────────────────────────────
echo ""
info "Upgrading pip..."
"$PIP" install --quiet --upgrade pip
ok "pip upgraded"

# ── install project ───────────────────────────────────────────────────────────
info "Installing WebSec Platform..."

if $DEV_DEPS; then
  "$PIP" install --quiet -e ".[dev]"
  ok "Installed with dev dependencies (pytest, ruff, mypy)"
else
  "$PIP" install --quiet -e .
  ok "WebSec Platform installed"
fi

# ── .env file ─────────────────────────────────────────────────────────────────
echo ""
info "Checking configuration..."
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$SCRIPT_DIR/.env.example" ]; then
    cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
    ok ".env created from .env.example"
  else
    cat > "$ENV_FILE" << 'ENVEOF'
# WebSec Platform configuration
# Get your Anthropic API key at: https://console.anthropic.com/
ANTHROPIC_API_KEY=

# HOST=127.0.0.1
# PORT=5000
# DEBUG=false
# ANTHROPIC_MODEL=claude-sonnet-4-20250514
ENVEOF
    ok ".env created"
  fi
  warn "Add your ANTHROPIC_API_KEY to .env to enable AI report generation"
else
  ok ".env already exists"
fi

# ── wire up the `websec` CLI command ─────────────────────────────────────────
echo ""
info "Installing 'websec' CLI command..."

if $USE_VENV; then
  VENV_WEBSEC="$VENV_DIR/bin/websec"
  [ ! -f "$VENV_WEBSEC" ] && VENV_WEBSEC="$VENV_DIR/Scripts/websec"

  WRAPPER_BODY="#!/usr/bin/env bash
source \"$VENV_DIR/bin/activate\" 2>/dev/null || source \"$VENV_DIR/Scripts/activate\" 2>/dev/null || true
exec python3 -m websec_platform \"\$@\""

  if [ -w "/usr/local/bin" ]; then
    echo "$WRAPPER_BODY" > "/usr/local/bin/websec"
    chmod +x "/usr/local/bin/websec"
    ok "'websec' installed → /usr/local/bin/websec"
  else
    LOCAL_BIN="$HOME/.local/bin"
    mkdir -p "$LOCAL_BIN"
    echo "$WRAPPER_BODY" > "$LOCAL_BIN/websec"
    chmod +x "$LOCAL_BIN/websec"
    ok "'websec' installed → $LOCAL_BIN/websec"
    if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
      # Detect active shell profile and append PATH export automatically
      PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'
      PROFILE=""

      if [ -n "${ZSH_VERSION:-}" ] || [[ "${SHELL:-}" == */zsh ]]; then
        PROFILE="$HOME/.zshrc"
      elif [ -n "${BASH_VERSION:-}" ] || [[ "${SHELL:-}" == */bash ]]; then
        if [[ "$(uname)" == "Darwin" ]]; then
          PROFILE="$HOME/.bash_profile"
        else
          PROFILE="$HOME/.bashrc"
        fi
      else
        for f in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
          if [ -f "$f" ]; then PROFILE="$f"; break; fi
        done
      fi

      if [ -n "$PROFILE" ]; then
        if ! grep -qF ".local/bin" "$PROFILE" 2>/dev/null; then
          echo "" >> "$PROFILE"
          echo "# Added by WebSec Platform installer" >> "$PROFILE"
          echo "$PATH_LINE" >> "$PROFILE"
          ok "PATH updated in $PROFILE"
          info "Run: source $PROFILE  (or open a new terminal to apply)"
        else
          info "PATH entry already present in $PROFILE — skipping"
        fi
        export PATH="$LOCAL_BIN:$PATH"
      else
        warn "Could not detect shell profile — add this line manually:"
        echo "       $PATH_LINE"
      fi
    fi
  fi
fi

# ── done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Installation complete!                          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}1. Add your API key to .env:${NC}"
echo -e "     ${CYAN}ANTHROPIC_API_KEY=sk-ant-...${NC}"
echo ""
echo -e "  ${BOLD}2. Start the platform:${NC}"
echo -e "     ${CYAN}websec${NC}                     → http://127.0.0.1:5000"
echo -e "     ${CYAN}websec --port 8080${NC}         → http://127.0.0.1:8080"
echo -e "     ${CYAN}websec --open${NC}              → auto-opens in browser"
echo -e "     ${CYAN}websec --env development${NC}   → debug mode"
echo ""
echo -e "  ${BOLD}Or run directly:${NC}"
echo -e "     ${CYAN}python3 -m websec_platform${NC}"
echo ""
