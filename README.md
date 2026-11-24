# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## Authentication

Profile Cloud has no sign-in UI. The editor posts its ID token into the web
component (`userAuthentication` message), and Profile Cloud signs that token
into its own Firebase project (`profile-cloud`, or `profile-cloud-dev`
outside production) with `signInWithCredential`. All Firestore data is keyed
by the Profile Cloud uid.

The OIDC provider is chosen by the token's `iss` claim
(`src/lib/authProvider.ts`):

| Token                       | `iss`                                | Provider                                                   |
| --------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| Firebase (released editors) | `https://securetoken.google.com/...` | `oidc.is-auth` in production, `oidc.is-auth-dev` otherwise |
| Keycloak (new editors)      | anything else                        | `oidc.keycloak`                                            |
| No readable `iss`           |                                      | same as Firebase                                           |

A re-posted token that already signed in the current user is not signed in
again.

### Firebase console

Authentication > Sign-in method > OpenID Connect, in each project:

| Provider id                         | Issuer                                           | Client id     |
| ----------------------------------- | ------------------------------------------------ | ------------- |
| `oidc.is-auth` / `oidc.is-auth-dev` | unchanged                                        | unchanged     |
| `oidc.keycloak`                     | `https://auth.intech.studio/realms/intechstudio` | `grid-editor` |

### Linking existing users to Keycloak

Without a link, a Keycloak sign-in would create a new, empty account.
`scripts/link-keycloak-users.ts` links every existing account to its Keycloak
id under `oidc.keycloak`, using a map of old `is-api-auth` uid to Keycloak id
(`{ "<firebase uid>": "<keycloak id>" }`). Keep the map out of this repo.

Needs Node 24 or later and `gcloud` signed in as a user who can manage Firebase
Auth users in the project. It reads every account, prints counts and local ids
only, and writes nothing unless `--commit` is passed. The first line names the
project.

Dry run against production, with the map at `~/uid-map.json`:

```sh
gcloud auth login
node scripts/link-keycloak-users.ts --project profile-cloud --legacy-provider oidc.is-auth --map ~/uid-map.json
```

Check the counts. "Legacy uid not in map" for most accounts means the map does
not belong to this project: stop. Then link:

```sh
node scripts/link-keycloak-users.ts --project profile-cloud --legacy-provider oidc.is-auth --map ~/uid-map.json --commit --report ~/link-report-profile-cloud.json
```

Running it again is safe: linked accounts report as "Already linked". Exit
code 1 means a conflict or a failed link (listed by local id), 2 means bad
arguments. For `profile-cloud-dev`, use `--project profile-cloud-dev
--legacy-provider oidc.is-auth-dev` with a map of `is-auth-dev` uids.

### Tests

```sh
npm test
```
