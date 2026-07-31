#!/usr/bin/env node
/**
 * Thin CLI wrapper around @browserbasehq/browse-cli.
 *
 * - If BROWSERBASE_API_KEY + BROWSERBASE_PROJECT_ID are set, creates a
 *   Browserbase cloud session and injects `--ws <connectUrl>` so the
 *   browse daemon connects to the remote browser.
 * - Otherwise, forwards all arguments directly to `browse` which manages
 *   a local Chrome instance via its daemon.
 *
 * Usage:
 *   browser open https://example.com
 *   browser snapshot -c
 *   browser click @0-5
 *   browser stop
 */
export {};
