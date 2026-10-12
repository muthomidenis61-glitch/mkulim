import { json, preflight, readBody, requireActiveAccess, adminRest, fail } from "./_shared.mjs";

const TYPES = new Set(["farm_note", "crop_record", "livestock_record", "expense", "sale", "inventory"]);
const MAX_DATA_BYTES = 32 * 1024;

export default async event => {
  const pf = preflight(event);
  if (pf) return pf;
  if (!["GET", "POST"].includes(event.httpMethod)) return json(405, { error: "Use GET to list records or POST to save a record." });

  try {
    const { user, access } = await requireActiveAccess(event);

    if (event.httpMethod === "GET") {
      const records = await adminRest("mkulima_farm_records", {
        query: "?select=id,record_type,title,data,created_at,updated_at&user_id=eq." +
          encodeURIComponent(user.id) + "&order=updated_at.desc&limit=100"
      });
      return json(200, { ok: true, access, records });
    }

    const body = await readBody(event);
    const recordType = String(body.recordType || "");
    const title = String(body.title || "").trim();
    const data = body.data === undefined ? {} : body.data;
    if (!TYPES.has(recordType)) throw new Error("Choose a supported farm record type.");
    if (title.length < 1 || title.length > 120) throw new Error("Record title must be 1–120 characters.");
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Record data must be a JSON object.");
    if (Buffer.byteLength(JSON.stringify(data), "utf8") > MAX_DATA_BYTES) throw new Error("Farm record is too large. Keep each record under 32 KB.");

    const saved = await adminRest("mkulima_farm_records", {
      method: "POST",
      query: "",
      body: { user_id: user.id, record_type: recordType, title, data, updated_at: new Date().toISOString() },
      prefer: "return=representation"
    });
    return json(201, { ok: true, access, record: saved[0] || null });
  } catch (e) {
    return fail(e);
  }
};
