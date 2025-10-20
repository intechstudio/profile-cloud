<script lang="ts">
  import { createEventDispatcher, onMount, tick } from "svelte";
  import { marked } from "marked";
  import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytes,
  } from "firebase/storage";
  import { firebaseStorage } from "../lib/firebase";
  import { v4 as uuidv4 } from "uuid";
  import { filter_value, highlightMatches } from "./Filter";

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
    textArea.select();
  }

  function handlePaste(e: ClipboardEvent) {
    const clipboardData = e.clipboardData;
    const items = clipboardData?.items ?? [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          let fileName = `${uuidv4()}.${blob.name.split(".").pop()}`;
          let storageReference = ref(
            firebaseStorage,
            `config_images/${fileName}`,
          );

          const markdownImage = `![Uploading image ${fileName}]()`;
          // Insert the Markdown image syntax at the caret position
          const startPos = textArea.selectionStart;
          const endPos = textArea.selectionEnd;
          let textBefore = textArea.value.substring(0, startPos);
          let textAfter = textArea.value.substring(
            endPos,
            textArea.value.length,
          );

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
                  `!\\[Uploading image ${fileName}\\]\\(\\)`,
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
      breaks: true,
    });
  });

  async function handleValueChange(value: string) {
    preview = await marked.parse(value);
  }
</script>

{#if mode === "edit"}
  <textarea
    bind:this={textArea}
    contenteditable="true"
    spellcheck="false"
    on:blur={handleBlur}
    on:paste={handlePaste}
    bind:value
  />
{:else if mode === "preview"}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="markdown-container p-2" on:dblclick={handleDoubleClick}>
    {@html highlightMatches(preview, $filter_value)}
  </div>
{/if}

<style>
  textarea {
    width: 100%;
    padding: 0.25rem;
    height: 100%;
    overflow-y: auto;
    border: 1px solid transparent;
    resize: none;
    background-color: transparent;
    outline: none;
  }

  textarea:hover {
    background-color: var(--background-muted);
  }

  textarea.isbold {
    font-weight: bold;
    font-size: 110%;
  }

  textarea:focus {
    background-color: var(--background-soft);
    border-color: green;
  }

  :global(.markdown-editor img) {
    display: inline;
    vertical-align: middle;
    width: auto;
    height: auto;
  }

  :global(.markdown-container p) {
    margin-bottom: 10px;
  }

  :global(.markdown-container h1) {
    font-size: 2em;
    margin: 0.3em 0 0.5em;
  }

  :global(.markdown-container h2) {
    font-size: 1.5em;
    margin: 0.1em 0 0.5em;
  }

  :global(.markdown-container h3) {
    font-size: 1.17em;
    margin: 0.05em 0 0.5em;
  }

  :global(.markdown-container h4) {
    font-size: 1em;
    margin: 0.025 0 0.5em;
  }

  :global(.markdown-container h5) {
    font-size: 0.83em;
    margin: 0.0125em 0 0.5em;
  }

  :global(.markdown-container h6) {
    font-size: 0.67em;
    margin: 0 0 0.5em;
  }

  :global(.markdown-container ul),
  :global(.markdown-container ol) {
    margin: 50 0;
    padding-left: 2em;
  }

  :global(.markdown-container ul) {
    margin: 1em 0;
    padding-left: 2em;
    list-style-type: disc;
  }

  :global(.markdown-container ol) {
    margin: 1em 0;
    padding-left: 2em;
    list-style-type: decimal;
  }

  /* Styling for inline elements */
  :global(.markdown-container strong) {
    font-weight: bold;
  }

  :global(.markdown-container em) {
    font-style: italic;
  }

  :global(.markdown-container code) {
    font-family: monospace;
    padding: 0.1em 0.3em;
    border-radius: 3px;
  }

  :global(.markdown-container pre) {
    padding: 1em;
    border-radius: 5px;
    overflow-x: auto;
  }

  :global(.markdown-container a) {
    color: #0366d6;
    text-decoration: none;
  }

  :global(.markdown-container a:hover) {
    text-decoration: underline;
  }

  /* Styling for block elements */
  :global(.markdown-container blockquote) {
    margin: 1em 0;
    padding: 0.5em 1em;
    border-left: 4px solid #ccc;
  }

  :global(.markdown-container pre) {
    margin: 1em 0;
  }
</style>
