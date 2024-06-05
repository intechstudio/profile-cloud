<script lang="ts">
    import { createEventDispatcher, tick } from "svelte";
    import { marked } from "marked";

    const dispatch = createEventDispatcher();

    export let value: string;
    export let disabled: boolean;

    let input: HTMLElement;
    let mode = "preview";

    function handleBlur(e: FocusEvent) {
        const target = e.target as HTMLElement;
        mode = "preview";
        value = target.innerText;
        dispatch("change", target.innerHTML);
    }

    async function handleDoubleClick() {
        if (disabled) {
            return;
        }
        mode = "edit";
        await tick(); // Wait for the DOM to update
        input.focus(); // Focus the input element
    }

    function handlePaste(e: ClipboardEvent) {
        const clipboardData = e.clipboardData;
        const items = clipboardData?.items ?? [];

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();

                    reader.onload = function (event) {
                        const base64Image = event.target?.result as string;
                        const markdownImage = `![Inline Image](${base64Image})`;

                        // Insert the Markdown image syntax at the caret position
                        insertTextAtCaret(input, markdownImage);
                        value = input.innerText;
                    };

                    reader.readAsDataURL(blob);
                }
            }
        }
    }

    function insertTextAtCaret(element: HTMLElement, text: string) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
</script>

<div class="markdown-editor flex-grow w-full h-full max-h-full max-w-full overflow-hidden">
    {#if mode === "edit"}
        <div
            bind:this={input}
            contenteditable="true"
            spellcheck="false"
            class="editable-content w-full p-1 h-full overflow-y-auto dark:bg-primary border border-transparent focus:border-emerald-500 text-xs focus:outline-none"
            class:dark:hover:bg-neutral-800={!disabled}
            on:blur={handleBlur}
            on:paste|preventDefault={handlePaste}
        >
            {@html value.replace(/\n/g, "<br>")}
        </div>
    {:else if mode === "preview"}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="markdown-container p-1 flex-grow w-full h-full dark:bg-primary bg-opacity-40 overflow-y-auto"
            on:dblclick={handleDoubleClick}
        >
            {@html marked(value).replace(/\n/g, "<br>")}
        </div>
    {/if}
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
