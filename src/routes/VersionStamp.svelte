<script>
  import { parentIframeCommunication } from "../lib/utils";
  import { getContext } from "svelte";

  const display = getContext("display");

  function handleCommitHashClicked() {
    const link = `https://github.com/intechstudio/profile-cloud/commit/${PUBLIC_COMMIT_HASH}`;
    if (display === "editor") {
      parentIframeCommunication({
        windowPostMessageName: "openExternalLink",
        dataForParent: {
          link: link,
        },
      });
    } else {
      window.open(link);
    }
  }
</script>

<div class="flex flex-row flex-wrap gap-2">
  <span class="text-opacity-40">
    {import.meta.env.PUBLIC_APP_ENV} - {import.meta.env.PUBLIC_CREATION_DATE}
  </span>
  <button
    class="hover:text-opacity-75 text-opacity-40"
    on:click={handleCommitHashClicked}
    >({import.meta.env.PUBLIC_COMMIT_HASH})</button
  >
</div>
