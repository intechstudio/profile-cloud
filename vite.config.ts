import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    plugins: [sveltekit()],
    server: {
        fs: {
            allow: [
                path.resolve(__dirname, "src"),
                path.resolve(__dirname, "node_modules"),
                path.resolve(__dirname) // Add the root directory to the allow list
            ]
        }
    }
});

/*import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { sveltePreprocess } from "svelte-preprocess";

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
      compilerOptions: {
        customElement: true,
      },
      emitCss: false,
    }),
  ],
  build: {
    sourcemap: true,
    target: "modules",
    lib: {
      entry: "src/main.js",
      name: "<<name>>",
      fileName: "components",
    },
  },
});*/
