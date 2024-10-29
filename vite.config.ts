import { defineConfig } from "vite";
import path from "path";
import { sveltekit } from "@sveltejs/kit/vite";

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
    },
    envPrefix: "PUBLIC_"
});
