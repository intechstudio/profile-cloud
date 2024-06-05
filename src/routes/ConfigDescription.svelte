<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { marked } from "marked";

    const dispatch = createEventDispatcher();

    export let value: string;
    export let disabled: boolean;

    let selectedTab = "edit";

    function handleBlur(e: FocusEvent) {
        const target = e.target as HTMLElement;
        dispatch("change", target.innerHTML);
    }
</script>

<div class="flex h-full w-full flex-col">
    {#if !disabled}
        <div class="flex flex-row self-end">
            <button
                class="py-0.5 px-2"
                class:bg-primary={selectedTab === "edit"}
                on:click={() => (selectedTab = "edit")}
            >
                Edit
            </button>
            <button
                class="py-0.5 px-2"
                class:bg-primary={selectedTab === "preview"}
                on:click={() => (selectedTab = "preview")}
            >
                Preview
            </button>
        </div>
    {/if}

    <div class="markdown-editor flex-grow w-full h-full max-h-full max-w-full overflow-hidden">
        {#if selectedTab === "edit"}
            {#key value}
                <div
                    contenteditable="true"
                    spellcheck="false"
                    class="editable-content w-full p-1 h-full overflow-y-auto dark:bg-primary border border-transparent focus:border-emerald-500 text-xs focus:outline-none"
                    class:dark:hover:bg-neutral-800={!disabled}
                    on:blur={handleBlur}
                >
                    {@html value}
                </div>
            {/key}
        {:else if selectedTab === "preview"}
            <div
                class="markdown-container p-1 flex-grow w-full h-full dark:bg-primary bg-opacity-40 overflow-y-auto"
            >
                {@html marked(value)}
            </div>
        {/if}
    </div>
</div>

<style>
    @import "./preview-styles.css";

    :global(.markdown-editor img) {
        display: inline;
        vertical-align: middle;
        width: auto;
        height: auto;
    }
</style>
