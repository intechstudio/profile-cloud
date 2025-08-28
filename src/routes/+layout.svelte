<script lang="ts">
  import ToggleSwitch from "../lib/components/atomic/ToggleSwitch.svelte";
  import DisplayOnWeb from "../lib/components/DisplayOnWeb.svelte";
  import { getContext, setContext } from "svelte";
  import "../app.css";
  import VersionStamp from "./VersionStamp.svelte";
  import { mode_store } from "./mode.store";

  function isThisAnIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  if (isThisAnIframe()) {
    setContext("display", "editor");
  } else {
    setContext("display", "web");
  }

  let darkMode = getContext("display") === "editor" ? true : true;

  function toggleDarkMode() {
    darkMode = !darkMode;
    // set class on body, so on overscrolling the background will match the app color
    document.body.classList.toggle("bg-primary");
  }

  let editorMode = false;

  function toggleDisplayMode() {
    editorMode = !editorMode;

    $mode_store = editorMode;
  }

  let fontSize = getContext("display") === "editor" ? "12px" : "16px";

  console.log("Dark mode:", darkMode);

  console.log("Application context:", getContext("display"));
</script>

<svelte:head>
  <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
</svelte:head>

<main style={"font-size: " + fontSize} class={darkMode ? "dark" : ""}>
  <div
    class="dark:bg-primary flex flex-col justify-between dark:text-white bg-white text-black transition duration-200 min-h-screen"
  >
    <DisplayOnWeb>
      <div class="dark:bg-neutral-700">
        <nav class=" container mx-auto flex w-full justify-between p-4">
          <a href="https://intech.studio">
            <img
              src={darkMode
                ? "/icon-logo-white-transparent.svg"
                : "/icon-logo-black-transparent.svg"}
              alt="Intech Studio"
              class="h-8 p-1"
            />
          </a>
          <ToggleSwitch on:toggle={toggleDarkMode}>
            <svelte:fragment slot="off">
              <img src="/moon_icon.svg" alt="dark mode" class="w-6 h-6" />
            </svelte:fragment>
            <svelte:fragment slot="on">
              <img src="/sun_icon.svg" alt="light mode" class="w-6 h-6 p-1" />
            </svelte:fragment>
          </ToggleSwitch>
          <ToggleSwitch on:toggle={toggleDisplayMode}>
            <svelte:fragment slot="off">
              <img
                src="/icon-logo-{darkMode ? 'white' : 'black'}-transparent.svg"
                alt="dark mode"
                class="w-16 h-16 px-2"
              />
            </svelte:fragment>
            <svelte:fragment slot="on">
              <img
                src="/icon-logo-{darkMode ? 'white' : 'black'}-transparent.svg"
                alt="light mode"
                class="w-16 h-16 px-2"
              />
            </svelte:fragment>
          </ToggleSwitch>
        </nav>
      </div>
    </DisplayOnWeb>

    <slot />

    <DisplayOnWeb>
      <footer class=" bg-emerald-300 dark:bg-emerald-800">
        <div
          class="container mx-auto flex w-full justify-center p-4 text-center"
        >
          <div
            class="flex flex-row gap-2 text-sm text-neutral-500 dark:text-white dark:text-opacity-80"
          >
            <p>
              <a
                class="hover:text-neutral-600 dark:hover:text-opacity-60"
                href="https://intech.studio"
                target="_blank"
                rel="noopener noreferrer"
              >
                &copy; {new Date().getFullYear()} Intech Studio
              </a>
            </p>
            <span>-</span>
            <VersionStamp />
          </div>
        </div>
      </footer>
    </DisplayOnWeb>
  </div>
</main>

<style lang="postcss">
  /**
	This is the global style for the scrollbar from the editor.
	*/
  :global(::-webkit-scrollbar) {
    height: 0.375rem;
    width: 0.375rem;
    @apply dark:rounded-md dark:bg-secondary bg-neutral-100;
  }

  :global(::-webkit-scrollbar-thumb) {
    @apply dark:rounded-md dark:bg-neutral-600 bg-neutral-400 dark:shadow;
  }

  :global(::-webkit-scrollbar-corner) {
    @apply dark:rounded-md dark:bg-secondary;
  }
</style>
