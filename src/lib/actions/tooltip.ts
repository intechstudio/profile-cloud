import type { Action } from "svelte/action";

export const tooltip: Action<HTMLElement, any> = (node: HTMLElement, options: any): void => {
    if (typeof options === "undefined") {
        return;
    }

    const setTooltipAsync = async () => {
        const sibling = document.createElement("div");
        node.parentNode?.insertBefore(sibling, node.nextSibling);

        const MoltenTooltip = (await import("@intechstudio/grid-uikit")).MoltenTooltip;

        options.referenceElement = node;

        new MoltenTooltip({
            target: sibling,
            props: options
        });
    };
    setTooltipAsync();
};
