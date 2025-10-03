<script lang="ts">
  import ToggleSwitch from "../lib/components/atomic/ToggleSwitch.svelte";
  import { Toggle } from "@intechstudio/grid-uikit";
  import DisplayOnWeb from "../lib/components/DisplayOnWeb.svelte";
  import { getContext, setContext } from "svelte";
  import "../app.css";
  import VersionStamp from "./VersionStamp.svelte";
  import { mode_store } from "./mode.store";

  import "@intechstudio/grid-uikit/theme.css";

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

  let darkMode = true;

  $: {
    document.documentElement.setAttribute(
      "color-scheme",
      darkMode ? "dark" : "light",
    );
  }

  let fontSize = getContext("display") === "editor" ? "12px" : "16px";

  console.log("Dark mode:", darkMode);

  console.log("Application context:", getContext("display"));
</script>

<svelte:head>
  <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
</svelte:head>

<main
  style="{'font-size: ' +
    fontSize}; background-color: var(--background); color: var(--foreground);"
>
  <div
    class="flex flex-col justify-between transition duration-200 min-h-screen"
  >
    <DisplayOnWeb>
      <div class="">
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
          <Toggle title="Dark mode" bind:value={darkMode} />
          <Toggle title="Editor view" bind:value={$mode_store} />
        </nav>
      </div>
    </DisplayOnWeb>

    <slot />

    <DisplayOnWeb>
      <footer class=" bg-emerald-300">
        <div
          class="container mx-auto flex w-full justify-center p-4 text-center"
        >
          <div class="flex flex-row gap-2 text-sm">
            <p>
              <a
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
