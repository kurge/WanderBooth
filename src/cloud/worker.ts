interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  DEVICE_TOKEN: string;
}

type DeliveryRow = {
  token: string;
  created_at: string;
  expires_at: string;
  status: "pending" | "ready" | "expired";
  expected_files: number;
  ready_at: string | null;
  expired_at: string | null;
};

type DeliveryFileRow = {
  file_id: string;
  kind: "individual" | "strip" | "slideshow";
  label: string;
  mime_type: string;
  object_key: string;
  byte_size: number | null;
  uploaded_at: string | null;
};

type ManifestFile = {
  id: string;
  kind: DeliveryFileRow["kind"];
  label: string;
  mimeType: string;
};

const DELIVERY_TOKEN = /^[A-Za-z0-9_-]{32}$/;
const FILE_ID = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000;

export const isDeliveryToken = (value: string) => DELIVERY_TOKEN.test(value);

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { ...securityHeaders, "Cache-Control": "no-store" },
  });

const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      ...securityHeaders,
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });

const authorized = (request: Request, env: Env) => {
  const value = request.headers.get("Authorization");
  return Boolean(env.DEVICE_TOKEN && value === `Bearer ${env.DEVICE_TOKEN}`);
};

const deliveryFor = (env: Env, token: string) =>
  env.DB.prepare("SELECT * FROM deliveries WHERE token = ?").bind(token).first<DeliveryRow>();

const filesFor = async (env: Env, token: string) => {
  const result = await env.DB.prepare(
    `SELECT file_id, kind, label, mime_type, object_key, byte_size, uploaded_at
     FROM delivery_files WHERE delivery_token = ? ORDER BY file_id`,
  )
    .bind(token)
    .all<DeliveryFileRow>();
  return result.results;
};

const validManifestFile = (value: unknown): value is ManifestFile => {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<ManifestFile>;
  return (
    typeof file.id === "string" &&
    FILE_ID.test(file.id) &&
    ["individual", "strip", "slideshow"].includes(file.kind ?? "") &&
    typeof file.label === "string" &&
    file.label.trim().length > 0 &&
    file.label.length <= 100 &&
    typeof file.mimeType === "string" &&
    ["image/png", "image/jpeg", "video/mp4"].includes(file.mimeType)
  );
};

