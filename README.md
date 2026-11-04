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

Profile Cloud has no sign-in UI. The editor posts `{ event, providerId: "oidc", idToken }` into the web component, and `src/lib/stores.ts` signs that token into Firebase through the `oidc.is-auth` (production) or `oidc.is-auth-dev` (development) provider.

The identity bridge to Logto is console-side: those providers point at Logto's issuer and the `grid-editor` client id, which keeps every Firebase uid without any code here. See decision 27 in the [authentication rework plan](https://github.com/intechstudio/webapps/blob/main/docs/auth-rework-plan.md).
