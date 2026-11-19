"""Resolve a Codex delegation selector once, before dispatch (Python 3.11+)."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tomllib


def catalog(home):
    try:
        result = subprocess.run(
            ["codex", "debug", "models"], capture_output=True, check=True, timeout=20
        )
        models = json.loads(result.stdout)["models"]
        if not isinstance(models, list):
            raise ValueError("invalid models list")
        return models, "codex debug models"
    except (OSError, subprocess.SubprocessError, ValueError, KeyError, TypeError) as error:
        cache = home / "models_cache.json"
        try:
            return json.loads(cache.read_bytes())["models"], str(cache)
        except (OSError, ValueError, KeyError, TypeError) as cache_error:
            raise ValueError(f"model list unavailable ({error}); {cache}: {cache_error}") from cache_error


def resolve(selector):
    home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    if selector == "default":
        path = home / "config.toml"
        config = tomllib.loads(path.read_text())
        profile = config.get("profile")
        settings = config.get("profiles", {}).get(profile, {})
        model = settings.get("model", config.get("model"))
        if not isinstance(model, str) or not model.strip():
            raise ValueError(f"no configured model in {path} (profile={profile!r})")
        return model
    if selector == "spark":
        return "gpt-5.3-codex-spark"  # Existing Companion shorthand.
    if selector not in {"astra", "sol"}:
        return selector
    models, source = catalog(home)
    candidates = []
    for model in models:
        slug = model["slug"]
        match = re.fullmatch(r"gpt-(\d+(?:\.\d+)*)-" + selector, slug)
        if match and model.get("visibility") == "list":
            candidates.append((tuple(map(int, match[1].split("."))), slug))
    if not candidates:
        raise ValueError(f"no visible, non-snapshot {selector} model in {source}")
    return max(candidates)[1]


if __name__ == "__main__":
    try:
        print(resolve(sys.argv[1] if len(sys.argv) > 1 else "default"))
    except (ValueError, OSError, KeyError, TypeError) as error:
        sys.exit(f"Codex model selection failed: {error}")
