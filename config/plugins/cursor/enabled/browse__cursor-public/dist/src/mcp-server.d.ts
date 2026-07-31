#!/usr/bin/env node
/**
 * MCP server for browser automation.
 *
 * Two backends depending on environment:
 *
 * - **Local mode** (default): shells out to @browserbasehq/browse-cli.
 *   The browse daemon manages Chrome lifecycle and keeps state between calls.
 *
 * - **Browserbase cloud mode** (BROWSERBASE_API_KEY + BROWSERBASE_PROJECT_ID):
 *   keeps a Playwright CDP connection alive in-process. This is required
 *   because BB sessions die when the last client disconnects, so the
 *   per-command `--ws` approach doesn't work.
 */
export {};
