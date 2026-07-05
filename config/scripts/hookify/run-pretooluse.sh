#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
export CLAUDE_PLUGIN_ROOT="$ROOT"
exec python3 "$ROOT/hooks/pretooluse.py"
