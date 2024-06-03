<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { clickOutside } from "./click-outside.action";

    const dispatch = createEventDispatcher();

    export let value: string;
    let disabled: boolean = false;

    function handleBlur() {
        isEdit = false;
        //dispatch("change", textArea.value ?? "");
    }

    function handleFocus() {
        isEdit = true;
    }

    import { createMarkdown } from "svelte-markdown-input";

    let markdown = createMarkdown();

    let isEdit = false;

    function handleApplyClicked() {}
</script>

<div class="flex h-full w-full flex-col">
    {#if !disabled}
        <div class="flex flex-row self-end">
            <button class="py-0.5 px-2" class:bg-primary={isEdit} on:click={() => (isEdit = true)}>
                Edit
            </button>
            <button
                class="py-0.5 px-2"
                class:bg-primary={!isEdit}
                on:click={() => (isEdit = false)}
            >
                Preview
            </button>
        </div>
    {/if}

    {#key value}
        <div class="flex-grow w-full h-full max-h-full max-w-full overflow-hidden">
            <textarea
                class="flex-grow w-full p-1 h-full overflow-y-auto dark:bg-primary text-xs resize-none"
                class:hidden={!isEdit}
                use:markdown
                {value}
            />
            <div
                id="preview"
                class="markdown-container p-1 flex-grow w-full h-full dark:bg-primary bg-opacity-40 overflow-y-auto"
                class:hidden={isEdit}
            >
                {@html $markdown}
            </div>
        </div>
    {/key}
</div>

<style>
    @import "./preview-styles.css";
</style>