const putManifest = async (request: Request, env: Env, token: string) => {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
  let body: { createdAt?: unknown; expiresAt?: unknown; files?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "The delivery manifest must be valid JSON." }, 400);
  }
  if (
    typeof body.createdAt !== "string" ||
    typeof body.expiresAt !== "string" ||
    !Array.isArray(body.files) ||
    body.files.length < 1 ||
    body.files.length > 16 ||
    !body.files.every(validManifestFile)
  ) {
    return json({ error: "The delivery manifest is incomplete." }, 400);
  }
  const createdAt = Date.parse(body.createdAt);
  const expiresAt = Date.parse(body.expiresAt);
  if (
    !Number.isFinite(createdAt) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= createdAt ||
    expiresAt - createdAt > THIRTY_DAYS_MS + 60_000
  ) {
    return json({ error: "The delivery expiration must be within 30 days." }, 400);
  }
  if (expiresAt <= Date.now()) return json({ error: "This delivery has already expired." }, 410);

  const files = body.files as ManifestFile[];
  if (new Set(files.map((file) => file.id)).size !== files.length) {
    return json({ error: "Every delivery file needs a unique identifier." }, 400);
  }

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO deliveries (
        token, created_at, expires_at, status, expected_files, ready_at, expired_at
      ) VALUES (?, ?, ?, 'pending', ?, NULL, NULL)
      ON CONFLICT(token) DO UPDATE SET
        created_at = excluded.created_at,
        expires_at = excluded.expires_at,
        status = 'pending',
        expected_files = excluded.expected_files,
        ready_at = NULL,
        expired_at = NULL`,
    ).bind(token, body.createdAt, body.expiresAt, files.length),
    ...files.map((file) =>
      env.DB.prepare(
        `INSERT INTO delivery_files (
          delivery_token, file_id, kind, label, mime_type, object_key, byte_size, uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
        ON CONFLICT(delivery_token, file_id) DO UPDATE SET
          kind = excluded.kind,
          label = excluded.label,
          mime_type = excluded.mime_type,
          object_key = excluded.object_key`,
      ).bind(token, file.id, file.kind, file.label.trim(), file.mimeType, `${token}/${file.id}`),
    ),
  ]);

  return json({ ok: true });
};

const putFile = async (request: Request, env: Env, token: string, fileId: string) => {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
  if (!FILE_ID.test(fileId)) return json({ error: "Invalid file identifier." }, 400);
  const delivery = await deliveryFor(env, token);
  if (!delivery) return json({ error: "Prepare the delivery manifest first." }, 404);
  if (Date.parse(delivery.expires_at) <= Date.now()) {
    return json({ error: "This delivery has already expired." }, 410);
  }
  const file = await env.DB.prepare(
    `SELECT file_id, kind, label, mime_type, object_key, byte_size, uploaded_at
     FROM delivery_files WHERE delivery_token = ? AND file_id = ?`,
  )
    .bind(token, fileId)
    .first<DeliveryFileRow>();
  if (!file) return json({ error: "That file is not part of this delivery." }, 404);
  if (!request.body) return json({ error: "The upload body is empty." }, 400);
  if (request.headers.get("Content-Type")?.split(";")[0] !== file.mime_type) {
    return json({ error: "The upload content type does not match its manifest." }, 400);
  }

  await env.MEDIA.put(file.object_key, request.body, {
    httpMetadata: { contentType: file.mime_type },
    customMetadata: { expiresAt: delivery.expires_at },
  });
  const uploadedAt = new Date().toISOString();
  const contentLength = Number(request.headers.get("Content-Length"));
  await env.DB.prepare(
    `UPDATE delivery_files SET byte_size = ?, uploaded_at = ?
     WHERE delivery_token = ? AND file_id = ?`,
  )
    .bind(Number.isFinite(contentLength) ? contentLength : null, uploadedAt, token, fileId)
    .run();
  return json({ ok: true, uploadedAt });
};

const completeDelivery = async (request: Request, env: Env, token: string) => {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
  const delivery = await deliveryFor(env, token);
  if (!delivery) return json({ error: "Prepare the delivery manifest first." }, 404);
  if (Date.parse(delivery.expires_at) <= Date.now()) {
    return json({ error: "This delivery has already expired." }, 410);
  }
  const count = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM delivery_files
     WHERE delivery_token = ? AND uploaded_at IS NOT NULL`,
  )
    .bind(token)
    .first<{ count: number }>();
  if ((count?.count ?? 0) !== delivery.expected_files) {
    return json({ error: "Not every branded file has finished uploading." }, 409);
  }
  const readyAt = new Date().toISOString();
  await env.DB.prepare("UPDATE deliveries SET status = 'ready', ready_at = ? WHERE token = ?")
    .bind(readyAt, token)
    .run();
  return json({ ok: true, readyAt });
};

const expireDelivery = async (env: Env, token: string, expiredAt = new Date().toISOString()) => {
  const files = await filesFor(env, token);
  await Promise.all(files.map((file) => env.MEDIA.delete(file.object_key)));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM delivery_files WHERE delivery_token = ?").bind(token),
    env.DB.prepare("UPDATE deliveries SET status = 'expired', expired_at = ? WHERE token = ?").bind(
      expiredAt,
      token,
    ),
  ]);
};

