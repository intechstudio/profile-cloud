<script lang="ts">
    import { createEventDispatcher, onMount, tick } from "svelte";
    import { marked } from "marked";
    import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
    import { firebaseStorage } from "../lib/firebase";
    import { v4 as uuidv4 } from "uuid";

    const dispatch = createEventDispatcher();

    export let value: string;
    export let disabled: boolean;

    let textArea: HTMLTextAreaElement;
    let mode = "preview";

    function handleBlur(e: FocusEvent) {
        mode = "preview";
        dispatch("change", value);
    }

    async function handleDoubleClick() {
        if (disabled) {
            return;
        }
        mode = "edit";
        await tick(); // Wait for the DOM to update
        textArea.focus(); // Focus the input element
    }

    function handlePaste(e: ClipboardEvent) {
        const clipboardData = e.clipboardData;
        const items = clipboardData?.items ?? [];

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    let fileName = `${uuidv4()}.${blob.name.split(".").pop()}`;
                    let storageReference = ref(firebaseStorage, `config_images/${fileName}`);

                    const markdownImage = `![Uploading image ${fileName}]()`;
                    // Insert the Markdown image syntax at the caret position
                    const startPos = textArea.selectionStart;
                    const endPos = textArea.selectionEnd;
                    let textBefore = textArea.value.substring(0, startPos);
                    let textAfter = textArea.value.substring(endPos, textArea.value.length);

                    // Set the new value of the textarea
                    textArea.value = textBefore + markdownImage + textAfter;

                    // Move the caret position to the end of the inserted text
                    const newCaretPos = startPos + markdownImage.length;
                    textArea.setSelectionRange(newCaretPos, newCaretPos);

                    // Trigger input event to update binding if using Svelte's two-way binding
                    textArea.dispatchEvent(new Event("input"));

                    e.preventDefault();

                    uploadBytes(storageReference, blob)
                        .then((snapshot) => {
                            getDownloadURL(snapshot.ref).then((url) => {
                                const regex = new RegExp(
                                    `!\\[Uploading image ${fileName}\\]\\(\\)`
                                );
                                const replacement = `![Image](${url})`;
                                let originalText = textArea.value;
                                let match = regex.exec(originalText);
                                if (!match) {
                                    deleteObject(snapshot.ref);
                                    return;
                                }

                                const matchEnd = match.index + match[0].length;

                                // Replace the matched pattern with the replacement string
                                const newString = originalText.replace(regex, replacement);
                                let newCaretStart = textArea.selectionStart;
                                if (newCaretStart >= matchEnd) {
                                    newCaretStart += replacement.length - match[0].length;
                                }
                                let newCaretEnd = textArea.selectionEnd;
                                if (newCaretEnd >= matchEnd) {
                                    newCaretEnd += replacement.length - match[0].length;
                                }
                                textArea.value = newString;
                                textArea.setSelectionRange(newCaretStart, newCaretEnd);
                                textArea.dispatchEvent(new Event("input"));
                            });
                        })
                        .catch((error) => {
                            console.log(error);
                        });
                }
            }
        }
        // Allow the default paste behavior for non-image content
    }

    let preview: any = "";

    $: handleValueChange(value);

    onMount(() => {
        marked.use({
            gfm: true,
            breaks: true
        });
    });

    async function handleValueChange(value: string) {
        preview = await marked.parse(value);
    }
</script>

<div class="markdown-editor flex-grow w-full h-full max-h-full max-w-full overflow-hidden">
    {#if mode === "edit"}
        <textarea
            bind:this={textArea}
            contenteditable="true"
            spellcheck="false"
            class="w-full p-1 h-full overflow-y-auto dark:bg-primary border border-transparent focus:border-emerald-500 text-xs focus:outline-none resize-none"
            class:dark:hover:bg-neutral-800={!disabled}
            on:blur={handleBlur}
            on:paste={handlePaste}
            bind:value
        />
    {:else if mode === "preview"}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="markdown-container p-1 flex-grow w-full h-full dark:bg-primary bg-opacity-40 overflow-y-auto"
            on:dblclick={handleDoubleClick}
        >
            {@html preview}
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
