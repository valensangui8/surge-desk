/** ?demo=capture → run live and keep responses in window.__fx · ?demo=replay → replay recorded real responses. */
export const demoMode = () => (typeof window === "undefined" ? "live" : (new URLSearchParams(window.location.search).get("demo") ?? "live"));
