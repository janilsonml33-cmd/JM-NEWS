import { getStore } from "@netlify/blobs";
import { createHmac, createHash, timingSafeEqual, randomUUID } from "node:crypto";

export const config = { path: "/api/*" };

const CATS = ["Medianeira","Oeste do Paraná","Paraná","Brasil","Mundo","Política","Economia","Segurança pública","Educação","Saúde","Esportes","Futebol","Entretenimento","Tecnologia"];
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const sign = (p) => createHmac("sha256", process.env.SESSION_SECRET || "").update(p).digest("hex");
const sha = (s) => createHash("sha256").update(String(s)).digest();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function authorized(req) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const [exp, sig] = t.split(".");
  if (!process.env.SESSION_SECRET || !exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}
const str = (v, n) => String(v == null ? "" : v).slice(0, n);
function clean(a) {
  if (!a || typeof a !== "object") return null;
  const id = str(a.id, 40);
  if (!/^[\w-]{1,40}$/.test(id)) return null;
  const l = str(a.l, 500), i = str(a.i, 100);
  return {
    id, t: str(a.t, 200), s: str(a.s, 300),
    c: CATS.includes(a.c) ? a.c : CATS[0],
    b: str(a.b, 50000), f: str(a.f, 200),
    l: /^https?:\/\//i.test(l) ? l : "",
    i: /^\/api\/img\/[a-f0-9-]{36}$/.test(i) ? i : "",
    k: str(a.k, 200),
    st: a.st === "publicado" ? "publicado" : "rascunho",
    d: /^\d{4}-\d{2}-\d{2}T[\d:]{8}/.test(str(a.d, 30)) ? str(a.d, 30) : new Date().toISOString().slice(0, 19),
  };
}

export default async (req) => {
  const p = new URL(req.url).pathname.replace(/^\/api\/?/, "");
  const db = getStore("jmnews"), imgs = getStore("jmnews-img");

  // Público: somente matérias publicadas
  if (req.method === "GET" && p === "news") {
    const all = (await db.get("all", { type: "json" })) || [];
    return json(all.filter((a) => a.st === "publicado"));
  }
  if (req.method === "GET" && p.startsWith("img/")) {
    const id = p.slice(4);
    if (!/^[a-f0-9-]{36}$/.test(id)) return json({ error: "não encontrado" }, 404);
    const r = await imgs.getWithMetadata(id, { type: "arrayBuffer" });
    if (!r) return json({ error: "não encontrado" }, 404);
    return new Response(r.data, { headers: { "content-type": r.metadata?.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  }

  // Login
  if (req.method === "POST" && p === "login") {
    let pw = "";
    try { pw = (await req.json()).password; } catch {}
    const ok = process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET && timingSafeEqual(sha(pw), sha(process.env.ADMIN_PASSWORD));
    if (!ok) { await wait(1000); return json({ error: "Senha incorreta." }, 401); }
    const exp = Date.now() + 8 * 3600 * 1000;
    return json({ token: exp + "." + sign(String(exp)) });
  }

  // Restrito ao administrador
  if (!authorized(req)) return json({ error: "Não autorizado." }, 401);

  if (req.method === "GET" && p === "all") return json((await db.get("all", { type: "json" })) || []);

  if (req.method === "POST" && p === "save") {
    let body; try { body = await req.json(); } catch { return json({ error: "JSON inválido." }, 400); }
    if (!Array.isArray(body) || body.length > 500) return json({ error: "Dados inválidos." }, 400);
    const list = body.map(clean).filter(Boolean);
    await db.setJSON("all", list);
    return json({ ok: true, total: list.length });
  }

  if (req.method === "POST" && p === "img") {
    const type = req.headers.get("content-type") || "";
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return json({ error: "Tipo de imagem não permitido." }, 400);
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 4 * 1024 * 1024) return json({ error: "Imagem maior que 4 MB." }, 400);
    const id = randomUUID();
    await imgs.set(id, buf, { metadata: { type } });
    return json({ url: "/api/img/" + id });
  }
  return json({ error: "Não encontrado." }, 404);
};
