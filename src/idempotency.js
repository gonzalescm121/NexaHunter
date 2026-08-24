const DEFAULT_TTL_SECONDS = 300;

export class IdempotencyStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async reserve(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const existing = await this.state.storage.get(key);

    if (existing) {
      return {
        accepted: false,
        existing
      };
    }

    await this.state.storage.put(
      key,
      {
        ...value,
        createdAt: Date.now()
      },
      {
        expirationTtl: ttlSeconds
      }
    );

    return {
      accepted: true,
      existing: null
    };
  }

  async get(key) {
    return this.state.storage.get(key);
  }
}

export class IdempotencyDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.store = new IdempotencyStore(
      state,
      env
    );
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== "/reserve") {
      return new Response(
        JSON.stringify({
          error: "Not found"
        }),
        {
          status: 404,
          headers: {
            "content-type":
              "application/json"
          }
        }
      );
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed"
        }),
        {
          status: 405,
          headers: {
            "content-type":
              "application/json"
          }
        }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON"
        }),
        {
          status: 400,
          headers: {
            "content-type":
              "application/json"
          }
        }
      );
    }

    const key = String(
      body?.key ?? ""
    ).trim();

    if (!key) {
      return new Response(
        JSON.stringify({
          error: "Missing idempotency key"
        }),
        {
          status: 400,
          headers: {
            "content-type":
              "application/json"
          }
        }
      );
    }

    const result =
      await this.store.reserve(
        key,
        body.value ?? {}
      );

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "content-type":
            "application/json"
        }
      }
    );
  }
}