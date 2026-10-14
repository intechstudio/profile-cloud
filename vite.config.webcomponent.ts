import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { sveltePreprocess } from "svelte-preprocess";
import { notifyEditorAfterBuildPlugin } from "./vite.postbuild";
import path from "path";

// The host editor only loads components.js, so any CSS vite extracts into a
// separate file (e.g. grid-uikit's splitpanes theme) never reaches the page.
function injectCssIntoJsPlugin(): Plugin {
  return {
    name: "inject-css-into-js",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const cssFiles = Object.keys(bundle).filter((k) => k.endsWith(".css"));
      const css = cssFiles
        .map((k) => (bundle[k] as { source: string }).source)
        .join("\n");
      if (!css) return;
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk" && chunk.isEntry) {
          chunk.code += `\n;(function(){try{var s=document.createElement("style");s.textContent=${JSON.stringify(css)};document.head.appendChild(s);}catch(e){}})();`;
        }
      }
      cssFiles.forEach((k) => delete bundle[k]);
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      // svelte-splitpanes (pulled in transitively via grid-uikit's
      // GridSplitpanes) imports the SvelteKit-only $app/environment module;
      // this build isn't a SvelteKit app, so shim it. Same pattern as
      // grid-uikit's own demo and grid-editor's renderer config.
      "$app/environment": path.resolve(
        __dirname,
        "src/app-environment-shim.ts",
      ),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: "resolve-app-environment",
          setup(build) {
            build.onResolve({ filter: /^\$app\/environment$/ }, () => ({
              path: path.resolve(__dirname, "src/app-environment-shim.ts"),
            }));
          },
        },
      ],
    },
  },
  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        replace: [
          [
            "web-component-name",
            process.env.WEB_COMPONENT_NAME ?? "profile-cloud-dev",
          ],
        ],
      }),
      compilerOptions: {
        customElement: true,
      },
      emitCss: false,
    }),
    injectCssIntoJsPlugin(),
    notifyEditorAfterBuildPlugin(),
  ],
  build: {
    sourcemap: true,
    target: "esnext",
    lib: {
      entry: "src/WebComponent.svelte",
      name: "profile-cloud-offline",
      fileName: "components",
    },
    outDir:
      process.env.WEB_COMPONENT_NAME == "profile-cloud-offline"
        ? "npm-package/dist"
        : "public/wc",
  },
  envPrefix: "PUBLIC_",
});
