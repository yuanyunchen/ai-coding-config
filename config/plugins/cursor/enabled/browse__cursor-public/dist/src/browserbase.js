/**
 * Browserbase cloud session management.
 *
 * Creates and caches a Browserbase session so the browse-cli daemon can
 * connect to a remote Chrome instance via `--ws <connectUrl>`.
 *
 * Shared by both the CLI wrapper and the MCP server.
 */
let _cachedSession = null;
/**
 * Returns true when BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID are set.
 */
export function isBrowserbaseMode() {
    return !!(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID);
}
/**
 * Create a Browserbase cloud browser session.
 * Returns the session id and CDP WebSocket connect URL.
 *
 * The result is cached for the lifetime of this process so that
 * multiple browse commands share the same remote browser.
 */
export async function getOrCreateSession() {
    if (_cachedSession) {
        return _cachedSession;
    }
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;
    if (!apiKey || !projectId) {
        throw new Error('Browserbase cloud mode requires BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID environment variables.');
    }
    const res = await fetch('https://api.browserbase.com/v1/sessions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-bb-api-key': apiKey,
        },
        body: JSON.stringify({ projectId }),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Browserbase session creation failed (${res.status}): ${errText}`);
    }
    const session = (await res.json());
    _cachedSession = session;
    return session;
}
/**
 * Clear the cached session (e.g. after `browse stop`).
 */
export function clearCachedSession() {
    _cachedSession = null;
}
//# sourceMappingURL=browserbase.js.map