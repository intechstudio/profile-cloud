// Links existing Profile Cloud users to their Keycloak id so a Keycloak
// sign-in lands on the same account. Dry run unless --commit is passed.
// Usage: see README, "Authentication".
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { planLinks, type Account, type UidMap } from "./keycloak-link-plan.ts";

const PAGE_SIZE = 1000;
const CONCURRENCY = 4;
const ALREADY_LINKED_ERROR = "FEDERATED_USER_ID_ALREADY_LINKED";

const { values: args } = parseArgs({
  options: {
    project: { type: "string" },
    "legacy-provider": { type: "string" },
    provider: { type: "string", default: "oidc.keycloak" },
    map: { type: "string" },
    commit: { type: "boolean", default: false },
    report: { type: "string" },
  },
});

if (!args.project) fail("--project is required");
const project = args.project;
console.log(`Project: ${project}`);

const legacyProvider = args["legacy-provider"];
const provider = args.provider;
if (!legacyProvider) fail("--legacy-provider is required");
if (!args.map) fail("--map is required");
if (legacyProvider === provider) fail("--legacy-provider equals --provider");

console.log(`Mode: ${args.commit ? "commit" : "dry run, nothing is written"}`);
console.log(`Legacy provider: ${legacyProvider}`);
console.log(`Provider: ${provider}`);

const uidMap = readMap(args.map);
const accessToken = execFileSync("gcloud", ["auth", "print-access-token"], {
  encoding: "utf8",
}).trim();

const accounts = await listAccounts();
const plan = planLinks(accounts, uidMap, { legacyProvider, provider });

console.log("");
console.log(`Accounts: ${accounts.length}`);
console.log(`To link: ${plan.toLink.length}`);
console.log(`Already linked: ${plan.alreadyLinked.length}`);
console.log(`No legacy identity: ${plan.noLegacy.length}`);
console.log(`Legacy uid not in map: ${plan.unmapped.length}`);
printIds(plan.unmapped);
console.log(`Conflicts: ${plan.conflicts.length}`);
for (const c of plan.conflicts) console.log(`  ${c.localId}: ${c.reason}`);

const linked: string[] = [];
const linkedElsewhere: string[] = [];
const failed: { localId: string; error: string }[] = [];

if (args.commit) {
  const queue = [...plan.toLink];
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        await api("/accounts:update", {
          localId: item.localId,
          linkProviderUserInfo: { providerId: provider, rawId: item.rawId },
        });
        linked.push(item.localId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith(ALREADY_LINKED_ERROR)) {
          linkedElsewhere.push(item.localId);
        } else {
          failed.push({ localId: item.localId, error: message });
        }
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log("");
  console.log(`Linked: ${linked.length}`);
  console.log(
    `Target id already linked to another account: ${linkedElsewhere.length}`,
  );
  printIds(linkedElsewhere);
  console.log(`Failed: ${failed.length}`);
  for (const f of failed) console.log(`  ${f.localId}: ${f.error}`);
}

if (args.report) {
  const report = {
    project,
    legacyProvider,
    provider,
    commit: args.commit,
    accounts: accounts.length,
    toLink: plan.toLink.map((item) => item.localId),
    alreadyLinked: plan.alreadyLinked,
    noLegacy: plan.noLegacy,
    unmapped: plan.unmapped,
    conflicts: plan.conflicts,
    linked,
    linkedElsewhere,
    failed,
  };
  writeFileSync(args.report, JSON.stringify(report, null, 2) + "\n");
  console.log(`Report: ${args.report}`);
}

const problems = plan.conflicts.length + linkedElsewhere.length + failed.length;
process.exit(problems > 0 ? 1 : 0);

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

function printIds(ids: string[]) {
  for (const id of ids) console.log(`  ${id}`);
}

function readMap(path: string): UidMap {
  const map = JSON.parse(readFileSync(path, "utf8"));
  if (typeof map !== "object" || map === null || Array.isArray(map)) {
    fail(`${path}: expected an object of uid -> Keycloak id`);
  }
  for (const value of Object.values(map)) {
    if (typeof value !== "string" || !value) {
      fail(`${path}: every value must be a non-empty string`);
    }
  }
  return map;
}

async function api(path: string, body?: object, query?: URLSearchParams) {
  const url = new URL(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(project)}${path}`,
  );
  if (query) url.search = query.toString();
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "x-goog-user-project": project,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  return json;
}

async function listAccounts() {
  const all: Account[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ maxResults: String(PAGE_SIZE) });
    if (pageToken) query.set("nextPageToken", pageToken);
    const page = await api("/accounts:batchGet", undefined, query);
    all.push(...(page.users ?? []));
    pageToken = page.nextPageToken || undefined;
  } while (pageToken);
  return all;
}
