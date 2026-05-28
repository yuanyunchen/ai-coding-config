# ui-ux-design-pro — Source Provenance

- **Repository**: https://github.com/saifyxpro/ui-ux-design-pro-skill
- **Description (GitHub)**: AI skill for premium UI/UX design — 107 styles, 127 palettes, 107 font pairings, 150+ reasoning rules, CLI, and 18 platform templates. Works with Claude, Cursor, Windsurf, Copilot, Antigravity, Cline & more.
- **Commit SHA**: `7c98f97767f00dee333635c59c42e9db229f6a1f` (default branch `main`)
- **Repo last pushed**: 2026-02-19T02:02:05Z
- **Pulled at**: 2026-05-18T16:54Z (UTC)
- **Pull method**: tarball download via `codeload.github.com`, pinned to commit SHA, with selective `tar -x` of the `skills/ui-ux-design-pro/` subtree plus top-level docs

## Layout in this dir

The upstream `skills/ui-ux-design-pro/` subtree was flattened into this dir (so `SKILL.md`, `cli/`, `references/` sit at the top level). Top-level repo docs (`LICENSE`, `README.md`, `CLAUDE.md`) are kept under the `REPO-` prefix to avoid colliding with anything that might later be added inside the skill.

| File / dir here        | Upstream path                                          |
|------------------------|--------------------------------------------------------|
| `SKILL.md`             | `skills/ui-ux-design-pro/SKILL.md`                     |
| `references/`          | `skills/ui-ux-design-pro/references/`                  |
| `cli/`                 | `skills/ui-ux-design-pro/cli/`                         |
| `LICENSE`              | `LICENSE` (repo root)                                  |
| `REPO-README.md`       | `README.md` (repo root)                                |
| `REPO-CLAUDE.md`       | `CLAUDE.md` (repo root)                                |

## Files intentionally NOT pulled

The upstream repo also contains `examples/` (~5 MB of demo PNGs/HTML), `public/assets/hero.png` (2 MB), `output/`, `test/`, and `.claude-plugin/` marketplace metadata. None of these are needed to understand the skill itself and they were skipped per the task constraint.
