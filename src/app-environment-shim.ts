// Shim for $app/environment (a SvelteKit-only module) so svelte-splitpanes
// resolves outside SvelteKit. The webcomponent build is plain Vite, not a
// SvelteKit app, so this module doesn't exist there otherwise.
export const browser = true;
export const building = false;
export const dev = import.meta.env.DEV;
export const version = "";
