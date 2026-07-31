/**
 * In-process Playwright backend for Browserbase cloud mode.
 *
 * Keeps the CDP WebSocket connection alive for the lifetime of the
 * MCP server process. This is critical because Browserbase sessions
 * die as soon as every client disconnects -- so we can't use the
 * browse-cli's per-command `--ws` mode (which opens and closes a
 * connection per invocation).
 *
 * Provides the same tool interface as the browse-cli based backend
 * (refs from the accessibility tree, JSON results).
 */
export declare function bbNavigate(url: string): Promise<Record<string, unknown>>;
export declare function bbClick(ref: string): Promise<Record<string, unknown>>;
export declare function bbClickXY(x: number, y: number): Promise<Record<string, unknown>>;
export declare function bbType(text: string, delay?: number): Promise<Record<string, unknown>>;
export declare function bbFill(ref: string, value: string, pressEnter?: boolean): Promise<Record<string, unknown>>;
export declare function bbPress(key: string): Promise<Record<string, unknown>>;
export declare function bbSelect(ref: string, values: string[]): Promise<Record<string, unknown>>;
export declare function bbSnapshot(compact?: boolean): Promise<Record<string, unknown>>;
export declare function bbScreenshot(path?: string, fullPage?: boolean): Promise<Record<string, unknown>>;
export declare function bbScroll(x: number, y: number, deltaX: number, deltaY: number): Promise<Record<string, unknown>>;
export declare function bbHover(x: number, y: number): Promise<Record<string, unknown>>;
export declare function bbDrag(fromX: number, fromY: number, toX: number, toY: number): Promise<Record<string, unknown>>;
export declare function bbEvaluate(script: string): Promise<Record<string, unknown>>;
export declare function bbGet(what: string, selector?: string): Promise<Record<string, unknown>>;
export declare function bbWait(type: string, value?: string, timeout?: number): Promise<Record<string, unknown>>;
export declare function bbBack(): Promise<Record<string, unknown>>;
export declare function bbForward(): Promise<Record<string, unknown>>;
export declare function bbReload(): Promise<Record<string, unknown>>;
export declare function bbPages(): Promise<Record<string, unknown>>;
export declare function bbNewTab(url?: string): Promise<Record<string, unknown>>;
export declare function bbSwitchTab(index: number): Promise<Record<string, unknown>>;
export declare function bbCloseTab(index?: number): Promise<Record<string, unknown>>;
export declare function bbClose(): Promise<Record<string, unknown>>;
