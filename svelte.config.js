import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/kit/vite";
import { preprocessMeltUI, sequence } from "@melt-ui/pp";

const config = {
    kit: {
        // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
        // If your environment is not supported or you settled on a specific environment, switch out the adapter.
        // See https://kit.svelte.dev/docs/adapters for more information about adapters.
        adapter: adapter({
            pages: "public",
            assets: "public",
            fallback: "index.html",
            precompress: false
        }),
        prerender: { entries: ["*"] }
    },
    preprocess: sequence([
        // ... other preprocessors
        vitePreprocess(),
        preprocessMeltUI() // add to the end!
    ]),
    compilerOptions: {
        customElement: true
    },
    files: {
        lib: "src/lib"
    }
};

export default config;
