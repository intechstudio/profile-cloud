import type { EditorReturnType } from "$lib/types";

export function applyFocus(el: HTMLElement) {
    el.focus();
}

export async function parentIframeCommunication({
    windowPostMessageName,
    dataForParent
}: {
    windowPostMessageName: string;
    dataForParent: any;
}): Promise<EditorReturnType> {
    return new Promise((resolve, reject) => {
        // create a message channel to communicate with the editor in this scope
        const messageChannel = new MessageChannel();
        // let editor know that it should listen for messages on this channel
        window.parent.postMessage(windowPostMessageName, "*", [messageChannel.port2]);
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
