# Profile Cloud off Firebase: discovery and plan (phase 2)

Status: **discovery, 2026-11-04.** Nothing in this document is built. It is
the phase-2 counterpart of `webapps/docs/auth-rework-plan.md` (phase 1,
"auth"), whose section 7 only sketched what follows. Decisions settled there
are taken as given and referenced by number (D1..D30).

Constraints given for this work:

- full data ownership;
- hosted on Coolify, open-source services only;
- authentication is stage one and is already in progress (Logto, phase 1);
- feature parity;
- mature technology.

## 1. How profile-cloud works inside grid-editor

Profile-cloud is one codebase built two ways from the same Svelte sources:

| Build | Entry | Output | Consumer |
|---|---|---|---|
| SvelteKit static SPA (`ssr=false`) | `src/routes/+page.svelte` | `public/` | `profile-cloud.web.app` web browser mode (anonymous, read-only) and the `/authorize` Google page |
| Svelte custom element | `src/WebComponent.svelte` | `public/wc/components.js` (CORS `*`), and `npm-package/dist` as `@intechstudio/profile-cloud-webcomponent` | grid-editor |

grid-editor loads the custom element with a dynamic `import(<profileCloudUrl>/wc/components.js)`
into its **own window** (no iframe, `shadow: "none"`), see
`src/renderer/main/panels/profileCloud/ProfileCloud.svelte`. The URL comes
from the persisted app setting `profileCloudUrl`, defaulting to
`PROFILE_CLOUD_URL_PROD` / `_DEV` / `_LOCAL` in grid-editor's
`configuration.json`. The element name (`profile-cloud-prod|nightly|pr|dev|offline`)
is inferred from the URL. If the import fails, the editor offers the
`profile-cloud-offline` element bundled from the npm package.

Communication is `window.postMessage` in both directions:

- editor → profile-cloud: plain messages with `messageType` in
  `{updateFontSize, localConfigs, userAuthentication, configLink,
  selectedComponentTypes, compatibleTypes, configDragTargetChange}`
  (`EditorLayout.svelte: editorMessageListener`).
- profile-cloud → editor: request/response over a `MessageChannel`
  (`src/lib/utils.ts: parentIframeCommunication`), names
  `profileCloudMounted, configImportCommunication, deleteLocalConfig,
  showConfigInFolder, getCurrenConfigurationFromEditor, loginToProfileCloud,
  logoutFromProfileCloud, createCloudConfigLink, submitAnalytics,
  provideSelectedConfigForEditor, sendLogMessage, openExternalLink,
  configDragChange, showOverlay`.

What each side owns:

- **grid-editor** owns the user session (Firebase Auth today, Logto after
  phase 1), the local config files (`~/Documents/grid-userdata/configs/*.json`,
  watched and pushed as `localConfigs`), reading/writing the device
  (`getCurrenConfigurationFromEditor`, drag-to-load), analytics (Mixpanel),
  and the deep links `grid-editor://?credential=` and `grid-editor://?config-link=`.
- **profile-cloud** owns the cloud data (Firestore + Storage), the merged
  view of local + cloud configs (`src/lib/configmanager/ConfigManager.ts`,
  last-write-wins on `modifiedAt`, linked by `cloudId`), the tree UI, and
  the username flow.

The identity hand-off: the editor posts `{event: "login", providerId: "oidc",
idToken}`; profile-cloud exchanges that token for a session in **its own**
Firebase project through the console-configured OIDC provider
`oidc.is-auth(-dev)` (`src/lib/stores.ts: authenticateUser`). The resulting
`uid` is project-local and is the key for all data (`owner`, `access[]`,
`users/{uid}`). Phase 1 keeps this bridge (D27) so phase 2 inherits the
re-keying problem; see section 3.

## 2. Firebase inventory

### 2.1 profile-cloud repo

