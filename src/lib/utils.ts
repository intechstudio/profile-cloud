import type { EditorReturnType } from "./types";
import { ModuleType } from "@intechstudio/grid-protocol";

export function applyFocus(el: HTMLElement) {
  el.focus();
}

/**
 * Module-type-level compatibility, e.g. for profile overwrite/load and the
 * config tree's module grouping. VSN1L and VSN1R share a profile format and
 * are treated as interchangeable; every other module type must match exactly.
 * Not for element/preset compatibility - use grid.is_element_compatible_with
 * for that, since a module match doesn't imply per-element event support.
 */
export function isModuleTypeCompatible(a: ModuleType, b: ModuleType): boolean {
  const vsn1Modules = [ModuleType.VSN1L, ModuleType.VSN1R];
  if (vsn1Modules.includes(a)) {
    return vsn1Modules.includes(b);
  }
  return a === b;
}

export async function parentIframeCommunication({
  windowPostMessageName,
  dataForParent,
}: {
  windowPostMessageName: string;
  dataForParent: any;
}): Promise<EditorReturnType> {
  return new Promise((resolve, reject) => {
    // create a message channel to communicate with the editor in this scope
    const messageChannel = new MessageChannel();
    // let editor know that it should listen for messages on this channel
    window.parent.postMessage(windowPostMessageName, "*", [
      messageChannel.port2,
    ]);
    // we listen for messages on this channel
    messageChannel.port1.onmessage = ({ data }) => {
      messageChannel.port1.close();
      if (data.ok) {
        resolve(data);
      } else {
        reject(data);
      }
    };
    // send the data to the editor
    messageChannel.port1.postMessage(dataForParent);
  });
}
