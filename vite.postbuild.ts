import { PluginOption } from "vite";
import { WebSocket } from "ws";

export function notifyEditorAfterBuildPlugin() : PluginOption {
    return {
        name: "postbuild-notify-editor",
        closeBundle: () => new Promise<void>((resolve) => {
            if (process.env.WEB_COMPONENT_NAME && process.env.WEB_COMPONENT_NAME != "profile-cloud-dev"){
                resolve();
            }
            console.log({dir: __dirname});
            let timeout = setTimeout(() => {
                console.log("No connection to Editor, closing websocket connection");
                ws.close();
                resolve();
            }, 3000,);
            let ws = new WebSocket("ws://localhost:9000");
            ws.on("open", () => {
                ws.send({
                    type: "reload-profile-cloud",
                });
                ws.close();
                clearTimeout(timeout);
                resolve();
            })
            ws.on("error", (err) => {
                console.error(err);
                clearTimeout(timeout);
                resolve();
            });
        })
    };
}