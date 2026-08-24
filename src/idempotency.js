const DEFAULT_TTL_SECONDS = 300;

const MIN_TTL_SECONDS = 1;
const MAX_TTL_SECONDS = 86400;
const MAX_KEY_LENGTH = 256;
const MAX_VALUE_BYTES = 32768;

function jsonResponse(
  body,
  status = 200,
  extraHeaders = {}
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "content-type":
          "application/json; charset=utf-8",

        "cache-control":
          "no-store",

        ...extraHeaders
      }
    }
  );
}

function normalizeKey(value) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
}

function validTtl(value) {
  return (
    Number.isInteger(value) &&
    value >= MIN_TTL_SECONDS &&
    value <= MAX_TTL_SECONDS
  );
}

function serializedSize(value) {
  try {
    return new TextEncoder()
      .encode(
        JSON.stringify(value)
      ).length;
  } catch {
    return Infinity;
  }
}


/*
========================================================
IDEMPOTENCY STORE
========================================================
*/

export class IdempotencyStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async reserve(
    key,
    value,
    ttlSeconds =
      DEFAULT_TTL_SECONDS
  ) {
    const normalizedKey =
      normalizeKey(key);

    if (
      !normalizedKey ||
      normalizedKey.length >
        MAX_KEY_LENGTH
    ) {
      return {
        accepted: false,
        error:
          "INVALID_IDEMPOTENCY_KEY"
      };
    }

    if (
      !validTtl(ttlSeconds)
    ) {
      return {
        accepted: false,
        error:
          "INVALID_IDEMPOTENCY_TTL"
      };
    }

    if (
      serializedSize(value) >
      MAX_VALUE_BYTES
    ) {
      return {
        accepted: false,
        error:
          "IDEMPOTENCY_VALUE_TOO_LARGE"
      };
    }

    const existing =
      await this.state.storage.get(
        normalizedKey
      );

    if (existing) {
      return {
        accepted: false,
        existing
      };
    }

    const record = {
      ...(
        value &&
        typeof value ===
          "object"
          ? value
          : {}
      ),

      createdAt: Date.now()
    };

    await this.state.storage.put(
      normalizedKey,
      record,
      {
        expirationTtl:
          ttlSeconds
      }
    );

    return {
      accepted: true,
      existing: null
    };
  }

  async get(key) {
    const normalizedKey =
      normalizeKey(key);

    if (
      !normalizedKey ||
      normalizedKey.length >
        MAX_KEY_LENGTH
    ) {
      return null;
    }

    return this.state.storage.get(
      normalizedKey
    );
  }
}


/*
========================================================
DURABLE OBJECT
========================================================
*/

export class IdempotencyDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;

    this.store =
      new IdempotencyStore(
        state,
        env
      );
  }

  async fetch(request) {
    const url =
      new URL(
        request.url
      );

    /*
    ----------------------------------------------------
    ROUTING
    ----------------------------------------------------
    */

    if (
      url.pathname !==
      "/reserve"
    ) {
      return jsonResponse(
        {
          error:
            "Not found"
        },
        404
      );
    }

    /*
    ----------------------------------------------------
    METHOD
    ----------------------------------------------------
    */

    if (
      request.method !==
      "POST"
    ) {
      return jsonResponse(
        {
          error:
            "Method not allowed"
        },
        405,
        {
          allow: "POST"
        }
      );
    }

    /*
    ----------------------------------------------------
    CONTENT TYPE
    ----------------------------------------------------
    */

    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    if (
      !contentType
        .toLowerCase()
        .startsWith(
          "application/json"
        )
    ) {
      return jsonResponse(
        {
          error:
            "Content-Type must be application/json"
        },
        415
      );
    }

    /*
    ----------------------------------------------------
    BODY
    ----------------------------------------------------
    */

    let body;

    try {
      body =
        await request.json();
    } catch {
      return jsonResponse(
        {
          error:
            "Invalid JSON"
        },
        400
      );
    }

    if (
      !body ||
      typeof body !==
        "object" ||
      Array.isArray(body)
    ) {
      return jsonResponse(
        {
          error:
            "Request body must be an object"
        },
        400
      );
    }

    /*
    ----------------------------------------------------
    IDEMPOTENCY KEY
    ----------------------------------------------------
    */

    const key =
      normalizeKey(
        body.key
      );

    if (!key) {
      return jsonResponse(
        {
          error:
            "Missing idempotency key"
        },
        400
      );
    }

    if (
      key.length >
      MAX_KEY_LENGTH
    ) {
      return jsonResponse(
        {
          error:
            "Idempotency key too long"
        },
        400
      );
    }

    /*
    ----------------------------------------------------
    TTL
    ----------------------------------------------------
    */

    const ttlSeconds =
      body.ttlSeconds ===
      undefined
        ? DEFAULT_TTL_SECONDS
        : Number(
            body.ttlSeconds
          );

    if (
      !validTtl(
        ttlSeconds
      )
    ) {
      return jsonResponse(
        {
          error:
            "Invalid TTL"
        },
        400
      );
    }

    /*
    ----------------------------------------------------
    VALUE
    ----------------------------------------------------
    */

    const value =
      body.value ??
      {};

    if (
      serializedSize(value) >
      MAX_VALUE_BYTES
    ) {
      return jsonResponse(
        {
          error:
            "Idempotency value too large"
        },
        413
      );
    }

    /*
    ----------------------------------------------------
    RESERVE
    ----------------------------------------------------
    */

    try {
      const result =
        await this.store.reserve(
          key,
          value,
          ttlSeconds
        );

      if (
        result.error ===
        "INVALID_IDEMPOTENCY_KEY"
      ) {
        return jsonResponse(
          result,
          400
        );
      }

      if (
        result.error ===
        "INVALID_IDEMPOTENCY_TTL"
      ) {
        return jsonResponse(
          result,
          400
        );
      }

      if (
        result.error ===
        "IDEMPOTENCY_VALUE_TOO_LARGE"
      ) {
        return jsonResponse(
          result,
          413
        );
      }

      /*
      --------------------------------------------------
      DUPLICATE
      --------------------------------------------------
      */

      if (
        result.accepted ===
        false
      ) {
        return jsonResponse(
          result,
          200
        );
      }

      /*
      --------------------------------------------------
      FIRST RESERVATION
      --------------------------------------------------
      */

      return jsonResponse(
        result,
        200
      );
    } catch {
      /*
      Fail closed. Never report a reservation
      as successful when persistence failed.
      */

      return jsonResponse(
        {
          accepted: false,
          error:
            "IDEMPOTENCY_STORAGE_ERROR"
        },
        503
      );
    }
  }
}