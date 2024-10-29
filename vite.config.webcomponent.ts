import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { sveltePreprocess } from "svelte-preprocess";

export default defineConfig({
    plugins: [
        svelte({
            preprocess: sveltePreprocess({
                postcss: {},
                replace: [
                    ["WEB-COMPONENT-NAME", process.env.WEB_COMPONENT_NAME ?? "profile-cloud-dev"]
                ]
            }),
            compilerOptions: {
                customElement: true
            },
            emitCss: false
        })
    ],
    build: {
        sourcemap: true,
        target: "modules",
        lib: {
            entry: "src/WebComponent.svelte",
            name: "<<name>>",
            fileName: "components"
        },
        outDir: "public/wc",
    },
    envPrefix: "PUBLIC_"
});