| Product | Where | What |
|---|---|---|
| Firestore `configs` | `ConfigManager.ts` | One realtime query: `public == true OR access array-contains uid` (`onSnapshot`); `setDoc` create/update with client-generated id; `updateDoc {public}`; `deleteDoc`. Schema `src/lib/schemas.ts: CloudConfigSchema` (`id, name, description, type, version{major,minor,patch}, configType profile/preset/snippet, configs (any), files[], owner, access[], public, virtualPath, displayName, createdAt, modifiedAt`). |
| Firestore `users`, `usernames` | `UserLogin.svelte: setUserName`, `checkIfUsernameAvailable`; `user_account.ts: getUserNameByUid`; `ConfigCardBrowser.svelte`, `ConfigCardDisplay.svelte` (owner name lookup per card) | `users/{uid} = {username}`, `usernames/{name} = {uid}` written in one batch; rules enforce uniqueness and length 3..15. |
| Storage | `ConfigDescription.svelte: handlePaste` | Pasted images uploaded to `config_images/<uuid>.<ext>`; the tokenised download URL is written into the markdown `description`; deleted if the placeholder was removed before upload finished. |
| Auth | `src/lib/stores.ts`, `src/lib/firebase.ts` | Federated sign-in via `OAuthProvider("oidc.is-auth")`; no accounts of its own. |
| Analytics | `src/lib/firebase.ts` | `getAnalytics` initialised, **never used** (events go to the editor's Mixpanel via `submitAnalytics`). |
| Functions (europe-west3) | `functions/src/publicCloudQueries.ts` | `readAllProfiles`, `readUserProfiles`, `readSingleProfile`: public configs, select-listed fields, behind `X_INTECHSTUDIO_KEY` secret. Only known caller: website `apps/website/src/routes/api/grid-configs/+server.ts` (owner id `eePyy59w5KXLy0wkvqsv1iPmLUh1`, 1h in-memory cache). |
| Functions | `functions/src/firestoreBackup.ts` | Daily export of all collections to `gs://profile-cloud-firestore-backup`. |
| Hosting | `firebase.json`, `.github/workflows/firebase-hosting-*.yml` | `profile-cloud.web.app` (tags), `profile-cloud-dev.web.app` (main; built with `PUBLIC_APP_ENV=production`, D30), PR previews (`profile-cloud-dev--pr…`, 30 d). CORS `*` on `wc/**`. SPA rewrite. Rules and functions deployed by hand. |
| Tooling | `transfer-configs-to-dev.js` | Copies public configs and users prod → dev with Anonymous auth on dev. |
| Config | `Configuration.json` | Five profile-cloud-local uids marking "official" and "workflow" owners. |

Not in the repo (console only): live `firestore.rules` (the committed one
is stale: it covers `profiles`/`profileLinks`, not `configs`), Storage rules,
the OIDC provider, Anonymous auth on dev, the hash parameters, the backup
bucket retention.

### 2.2 grid-editor repo

Auth only (`src/renderer/lib/firebase.js`, `auth.store.ts`, `user.store.ts`,
the `user-authentication` modals, `/authorize` round trip via `main.ts`
deep link). All of it is removed by phase-1 slice 5 (branch
`feat/auth-logto`, in review): main-process `openid-client` code + PKCE,
refresh token in `safeStorage`, renderer gets `{event, providerId: "oidc",
idToken}` and forwards it unchanged to profile-cloud. **grid-editor has no
Firebase left after slice 5.** Nothing else in the editor touches Firebase:
packages come from GitHub, updates from GitHub releases, the web build is
served from Cloudflare Workers static assets (`wrangler.jsonc`).

Editor-side things phase 2 still has to touch:

- `configuration.json`: `PROFILE_CLOUD_URL_PROD/DEV` and the
  `profile-cloud-dev--pr` substring used for element naming
  (`ProfileCloud.svelte`).
- The persisted `profileCloudUrl` app setting on every existing install
  (points at `*.web.app`).
- `PROFILE_CLOUD_EMAIL_REGISTRATION` (website `/auth`, already changing in
  phase 1).

### 2.3 Other consumers

- website `api/grid-configs` (above).
- Public config links `grid-editor://?config-link=<cloudId>` in the wild:
  config ids must survive.
- `@intechstudio/profile-cloud-webcomponent` on npm (offline fallback) is
  the same code: after phase 2 it talks to the new API when online.

## 3. Identity after phase 1, and the re-key

Phase 1 ends with Logto as the only identity provider. `sub` equals the old
**central** uid (D4). Profile-cloud data, however, is keyed by the
**profile-cloud-project-local** uid, which Firebase minted when the central
token was federated in. D27 keeps that mapping alive by repointing the OIDC
provider at Logto, so phase 1 needs no data change.

Phase 2 removes the profile-cloud Firebase project, so the data must be
re-keyed from local uid to Logto `sub`. The mapping is deterministic and
exportable: `firebase auth:export` of the `profile-cloud` project lists, per
local user, `providerUserInfo[].rawId` for provider `oidc.is-auth`, and that
`rawId` is the central uid = Logto user id. Users without such an entry
(dev Anonymous users, anything pre-dating the OIDC bridge) own data that
cannot be attributed; they are counted in the pre-checks and decided then.

Everything keyed by local uid has to move together: `configs.owner`,
`configs.access[]`, `users/{uid}`, `usernames/{name}.uid`,
`Configuration.json` (five ids), the website constant in `grid-configs`.

## 4. Requirements mapped to parity

| Today | Must hold after | Notes |
|---|---|---|
| Public configs browsable without login (editor and web) | yes | public read endpoints without auth |
| Own private configs; make public/private; delete | yes | owner-only writes (the stale rules let any signed-in user update any doc; the new API will not) |
| Username, unique, 3..15 chars, shown on cards | yes | one row with a unique index replaces the two-document batch |
| List updates live (other device, someone publishing) | yes | push notifications + delta pull, section 6.4 |
| Pasted images in descriptions | yes | served from our own host; existing Storage URLs rewritten at migration |
| Config links by id | yes | ids preserved |
| Local/cloud merge, offline element | unchanged | lives in profile-cloud + editor, no Firebase involved |
| Public read API for the website | yes | same three queries, same key header |
| Daily backup | yes | `pg_dump` schedule |
| dev and prod environments; PR previews of the element | yes | section 6.6 |
| Firebase Analytics | dropped | unused |
| `transfer-configs-to-dev.js` | replaced | dump/restore of public rows |

## 5. Technology evaluation

Requirements: Postgres-class durability, OIDC token verification against
Logto, per-row access control, a change feed for one query, small binary
uploads, a public read API, runs as one or two containers on Coolify, OSS
licence, boring to upgrade.

| Candidate | Licence | Fit | Why not / caveats |
|---|---|---|---|
| **SvelteKit `adapter-node` + Postgres** (own code, this repo) | MIT / PostgreSQL | All requirements; the framework is already here, so SPA, web component and API ship as one container; `+server.ts` routes, `handle` hook for auth and CORS, `init` hook for the pool and migrations; the website in webapps already runs this shape | ~1.5k lines to write and own; no admin UI (use `psql`); no built-in WebSocket in the node adapter (SSE is used instead) |
| Fastify + Postgres service | MIT / PostgreSQL | Same stack as `apps/hq-api`; schema validation and plugins (`@fastify/cors`, `multipart`, `websocket`) | A second framework, build and deploy artifact in a repo that already has SvelteKit; duplicates static and CORS concerns. Set aside after review |
| PocketBase | MIT | Closest feature match (realtime, files, rules, OIDC login, admin UI, backups) in one binary | **Pre-1.0**, single maintainer, breaking releases documented as expected; SQLite only; fails "mature" |
| Supabase self-hosted | Apache-2.0 | Realtime, storage, RLS, Postgres | 10+ containers (Kong, GoTrue, PostgREST, Realtime, Storage, Studio); own auth to bridge to Logto; heavy on Coolify for one collection |
| Payload CMS 3 | MIT | Collections, access control, uploads, admin UI, REST; team has Payload experience | No realtime (polling or custom SSE); Next.js runtime; auth strategy for Logto is custom code anyway |
| PostgREST + RLS | MIT | Mature, JWKS verification, policies in SQL | No change feed, no uploads, logic in SQL policies; still needs a side service, so two things instead of one |
| Hasura v2 | Apache-2.0 | Subscriptions, JWT auth | v2 in maintenance, v3 is a different product; GraphQL for one table |
| ElectricSQL / PowerSync | Apache-2.0 / FSL (not OSS) | Sync engines | No offline persistence to preserve, so the complexity buys nothing; PowerSync licence excluded |
| Directus | BSL 1.1 | Rich | Not an OSS licence; excluded |
| Object storage (MinIO, Garage, SeaweedFS) | AGPL / AGPL / Apache | S3 for images | Not needed at this volume; images fit in Postgres and ride the same backup. Revisit if uploads grow beyond a few GB |

**Recommendation:** turn this SvelteKit app into the service. Switch to
`adapter-node`, add the API as `+server.ts` routes, keep the UI pages
client-rendered as today, store images as `bytea` served by the API, drive
the SSE change feed from Postgres `LISTEN/NOTIFY`, and ship one container
that serves the SPA, `wc/components.js` and the API. Every component is
mature, already in the team's stack, and nothing holds user data outside the
Coolify Postgres.

### 5.1 Database layer

SvelteKit recommends no ORM. Its scaffolding CLI integrates one: `sv add
drizzle` sets up Drizzle with Postgres, MySQL or SQLite. The docs only say to
keep the client under `$lib/server`.

| Candidate | Fit in a Vite-built server | Notes |
|---|---|---|
| **Drizzle** (`drizzle-orm`, `drizzle-kit`) | No decorators, no build config; migrations generated as plain SQL and applied at startup | Schema in TypeScript next to the zod schemas; `drizzle-zod` can derive them. `citext` and `bytea` need a `customType` each (a few lines). Matches the official `sv add` integration |
| TypeORM (as in hq-api) | Decorator entities depend on `emitDecoratorMetadata`, which esbuild does not emit; columns need explicit `type` or an swc Vite plugin | Viable with `EntitySchema` object definitions instead of decorators; `DataSource` as a singleton from the `init` hook. Years on 0.3.x, maintenance picked up again in 2025 |
| Kysely | Fine | Type-safe query builder only, own migration runner; good if SQL-first is preferred |
| Plain `pg` + `node-pg-migrate` | Fine | Five tables, a dozen endpoints; the most boring option, zod at the boundary |
| Prisma | Fine | Own schema language and generator step; more than this needs |

**Decision D-P2.11:** Drizzle. Second choice if consistency with hq-api
wins: TypeORM with `EntitySchema`, never the decorator path in this build.

## 6. Target architecture

### 6.1 Components

| Component | Runs where | Notes |
|---|---|---|
| `profile-cloud` (this app, `adapter-node`) | Coolify, one container, image built from this repo | Serves the SPA (`/`), the web component (`/wc/`), and the API (`/v1/`). Routes in `src/routes/v1/**/+server.ts`; database, token verification and the change feed in `src/lib/server/`; `handle` hook for bearer auth and CORS; `init` hook opens the Drizzle/`pg` pool, runs migrations, starts `LISTEN`. `/healthz` for the argus monitor stack |
| Database `profile_cloud` (`profile_cloud_dev`) | Existing Postgres server on Coolify (the one `auth`/`auth-dev` use) | own role, direct 5432, same backup routine as `logto_auth` |
| Web component build | unchanged Vite lib build (`vite.config.webcomponent.ts`) | output moves to `static/wc/` so the node server serves it; the CORS header now set in `firebase.json` moves to the `handle` hook |
| Logto | already planned | API resource registration optional, section 6.3 |

Repository: everything stays in this repo. `functions/` is deleted; server
code lives in `src/lib/server/` and `src/routes/v1/`; the zod schemas in
`src/lib/schemas.ts` are imported by routes and client alike with no package
plumbing. Alternative considered: a separate service in `webapps/apps/`,
rejected because it splits one product across two repos and two deploys.

Node adapter specifics: `BODY_SIZE_LIMIT` defaults to 512 KB and must be
raised to cover the 5 MB image cap; `ORIGIN` must be set so the server knows
its public URL behind the Coolify proxy; keep `ssr = false` on the UI routes
(they talk to the editor through `window`), the API routes are server-only
by nature.

### 6.2 Data model

Authored as a Drizzle schema in `src/lib/server/db/schema.ts`; `drizzle-kit
generate` turns it into the SQL migrations under `drizzle/`, applied by
`migrate()` from the `init` hook. `citext` and `bytea` are `customType`
definitions. The equivalent SQL:

```sql
users (
  id          text primary key,           -- Logto sub (= old central uid)
  username    citext unique,              -- null until chosen; 3..15 enforced in API
  created_at  timestamptz not null default now()
);

configs (
  id           text primary key,          -- existing Firestore ids preserved
  owner_id     text not null references users(id),
  name         text not null,
  description  text not null default '',
  type         text not null,             -- ElementType | ModuleType | 'snippet'
  config_type  text not null check (config_type in ('profile','preset','snippet')),
  version      jsonb,                     -- {major,minor,patch} as strings
  configs      jsonb not null,            -- payload, opaque to the API
  files        jsonb,                     -- [{name,content,mimeType?}]
  virtual_path text not null default '',
  display_name text,
  public       boolean not null default false,
  created_at   timestamptz not null,
  modified_at  timestamptz not null,
  seq          bigint generated always as identity  -- change cursor
);
create index on configs (public) where public;
create index on configs (owner_id);
create index on configs (seq);

config_access (                            -- parity with access[]; today always [owner]
  config_id text references configs(id) on delete cascade,
  user_id   text references users(id),
  primary key (config_id, user_id)
);

images (
  id         uuid primary key,
  owner_id   text not null references users(id),
  mime       text not null,
  bytes      bytea not null,               -- cap 5 MB per image in the API
  created_at timestamptz not null default now()
);
```

Type normalisations done today at read time (`potentiometer → potmeter`,
`VSN1 → VSN1L`, `ConfigManager.ts: configsUpdated`) are applied once at
import and the shims deleted.

### 6.3 Authentication at the API

- Bearer token on every non-public call. First iteration verifies the Logto
  **ID token** with `jose` against the issuer's JWKS: `iss`, `exp`,
  signature, `aud ∈ {grid-editor client ids}`; `sub` is the user. This is the
  same contract Vendure uses (D26, phase-1 slice 2) and needs **no change to
  the editor or to the postMessage payload** (slice 5 already resends on
  every refresh).
- Upgrade path, not required for parity: register a Logto API resource
  (indicator is permanent, choose it once, e.g.
  `https://profile-cloud.intech.studio/api`), have the editor request an
  access token for it, and add `accessToken` to the postMessage payload.
  Needed only if scopes or a non-editor client ever call the API.
- Web browser mode stays anonymous and read-only (it is today). A Logto SPA
  login for the web mode is a feature, not parity.
- `users` row is created on first authenticated call (`sub`, no username),
  which mirrors Firebase creating the local user on first sign-in.

### 6.4 API surface

Prefix `/v1`. JSON. `Config` shape equals `CloudConfigSchema` with
`owner`, `access[]` derived.

| Method and path | Auth | Replaces |
|---|---|---|
| `GET /configs?since=<seq>` | optional | the `onSnapshot` query: public ∪ accessible-to-me; `since` returns only rows changed after the cursor plus a list of deleted ids (kept in a small `config_tombstones` table or via `deleted_at`) |
| `GET /configs/:id` | optional | single read, used by config links |
| `PUT /configs/:id` | required | `setDoc`: create if absent (owner = caller) or update if caller is owner or in access; client-generated id kept |
| `PATCH /configs/:id {public}` | required | `updateDoc` |
| `DELETE /configs/:id` | required | `deleteDoc`, owner or access |
| `GET /events` (SSE) | optional | change notifications `{seq, id, op}`; client follows with `GET /configs?since=`; reconnect with `Last-Event-ID` |
| `GET /me` | required | `users/{uid}` |
| `PUT /me/username` | required | the two-doc batch; `409` if taken |
| `GET /usernames/:name` | none | availability check (`404`/`204`) |
| `GET /users/:id` | none | `{username}` for cards (batch variant `?ids=` to replace the per-card `getDoc`) |
| `POST /images` (multipart), `GET /images/:id`, `DELETE /images/:id` | required / none / owner | Storage; `GET` sends long cache headers and the stored mime |
| `GET /public/configs`, `/public/users/:id/configs`, `/public/configs/:id` | `X_INTECHSTUDIO_KEY` header, as today | the three Functions, same select-listed fields; `userId` may also be a username |
| `GET /healthz` | none | monitoring |

Change feed: `EventSource` cannot send `Authorization`, so the client uses
`fetch` with a streamed body (a 40-line helper) or the API accepts a
short-lived signed stream token from `GET /events/token`. Private events are
only delivered to the authenticated stream; the anonymous stream carries
public changes. Polling every 30 s with the same `since` cursor is the
fallback when the stream is down, which also covers the offline element.

CORS (Firebase hid this): the element runs in the editor's origin, so the
API must allow `https://grid-editor.app`, `https://stable.grid-editor.app`,
`https://pr-*-grid-editor.intechstudio.workers.dev`, the Electron renderer
origin (`file://` → `Origin: null`; verify on the slice-5 build), the web
dev origins, and the profile-cloud web origin. `Authorization` triggers a
preflight on every call; cache it with `Access-Control-Max-Age`.

### 6.5 Client changes in profile-cloud

Introduce one seam, `src/lib/cloud/`:

- `CloudBackend` interface: `subscribe(uid?) → stream of Config[]`,
  `save`, `setPublic`, `delete`, `getUsername(ids)`, `setUsername`,
  `usernameAvailable`, `uploadImage`, `deleteImage`, `setToken(idToken|null)`.
- `firebase.ts` implementation: the code that exists today, moved behind the
  interface, selected by `PUBLIC_CLOUD_BACKEND=firebase`.
- `api.ts` implementation: REST + SSE, selected by
  `PUBLIC_CLOUD_BACKEND=api` with `PUBLIC_API_URL`.

Call sites to route through the seam: `ConfigManager.ts`,
`UserLogin.svelte`, `user_account.ts`, `ConfigCardBrowser.svelte`,
`ConfigCardDisplay.svelte`, `ConfigDescription.svelte`, `stores.ts`
(`authenticateUser` becomes "hold the token", no sign-in call). The
postMessage protocol with the editor does not change. The env switch gives
a one-line rollback for the first release after cutover; the Firebase
implementation and dependency are deleted in the decommission slice.

Behaviour changes worth stating: writes are awaited and errors surfaced via
`sendLogMessage` (today `setDoc` is fire-and-forget); the list refreshes
from the `since` cursor after a write instead of waiting for the snapshot.

### 6.6 Hosting, environments, CI

| | Today | After |
|---|---|---|
| prod API | Firebase project `profile-cloud` | `https://profile-cloud.intech.studio` (API) on Coolify, db `profile_cloud` |
| dev API | `profile-cloud-dev` (prod data copy) | `https://profile-cloud-dev.intech.studio`, db `profile_cloud_dev`, seeded from a public-rows dump |
| local | dev project | repo-root `docker compose` (Postgres) + `npm run dev` next to the `apps/auth` Logto stack; `PUBLIC_API_URL=http://localhost:5200` (same origin as the dev server) |
| static prod | `profile-cloud.web.app` | same container: `https://profile-cloud.intech.studio` serves `/`, `/wc/` and `/v1/` |
| static dev / PR | `profile-cloud-dev.web.app`, `…--pr<n>` previews | dev container on `profile-cloud-dev.intech.studio`; PR previews via Coolify preview deployments (one container per PR, hostname pattern `pr-<n>.profile-cloud-dev.intech.studio`, pointed at `profile_cloud_dev`); untested for us, fallback is Workers static previews of the element only, pointed at the dev API |
| deploy | `firebase deploy` by hand for rules/functions, Action for hosting | one image build per push (dev) and per tag (prod); Drizzle migrations run from the `init` hook at container start |
| backups | daily Firestore export | nightly `pg_dump -Fc` of `profile_cloud` to the same place `logto_auth` dumps go (argus) |

Hosts stay under `intech.studio` so cookies and CORS stay first-party where
it matters, and so the editor's URL-based element naming has stable
substrings (`-dev`, `pr-`) to key on.

Editor side: update `PROFILE_CLOUD_URL_PROD/DEV`, replace the
`profile-cloud-dev--pr` substring check, and on startup migrate a persisted
`profileCloudUrl` equal to either old `*.web.app` value to the new default.
Until the Firebase project is deleted, Firebase Hosting serves a one-line
`wc/components.js` that imports the new URL, so editors that have not
updated keep working.

## 7. Decisions to take (phase 2)

Recommendations are first; the alternative is noted.

- **D-P2.1 Backend:** this SvelteKit app on `adapter-node` + Postgres
  (section 5). Alternatives: a separate Fastify service (set aside after
  review), PocketBase if "mature" is relaxed.
- **D-P2.2 Repo:** everything in this repo (`src/lib/server/`,
  `src/routes/v1/`). Alternative: a separate service in `webapps/apps/`.
- **D-P2.3 Token:** verify Logto ID tokens, `aud` = grid-editor client ids;
  no editor change. Alternative: Logto API resource + access token (adds a
  field to slice 5's payload; decide before slice 5 merges if wanted).
- **D-P2.4 Static hosting:** the same container serves SPA, web component
  and API; PR previews through Coolify preview deployments. Alternative:
  Workers static assets for the element with version previews (proven in
  grid-editor), pointed at the dev API.
- **D-P2.5 Images:** Postgres `bytea`, 5 MB cap, served by the API.
  Alternative: Garage/MinIO when volume justifies it.
- **D-P2.6 Change feed:** SSE + `since` cursor, 30 s polling fallback.
  Alternative: polling only (parity loss: cross-device updates delayed).
- **D-P2.7 Public API key:** keep `X_INTECHSTUDIO_KEY` on `/public/*` for
  parity; the data is public anyway, so the key is rate-limit hygiene.
- **D-P2.8 Orphaned data:** rows owned by local uids with no Logto mapping
  (count unknown until the export) are imported with `owner = null`,
  hidden unless public, and listed for manual review. Alternative: drop.
- **D-P2.9 Official owners:** replace the five hardcoded uids in
  `Configuration.json` and the website constant by usernames resolved
  through the API, so ids never need hardcoding again.
- **D-P2.10 Write freeze at cutover:** short (hours) announced freeze versus
  a delta re-import by `modifiedAt`. Recommendation: delta re-import, no
  freeze; unsynced local files re-upload on the next save anyway.

## 8. Plan

Ordered after the phase-1 slices it depends on. Slice letters avoid
collision with phase-1 numbers. Each slice has an acceptance line and is
testable on the local stack (`apps/auth` Logto + this repo's compose).

| Slice | Repo | Depends on | Rough size |
|---|---|---|---|
| A. Server side (adapter-node, Drizzle, `/v1` routes) | profile-cloud | local Logto (phase-1 slice 1) | 4..6 days |
| B. Client seam + API backend | profile-cloud | A | 3..5 days |
| C. Migration tooling + dev rehearsal | profile-cloud (`scripts/migrate/`) | A, exports (user action) | 2..3 days |
| D. Hosting, CI, editor URLs | profile-cloud, grid-editor, Coolify | A, B | 2..3 days |
| E. Public API, website, backups, monitoring | profile-cloud, webapps, argus | A, D | 1..2 days |
| F. Cutover | runbook | phase-1 slice 8 done, C rehearsed, D, E | 1 day + 1 rehearsal |
| G. Decommission | profile-cloud, grid-editor, Firebase console | F confirmed, retention passed | 1 day |

### Slice A: server side

- `@sveltejs/adapter-node` replaces `adapter-static`; UI routes keep
  `ssr = false`. Web component build output moved to `static/wc/`.
- `src/lib/server/db/`: Drizzle schema (6.2), `drizzle.config.ts`,
  generated migrations in `drizzle/`, pool + `migrate()` + `LISTEN` started
  from the `init` hook in `hooks.server.ts`.
- `hooks.server.ts` `handle`: bearer extraction, `jose` JWKS verification
  against `OIDC_ISSUER` with `OIDC_ALLOWED_AUDIENCES` into `event.locals.user`,
  CORS allow-list from `CORS_ORIGINS` (preflight answered here, the `/wc/`
  CORS header too).
- `src/routes/v1/**/+server.ts`: all endpoints of 6.4, zod-validated bodies
  from `src/lib/schemas.ts`, SSE as a streamed `Response`, multipart images
  with size and mime checks, `/public/*` with the key, `/healthz`.
- `docker-compose.yml` (Postgres + app), `Dockerfile`, `.env.example`
  (`DATABASE_URL`, `OIDC_*`, `CORS_ORIGINS`, `PUBLIC_API_KEY`, `ORIGIN`,
  `BODY_SIZE_LIMIT`), README.
- Tests: endpoint tests (Vitest) calling the route handlers or a running
  preview against a throwaway Postgres: ownership, visibility of public vs
  private, username uniqueness and length, `since` cursor including deletes,
  audience rejection, image round trip above 512 KB.
- Acceptance: with the local Logto, a token from the slice-5 editor build
  (or a token minted by the seed M2M for tests) can create, list, publish,
  and delete a config; an anonymous call sees only public rows; SSE delivers
  the change within a second.

### Slice B: client seam and API backend

- `src/lib/cloud/` as in 6.5; Firebase code moved behind the interface
  unchanged; API implementation with fetch-streamed SSE and the polling
  fallback; token held from the editor's `userAuthentication` message;
  `getUsername` batched; image upload through the API; `firebase.ts`
  analytics removed.
- Delete `transfer-configs-to-dev.js`; add `scripts/dump-public.ts`.
- Acceptance: the local editor (slice-5 branch, `VITE_PROFILE_CLOUD_URL`
  pointing at a local dev build with `PUBLIC_CLOUD_BACKEND=api`) shows the
  same tree, save/overwrite/delete/publish, link copy, drag-to-load, username
  set, image paste, as the Firebase build; switching the env back to
  `firebase` restores today's behaviour with no other change.

### Slice C: migration tooling

Inputs (all **user action** or run only with explicit approval for that
run, as in phase-1 D23): Firestore export of `configs`, `users`,
`usernames` (use the existing daily export in the backup bucket, or an
Admin SDK read); `firebase auth:export` of the **profile-cloud** project
(for the local uid → `sub` map); a listing of `config_images/` in Storage.

`scripts/migrate/` (run with `tsx`, reusing the Drizzle schema from
`src/lib/server/db/`):

1. `map-users.ts`: local uid → `sub` from `providerUserInfo` where
   `providerId == "oidc.is-auth"`; report unmapped uids and the rows they
   own (D-P2.8).
2. `import.ts`: idempotent upsert; `Timestamp → timestamptz`;
   `access[] → config_access`; type normalisation; `users` + `usernames` →
   `users` (conflicts reported, not resolved silently); download every
   `firebasestorage.googleapis.com/…/config_images/…` URL found in
   `description`, store it, rewrite the markdown URL to `/v1/images/<id>`;
   `--dry-run`, resumable, counts at the end.
3. `verify.ts`: row counts per collection, per-owner counts, checksum of
   `configs` payloads, sample of rewritten descriptions, list of images
   referenced but missing.
4. `rekey-config.ts`: prints the new ids for `Configuration.json` and the
   website constant (until D-P2.9 removes them).

Acceptance: rehearsal against the `profile-cloud-dev` export into
`profile_cloud_dev`; the editor on the slice-5 branch, signed into hosted
`auth-dev` as an imported user, lists their configs with images rendering
from the new host.

### Slice D: hosting, CI, editor

- Coolify: `profile-cloud-dev` then `profile-cloud` services (one
  container from the repo's `Dockerfile`; Postgres shared), roles and
  databases as in the Logto runbook, env (`DATABASE_URL`, `OIDC_ISSUER`,
  `OIDC_ALLOWED_AUDIENCES`, `CORS_ORIGINS`, `PUBLIC_API_KEY`, `ORIGIN`,
  `BODY_SIZE_LIMIT`), domains, health check on `/healthz`. Runbook under
  `docs/runbooks/hosted-profile-cloud.md` in the style of `hosted-logto.md`.
- Coolify preview deployments enabled on the dev service (D-P2.4);
  workflows replace the three `firebase-hosting-*.yml` with image build and
  Coolify deploy webhooks; a PR preview must serve SPA, element and API.
- grid-editor: new URLs in `configuration.json`, element naming by the new
  substrings, persisted-setting migration, `README` origins list for the
  Logto seed (CORS list and `GRID_EDITOR_WEB_REDIRECT_URIS` now share the
  same origins; keep them in one place).
- Old-host shim prepared (one-line `components.js`), deployed at cutover.
- Acceptance: dev element loaded from the new dev host inside a nightly
  editor build; a PR preview URL loads as `profile-cloud-pr`.

### Slice E: public API, website, backups, monitoring

- Website `api/grid-configs`: new endpoint URL and key env names; owner by
  username (D-P2.9).
- Nightly `pg_dump` for `profile_cloud` added to the existing backup routine;
  restore tested once on dev.
- `/healthz` added to the argus monitor stack; alert on SSE connection
  count dropping to zero during editor hours is optional.
- Acceptance: website profile list renders from the new API in dev; a
  restored dump on dev serves the editor.

### Slice F: cutover (runbook)

Pre-conditions: phase-1 slice 8 confirmed (Logto is live and the editor
release that sends Logto tokens is out), C rehearsed twice on dev, D and E
deployed to prod with empty data.

1. Prod exports (Firestore, Storage listing, profile-cloud `auth:export`):
   **user action**. Import into `profile_cloud`, `verify.ts` clean.
2. Deploy static with `PUBLIC_CLOUD_BACKEND=api` to the new prod host;
   deploy the old-host shim on Firebase Hosting; publish the editor release
   with the new URLs (or ship the URL change one release earlier so only
   the static flip remains).
3. Smoke: imported user with private configs, public browse anonymous,
   config link from the website, image rendering, username change, website
   `grid-configs`.
4. Delta: re-run `import.ts` once more for rows with `modifiedAt` after the
   export timestamp (D-P2.10).
5. Rollback until confirmed: redeploy static with `PUBLIC_CLOUD_BACKEND=firebase`
   (the Firebase project is untouched by the import); editor needs nothing.
   Rows written to Postgres in between are re-exported into Firestore by the
   reverse of `import.ts` only if the rollback lasts; otherwise they wait
   for the second attempt.

### Slice G: decommission

After the retention window agreed in F (suggest 30 days of clean operation):

- profile-cloud: delete `src/lib/cloud/firebase.ts`, `firebase.ts`,
  `collections.ts`, `functions/`, `firebase.json`, `firestore.*`, the
  `firebase` dependency, the old workflows; stop publishing the shim.
- grid-editor: nothing left after slice 5 plus D.
- Console (**user action**): disable Firestore and Storage writes first,
  export a final archive to cold storage we own, then delete the
  `profile-cloud` and `profile-cloud-dev` projects and the backup bucket;
  remove the `FIREBASE_SERVICE_ACCOUNT_PROFILE_CLOUD*` GitHub secrets and
  `X_INTECHSTUDIO_KEY` from Secret Manager.

## 9. Pre-checks that need prod access (user action or approved run)

- Live `firestore.rules` and Storage rules from the console, to confirm the
  access model in 6.4 matches what is enforced today, not the stale file.
- Counts: `configs` total / public / per owner, `users`, `usernames`,
  Storage objects and total bytes under `config_images/`, largest object.
- `auth:export` of the profile-cloud project: how many local users lack an
  `oidc.is-auth` identity (D-P2.8), how many have none at all.
- Whether any caller other than the website uses the three Functions
  (Cloud Functions request logs for 30 days).
- The Electron renderer `Origin` on the slice-5 build, for the CORS list.
- Which Postgres server and backup routine host `logto_auth`, so
  `profile_cloud` follows it (the Logto runbook has the same `TODO(user)`).

## 10. Risks

- **Re-key correctness** is the only irreversible-looking step; it is fully
  derived from the auth export, dry-run and verified, and the Firebase side
  is untouched until G.
- **Unknown live rules** may allow behaviour the new API tightens (any
  signed-in user editing any config). Expected to be fine; confirmed by the
  pre-check.
- **CORS and Electron origin**: new surface Firebase absorbed. Caught in
  slice B/D acceptance on the real editor build.
- **Change feed on the Coolify proxy**: SSE needs no buffering on Traefik;
  the polling fallback covers a misconfiguration.
- **Timing with phase 1:** phase 2 cannot cut over before phase-1 slice 8,
  because the API verifies Logto tokens. Slices A..E can be built and
  rehearsed in parallel with phase-1 slices 5..7 on the local stack.
- **Persisted editor setting** pointing at `*.web.app`: covered by the
  setting migration and the shim.

## 11. Not changing

The editor ↔ profile-cloud message protocol, the local-file merge and
`cloudId` linking, config ids and deep-link formats, the element delivery
mechanism, the offline npm package, the UI.

## Sources

- Phase 1: `webapps/docs/auth-rework-plan.md`, `webapps/apps/auth/runbooks/hosted-logto.md`
- grid-editor slice 5: branch `feat/auth-logto` (`src/electron/auth.ts`, `src/shared/auth-provider.ts`)
- Firebase auth export format: https://firebase.google.com/docs/cli/auth
- Firestore export/import: https://firebase.google.com/docs/firestore/manage-data/export-import
- Logto API resources: https://docs.logto.io/authorization/api-resources
- SvelteKit `adapter-node` (`BODY_SIZE_LIMIT`, `ORIGIN`): https://svelte.dev/docs/kit/adapter-node
- SvelteKit server hooks (`handle`, `init`): https://svelte.dev/docs/kit/hooks
- SvelteKit `sv add drizzle`: https://svelte.dev/docs/cli/drizzle
- Drizzle Postgres `customType`, migrations: https://orm.drizzle.team/docs/custom-types ; https://orm.drizzle.team/docs/migrations
- TypeORM `EntitySchema` (decorator-free entities): https://typeorm.io/docs/entity/separating-entity-definition
- PocketBase stability statement: https://pocketbase.io/faq/
- Coolify compose and preview deployments: https://coolify.io/docs/knowledge-base/docker/compose
