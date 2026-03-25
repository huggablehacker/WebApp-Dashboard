#!/usr/bin/env python3
"""
WebSec Platform — CLI entry point.

Requires Python 3.12+

Usage
-----
  python -m websec_platform              # default: 127.0.0.1:5000
  python -m websec_platform --port 8080
  python -m websec_platform --host 0.0.0.0 --port 8080
  python -m websec_platform --open       # auto-open browser
  websec                                 # if installed via pip
"""

import argparse
import sys
import threading
import time
import webbrowser


def _check_python_version() -> None:
    if sys.version_info < (3, 10):
        print(
            f"ERROR: WebSec Platform requires Python 3.10+. "
            f"You are running {sys.version}",
            file=sys.stderr,
        )
        sys.exit(1)


def main(argv: list[str] | None = None) -> None:
    _check_python_version()

    parser = argparse.ArgumentParser(
        prog="websec",
        description="WebSec Platform — OWASP web application security testing toolkit",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  websec                         # http://127.0.0.1:5000
  websec --port 8080 --open      # custom port + auto-open browser
  websec --host 0.0.0.0          # expose on local network
  websec --env development        # dev mode with debug + auto-reload
        """,
    )
    parser.add_argument("--host",    default=None,           help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port",    type=int, default=None, help="Bind port (default: 5000)")
    parser.add_argument("--open",    action="store_true",    help="Auto-open browser on start")
    parser.add_argument("--env",     choices=["development", "production"], default=None,
                        help="Config environment (default: production)")
    parser.add_argument("--version", action="store_true",    help="Print version and exit")

    args = parser.parse_args(argv)

    if args.version:
        from websec_platform import __version__
        print(f"WebSec Platform v{__version__}  (Python {sys.version.split()[0]})")
        sys.exit(0)

    from websec_platform.app import create_app
    from websec_platform.config import get_config

    cfg = get_config(args.env)

    if args.host:
        cfg.HOST = args.host
    if args.port:
        cfg.PORT = args.port

    app = create_app(cfg)

    display_host = "127.0.0.1" if cfg.HOST == "0.0.0.0" else cfg.HOST
    url = f"http://{display_host}:{cfg.PORT}"

    if args.open:
        def _open_browser() -> None:
            time.sleep(1.2)
            webbrowser.open(url)
        threading.Thread(target=_open_browser, daemon=True).start()

    print(f"\n  WebSec Platform  (Python {sys.version.split()[0]})")
    print(f"  Running at : {url}")
    print(f"  Press Ctrl+C to stop\n")

    try:
        from waitress import serve
        serve(app, host=cfg.HOST, port=cfg.PORT, threads=4)
    except ImportError:
        # Fallback to Flask dev server if waitress not installed
        app.run(host=cfg.HOST, port=cfg.PORT, debug=cfg.DEBUG, use_reloader=cfg.DEBUG)


if __name__ == "__main__":
    main()
