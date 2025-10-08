<script>
  import { parentIframeCommunication } from "../lib/utils";
  import { getContext } from "svelte";

  const display = getContext("display");

  function handleCommitHashClicked() {
    const link = `https://github.com/intechstudio/profile-cloud/commit/${import.meta.env.PUBLIC_COMMIT_HASH}`;
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

<div class="commit-container">
  <span>
    {import.meta.env.PUBLIC_APP_ENV} - {import.meta.env.PUBLIC_CREATION_DATE}
  </span>
  <button class="commit-button" on:click={handleCommitHashClicked}>
    ({import.meta.env.PUBLIC_COMMIT_HASH})
  </button>
</div>

<style>
  .commit-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem; /* roughly Tailwind's gap-2 */
  }

  .commit-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition: opacity 0.2s;
  }

  .commit-button:hover {
    opacity: 0.75;
  }
</style>
