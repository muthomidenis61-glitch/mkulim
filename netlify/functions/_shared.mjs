const ALLOWED_ORIGIN = process.env.SITE_URL || "https://mkulim.netlify.app";
export const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
  "Cache-Control": "no-store"
};
export const json = (statusCode, data) => ({ statusCode, headers, body: JSON.stringify(data) });
export const preflight = event => event.httpMethod === "OPTIONS" ? { statusCode: 204, headers, body: "" } : null;
export function env(name) { const value = process.env[name]; if (!value) throw new Error("Server configuration is missing " + name); return value; }
export async function readBody(event) { try { return JSON.parse(event.body || "{}"); } catch { throw new Error("Request body must be valid JSON."); } }
export async function supabaseAuth(path, options = {}) {
  const base = env("SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_ANON_KEY");
  const response = await fetch(base + path, { ...options, headers: { apikey: key, "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || "Authentication request failed.");
  return data;
}
export async function adminRest(table, options = {}) {
  const base = env("SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(base + "/rest/v1/" + table + (options.query || ""), {
    method: options.method || "GET",
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: options.prefer || "return=representation", ...(options.headers || {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) throw new Error(data.message || data.error || "Database request failed (" + response.status + ").");
  return data;
}
export async function requireUser(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Please sign in first.");
  const user = await supabaseAuth("/auth/v1/user", { headers: { Authorization: auth } });
  if (!user?.id || !user.email) throw new Error("Your session is invalid. Please sign in again.");
  return user;
}
export function fail(error) {
  const message = String(error?.message || "Unexpected server error.");
  const statusCode = /sign in|session|invalid credentials|email not confirmed/i.test(message) ? 401 : /configuration is missing|SUPABASE_|DARAJA_/i.test(message) ? 503 : 400;
  return json(statusCode, { error: statusCode === 503 ? "Subscription service is not fully configured yet. The site owner must finish secure server settings." : message });
}
export function normalizeKenyanPhone(value) {
  let p = String(value || "").replace(/[\s()-]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (!/^254[17]\d{8}$/.test(p)) throw new Error("Enter a Kenyan Safaricom mobile number, e.g. 0712345678 or 254712345678.");
  return p;
}
