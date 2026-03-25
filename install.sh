#!/usr/bin/env bash
# =============================================================================
#  WebSec Platform — install.sh
#  Installs the platform in a Python virtual environment and wires up the
#  `websec` CLI command.
#
#  Usage:
#    chmod +x install.sh && ./install.sh
#    ./install.sh --dev          # also install dev/test dependencies
#    ./install.sh --no-venv      # install into current Python environment
#    ./install.sh --help
# =============================================================================

set -euo pipefail

# ── colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ OK ]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERR ]${NC}  $*"; exit 1; }
header(){ echo -e "\n${BOLD}$*${NC}\n"; }

# ── parse args ────────────────────────────────────────────────────────────────
USE_VENV=true
DEV_DEPS=false

for arg in "$@"; do
  case $arg in
    --dev)      DEV_DEPS=true ;;
    --no-venv)  USE_VENV=false ;;
    --help|-h)
      echo "Usage: ./install.sh [--dev] [--no-venv]"
      echo "  --dev       Install dev/testing dependencies as well"
      echo "  --no-venv   Skip virtual environment creation"
      exit 0 ;;
    *) warn "Unknown option: $arg" ;;
  esac
done

# ── locate Python 3.9+ ───────────────────────────────────────────────────────
find_python() {
  for cmd in python3.12 python3.11 python3.10 python3.9 python3 python; do
    if command -v "$cmd" &>/dev/null; then
      ver=$("$cmd" -c "import sys; print(sys.version_info >= (3,9))" 2>/dev/null)
      if [ "$ver" = "True" ]; then echo "$cmd"; return; fi
    fi
  done
  echo ""
}

header "WebSec Platform — Installer"

PYTHON=$(find_python)
[ -z "$PYTHON" ] && err "Python 3.9+ not found. Install it first:\n  https://www.python.org/downloads/"
ok "Python: $($PYTHON --version)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
info "Project root: $SCRIPT_DIR"
cd "$SCRIPT_DIR"

# ── virtual environment ───────────────────────────────────────────────────────
VENV_DIR="$SCRIPT_DIR/.venv"
PIP=""

if $USE_VENV; then
  header "Setting up virtual environment"
  if [ -d "$VENV_DIR" ]; then
    info "Virtual environment already exists — updating..."
  else
    info "Creating virtual environment at $VENV_DIR"
    "$PYTHON" -m venv "$VENV_DIR"
  fi

  # Activate
  if [ -f "$VENV_DIR/bin/activate" ]; then
    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"
    PIP="$VENV_DIR/bin/pip"
    ok "Virtual environment activated"
  elif [ -f "$VENV_DIR/Scripts/activate" ]; then
    # Windows Git Bash
    source "$VENV_DIR/Scripts/activate"
    PIP="$VENV_DIR/Scripts/pip"
    ok "Virtual environment activated (Windows)"
  else
    err "Could not activate virtual environment"
  fi
else
  PIP="$(command -v pip3 || command -v pip)"
  [ -z "$PIP" ] && err "pip not found"
  info "Skipping venv — using system pip: $PIP"
fi

# ── upgrade pip ───────────────────────────────────────────────────────────────
header "Installing dependencies"
info "Upgrading pip..."
"$PIP" install --quiet --upgrade pip

# ── install project ───────────────────────────────────────────────────────────
info "Installing WebSec Platform..."
if $DEV_DEPS; then
  "$PIP" install --quiet -e ".[dev]"
  ok "Installed with dev dependencies"
else
  "$PIP" install --quiet -e .
  ok "WebSec Platform installed"
fi

# ── .env file ─────────────────────────────────────────────────────────────────
header "Configuration"
ENV_FILE="$SCRIPT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  info "Creating .env from .env.example..."
  if [ -f "$SCRIPT_DIR/.env.example" ]; then
    cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
    ok ".env created — edit it to add your ANTHROPIC_API_KEY"
  else
    cat > "$ENV_FILE" << 'EOF'
# WebSec Platform — environment configuration
# Copy this file to .env and fill in your values.

# Anthropic API key (required for AI report generation)
# Get yours at: https://console.anthropic.com/
ANTHROPIC_API_KEY=

# Server settings (optional — defaults shown)
# HOST=127.0.0.1
# PORT=5000
# DEBUG=false

# Anthropic model (optional)
# ANTHROPIC_MODEL=claude-sonnet-4-20250514
EOF
    ok ".env created"
  fi
else
  info ".env already exists — skipping"
fi

# ── wrapper script ────────────────────────────────────────────────────────────
header "CLI setup"

if $USE_VENV; then
  WRAPPER="/usr/local/bin/websec"
  WRAPPER_CONTENT="#!/usr/bin/env bash
source \"$VENV_DIR/bin/activate\" 2>/dev/null || true
exec \"$VENV_DIR/bin/websec\" \"\$@\""

  if [ -w "/usr/local/bin" ]; then
    echo "$WRAPPER_CONTENT" > "$WRAPPER"
    chmod +x "$WRAPPER"
    ok "'websec' command installed to /usr/local/bin/websec"
  else
    LOCAL_BIN="$HOME/.local/bin"
    mkdir -p "$LOCAL_BIN"
    echo "$WRAPPER_CONTENT" > "$LOCAL_BIN/websec"
    chmod +x "$LOCAL_BIN/websec"
    ok "'websec' command installed to $LOCAL_BIN/websec"
    # Ensure ~/.local/bin is in PATH
    if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
      warn "Add to your shell profile:  export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
  fi
fi

# ── final instructions ────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Installation complete!                          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}1. Add your Anthropic API key to .env:${NC}"
echo -e "     ${CYAN}ANTHROPIC_API_KEY=sk-ant-...${NC}"
echo ""
echo -e "  ${BOLD}2. Start the platform:${NC}"
echo -e "     ${CYAN}websec${NC}                     # default: http://127.0.0.1:5000"
echo -e "     ${CYAN}websec --port 8080${NC}         # custom port"
echo -e "     ${CYAN}websec --open${NC}              # auto-open browser"
echo ""
echo -e "  ${BOLD}Or run directly:${NC}"
echo -e "     ${CYAN}python -m websec_platform${NC}"
echo ""
