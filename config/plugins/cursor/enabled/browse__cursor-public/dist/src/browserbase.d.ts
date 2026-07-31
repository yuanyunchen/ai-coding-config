/**
 * Browserbase cloud session management.
 *
 * Creates and caches a Browserbase session so the browse-cli daemon can
 * connect to a remote Chrome instance via `--ws <connectUrl>`.
 *
 * Shared by both the CLI wrapper and the MCP server.
 */
export interface BrowserbaseSession {
    id: string;
    connectUrl: string;
}
/**
 * Returns true when BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID are set.
 */
export declare function isBrowserbaseMode(): boolean;
/**
 * Create a Browserbase cloud browser session.
 * Returns the session id and CDP WebSocket connect URL.
 *
 * The result is cached for the lifetime of this process so that
 * multiple browse commands share the same remote browser.
 */
export declare function getOrCreateSession(): Promise<BrowserbaseSession>;
/**
 * Clear the cached session (e.g. after `browse stop`).
 */
export declare function clearCachedSession(): void;
