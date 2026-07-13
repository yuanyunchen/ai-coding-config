---
name: bytedance-tmates
description: "Operate TMates OpenAPI through bytedcli: check OAuth authorization, list/fetch followed projects, inspect run summaries, inspect/export/update/archive managed agents by agent ID, create managed-agent runs, and inspect managed-agent spaces. Use for TMates task share URLs, tmates.tiktok-row.net run IDs, managed agent IDs, and debugging TMates runs or agents."
---

# bytedcli TMates

This skill covers bytedcli TMates OpenAPI commands:

- `tmates auth check`
- `tmates project list`
- `tmates project get`
- `tmates run get`
- `tmates run create`
- `tmates agent list`
- `tmates agent get`
- `tmates agent export`
- `tmates agent update`
- `tmates agent archive`
- `tmates agent unarchive`
- `tmates space list`
- `tmates space get`

Agent update/archive commands require `--yes`. Personal agent discovery is not exposed by TMates OpenAPI yet; when working with personal agents, copy the numeric agent ID from the TMates Web URL and use `tmates agent get --id <agent-id>`.

## When to use

Use this skill when the user asks to inspect or debug TMates data:

- TMates task share URLs such as `https://tmates.tiktok-row.net/task/share/<run_id>`
- TMates sandbox run status, messages, toolcalls, or resources
- MP2C Regression Steward managed-agent sessions
- TMates managed agent lookup, export, update, archive, or unarchive by known agent ID
- Creating a run from a managed agent using the agent's configured repositories
- Checking whether current bytedcli auth can call TMates OpenAPI

## Authentication

TMates OpenAPI uses ByteCloud JWT in `x-jwt-token` plus the OpenAPI header `domain: tiktok_tmates;v1`.

For the TikTok ROW gateway, use the i18n-tt site:

```bash
bytedcli --site i18n-tt auth login
bytedcli --site i18n-tt tmates auth check
```

`--site` and `--json` are global options and must be placed before `tmates`.

## Quick Start

```bash
# Check current user authorization.
bytedcli --site i18n-tt tmates auth check

# List followed TMates projects.
bytedcli --site i18n-tt tmates project list

# Resolve a Codebase repo to a TMates project without creating a missing project.
bytedcli --site i18n-tt tmates project get --repo example-org/example-repo

# Inspect a sandbox run summary.
bytedcli --json --site i18n-tt tmates run get --run-id 38097

# Create a run from a managed agent. Without repo flags, TMates uses the agent's configured repos.
bytedcli --site i18n-tt tmates run create --managed-agent-id 2033 --prompt 'Review this MR' --yes

# Inspect managed-agent spaces and agents.
bytedcli --site i18n-tt tmates space list
bytedcli --site i18n-tt tmates space get --id 96
bytedcli --site i18n-tt tmates agent list --space-id 96
bytedcli --site i18n-tt tmates agent get --id 878

# Export, edit, and update a managed agent by ID.
bytedcli --site i18n-tt tmates agent export --id 2033 --out agent.json
bytedcli --site i18n-tt tmates agent update --id 2033 --from-file agent.json --yes
```

## Output Boundaries

The CLI returns normalized summaries instead of raw TMates payloads:

- Managed agent detail reports prompt length and config key summaries, not the raw system prompt or raw config body.
- `agent export` writes an editable JSON config and relies on the official OpenAPI projection, which omits Lark secret fields.
- Run detail reports bounded previews for prompt, messages, tool inputs, and tool outputs.
- Use `--message-limit`, `--toolcall-limit`, and `--preview-length` to control run summary size.

This keeps routine agent debugging useful while reducing accidental leakage of session content, environment values, or agent configuration secrets.

## Command Notes

### `tmates project get`

`project get` calls the OpenAPI project lookup with `createIfNotExist=false`. It does not create projects.

```bash
bytedcli --json --site i18n-tt tmates project get --repo example-org/example-repo
```

### `tmates run get`

Use the numeric run id from a TMates share URL:

```bash
bytedcli --json --site i18n-tt tmates run get --run-id 38097 --message-limit 5 --toolcall-limit 10
```

The JSON result includes status, managed-agent version identifiers, project/space ids, message/tool/resource counts, recent message previews, recent toolcall previews, resources, and toolcall status counts.

### `tmates run create`

Use this to start a cloud run from a managed agent:

```bash
bytedcli --site i18n-tt tmates run create --managed-agent-id 2033 --prompt 'Review this MR' --yes
```

When no repository override is provided, TMates uses the managed agent's configured repositories, matching the Web agent run behavior. Use `--repo <repoPath> --branch <branch>`, `--project-id <id> --branch <branch>`, or `--project-list <json>` only when explicitly overriding that default. Do not combine `--project-list` with `--repo`, `--project-id`, or `--branch`.

### `tmates agent get`

Use this to inspect a managed-agent summary.

```bash
bytedcli --json --site i18n-tt tmates agent get --id 878
```

### `tmates agent export` / `update`

Use `agent export` as the template for `agent update`:

```bash
bytedcli --site i18n-tt tmates agent export --id 2033 --out agent.json
bytedcli --site i18n-tt tmates agent update --id 2033 --from-file agent.json --yes
```

The exported JSON may contain full system prompt and config bodies. Review edits before applying them. Fields omitted from the update file are not sent to OpenAPI; explicit `null` values are sent as clear/empty values where OpenAPI accepts them.

### Agent IDs and Space IDs

`tmates agent get/export/update/archive/unarchive` operate by managed agent ID and work for personal agents when you know the numeric ID from the Web URL, for example `/space/personal/agents/workflow/2033`.

`tmates agent list --space-id` uses the OpenAPI managed-agent-space ID, such as `82`; it is not the runtime `scopeId` shown on agent detail. TMates OpenAPI does not currently expose personal agent listing or Web space resolution.

## Safety Guidance

- Do not simulate unsupported Web-only operations by calling `sdma-api.tiktok-row.net` directly from bytedcli.
- `run create`, `agent update`, `agent archive`, and `agent unarchive` require `--yes`.
- Avoid pasting raw run messages, raw tool output, system prompts, MCP configs, skill configs, env vars, or long-term memory content into chat unless the user explicitly asks and the data has been reviewed.

## References

- `../../invocation.md`
- `../../troubleshooting.md`
