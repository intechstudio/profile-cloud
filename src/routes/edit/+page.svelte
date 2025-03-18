<script lang="ts">
  import Editor from "@toast-ui/editor";

  const initMarkdown = `
# Milkdown Svelte Commonmark

> You're scared of a world where you're needed.

This is a demo for using Milkdown with **Svelte**.
`;

  function editor(dom: HTMLElement) {
    const editor = new Editor({
      el: dom,
      height: "500px",
      initialEditType: "markdown",
      previewStyle: "vertical",
    });

    editor.getMarkdown();
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://uicdn.toast.com/editor/latest/toastui-editor.min.css"
  />
</svelte:head>

<div use:editor />

<style lang="postcss">
  :global(.milkdown) {
    @apply bg-slate-50 px-2 py-4 m-5 border rounded;
  }

  .editor {
    @apply prose;
    @apply focus-visible:outline-none;
    @apply outline-none;
    @apply mx-auto;
  }

  :global(.ProseMirror:focus) {
    outline: none;
  }
</style>
