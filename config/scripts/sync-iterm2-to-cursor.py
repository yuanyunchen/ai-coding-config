#!/usr/bin/env python3
"""Sync the active iTerm2 default profile colors into Cursor's settings.json.

Usage:
    python3 ~/.claude/scripts/sync-iterm2-to-cursor.py [--mode dark|light|auto]

--mode auto (default) follows the current macOS appearance.
Re-run after changing the iTerm2 profile to propagate updates.
"""
import argparse, json, plistlib, re, subprocess, sys, shutil, time
from pathlib import Path

PLIST = Path.home() / "Library/Preferences/com.googlecode.iterm2.plist"
SETTINGS = Path.home() / "Library/Application Support/Cursor/User/settings.json"

ANSI_MAP = [
    ("Ansi 0 Color",  "terminal.ansiBlack"),
    ("Ansi 1 Color",  "terminal.ansiRed"),
    ("Ansi 2 Color",  "terminal.ansiGreen"),
    ("Ansi 3 Color",  "terminal.ansiYellow"),
    ("Ansi 4 Color",  "terminal.ansiBlue"),
    ("Ansi 5 Color",  "terminal.ansiMagenta"),
    ("Ansi 6 Color",  "terminal.ansiCyan"),
    ("Ansi 7 Color",  "terminal.ansiWhite"),
    ("Ansi 8 Color",  "terminal.ansiBrightBlack"),
    ("Ansi 9 Color",  "terminal.ansiBrightRed"),
    ("Ansi 10 Color", "terminal.ansiBrightGreen"),
    ("Ansi 11 Color", "terminal.ansiBrightYellow"),
    ("Ansi 12 Color", "terminal.ansiBrightBlue"),
    ("Ansi 13 Color", "terminal.ansiBrightMagenta"),
    ("Ansi 14 Color", "terminal.ansiBrightCyan"),
    ("Ansi 15 Color", "terminal.ansiBrightWhite"),
]
SIMPLE_MAP = [
    ("Background Color",   "terminal.background"),
    ("Foreground Color",   "terminal.foreground"),
    ("Cursor Color",       "terminalCursor.foreground"),
    ("Cursor Text Color",  "terminalCursor.background"),
    ("Selection Color",    "terminal.selectionBackground"),
]

def hx(c):
    return "#%02x%02x%02x" % (
        round(c.get("Red Component", 0) * 255),
        round(c.get("Green Component", 0) * 255),
        round(c.get("Blue Component", 0) * 255),
    )

def detect_macos_dark():
    r = subprocess.run(["defaults", "read", "-g", "AppleInterfaceStyle"],
                       capture_output=True, text=True)
    return r.returncode == 0 and "Dark" in r.stdout

def load_profile():
    with PLIST.open("rb") as f:
        d = plistlib.load(f)
    guid = d.get("Default Bookmark Guid")
    for b in d.get("New Bookmarks", []):
        if b.get("Guid") == guid:
            return b
    return d["New Bookmarks"][0]

def colors_for(profile, dark):
    suffix = " (Dark)" if (dark and profile.get("Use Separate Colors for Light and Dark Mode")) else ""
    out = {}
    for src, dst in SIMPLE_MAP + ANSI_MAP:
        c = profile.get(src + suffix) or profile.get(src)
        if c: out[dst] = hx(c)
    return out

# Tolerant JSONC editor: replace the value of "workbench.colorCustomizations"
# without disturbing comments / trailing commas elsewhere in settings.json.
def patch_settings(new_colors):
    text = SETTINGS.read_text()
    block = "\"workbench.colorCustomizations\": " + json.dumps(
        new_colors, indent=4
    ).replace("\n", "\n    ")
    pattern = re.compile(
        r'"workbench\.colorCustomizations"\s*:\s*\{[^{}]*\}',
        re.DOTALL,
    )
    if pattern.search(text):
        text = pattern.sub(block, text, count=1)
    else:
        # insert before final closing brace
        text = re.sub(r'\n\}\s*\Z', ",\n\n    " + block + "\n}\n", text)
    backup = SETTINGS.with_suffix(f".json.bak.{int(time.time())}")
    shutil.copy2(SETTINGS, backup)
    SETTINGS.write_text(text)
    return backup

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["dark", "light", "auto"], default="auto")
    args = ap.parse_args()
    dark = detect_macos_dark() if args.mode == "auto" else (args.mode == "dark")
    profile = load_profile()
    colors = colors_for(profile, dark)
    backup = patch_settings(colors)
    print(f"profile: {profile.get('Name')!r} mode: {'dark' if dark else 'light'}")
    print(f"wrote {len(colors)} keys to {SETTINGS}")
    print(f"backup: {backup}")
    print("Reload Cursor window: Cmd+Shift+P -> 'Developer: Reload Window'")

if __name__ == "__main__":
    sys.exit(main())
