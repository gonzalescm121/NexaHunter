import test from "node:test";
import assert from "node:assert/strict";
import {
  IdempotencyDurableObject
} from "../src/idempotency.js";

function makeState() {
  const values = new Map();

  return {
    storage: {
      async get(key) {
        return values.get(key);
      },
      async put(key, value) {
        values.set(key, value);
      },
      async delete(key) {
        return values.delete(key);
      }
    }
  };
}

async function reserve(instance, key) {
  const response = await instance.fetch(
    new Request("https://idempotency/reserve", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        key,
        value: { order: "paper" }
      })
    })
  );

  return {
    status: response.status,
    body: await response.json()
  };
}

test("durable idempotency rejects the same key twice", async () => {
  const state = makeState();
  const instance = new IdempotencyDurableObject(state, {});

  const first = await reserve(instance, "order-1");
  const second = await reserve(instance, "order-1");

  assert.equal(first.status, 200);
  assert.equal(first.body.accepted, true);
  assert.equal(second.status, 200);
  assert.equal(second.body.accepted, false);
  assert.equal(second.body.existing.order, "paper");
});

test("durable idempotency survives a reconstructed object instance", async () => {
  const state = makeState();

  const firstInstance =
    new IdempotencyDurableObject(state, {});
  const secondInstance =
    new IdempotencyDurableObject(state, {});

  const first = await reserve(
    firstInstance,
    "restart-order"
  );

  const replay = await reserve(
    secondInstance,
    "restart-order"
  );

  assert.equal(first.body.accepted, true);
  assert.equal(replay.body.accepted, false);
});

test("different idempotency keys remain independent", async () => {
  const state = makeState();
  const instance = new IdempotencyDurableObject(state, {});

  const first = await reserve(instance, "order-a");
  const second = await reserve(instance, "order-b");

  assert.equal(first.body.accepted, true);
  assert.equal(second.body.accepted, true);
});

test("invalid idempotency keys fail closed", async () => {
  const state = makeState();
  const instance = new IdempotencyDurableObject(state, {});

  const response = await instance.fetch(
    new Request("https://idempotency/reserve", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        key: ""
      })
    })
  );

  assert.equal(response.status, 400);
});
