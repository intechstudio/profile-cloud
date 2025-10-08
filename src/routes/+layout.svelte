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

<main>
  <div class="app-container">
    <DisplayOnWeb>
      <nav class="container">
        <a href="https://intech.studio">
          <img
            src={darkMode
              ? "/icon-logo-white-transparent.svg"
              : "/icon-logo-black-transparent.svg"}
            alt="Intech Studio"
            class="logo"
          />
        </a>
        <Toggle title="Dark mode" bind:value={darkMode} />
        <Toggle title="Editor view" bind:value={$mode_store} />
      </nav>
    </DisplayOnWeb>

    <slot />

    <DisplayOnWeb>
      <footer>
        <div class="container">
          <div class="footer-content">
            <div>
              <a
                href="https://intech.studio"
                target="_blank"
                rel="noopener noreferrer"
              >
                &copy; {new Date().getFullYear()} Intech Studio
              </a>
            </div>
            <div>-</div>
            <VersionStamp />
          </div>
        </div>
      </footer>
    </DisplayOnWeb>
  </div>
</main>

<style>
  main {
    font-size: var(--font-size);
    background-color: var(--background);
    color: var(--foreground);
  }

  .app-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 100vh;
    transition: all 0.2s;
  }

  nav.container {
    max-width: 1024px;
    margin: 0 auto;
    display: flex;
    width: 100%;
    justify-content: space-between;
    padding: 1rem;
  }

  nav img.logo {
    height: 2rem;
    padding: 0.25rem;
  }

  footer {
    background-color: #34d399; /* emerald-300 */
  }

  footer .container {
    max-width: 1024px;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    padding: 1rem;
    text-align: center;
  }

  footer .footer-content {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    font-size: 0.875rem; /* text-sm */
  }
</style>
