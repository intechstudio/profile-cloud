<script lang="ts">
    import { getContext, onMount } from "svelte";
    import DisplayOnWeb from "../lib/components/DisplayOnWeb.svelte";
    import { parentIframeCommunication } from "../lib/utils";
    import { compareSemVer } from "semver-parser";
    import EditorLayout from "./EditorLayout.svelte";
    import BrowserLayout from "./BrowserLayout.svelte";

    const display = getContext("display");
    let isEditorVersionCompatible = true;

    async function profileCloudMounted() {
        return await parentIframeCommunication({
            windowPostMessageName: "profileCloudMounted",
            dataForParent: {
                environment: import.meta.env.PUBLIC_APP_ENV
            }
        });
    }

    onMount(async () => {
        let editorVersionResponse = await profileCloudMounted();
        if (
            editorVersionResponse.data &&
            compareSemVer(editorVersionResponse.data, "1.2.45") >= 0
        ) {
            isEditorVersionCompatible = true;
        } else {
            isEditorVersionCompatible = false;
        }
    });
</script>

<section class="w-full h-full flex-grow bg-neutral-100 dark:bg-primary">
    <div class="w-full min-h-full bg-neutral-100 dark:bg-primary/100 flex justify-center">
        <div class="container flex flex-col max-w-screen-xl min-h-full">
            <DisplayOnWeb>
                <div
                    class="flex flex-col justify-between pt-8 text-opacity-80 text-black dark:text-opacity-80 dark:text-white"
                >
                    <h1 class="text-3xl font-bold pb-2">profile list</h1>
                    <p class="text-opacity-60 text-black dark:text-white dark:text-opacity-60">
                        <a
                            href="https://links.intech.studio/discord"
                            class="hover:underline text-blue-500">Join the discord channel</a
                        > to get support.
                    </p>
                </div>
            </DisplayOnWeb>
            {#if display == "editor" && !isEditorVersionCompatible}
                <div class="flex justify-center items-center h-screen px-4">
                    <p class="text-center text-lg">
                        Your Editor is not compatible with the current Profile Cloud version. Please
                        update your Editor to the latest version!
                    </p>
                </div>
            {/if}
            {#if display == "editor"}
                {#if isEditorVersionCompatible}
                    <EditorLayout />
                {/if}
            {:else}
                <BrowserLayout />
            {/if}
        </div>
    </div>
</section>

<style lang="postcss">
    :global(.splitpanes.modern-theme .splitpanes__pane) {
        /*  @apply bg-secondary; */
        position: relative;
        overflow: visible;
    }

    /*betty magic selector*/
    :global(.splitpanes.modern-theme .splitpanes__pane.leftPane) {
        overflow: hidden;
    }

    :global(.splitpanes.modern-theme .splitpanes__splitter) {
        background-color: #4c4c4c;
        position: relative;
    }
    :global(.splitpanes.modern-theme .splitpanes__splitter:before) {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        transition: opacity 0.3s;
        background-color: #2db9d2;
        width: 200;
        opacity: 0;
        z-index: 1;
    }
    :global(.splitpanes.modern-theme .splitpanes__splitter:hover:before) {
        opacity: 1;
    }
    :global(.splitpanes.modern-theme .splitpanes__splitter.splitpanes__splitter__active) {
        z-index: 2;
        /* Fix an issue of overlap fighting with a near hovered splitter */
    }
    :global(.modern-theme.splitpanes--vertical > .splitpanes__splitter:before) {
        left: -3px;
        right: -3px;
        height: 100%;
        cursor: col-resize;
    }
    :global(.modern-theme.splitpanes--horizontal > .splitpanes__splitter:before) {
        top: -3px;
        bottom: -3px;
        width: 100%;
        cursor: row-resize;
    }
    :global(.splitpanes.no-splitter .splitpanes__pane) {
        background-color: #0e100f;
    }
    :global(.splitpanes.no-splitter .splitpanes__splitter) {
        background-color: #4c4c4c;
        position: relative;
    }
    :global(.no-splitter.splitpanes--horizontal > .splitpanes__splitter:before) {
        width: 0.05rem;
        pointer-events: none;
        cursor: none;
    }
    :global(.no-splitter.splitpanes--vertical > .splitpanes__splitter:before) {
        height: 0.05rem;
        pointer-events: none;
        cursor: none;
    }
</style>
