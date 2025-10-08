<script lang="ts">
  import { getContext, onMount } from "svelte";
  import DisplayOnWeb from "../lib/components/DisplayOnWeb.svelte";
  import { parentIframeCommunication } from "../lib/utils";
  import { compareSemVer } from "semver-parser";
  import EditorLayout from "./EditorLayout.svelte";
  import BrowserLayout from "./BrowserLayout.svelte";
  import { mode_store } from "./mode.store";

  const display = getContext("display");
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
      compareSemVer(editorVersionResponse.data, "1.2.45") >= 0
    ) {
      isEditorVersionCompatible = true;
    } else {
      isEditorVersionCompatible = false;
    }
  });
</script>

<section>
  <DisplayOnWeb>
    <h1>profile list</h1>
    <a href="https://links.intech.studio/discord"> Join the discord channel </a>
    to get support.
  </DisplayOnWeb>

  {#if display == "editor" && !isEditorVersionCompatible}
    <div>
      <p>
        Your Editor is not compatible with the current Profile Cloud version.
        Please update your Editor to the latest version!
      </p>
    </div>
  {/if}

  {#if display == "editor" && isEditorVersionCompatible}
    <EditorLayout />
  {:else if $mode_store}
    <EditorLayout />
  {:else}
    <BrowserLayout />
  {/if}
</section>

<style global>
</style>
