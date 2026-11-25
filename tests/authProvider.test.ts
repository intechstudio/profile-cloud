import assert from "node:assert/strict";
import { test } from "node:test";
import { providerIdForToken, tokenIssuer } from "../src/lib/authProvider.ts";

function jwt(claims: object) {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part(claims)}.signature`;
}

const firebaseToken = jwt({
  iss: "https://securetoken.google.com/is-api-auth",
});
const keycloakToken = jwt({ iss: "https://idp.example.com/realms/test" });

test("Firebase-issued token keeps today's provider", () => {
  assert.equal(providerIdForToken(firebaseToken, "production"), "oidc.is-auth");
  assert.equal(
    providerIdForToken(firebaseToken, "development"),
    "oidc.is-auth-dev",
  );
  assert.equal(
    providerIdForToken(firebaseToken, undefined),
    "oidc.is-auth-dev",
  );
});

test("any other issuer uses oidc.keycloak in every env", () => {
  assert.equal(
    providerIdForToken(keycloakToken, "production"),
    "oidc.keycloak",
  );
  assert.equal(
    providerIdForToken(keycloakToken, "development"),
    "oidc.keycloak",
  );
});

test("unreadable token falls back to today's provider", () => {
  for (const token of [
    undefined,
    "",
    "not-a-jwt",
    "a.%%%.c",
    `a.${Buffer.from("not json").toString("base64url")}.c`,
    jwt({ sub: "no issuer" }),
    jwt({ iss: 42 }),
    jwt({ iss: "" }),
  ]) {
    assert.equal(providerIdForToken(token, "production"), "oidc.is-auth");
  }
});

test("decodes base64url payloads without padding", () => {
  const token = jwt({ iss: "https://securetoken.google.com/x", n: "~~~" });
  assert.match(token.split(".")[1], /[-_]/);
  assert.notEqual(token.split(".")[1].length % 4, 0);
  assert.equal(tokenIssuer(token), "https://securetoken.google.com/x");
});