const pageShell = (
  content: string,
  options?: { refresh?: boolean; title?: string },
) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${options?.refresh ? '<meta http-equiv="refresh" content="8" />' : ""}
    <title>${escapeHtml(options?.title ?? "WanderBooth photos")}</title>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-rounded, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #28083f; background: #fffaf0; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; background: radial-gradient(circle at 10% 5%, #fff45b 0 10rem, transparent 24rem), linear-gradient(145deg, #fffaf0, #eef4ff); }
      main { width: min(100% - 2rem, 54rem); margin: 0 auto; padding: 2rem 0 4rem; }
      header { padding: 1.5rem 0 2rem; }
      .brand { display: inline-flex; align-items: center; gap: .7rem; font-weight: 900; font-size: 1.25rem; }
      .brand i { display: block; width: 2.4rem; height: 2.4rem; border-radius: 45% 55% 52% 48%; background: #3572c4; box-shadow: .45rem .4rem 0 #ddf426; transform: rotate(-9deg); }
      h1 { max-width: 14ch; margin: .8rem 0; font-size: clamp(2.4rem, 11vw, 5.5rem); line-height: .94; letter-spacing: -.055em; }
      p { color: #646a82; line-height: 1.55; }
      .card, .state { padding: 1rem; border: 1px solid rgba(40, 8, 63, .11); border-radius: 1.5rem; background: rgba(255,255,255,.9); box-shadow: 0 1.1rem 3rem rgba(35, 45, 88, .1); }
      .state { padding: 2rem; text-align: center; }
      .state b { display: block; margin-bottom: .55rem; font-size: 1.2rem; }
      .gallery { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
      .card--wide { grid-column: 1 / -1; }
      img, video { display: block; width: 100%; max-height: 40rem; border-radius: 1rem; background: #231b31; object-fit: contain; }
      .card__copy { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .9rem .25rem .15rem; }
      .card__copy strong { font-size: .9rem; }
      a { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; padding: .65rem 1rem; border-radius: 999px; color: white; background: #3572c4; font-size: .82rem; font-weight: 850; text-decoration: none; }
      footer { padding: 2rem .5rem; color: #7a7e91; font-size: .78rem; text-align: center; }
      @media (max-width: 40rem) { .gallery { grid-template-columns: 1fr; } .card--wide { grid-column: auto; } .card__copy { align-items: flex-start; flex-direction: column; } a { width: 100%; } }
    </style>
  </head>
  <body>
    <main>
      <header><span class="brand"><i aria-hidden="true"></i> WanderBooth</span></header>
      ${content}
      <footer>Created by Wander Press PH · This private gallery expires after 30 days.</footer>
    </main>
  </body>
</html>`;

const pendingPage = () =>
  pageShell(
    `<section class="state"><b>Your photos are still being prepared.</b><p>Keep this page or scan the same QR again shortly. It updates automatically while WanderBooth finishes the secure upload.</p></section>`,
    { refresh: true, title: "Preparing your WanderBooth photos" },
  );

const expiredPage = () =>
  pageShell(
    `<section class="state"><b>This private gallery has expired.</b><p>WanderBooth links are available for 30 days. Please contact the event organizer if you need help.</p></section>`,
    { title: "WanderBooth gallery expired" },
  );

export const renderReadyPage = (token: string, files: DeliveryFileRow[], expiresAt: string) => {
  const cards = files
    .map((file) => {
      const fileUrl = `/d/${encodeURIComponent(token)}/files/${encodeURIComponent(file.file_id)}`;
      const preview =
        file.kind === "slideshow"
          ? `<video src="${fileUrl}" controls autoplay loop muted playsinline></video>`
          : `<img src="${fileUrl}" alt="${escapeHtml(file.label)}" loading="lazy" />`;
      return `<article class="card ${file.kind === "strip" || file.kind === "slideshow" ? "card--wide" : ""}">
        ${preview}
        <div class="card__copy"><strong>${escapeHtml(file.label)}</strong><a href="${fileUrl}?download=1">Download</a></div>
      </article>`;
    })
    .join("");
  const expiry = new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(
    new Date(expiresAt),
  );
  return pageShell(
    `<section><h1>Your photos are ready.</h1><p>Download your favorites before ${escapeHtml(expiry)}. Only the finished, branded WanderBooth files are included.</p></section><section class="gallery">${cards}</section>`,
  );
};

const serveGallery = async (env: Env, ctx: ExecutionContext, token: string) => {
  const delivery = await deliveryFor(env, token);
  if (!delivery) return html(pendingPage(), 202);
  if (delivery.status === "expired" || Date.parse(delivery.expires_at) <= Date.now()) {
    if (delivery.status !== "expired") ctx.waitUntil(expireDelivery(env, token));
    return html(expiredPage(), 410);
  }
  if (delivery.status !== "ready") return html(pendingPage(), 202);
  const files = (await filesFor(env, token)).filter((file) => file.uploaded_at);
  return html(renderReadyPage(token, files, delivery.expires_at));
};

const safeDownloadName = (file: DeliveryFileRow) => {
  const extension = file.file_id.includes(".") ? `.${file.file_id.split(".").pop()}` : "";
  const base = file.label
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base || "WanderBooth-photo"}${extension}`;
};

const serveFile = async (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  token: string,
  fileId: string,
) => {
  const delivery = await deliveryFor(env, token);
  if (delivery?.status !== "ready") return json({ error: "File not ready." }, 404);
  if (Date.parse(delivery.expires_at) <= Date.now()) {
    ctx.waitUntil(expireDelivery(env, token));
    return json({ error: "This gallery has expired." }, 410);
  }
  const file = await env.DB.prepare(
    `SELECT file_id, kind, label, mime_type, object_key, byte_size, uploaded_at
     FROM delivery_files WHERE delivery_token = ? AND file_id = ?`,
  )
    .bind(token, fileId)
    .first<DeliveryFileRow>();
  if (!file?.uploaded_at) return json({ error: "File not found." }, 404);
  const object = await env.MEDIA.get(file.object_key);
  if (!object) return json({ error: "File not found." }, 404);
  const headers = new Headers({
    ...securityHeaders,
    "Cache-Control": "private, max-age=300",
    "Content-Type": file.mime_type,
  });
  object.writeHttpMetadata(headers);
  if (new URL(request.url).searchParams.get("download") === "1") {
    headers.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(safeDownloadName(file))}`,
    );
  }
  return new Response(object.body, { headers });
};

const fetchHandler = async (request: Request, env: Env, ctx: ExecutionContext) => {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

  if (request.method === "GET" && url.pathname === "/api/v1/health") {
    return json({ ok: true, service: "wanderbooth-delivery" });
  }
  if (request.method === "GET" && url.pathname === "/api/v1/device-health") {
    return authorized(request, env)
      ? json({ ok: true, service: "wanderbooth-delivery", authenticated: true })
      : json({ error: "Unauthorized." }, 401);
  }
  if (request.method === "GET" && url.pathname === "/robots.txt") {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (parts[0] === "api" && parts[1] === "v1" && parts[2] === "deliveries") {
    const token = parts[3] ?? "";
    if (!isDeliveryToken(token)) return json({ error: "Invalid delivery token." }, 400);
    if (request.method === "PUT" && parts.length === 4) return putManifest(request, env, token);
    if (request.method === "PUT" && parts[4] === "files" && parts[5]) {
      return putFile(request, env, token, parts[5]);
    }
    if (request.method === "POST" && parts[4] === "complete" && parts.length === 5) {
      return completeDelivery(request, env, token);
    }
  }

  if (parts[0] === "d") {
    const token = parts[1] ?? "";
    if (!isDeliveryToken(token)) return html(expiredPage(), 404);
    if (request.method === "GET" && parts.length === 2) return serveGallery(env, ctx, token);
    if (request.method === "GET" && parts[2] === "files" && parts[3]) {
      return serveFile(request, env, ctx, token, parts[3]);
    }
  }

  if (request.method === "GET" && url.pathname === "/") {
    return html(
      pageShell(
        `<section class="state"><b>WanderBooth delivery is online.</b><p>Scan the private QR shown after your photo session to open your gallery.</p></section>`,
      ),
    );
  }
  return json({ error: "Route not found." }, 404);
};

const scheduledHandler = async (env: Env) => {
  const expired = await env.DB.prepare(
    "SELECT token FROM deliveries WHERE expires_at <= ? AND status != 'expired' LIMIT 100",
  )
    .bind(new Date().toISOString())
    .all<{ token: string }>();
  for (const delivery of expired.results) await expireDelivery(env, delivery.token);
};

export default {
  fetch: fetchHandler,
  scheduled: (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(scheduledHandler(env));
  },
};
