import "server-only";

// On Vercel the OIDC token is injected per request, so being deployed counts as available.
export const llmAvailable = () => !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
