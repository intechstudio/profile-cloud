<svelte:options customElement={{ tag: "web-component-name" }} />

<script>
  import { onMount } from "svelte";
  import EditorLayout from "./routes/EditorLayout.svelte";
  import { compareSemVer } from "semver-parser";
  import { parentIframeCommunication } from "./lib/utils";

  let isEditorVersionCompatible = true;

  async function profileCloudMounted() {
    return await parentIframeCommunication({
      windowPostMessageName: "profileCloudMounted",
      dataForParent: {
        environment: import.meta.env.PUBLIC_APP_ENV,
      },
    });
  }

  onMount(async () => {
    let editorVersionResponse = await profileCloudMounted();
    if (
      editorVersionResponse.data &&
      compareSemVer(editorVersionResponse.data, "1.3.6") >= 0
    ) {
      isEditorVersionCompatible = true;
    } else {
      isEditorVersionCompatible = false;
    }
  });
</script>

<profile-cloud-web-component
  class="dark bg-primary/100 text-white transition duration-200 h-full"
>
  {#if isEditorVersionCompatible}
    <EditorLayout />
  {:else}
    Incompatible Editor Version!
  {/if}
</profile-cloud-web-component>

<style global lang="postcss">
  @import "./app.css";

  /**
	This is the global style for the scrollbar from the editor.
	*/
  ::-webkit-scrollbar {
    height: 6px;
    width: 6px;
    @apply dark:rounded-md dark:bg-secondary bg-neutral-100;
  }

  ::-webkit-scrollbar-thumb {
    @apply dark:rounded-md dark:bg-neutral-600 bg-neutral-400 dark:shadow;
  }

  ::-webkit-scrollbar-corner {
    @apply dark:rounded-md dark:bg-secondary;
  }

  .splitpanes.modern-theme .splitpanes__pane {
    /*  @apply bg-secondary; */
    position: relative;
    overflow: visible;
  }

  /*betty magic selector*/
  .splitpanes.modern-theme .splitpanes__pane.leftPane {
    overflow: hidden;
  }

  .splitpanes.modern-theme .splitpanes__splitter {
    background-color: #4c4c4c;
    position: relative;
  }
  .splitpanes.modern-theme .splitpanes__splitter:before {
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
  .splitpanes.modern-theme .splitpanes__splitter:hover:before {
    opacity: 1;
  }
  .splitpanes.modern-theme .splitpanes__splitter.splitpanes__splitter__active {
    z-index: 2;
    /* Fix an issue of overlap fighting with a near hovered splitter */
  }
  .modern-theme.splitpanes--vertical > .splitpanes__splitter:before {
    left: -3px;
    right: -3px;
    height: 100%;
    cursor: col-resize;
  }
  .modern-theme.splitpanes--horizontal > .splitpanes__splitter:before {
    top: -3px;
    bottom: -3px;
    width: 100%;
    cursor: row-resize;
  }
  .splitpanes.no-splitter .splitpanes__pane {
    background-color: #0e100f;
  }
  .splitpanes.no-splitter .splitpanes__splitter {
    background-color: #4c4c4c;
    position: relative;
  }
  .no-splitter.splitpanes--horizontal > .splitpanes__splitter:before {
    width: 0.05rem;
    pointer-events: none;
    cursor: none;
  }
  .no-splitter.splitpanes--vertical > .splitpanes__splitter:before {
    height: 0.05rem;
    pointer-events: none;
    cursor: none;
  }
</style>
