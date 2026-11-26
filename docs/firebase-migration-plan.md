# Profile Cloud off Firebase: migration plan

Status: **plan, revised 2026-11-25 after the owner's review; ids and the
handling of the local folder against the cloud decided on 2026-11-26
(sections 4.2 and 4.9). Nothing in this document is built.**

Profile Cloud exists for two things: **sharing configs** and **backing them
up**. The configs a user works with are files in the editor's
`grid-userdata/configs` folder; Profile Cloud holds the copies that are
shared or kept safe.

Today all of it runs on Firebase: configs, users and usernames in Firestore,
pasted images in Storage, a public read API and a daily backup in Functions,
and the app itself on Firebase Hosting. This plan moves it to a service we
run ourselves, in a single cutover.

In short:

- The SvelteKit app in this repo becomes a Node server with a Postgres
  database. One container serves the web page, the web component and a small
  HTTP API.
- Images go to a Cloudflare R2 bucket.
- The client calls the API instead of the Firebase SDK.
- The local folder stays the working copy. While a user is signed in, the
  files that have a cloud copy are kept backed up; nothing else about a file
  depends on the network.
- One script copies the production data from Firebase.
- At the cutover Firebase is closed to customers, the script runs, and the
  new Profile Cloud and a new editor release go out. Downtime in between is
  accepted.

## 1. Ground rules

- **Clean cutover, simple for the team.** Firebase is switched off for
  customers first, then the data is moved, then the new service is released.
  The steps are not squeezed to keep the downtime short: Profile Cloud may
  be unavailable for hours.
- **No legacy support.** Concretely:
  - The API accepts Keycloak tokens only.
  - Every editor older than the release that ships with the cutover loses
    Profile Cloud and shows a notice to update. Local configs keep working
    in those editors.
  - The client has no switch between backends. The Firebase code is deleted
    in the same change that adds the API client.
  - Nothing forwards from the old `*.web.app` addresses, and the old
    Functions URLs and their API key are not kept.
  - There is no way back to Firebase after the release.
- **Where things run.** The service and its Postgres run on Coolify. Images
  are on Cloudflare R2, which is accepted because we are a Cloudflare
  customer already.
- **Same features** for a user on the new editor, with the changes this
  document names.
- **Configs stay linkable.** Their ids change, and old links keep working
  (section 4.2).
- **Offline first.** Saving and editing configs in the local folder is the
  main thing and never depends on the network. The cloud is an extra on top
  (section 4.9).

## 2. Where things stand

Sign-in moved to Keycloak on 2026-11-24. What this plan builds on:

- Keycloak runs at `https://auth.intech.studio/realms/intechstudio`, from
  the `intechstudio/auth` repo. Locally it runs on
  `http://localhost:3001/realms/intechstudio`. There is no hosted dev
  Keycloak.
- grid-editor 1.8.0 signs in there as the public client `grid-editor` and
  has no Firebase code left. It posts its ID token to Profile Cloud on
  sign-in and after every refresh, as `{ messageType: "userAuthentication",
  authEvent: { event: "login", providerId: "oidc", idToken } }`, and
  `{ event: "logout" }` on sign-out.
- Profile Cloud v1.5.10 still runs on Firebase. It signs the editor's token
  into its own Firebase project through one of two providers, picked from
  the token's issuer (`src/lib/authProvider.ts`): `oidc.keycloak` for the
  new editor, `oidc.is-auth` for older editors, which still sign in through
  the old central Firebase project.
- All Profile Cloud data is keyed by the Firebase uid of Profile Cloud's own
  project. That uid is neither the Keycloak id nor the old central uid.
- A one-time script (`scripts/link-keycloak-users.ts`) attached the Keycloak
  id to every existing account: 4,186 accounts, 4,166 linked. The other 20
  have no Keycloak user, because their central account had no email or
  shared one.
- The old central Firebase Auth projects are still alive, only so that older
  editors can sign in.

## 3. What Firebase does today

Profile Cloud is one codebase built two ways: a static single-page app
(`src/routes/`, served at `profile-cloud.web.app`, anonymous and read-only
in a browser) and a custom element (`src/WebComponent.svelte`, built to
`wc/components.js`). The editor loads the element at run time with
`import(<profileCloudUrl>/wc/components.js)` into its own window and talks
to it with `postMessage`. The same element is published to npm as
`@intechstudio/profile-cloud-webcomponent` and bundled into the editor as
the offline fallback.

