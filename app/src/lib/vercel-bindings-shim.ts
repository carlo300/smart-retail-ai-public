// Build-time shim for the Vercel Node runtime.
// Cloudflare-specific bindings are available only on the original Higgsfield deployment.
// Reward persistence is provided separately when a Vercel-backed data store is configured.
export const env = {
  HF_ENV: "vercel",
  APP_SLUG: "smart-retail-ai-public",
};
