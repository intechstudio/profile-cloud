<svelte:options customElement={{ tag: "WEB-COMPONENT-NAME", shadow: "none" }} />

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
