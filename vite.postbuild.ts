import { PluginOption } from "vite";
import { WebSocket } from "ws";

export function notifyEditorAfterBuildPlugin(): PluginOption {
  return {
    name: "postbuild-notify-editor",
    closeBundle: () =>
      new Promise<void>((resolve) => {
        console.log("notify start");
        if (
          process.env.WEB_COMPONENT_NAME &&
          process.env.WEB_COMPONENT_NAME != "profile-cloud-dev"
        ) {
          resolve();
        }
        let timeout = setTimeout(() => {
          console.log("No connection to Editor, closing websocket connection");
          ws.close();
          resolve();
        }, 3000);
        let ws = new WebSocket("ws://localhost:9000");
        ws.on("open", () => {
          console.log("Websocket message sent!");
          ws.send(
            JSON.stringify({
              type: "developer-package",
              event: "components-build-complete",
              id: "profile-cloud",
              rootPath: __dirname,
            }),
          );
          ws.close();
          clearTimeout(timeout);
          resolve();
        });
        ws.on("error", (err) => {
          console.error(err);
          clearTimeout(timeout);
          resolve();
        });
      }),
  };
}