| Firebase product | Used for | Code |
|---|---|---|
| Firestore `configs` | One live query (public configs, plus the user's own), create and update with a client-made id, publish and unpublish, delete | `src/lib/configmanager/ConfigManager.ts` |
| Firestore `users`, `usernames` | Username, chosen once, 3 to 15 characters, unique; shown on every card | `src/routes/UserLogin.svelte`, `user_account.ts`, `ConfigCardBrowser.svelte`, `ConfigCardDisplay.svelte` |
| Storage | Images pasted into a description, stored under `config_images/<uuid>.<ext>`; the download URL is written into the markdown | `src/routes/ConfigDescription.svelte` |
| Auth | Turns the editor's token into a Firebase session | `src/lib/stores.ts`, `src/lib/authProvider.ts`, `src/lib/firebase.ts` |
| Functions | Three public read endpoints behind an API key (only known caller: the website's `api/grid-configs`), and a daily Firestore export | `functions/src/` |
| Hosting | `profile-cloud.web.app` (tags), `profile-cloud-dev.web.app` (the nightly element, from `main`), pull-request previews | `firebase.json`, `.github/workflows/firebase-hosting-*.yml` |
| Analytics | Initialised, never used | `src/lib/firebase.ts` |

Also in the repo and tied to Firebase: the `/authorize` page with
`GoogleAuth.svelte` (unused since the Keycloak switch), `Configuration.json`
with five hardcoded owner uids that mark the "recommended" and "workflow"
configs, `transfer-configs-to-dev.js`, and a `firestore.rules` file that is
stale. The live Firestore and Storage rules exist only in the console.

## 4. Target

### 4.1 One service

This SvelteKit app switches from `adapter-static` to `adapter-node` and
gains server code:

- `src/routes/v1/**/+server.ts`: the API.
- `src/lib/server/`: database access, token verification, image storage.
- `src/hooks.server.ts`: reads the bearer token, answers CORS, opens the
  database and runs pending migrations at start.

Database access uses Drizzle: the schema is TypeScript next to the zod
schemas, and migrations are plain SQL files applied when the server starts.
`functions/` is deleted.

**About `ssr = false`.** The web component is not affected by server
rendering either way: it is a separate Vite library build, a plain script
the editor imports, and SvelteKit never renders it. The switch only concerns
the page at `/`. That page shares its components with the element, and they
reach for `window` as soon as they load, so it stays client-rendered at the
cutover. With `adapter-node`, server rendering is chosen per route, so pages
added later can be server-rendered without touching the element. The first
candidate is a public page per config (section 4.2).

### 4.2 Ids and links

Decided on 2026-11-26.

**One id.** A config has one UUID. It is the `id` in the local file and the
id of its cloud copy. The separate `cloudId` goes away.

**Who makes it.** The id is made where the config is first written: by the
editor when it writes a new file, as today, and by the client when a config
is created without a folder (the web editor). The server never makes a
config id. Saving to the cloud means "create or replace the config with this
id" (`PUT /configs/:id`), so repeating a save does no harm.

**Migrated configs.** A config copied from Firestore gets a UUID computed
from its Firestore id (UUID version 5 under one fixed namespace). One small
function in `src/lib/` does this, and it is used in three places:

- the migration script, for the new ids;
- the server, which converts any config id in a request that is not a UUID.
  This is what keeps old links working, with no lookup table;
- the client, for local files that still carry a `cloudId`. Such a file
  counts as having the computed id. The file itself gets that id and loses
  `cloudId` the next time it is saved.

**Links** keep their form, `grid-editor://?config-link=<id>`. New links
carry the UUID. Old links carry a Firestore id and still open, in the new
editor.

The cases:

| Case | What happens |
|---|---|
| A file is uploaded for the first time | A cloud copy is created with the file's id |
| It is uploaded again | The cloud copy with that id is replaced |
| A file is uploaded after its cloud copy was deleted | The cloud copy comes back under the same id, private |
| A file is uploaded whose id belongs to someone else's cloud config (a file received from another user) | The server refuses. The client gives the file a new id and uploads it as the user's own |
| One's own cloud config is taken onto a second computer | The file gets the same id, so it lines up with the cloud copy |
| Someone else's config is imported | A copy with a new id, not tied to the original. Imported twice, it gives two files |
| A file with an old `cloudId`, after the cutover | Lines up with its migrated cloud copy through the computed id |
| A file with an old `cloudId` whose cloud copy no longer exists | A local file like any other, under the computed id |
| An old link | Opens the migrated config |

These rules are written as test cases that the client and the migration
script share (task 1).

Later, not part of this migration: a public web page per config, such as
`https://profile-cloud.intech.studio/c/<id>`, server-rendered, with the
name, description and an "Open in Grid Editor" button. That makes a config
shareable as an ordinary web link.

### 4.3 Data model

```sql
users (
  id          uuid primary key,     -- Keycloak user id
  username    text unique,          -- null until chosen; 3..15 characters
  featured    text,                 -- null, 'recommended' or 'workflow'
  created_at  timestamptz not null default now()
);

configs (
  id           uuid primary key,    -- made by the client, the same as in the local file
  owner_id     uuid not null references users(id),
  name         text not null,
  description  text not null default '',
  type         text not null,
  config_type  text not null,       -- 'profile' | 'preset' | 'snippet'
  version      jsonb,               -- {major, minor, patch}
  configs      jsonb not null,      -- the payload; the API does not look inside
  files        jsonb,
  virtual_path text not null default '',
  display_name text,
  public       boolean not null default false,
  created_at   timestamptz not null,
  modified_at  timestamptz not null,               -- set by the client: the modified time of the file this copy came from
  updated_at   timestamptz not null default now(), -- set by the server on every write
  deleted_at   timestamptz,                        -- set when the config is deleted in the panel; null otherwise
  summary      jsonb not null,      -- derived on save: what is inside, in short
  search       tsvector not null    -- derived on save: name, description, script text
);

images (
  id            uuid primary key default uuidv7(),
  owner_id      uuid not null references users(id),
  content_type  text not null,
  size          integer not null,
  created_at    timestamptz not null default now()
);
```

Simpler than in Firestore, as agreed:

- **No access list.** Every config stores `access: [owner]` today and the
  code never writes anything else. Only the owner can change a config.
- **One username table** instead of the `users` and `usernames` documents
  that had to be written together.
- **No hardcoded owner ids.** The five uids in `Configuration.json` become
  the `featured` column, set by the migration and changed later with SQL.

Two columns carry the folder handling of section 4.9:

- **`modified_at`** is the modified time of the file a cloud copy was
  uploaded from. A file with a later time than its cloud copy is uploaded.
- **`deleted_at`** makes a delete soft. A deleted config is left out of
  every list and its link stops working, but the row stays. Deleting also
  makes it private, so a config that is uploaded again under the same id
  comes back private.

### 4.4 Sign-in at the API

The client sends the ID token it got from the editor as
`Authorization: Bearer <token>`. The server verifies it with `jose` against
the realm's published keys: signature, issuer, audience (`grid-editor`) and
expiry. The token's `sub` is the user id. A `users` row is created on the
first signed-in call. Without a token the API serves public data only.

Token lifetime and refresh:

- The realm file sets no lifetime, so Keycloak's default applies, which is
  five minutes (to be confirmed on a decoded token). It will be raised in
  the auth repo; 30 minutes for the `grid-editor` client is the suggested
  starting value.
- Whatever the lifetime, the client handles expiry. The editor already
  refreshes a minute before the token runs out and posts the new one. A
  request that still gets `401`, for example right after the laptop wakes,
  waits for the next token from the editor and is retried once; if none
  comes, the client shows the signed-out state.
- This is tested while building, with the local Keycloak set to a lifetime
  of a minute, and the lifetime is settled from what that shows.

### 4.5 API

All under `/v1`, JSON. A config has the fields of today's `CloudConfigSchema`
without `access`, plus `ownerName` and `featured`, so cards no longer look up
each owner separately. The list returns configs in a light form and a single
config in full; "The list and the detail" below says what each carries.

| Method and path | Sign-in | Does |
|---|---|---|
| `GET /configs` | optional | Public configs plus the caller's own, in light form, with the current `state` (section 4.6). `?owner=<username>` narrows to one owner, `?q=<text>` searches |
| `GET /configs/state` | optional | Only the `state` |
| `GET /configs/:id` | optional | One config in full; used when a config is clicked, loaded, or opened from a link. An old Firestore id is converted (section 4.2) |
| `PUT /configs/:id` | required | Create the config with this id, or replace one's own. Refused with `409` if the id belongs to another user's config. Brings back a deleted config of one's own |
| `PATCH /configs/:id` | required | Publish or unpublish |
| `DELETE /configs/:id` | required | Soft delete one's own (section 4.3) |
| `GET /me` | required | Own user row |
| `PUT /me/username` | required | Choose the username; `409` if taken or already chosen |
| `GET /usernames/:name` | none | Is the name free |
| `POST /images` | required | Upload; answers with the image URL |
| `DELETE /images/:id` | required | Delete one's own |
| `GET /healthz` | none | For monitoring |

**The list and the detail.** Configs load progressively: the list is light,
and the heavy parts of a config come only when it is clicked.

| | When | Carries |
|---|---|---|
| List | the panel opens, Refresh, a search | id, name, type, kind, version, owner, public, folder path, dates (`modifiedAt` and `updatedAt` among them), `summary` |
| Detail | a config is clicked, loaded onto a module, or taken into the local folder | everything: description, payload, files |

It stays one table. Postgres keeps large values (payload, files, a long
description) outside the main row by itself, and a query that does not name
those columns never reads them. So the list is one select of the light
columns joined to `users` for the owner's name, and the detail is one select
of the whole row. Nothing is gained by picking parts out of the payload in
SQL, since Postgres loads the whole value to do it.

Two features read every payload in the list today, and each gets a column
that is derived when a config is saved:

- **The tree shows the presets inside a profile** (`ConfigTree.ts`).
  `summary` holds what the tree needs for that: the presets in a profile
  with their type and name, and the number and size of files. The payload of
  a preset is fetched when it is clicked.
- **Search looks inside scripts**, besides name and description
  (`Filter.ts`). `search` is a Postgres text-search column over those three;
  `?q=` uses it. Local files are still searched in the client.

One function derives both from a config. It lives in `src/lib/` and is used
by the server on every save and by the migration script, so the two cannot
drift.

The client keeps every detail it has loaded in memory, by id and
`updatedAt`. The list carries `updatedAt`, so the client knows when a kept
detail is stale without asking.

Files and descriptions do not get tables of their own. That would only pay
off if a file needed its own identity, for example to be shared alone, and
it can be done later behind the same API.

CORS: the element runs inside the editor's page, so every call is
cross-origin. The API answers `Access-Control-Allow-Origin: *`. That is safe
here because it authenticates by the bearer header only and sets no cookies,
and it removes the need to list editor origins (the desktop editor's page is
a `file://` URL, whose origin is `null`).

Request size: `adapter-node` rejects bodies over 512 KB by default, and a
config with files can be larger than that. The limit is set from the largest
config the dry run finds (section 9), with room to spare.

### 4.6 Noticing changes

Firestore pushed every change into the list. Configs do not change often
enough to justify rebuilding that now, so the first version is deliberately
small:

- The panel has a **Refresh** button that is always there. It reloads the
  cloud list and asks the editor to re-read the local folder (section 4.9).
  A colleague who was told "it is uploaded" presses it and searches.
- The list also loads when the element starts, when the user signs in or
  out, and after the user's own saves and deletes.
- With the list the server returns a `state`: a short value made from the
  number of configs the caller can see and the newest `updated_at` among
  them. Any create, edit, delete, publish or unpublish changes it.
- The client asks `GET /configs/state` when the panel comes into view and
  once a minute while it is open. If the value differs, a dot appears on the
  Refresh button. Nothing reloads by itself.

The path from here, each step replacing one piece and none of them needed
for the cutover:

1. Refresh fetches only the rows changed since the last load, using
   `updated_at`.
2. The once-a-minute question becomes a pushed event.
3. Changes are applied without pressing the button.

### 4.7 Images on R2

Images pasted into descriptions live in a Cloudflare R2 bucket used only by
Profile Cloud. Postgres keeps one small row per image (owner, type, size),
so the API knows who may delete what.

- **Upload.** The client sends the image to `POST /v1/images`. The server
  checks sign-in, type and size (5 MB at most), puts the object into the
  bucket as `<id>.<ext>`, writes the row and answers with the URL. The
  markdown gets that URL.
- **Read.** Straight from the bucket, through a custom domain of ours on
  the bucket, for example `https://profile-cloud-images.intech.studio/<id>.<ext>`.
  The Node server is not involved, and Cloudflare caches. The names are
  unguessable and a public bucket does not list its contents; this is the
  same exposure as today's Firebase download URLs.
- **Delete.** `DELETE /v1/images/:id` removes the object and the row.

**The storage module.** One file, `src/lib/server/images.ts`, is the only
code that knows about R2. It offers `put`, `remove` and `urlFor`, and tests
swap it for an in-memory stand-in. It talks to R2 through the S3-compatible
API with `@aws-sdk/client-s3`, the package Cloudflare documents for this:
endpoint `https://<account id>.r2.cloudflarestorage.com`, region `auto`, an
access key pair. Nothing R2-specific is needed for Drizzle or SvelteKit:
Drizzle only stores the row, and the upload is an ordinary `+server.ts`
route. `aws4fetch` is the lighter alternative Cloudflare also documents.

Why uploads pass through our server instead of going straight to R2 with a
signed URL: a signed upload URL can fix the content type but, per the R2
docs, not the size, it only works on R2's own domain, and it needs CORS
rules on the bucket. Through the server there is one check in one place.
`adapter-node` rejects bodies over 512 KB by default, so `BODY_SIZE_LIMIT`
is raised to cover 5 MB.

Set-up, by the owner in the Cloudflare dashboard:

| What | Value |
|---|---|
| Production bucket | `profile-cloud-images`, public through a custom domain. The domain's zone must be in the same Cloudflare account, which `intech.studio` is |
| Development bucket | `profile-cloud-images-dev`, public through its `r2.dev` address, which Cloudflare rate-limits and allows for development only |
| Credentials | One API token per bucket, permission "Object Read & Write", scoped to that bucket |
| Server env | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `PUBLIC_IMAGE_URL` |

Local development uses the development bucket. R2 can only be imitated
locally inside a Wrangler dev server, which this app does not run.

Cost: the free tier covers 10 GB of storage and millions of requests a
month, and R2 does not charge for downloads.

Backups: images are not in the Postgres backup. A restored database and the
bucket can differ by an image uploaded in between, which shows as a broken
picture at worst. R2 keeps no second copy for us; if one is wanted, it is a
scheduled copy to another bucket.

### 4.8 Client changes

One module, `src/lib/api.ts`, is the only place that calls `fetch`. Its core
is a single `execute()` function that adds the base URL, the headers and the
current token, parses the answer, turns failures into one error type and
does the `401` wait-and-retry. Each endpoint is a small typed function on
top of it.

These files lose their Firebase imports and call the module instead:
`ConfigManager.ts`, `stores.ts` (signing in becomes "keep the token"),
`UserLogin.svelte`, `user_account.ts`, `ConfigCardBrowser.svelte`,
`ConfigCardDisplay.svelte`, `ConfigDescription.svelte`, `schemas.ts`.

Deleted in the same change: `src/lib/firebase.ts`, `collections.ts`,
`authProvider.ts` and its test, `src/routes/authorize/`,
`GoogleAuth.svelte`, `functions/`, `firebase.json`, `firestore.*`,
`transfer-configs-to-dev.js`, the link scripts, the owner ids in
`Configuration.json`, and the `firebase` dependency.

Behaviour that changes:

- What the user does to the cloud on purpose (Upload, publish, unpublish,
  delete, get the cloud version) waits for the server's answer and reports a
  failure. Today these are fired and forgotten.
- What the user does to a file never waits for the network. The cloud copy
  follows in the background (section 4.9).
- Ids work as in section 4.2, and local files meet their cloud copies as in
  section 4.9. The merge by `cloudId` and newer `modifiedAt` in
  `ConfigManager.ts` is removed.
- The list refreshes as in section 4.6.
- Configs load progressively (section 4.5): the list holds light entries, a
  click fetches the detail, the tree builds a profile's presets from
  `summary`, and searching cloud configs asks the server.
- The two type fix-ups done on every read (`potentiometer`, `VSN1`) are
  applied once by the migration and removed.
- The element already refuses editors below a minimum version
  (`WebComponent.svelte`). That constant becomes the cutover editor release.

### 4.9 The local folder and the cloud

Decided on 2026-11-26. The folder comes first: saving and editing configs
offline has to be solid, and the cloud is an extra on top of it.

**Principles**

- The files in `grid-userdata/configs` are the working copy. The cloud holds
  a backup of them and the versions that are shared.
- Saving, renaming, deleting and loading onto a module work from the file
  alone and never wait for the network.
- Being signed in is the switch for backup. Signed out, nothing is sent to
  the cloud.
- A file on one computer is never changed because of what happened on
  another.

**Where a config is.** A config is a file on this computer, a cloud copy, or
both. The two indicators on a list item show exactly that, one for the
computer and one for the cloud. They no longer say which side is newer: the
states "local", "cloud" and "synced" go away. Both indicators lit is the
normal look of a backed-up config, since uploading never removes the file.

**What gives a config a cloud copy**

- It is created in the editor while signed in, as today.
- The user presses Upload on it.

Files that get into the folder any other way (copied from a pendrive,
written by an agent, created while signed out) stay local until Upload is
pressed.

**Keeping the cloud copy up to date.** While signed in, a file that has a
cloud copy of the user's own is uploaded when the file's modified time is
later than the cloud copy's. That one rule covers every way a file changes:
an edit in the editor, an edit by hand or by an agent, and edits made while
signed out, which go up after the next sign-in.

- It is checked when the element starts, at sign-in, when the folder changes
  and on Refresh.
- Uploads go one at a time, and each stores the file's time with the cloud
  copy.
- A failed upload interrupts nothing and is tried again at the next check.
  It shows as one of the editor's log messages.
- Backup only uploads. It never changes or deletes a local file, and it
  never deletes in the cloud.
- A soft-deleted cloud copy does not count as a cloud copy. A file left on
  another computer is not uploaded again unless the user presses Upload.

**The actions**

| Action | The file | The cloud copy |
|---|---|---|
| Create, signed in | Written | Created |
| Create, signed out | Written | None until Upload |
| Edit, rename, overwrite from a module | Written | Follows by the rule above |
| Edit one's own config that is only in the cloud | None | Changed directly, as today |
| Upload | Unchanged | Created or replaced; waits for the server and reports the result |
| Import someone else's config | A new file with a new id | Unchanged |
| Get the cloud version of one's own config | Written with the same id and the cloud copy's time; asks first if a file is already there | Unchanged |
| Delete in the panel | Deleted | Soft deleted: hidden from every list, its link stops working, the row stays in the database |
| Delete the file in the file system | Gone | Kept; the config shows as in the cloud only |
| Load onto a module | Unchanged | Unchanged; works for any config, imported or not |

**Two computers.** There is no merging and no conflict handling. If the same
config is edited on two computers, the later file time wins in the cloud,
and neither computer's file is touched.

**What the editor provides**

- It watches the folder (`startConfigWatcher` in `src/electron/main.ts`) and
  sends the whole list to the element as a `localConfigs` message whenever a
  file is added, changed or removed, as today. Each entry now also carries
  the file's modified time.
- It sets a file's time to the cloud copy's time when the file is written
  from the cloud version. Otherwise a freshly fetched file would look newer
  than its cloud copy and be uploaded straight back.
- It re-reads the folder when the element asks, which is what the Refresh
  button does on the local side.
- It says whether it has file-system access, as one more field in its answer
  to the `profileCloudMounted` message. Without access (the web editor) the
  element is cloud-only: it says so, and it hides what needs a file.

**Files that cause trouble**

- A file the element cannot use, for example one without an id, is skipped
  and named in a message, and the others load. Today one such file makes the
  whole local list fail.
- Two files with the same id give an error in the log that names both. One
  of them is shown, as today.

**First start after the cutover.** A file's modified time is always a moment
later than the timestamp stored inside it, which is what the migrated cloud
copy carries. So every file that has a cloud copy is uploaded once on first
start, with the same content. Nothing changes for the user.

**Not in this migration**

- Loading the bundled element by itself when there is no internet. The
  screen with the "Load Offline" button stays as it is; grid-editor issue
  #1693 keeps the idea.
- A content hash that would skip uploading a file whose time changed but
  whose content did not. It only saves traffic and can be added later as one
  column and one check.
- A folder for the web editor through the browser's directory picker.
- Sending only the changed file from the editor to the element, instead of
  the whole list.

### 4.10 Editor and website

grid-editor, in the release that ships with the cutover:

- `PROFILE_CLOUD_URL_PROD` points at the new host. The nightly address and
  the pull-request preview naming are removed, since those hosts no longer
  exist; the local option stays.
- The URL is also a saved setting (`profileCloudUrl`). On start, a saved
  value equal to an old `*.web.app` address is replaced by the new default.
- What section 4.9 lists under "What the editor provides": the file's
  modified time in the local list, setting that time on a file written from
  the cloud version, re-reading the folder on request, and the file-system
  field.
- The bundled `@intechstudio/profile-cloud-webcomponent` is bumped to the
  API-backed build.
- A notification about the move.

Website: `api/grid-configs` calls `GET /v1/configs?owner=<username>` on the
new host instead of the Function. The hardcoded uid and the two env values
for the Function go away.

### 4.11 Hosting and Docker files

Two environments, as with Vendure: local first in Docker, then `main`.

| | Where | Database | Images |
|---|---|---|---|
| Production | `https://profile-cloud.intech.studio` on Coolify, deployed on every push to `main` | its own Postgres resource on Coolify, with its own scheduled backup | `profile-cloud-images` |
| Local | `http://localhost:5200` | Postgres from the compose file | `profile-cloud-images-dev` |

There is no hosted dev or nightly environment and there are no pull-request
previews. Migrations run when the server starts, so a push to `main` that
changes the schema migrates production on restart. A push to `main` is also
live in every editor at once, because editors load the element at run time;
testing against a real editor locally is the guard.

Files, named as in the auth repo:

| File | For |
|---|---|
| `Dockerfile` | The production image: builds the app and the web component, runs the Node server |
| `docker-compose.yml` | Local development: Postgres, and the app built from the `Dockerfile` when the production image itself is to be tried |
| `docker-compose.hosted.yml` | What Coolify deploys: the app only, every value from Coolify's environment, a health check on `/healthz`. The database is the separate Coolify resource |
| `.dockerignore`, `.env.example` | As usual; `.env.example` lists every variable both compose files read |

The local loop: Keycloak from a checkout of `intechstudio/auth`
(`docker compose up`), Postgres from this repo's compose file, `npm run dev`.
A test user and its token come from the auth repo's helper
(`node e2e/test-user.ts create`, then `token <email> <password>`). API tests
need neither Keycloak nor R2: they sign tokens with a test key and use the
in-memory image store.

Also: `/healthz` is added to the monitor stack in `argus`; the three
`firebase-hosting-*.yml` workflows are removed and the npm publish stays;
a runbook `docs/runbooks/hosted-profile-cloud.md` describes the Coolify
set-up in the style of the Keycloak one.

Until the cutover, `main` keeps deploying the Firebase build. The work lives
on `feat/firebase-migration`, which the Coolify application follows until
then; at the cutover the branch merges and the application follows `main`.

## 5. The migration script

One script, `scripts/migrate-from-firebase.ts`, copies everything. It
follows the conventions of the link script that already ran on production:
plain Node, the operator's own `gcloud` login and no service-account key, a
dry run unless `--commit` is passed, output that shows counts and ids only,
and a `--report` file with the full lists. It reads Firebase with admin
credentials, so it works while the projects are closed to customers.

What it does, in order:

1. **Accounts → users.** Reads every account of the Firebase project (the
   same paged read the link script uses). Each Firebase uid is mapped to a
   Keycloak id:
   - from the account's `oidc.keycloak` identity, which the link run and
     every later Keycloak sign-in wrote;
   - otherwise from its `oidc.is-auth` identity through the uid map file
     kept in the auth checkout (`--uid-map`). This covers people who first
     opened Profile Cloud from an older editor after the link run;
   - otherwise the account has no Keycloak user (the known 20). It is kept
     as a user nobody can sign in to, under an id computed from its
     Firebase uid: its username and public configs stay visible, and
     support can hand it to a real user later with one SQL update.

   Where an account has both identities, the two routes must agree; a
   disagreement is reported and the Keycloak identity wins. Two accounts
   that map to the same Keycloak id are merged into one user; if both have a
   username, the older account's is kept and the case is reported.
2. **Usernames.** `users` and `usernames` documents become the `username`
   column. Inconsistent pairs are reported.
3. **Configs.** Every `configs` document becomes a row: the id computed
   from the Firestore id (section 4.2), timestamps converted, the two type
   fix-ups applied, `access` dropped, owner
   replaced by the mapped id, and `summary` and `search` derived with the
   function the server uses.
4. **Featured owners.** The five uids from `Configuration.json` set
   `featured`. The script stops if one of them has no Keycloak id.
5. **Images.** Every `config_images` URL found in a description is copied
   from Firebase Storage to the R2 bucket under the same uuid, gets its
   row, and is replaced in the markdown by the new URL. An object already
   in the bucket is skipped, so the bulk of the images can be copied before
   the cutover. Images no description refers to are not copied.
6. **Verify.** Counts per collection and per owner against Firestore, a
   checksum over the config payloads, every rewritten image URL answering,
   and the list of everything reported above.

On the Postgres side it insists on an empty database, or empties it with
`--reset`, and writes in one go. There is no incremental mode: every
rehearsal and the real run start from nothing.

Rehearsals load into the production database itself. Before the cutover it
is empty and nothing points at it, so real data can be loaded, looked at
through the production host with a locally built editor, and wiped again.

## 6. Cutover

Before:

- The script has run cleanly against production data at least twice, and
  real accounts have been checked on the production host.
- The editor release and the website change are ready.
- The live Firestore and Storage rules are saved to a file.

Then, with no time pressure between the steps:

1. **Close Firebase to customers.** Publish Firestore and Storage rules
   that deny everything. Admin scripts still read. Deploy one last build to
   the two `*.web.app` hosts that only shows a notice: Profile Cloud is
   moving, update Grid Editor to use it again. This is the one part of an
   installed editor that can still be changed, so it is how every existing
   editor gets told.
2. **Migrate.** Run the script with `--reset --commit`. Check its verify
   output, then sign in on the production host and look at known accounts:
   own private configs, a public config, a link, an image.
3. **Release.** Merge `feat/firebase-migration` to `main` and point the
   Coolify application at `main`. Release the editor. Deploy the website
   change.
4. **Confirm.** In the released desktop editor and the web editor: sign in,
   save, publish, paste an image, see the dot on Refresh after a change
   from a second window, and open a link made before the cutover. In the
   desktop editor, a file that had a cloud copy before the cutover shows
   both indicators. Announce.

Until step 3, backing out means publishing the saved rules and redeploying
the previous build to `*.web.app`. After step 3 there is no return.

Afterwards the Firebase projects stay closed to customers and readable for
admin scripts for as long as the owner wants them. Deleting them is the
owner's step, together with the old central Auth projects, the importer and
its exports (uid map included) as the auth runbook `after-switch.md`
describes, and the Firebase secrets in GitHub and the website's env. Once
the projects are gone, older editors cannot load the element at all.

## 7. Epic and tasks

Epic: **Move Profile Cloud off Firebase.** Done when Profile Cloud runs on
the new service for every user and no repo depends on Firebase.

The project is followed in dex: one epic, the tasks below, and subtasks
added to a task when work on it starts.

How the work is run: agents carry out the tasks, steered by Claude, and
nothing starts without the owner's command. Each task has a brief an agent
can work from and a "done when" that can be checked. The owner reviews a
finished task before anything that needs it begins. There are no time
estimates; the table gives the order and what can run side by side.

| # | Task | Needs | Can run alongside |
|---|---|---|---|
| 1 | Id and backup rules as test cases | | |
| 2 | Server foundation | 1 | |
| 3 | API | 2 | 4, 8 |
| 4 | Image storage on R2 | 2 | 3, 8 |
| 5 | Client on the API | 3, 4 | 7, 8 |
| 6 | Local folder and backup | 5 | 7 |
| 7 | Migration script | 2, 4 | 5, 6, 8 |
| 8 | Hosting | 2 | 3, 4, 5, 7 |
| 9 | Editor release and website | 5, 6 | 10 |
| 10 | Rehearsal on production data | 5, 7, 8 | 9 |
| 11 | Cutover | 9, 10 | |
| 12 | Clean-up | 11 | |

Tasks 10 and 11 are done together with the owner: runs against production,
and the release.

**1. Id and backup rules as test cases.** The decisions are made (sections
4.2 and 4.9). This task writes them down as code the others build on: the
function that computes a UUID from a Firestore id, the function that decides
whether a file is uploaded, and their test cases.
*Done when:* every case in the table of section 4.2 and every row of the
actions table in section 4.9 has a test, and the client and the migration
script use the same id function.

**2. Server foundation.** `adapter-node`; Drizzle schema and first
migration; database opened and migrated at start; token verification;
`/healthz`; `Dockerfile`, both compose files, `.env.example`; README section
for the local loop.
*Done when:* `docker compose up` gives a working local stack, and a request
with a token from the local Keycloak is recognised while a wrong audience, a
wrong issuer and an expired token are refused.

**3. API.** The config, user and username endpoints, the light list and the
full detail, create-or-replace by id, the conversion of old Firestore ids,
soft delete, the function that derives `summary` and `search`, `?q=`, the
`state` value, CORS, zod validation shared with the client.
*Done when:* tests cover ownership (nobody changes another user's config,
and an id that belongs to someone else is refused), what an anonymous caller
sees, username rules, the list never carrying payload, files or description,
search finding a word that occurs only inside a script, `state` changing on
every kind of write, a second save with the same id replacing the first, an
old Firestore id finding its migrated config, and a deleted config being
left out of the list, failing by its link and coming back private when it is
saved again.

**4. Image storage on R2.** The storage module, the two image endpoints, the
body size limit, the buckets, tokens and custom domain.
*Done when:* an image above 512 KB uploaded locally is served from the
development bucket's URL, a wrong type and an oversized file are refused,
and delete removes object and row.

**5. Client on the API.** `src/lib/api.ts` with `execute()`; every Firebase
call site moved; Firebase code, `/authorize` and `functions/` deleted; ids
as in section 4.2; awaited writes for what the user does to the cloud on
purpose; the token expiry handling, tried with a one-minute lifetime; the
Refresh button and its dot; progressive loading
(detail on click, kept by id and `updatedAt`, presets in the tree from
`summary`, server search next to local search); the minimum editor version.
*Done when:* in a local editor the element lists, saves, overwrites,
deletes, publishes, copies a link, loads by drag, sets a username and pastes
an image; cloud entries stay light until clicked, a profile's presets show
in the tree before its payload is fetched, and search finds a word inside a
script both in a cloud config and in a local file; `grep -ri firebase src`
finds nothing.

**6. Local folder and backup.** Section 4.9, in the element and in
grid-editor. In the element: the two indicators with their new meaning, the
upload rule and when it is checked, Upload, import and "get the cloud
version", the soft delete, skipping a file it cannot use, the log error for
two files with one id, and cloud-only mode. In grid-editor: the file's
modified time in the local list, setting that time on a file written from
the cloud version, re-reading the folder on request, and the file-system
field.
*Done when,* in the desktop editor:
- a file added, changed and removed in the folder shows in the list without
  a restart, and Refresh picks up a change as well;
- with no network, a config is saved, renamed, deleted and loaded onto a
  module without waiting;
- a file with a cloud copy that is edited by hand is uploaded while signed
  in, and is not while signed out; after signing in again it is;
- a file put into the folder by hand is not uploaded until Upload is
  pressed;
- an older copy of a config on a second computer is neither uploaded nor
  changed;
- deleting in the panel removes the file and hides the cloud copy, and
  deleting the file in the file system leaves the cloud copy;
- a file without an id is skipped and named while the others load;
- a file that had a cloud copy before the migration shows both indicators;

and the web editor shows cloud-only mode.

**7. Migration script.** Section 5, with the mapping, merge and id rules as
unit tests on made-up accounts, like the link plan's tests.
*Done when:* a dry run prints every count in section 9, and a committed run
into a local database passes its own verify step.

**8. Hosting.** Coolify: the Postgres resource with its backup and one tried
restore, the application from `docker-compose.hosted.yml`, env, domain,
health check, deploy on push; monitoring; the runbook.
*Done when:* the production host serves page, element and API from the
branch against an empty database, and a restored backup serves the same
data.

**9. Editor release and website.** The changes of section 4.10, as pull
requests that stay unmerged until the cutover.
*Done when:* an editor built from the branch works against the production
host, including an install that had the old URL saved, and the website's
list renders from the new API.

**10. Rehearsal on production data.** Run the script against production into
the production database (reads only on the Firebase side; approved for each
run), look at the reports, decide the open cases, repeat after fixes.
*Done when:* two runs in a row need no change to the script, and real
accounts have been checked.

**11. Cutover.** Write `docs/runbooks/cutover.md` from section 6 with the
exact commands, then run it.
*Done when:* the confirm step passes on production.

**12. Clean-up.** README rewritten for the new setup; the auth documents
updated to say Profile Cloud no longer uses Firebase; the list of what the
owner deletes, handed over.
*Done when:* the docs describe only what runs.

## 8. Choices for the owner

Settled in the review: the relational model and its simplifications; images
on R2; a Postgres resource of its own; local and production only; downtime
at the cutover; the request wrapper in the client; no version history.

Settled on 2026-11-26:

- One UUID per config, made by the client, with old Firestore ids converted
  on the server so old links keep working (section 4.2).
- The folder first and the cloud as an extra; sign-in as the switch for
  backup; one upload rule by file time; two indicators and no sync states;
  soft delete in the cloud; a Refresh button (section 4.9).
- Half-finished edits reaching a public config through backup are accepted
  as a minor annoyance.
- Left out on purpose: a content hash, a "differs" mark, a separate backup
  switch, safer file writes in the editor, new ids for duplicate files, and
  loading the offline element automatically (grid-editor issue #1693).

Still open, each with the recommendation the plan assumes:

1. **Moving a deleted local file to the system trash** instead of removing
   it for good, to match the soft delete in the cloud. Raised, not decided;
   the plan assumes the file is removed as today.
2. **Progressive loading** (section 4.5) is written into the plan as
   suggested: a light list, the detail on click, and two derived columns so
   the tree and search keep working. The lighter alternative drops searching
   inside the scripts of cloud configs and with it the `search` column.
3. **Accounts without a Keycloak user** are kept (section 5, step 1).
   Alternative: leave them and their configs out.
4. **Token lifetime:** 30 minutes for the `grid-editor` client, adjusted
   after testing.
5. **Image reads straight from the bucket's custom domain** (section 4.7).
   Alternative: through the API, which hides R2 but puts every image
   through the Node server.
6. **The notice in existing editors comes from a last deploy to
   `*.web.app`** (section 6, step 1). This is my reading of "a notification
   in the editor"; a notification in the new editor release is listed in
   section 4.10 as well.
7. **Usernames stay case-sensitive, as today**, unless the dry run finds no
   two names that differ only by case; then the column becomes
   case-insensitive.
8. **The R2 bucket's location:** default, or EU jurisdiction, which needs a
   different endpoint and has to be chosen when the bucket is created.

## 9. Checks that need production access

All are reads. Each run needs the owner's approval.

- The live Firestore and Storage rules, copied from the console.
- The script's dry run, which reports:
  - accounts in total, mapped by each route, and without a Keycloak user;
    what the latter own (configs, how many public);
  - accounts merged into one user; username conflicts; names that differ
    only by case;
  - configs in total and public, the size of the full list in bytes, and
    the largest single config;
    configs whose `access` is not `[owner]`; configs whose owner has no
    account;
  - whether all five featured uids map;
  - image URLs in descriptions, and objects, total bytes and the largest
    object under `config_images/`.
- Request logs of the three Functions for 30 days: is the website really
  the only caller.

## 10. Risks

- **A wrong owner mapping** would show people the wrong private configs. It
  is derived from identities Firebase holds, checked two ways where
  possible, verified by per-owner counts, and tried with real sign-ins
  before the cutover.
- **Local files and their cloud copies must line up after the id change.**
  They do so through the id computed from the old `cloudId` (section 4.2).
  Task 1 tests the rule and task 6 checks it in a real editor.
- **The file's time decides what is uploaded, not its content.** A file
  that is older in content but newer in time, for example one copied back
  from somewhere or checked out from git, replaces a newer cloud copy. So
  does a file that was emptied or broken. Both are accepted: the file is the
  truth and the cloud follows it.
- **Without sync states, nothing tells a user that a file has no cloud
  copy** beyond the cloud indicator being off. Files that arrive in the
  folder from outside are not backed up until Upload is pressed.
- **Every file with a cloud copy is uploaded once on the first start after
  the cutover** (section 4.9). The content is the same and the files are
  small, but it is a burst of requests on release day.
- **Every desktop user has to update.** The notice says so, the web editor
  needs nothing, and local configs are unaffected.
- **A push to `main` is live everywhere at once**, with no nightly host in
  between. Schema changes and element changes are tried locally against a
  real editor first.
- **Progressive loading changes how the client holds configs.** Today
  every config is complete in memory; afterwards cloud entries are light
  until clicked, while local files stay complete. The merge of the two, the
  tree and search each have to work with both. It is the largest change to
  existing client code, and task 5 is checked against it.
- **Rules nobody has read.** The live rules may allow things the API will
  not, such as editing someone else's config. That tightening is intended.
- **No return after the release.** What makes that acceptable: rehearsals
  on real data, the way out before step 3, and the untouched Firebase copy.

## 11. Where Profile Cloud is heading

Context from the owner, 2026-11-25. **None of this is built in the
migration.** It needs larger editor changes and is its own project. It is
written down because it decides a few things here.

The direction:

- **A whole control surface as one thing.** Today a profile holds one
  module's page config and that page's files. The aim is one saved unit for
  the interconnected surface: all connected modules, their configs and
  their files for the active page, written to a local file and loaded onto
  the modules in one action (one by one underneath, with the existing Grid
  logic). The name is open; "collection" and "surface" are the candidates.
- **A shadow copy.** When a module is unplugged its code is gone from the
  editor. A copy of the last known setup, kept by the editor, would cover
  that.
- **Smaller pieces stay.** Snippets and control element configs remain, and
  a larger config can be opened to take one piece out of it. An
  organisational layer comes on top.
- **No version history.** Undo and redo through stored versions was
  considered and is not wanted.
- **The panel.** A plain list, with the selected config's description in
  its own box beside it, or moved into the configuration panel. An idea, to
  be compared with how other software does it.

What follows for this migration:

- **One row is one self-contained document, shaped like the local file.**
  The server does not interpret the payload, apart from the one function
  that derives the summary and the search text, and the kind of config is a
  plain text field. A surface later is a new kind with a bigger
  payload, not a new table and not a set of references between rows.
- **Identity belongs to the document.** Pieces inside a config are found by
  their place in it, not by ids of their own. The id rules (section 4.2)
  only cover whole documents, and a surface file will get its id the
  same way a profile does.
- **The list should not carry payloads.** Surfaces will be several times
  the size of a profile, and a list with a detail box only needs the
  payload of the selected config. Section 4.5 does this now: a light list,
  and description, payload and files when a config is clicked.
- **The local file is the working copy, the cloud is the share and the
  backup.** Nothing in the API assumes a config exists only in the cloud,
  and the folder handling of section 4.9 is treated as a core feature.
- **No history tables.** One row per config, overwritten on save.
- **The shadow copy is the editor's business.** It should live outside
  `grid-userdata/configs`, or every shadow file would appear in the list.

## Sources

- Sign-in as it runs: `intechstudio/auth` (`README.md`,
  `realm/intechstudio.json`, `importer/uid-map.ts`, `e2e/test-user.ts`);
  grid-editor PR #1687 (`src/electron/auth.ts`,
  `src/renderer/lib/auth.web.ts`); profile-cloud PR #191 and this repo's
  README, "Authentication".
- The config folder: grid-editor `src/electron/main.ts`
  (`startConfigWatcher`), `src/electron/src/profiles.ts`,
  `src/renderer/main/panels/profileCloud/ProfileCloud.svelte`; in this repo
  `src/lib/configmanager/ConfigManager.ts` and
  `src/lib/components/tree/ProfileCloudTreeItem.svelte` (the two
  indicators).
- The offline screen that stays as it is:
  https://github.com/intechstudio/grid-editor/issues/1693
- What was run on production and what still waits for this migration:
  `webapps/docs/auth/runbooks/stage-2.md`, `after-switch.md`,
  `hosted-keycloak.md`.
- SvelteKit `adapter-node` (`BODY_SIZE_LIMIT`, `ORIGIN`): https://svelte.dev/docs/kit/adapter-node
- SvelteKit page options (`ssr` per route): https://svelte.dev/docs/kit/page-options
- Drizzle migrations: https://orm.drizzle.team/docs/migrations
- R2 with the AWS SDK for JavaScript: https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
- R2 public buckets and custom domains: https://developers.cloudflare.com/r2/buckets/public-buckets/
- R2 signed URLs and their limits: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- R2 API tokens: https://developers.cloudflare.com/r2/api/tokens/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- R2 local development: https://developers.cloudflare.com/r2/local-development/
- Identity Toolkit `accounts:batchGet`: https://cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/batchGet
