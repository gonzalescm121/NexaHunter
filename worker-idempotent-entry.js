import base from "./worker-entry.js";

export {
  IdempotencyDurableObject,
  PortfolioDurableObject,
  MarketStreamDurableObject
} from "./worker-app.js";

const PAPER_PATH = "/api/paper-orders";
const DUPLICATE_TTL_SECONDS = 300;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function identityScope(request, ctx) {
  try {
    if (ctx?.access) {
      const identity = await ctx.access.getIdentity();
      if (identity?.id) return `access:${identity.id}`;
      if (identity?.email) return `access:${identity.email}`;
    }
  } catch {}

  const userHeader =
    request.headers.get("x-nexahunter-user");
  if (userHeader) return `user:${userHeader}`;

  const authorization =
    request.headers.get("cookie") || "";
  if (authorization) {
    return `session:${await digest(authorization)}`;
  }

  return `ip:${request.headers.get("cf-connecting-ip") || "anonymous"}`;
}

async function paperIdempotency(request, env, ctx) {
  if (!env?.IDEMPOTENCY) {
    return {
      ok: false,
      status: 503,
      error: "Idempotency storage is not configured"
    };
  }

  let body;
  try {
    body = await request.clone().json();
  } catch {
    return {
      ok: true,
      skip: true
    };
  }

  const scope = await identityScope(request, ctx);
  const suppliedKey =
    request.headers.get("Idempotency-Key")?.trim();

  const canonical = JSON.stringify({
    symbol: String(body?.symbol || "").trim().toUpperCase(),
    quantity: Number(body?.quantity),
    price: Number(body?.price),
    side: String(body?.side || "").trim().toUpperCase(),
    assetType: String(body?.assetType || "STOCK").trim().toUpperCase()
  });

  const key =
    suppliedKey ||
    `paper:${await digest(`${scope}:${canonical}`)}`;

  const objectName =
    `paper:${await digest(scope)}`;
  const id = env.IDEMPOTENCY.idFromName(objectName);
  const stub = env.IDEMPOTENCY.get(id);

  try {
    const response = await stub.fetch(
      new Request("https://idempotency/reserve", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          key,
          ttlSeconds: DUPLICATE_TTL_SECONDS,
          value: {
            canonical,
            scope
          }
        })
      })
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        status: 503,
        error: "Idempotency storage unavailable"
      };
    }

    if (result.accepted === false) {
      return {
        ok: false,
        status: 409,
        error: "Duplicate paper order rejected"
      };
    }

    return {
      ok: true,
      key
    };
  } catch {
    return {
      ok: false,
      status: 503,
      error: "Idempotency storage unavailable"
    };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (
      url.pathname === PAPER_PATH &&
      request.method === "POST"
    ) {
      const guard = await paperIdempotency(
        request,
        env,
        ctx
      );

      if (!guard.ok) {
        return json(
          {
            accepted: false,
            error: guard.error
          },
          guard.status
        );
      }
    }

    return base.fetch(request, env, ctx);
  }
};
