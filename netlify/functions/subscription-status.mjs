import { json, preflight, requireUser, adminRest, fail } from "./_shared.mjs";
export default async event => {
  const pf = preflight(event); if (pf) return pf;
  if (event.httpMethod !== "GET") return json(405, { error: "Use GET." });
  try {
    const user = await requireUser(event);
    const now = new Date().toISOString();
    const [subs, trials] = await Promise.all([
      adminRest("mkulima_subscriptions", { query: "?select=plan,status,starts_at,ends_at,mpesa_receipt,updated_at&user_id=eq." + encodeURIComponent(user.id) + "&status=eq.active&ends_at=gt." + encodeURIComponent(now) + "&order=ends_at.desc&limit=1" }),
      adminRest("mkulima_trials", { query: "?select=starts_at,ends_at&user_id=eq." + encodeURIComponent(user.id) + "&limit=1" })
    ]);
    return json(200, { user: { id: user.id, email: user.email, fullName: user.user_metadata?.full_name || "" }, subscription: subs[0] || null, trial: trials[0] || null, serverTime: now, configured: true });
  } catch (e) { return fail(e); }
};
