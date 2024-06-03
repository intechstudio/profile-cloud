<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { createMarkdown } from "svelte-markdown-input";

    const dispatch = createEventDispatcher();
    const markdown = createMarkdown();

    export let value: string;
    export let disabled: boolean;

    let selectedTab = "edit";

    function handleBlur(e: FocusEvent) {
        const textArea = e.target as HTMLTextAreaElement;
        dispatch("change", textArea.value ?? "");
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

    {#key value}
        <div class="flex-grow w-full h-full max-h-full max-w-full overflow-hidden">
            {#if selectedTab === "edit"}
                <textarea
                    spellcheck="false"
                    class="flex-grow w-full p-1 h-full overflow-y-auto dark:bg-primary border border-transparent focus:border-emerald-500 text-xs resize-none focus:outline-none"
                    class:dark:hover:bg-neutral-800={!disabled}
                    on:blur={handleBlur}
                    use:markdown
                    {value}
                />
            {:else if selectedTab === "preview"}
                <div
                    class="markdown-container p-1 flex-grow w-full h-full dark:bg-primary bg-opacity-40 overflow-y-auto"
                >
                    {@html $markdown}
                </div>
            {/if}
        </div>
    {/key}
</div>

<style>
    @import "./preview-styles.css";
</style>
