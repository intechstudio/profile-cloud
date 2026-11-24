import assert from "node:assert/strict";
import { test } from "node:test";
import { planLinks, type Account } from "../scripts/keycloak-link-plan.ts";

const options = { legacyProvider: "oidc.legacy", provider: "oidc.new" };

function account(localId: string, legacy?: string, linked?: string): Account {
  const providerUserInfo = [{ providerId: "google.com", rawId: "g" }];
  if (legacy)
    providerUserInfo.push({ providerId: "oidc.legacy", rawId: legacy });
  if (linked) providerUserInfo.push({ providerId: "oidc.new", rawId: linked });
  return { localId, providerUserInfo };
}

test("links a mapped legacy account", () => {
  const plan = planLinks([account("L1", "old1")], { old1: "k1" }, options);
  assert.deepEqual(plan.toLink, [{ localId: "L1", rawId: "k1" }]);
  assert.deepEqual(plan.conflicts, []);
});

test("skips an account already linked to the expected id", () => {
  const plan = planLinks(
    [account("L1", "old1", "k1")],
    { old1: "k1" },
    options,
  );
  assert.deepEqual(plan.toLink, []);
  assert.deepEqual(plan.alreadyLinked, ["L1"]);
});

test("a second run after linking reports everything as already linked", () => {
  const legacy: Record<string, string> = { L1: "old1", L2: "old2" };
  const map = { old1: "k1", old2: "k2" };
  const before = Object.entries(legacy).map(([id, old]) => account(id, old));
  const first = planLinks(before, map, options);
  const after = first.toLink.map(({ localId, rawId }) =>
    account(localId, legacy[localId], rawId),
  );
  const second = planLinks(after, map, options);
  assert.deepEqual(second.toLink, []);
  assert.deepEqual(second.alreadyLinked, ["L1", "L2"]);
});

test("conflict when linked under the provider to a different id", () => {
  const plan = planLinks(
    [account("L1", "old1", "kX")],
    { old1: "k1" },
    options,
  );
  assert.deepEqual(plan.toLink, []);
  assert.deepEqual(
    plan.conflicts.map((c) => c.localId),
    ["L1"],
  );
});

test("counts accounts without a legacy identity", () => {
  const plan = planLinks(
    [account("L1"), { localId: "L2" }, account("L3", undefined, "k3")],
    {},
    options,
  );
  assert.deepEqual(plan.noLegacy, ["L1", "L2", "L3"]);
});

test("lists legacy uids missing from the map by local id", () => {
  const plan = planLinks(
    [account("L1", "old1"), account("L2", "toString")],
    { old2: "k2" },
    options,
  );
  assert.deepEqual(plan.unmapped, ["L1", "L2"]);
  assert.deepEqual(plan.toLink, []);
});

test("conflict when two accounts resolve to the same id", () => {
  const plan = planLinks(
    [account("L1", "old1"), account("L2", "old2"), account("L3", "old3")],
    { old1: "k1", old2: "k1", old3: "k3" },
    options,
  );
  assert.deepEqual(plan.toLink, [{ localId: "L3", rawId: "k3" }]);
  assert.deepEqual(
    plan.conflicts.map((c) => c.localId),
    ["L1", "L2"],
  );
});

test("conflict when the target id is held by another account", () => {
  const plan = planLinks(
    [account("L1", "old1"), account("L2", undefined, "k1")],
    { old1: "k1" },
    options,
  );
  assert.deepEqual(plan.toLink, []);
  assert.deepEqual(
    plan.conflicts.map((c) => c.localId),
    ["L1"],
  );
  assert.match(plan.conflicts[0].reason, /L2/);
});

test("an already-linked account stays linked when another claims its id", () => {
  const plan = planLinks(
    [account("L1", "old1", "k1"), account("L2", "old2")],
    { old1: "k1", old2: "k1" },
    options,
  );
  assert.deepEqual(plan.alreadyLinked, ["L1"]);
  assert.deepEqual(
    plan.conflicts.map((c) => c.localId),
    ["L2"],
  );
});
