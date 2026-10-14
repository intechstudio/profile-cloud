import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { sveltePreprocess } from "svelte-preprocess";
import { notifyEditorAfterBuildPlugin } from "./vite.postbuild";
import path from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";

// The host editor only loads components.js, so any CSS vite extracts into a
// separate file (e.g. grid-uikit's splitpanes theme) never reaches the page.
// Vite attaches the extracted CSS to a different output format depending on
// the mode (build vs --watch), so inject it into every entry file after all
// formats are written instead of per bundle.
function injectCssIntoJsPlugin(): Plugin {
  const marker = "/*inject-css-into-js*/";
  let outDir = "";
  let css = "";
  const entryFiles = new Set<string>();
  return {
    name: "inject-css-into-js",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    generateBundle(_, bundle) {
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === "chunk" && file.isEntry) entryFiles.add(name);
        if (file.type === "asset" && name.endsWith(".css")) {
          css = String(file.source);
          delete bundle[name];
        }
      }
    },
    closeBundle() {
      if (!css) return;
      const snippet = `\n${marker};(function(){try{var s=document.createElement("style");s.textContent=${JSON.stringify(css)};document.head.appendChild(s);}catch(e){}})();`;
      for (const name of entryFiles) {
        const file = path.join(outDir, name);
        if (!existsSync(file)) continue;
        const code = readFileSync(file, "utf8");
        if (!code.includes(marker)) writeFileSync(file, code + snippet);
      }
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
