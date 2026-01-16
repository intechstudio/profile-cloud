<script lang="ts">
  import { sortConfigs, sort_key } from "./Sorter";
  import { matches, filter_value } from "./Filter";
  import Sorter from "./Sorter.svelte";
  import { onDestroy, onMount } from "svelte";
  import type { Config } from "../lib/schemas";
  import Filter from "./Filter.svelte";
  import {
    type ConfigManager,
    createConfigManager,
  } from "../lib/configmanager/ConfigManager";
  import ConfigCardBrowser from "./ConfigCardBrowser.svelte";
  import configuration from "../../Configuration.json";

  let selectedConfigIndex: number | undefined = undefined;

  let configManager: ConfigManager | undefined = undefined;
  let configs: Config[] = [];
  let filteredConfigs: Config[] = [];

  let selectedComponentTypes: string[] = [];

  let isSearchSortingShows = false;

  function filterShowHide() {
    isSearchSortingShows = !isSearchSortingShows;
  }

  onMount(async () => {
    configManager = createConfigManager({
      next: (newConfigs) => {
        newConfigs.sort((a, b) => {
          let ai = configs.findIndex((e) => e.id === a.id);
          let bi = configs.findIndex((e) => e.id === b.id);
          return ai - bi;
        });
        configs = newConfigs;
      },
    });
  });

  onDestroy(() => {
    configManager?.cancel();
    configManager = undefined;
  });

  $: {
    filteredConfigs = sortConfigs(
      configs.filter((e) => matches(e, $filter_value)),
      $sort_key,
    );
  }
</script>

<div id="main">
  <div class="filter-toggle">
    <button on:click={filterShowHide}>
      {#if isSearchSortingShows}
        Hide Filters
      {:else}
        Show Filters
      {/if}
    </button>
  </div>

  {#if isSearchSortingShows}
    <div class="filters-row">
      <Filter />
      <Sorter />
    </div>
  {/if}

  <div class="configs-grid">
    {#each filteredConfigs as config, index (config.id)}
      <ConfigCardBrowser
        on:click={() => {
          selectedConfigIndex = index;
        }}
        isSelected={index === selectedConfigIndex}
        data={{
          ...config,
          selectedComponentTypes: selectedComponentTypes,
        }}
      >
        <svelte:fragment slot="import-config-browser-button">
          <button
            on:click={() => {
              const configLinkUrl =
                `${configuration.DEEPLINK_PROTOCOL_NAME}://?config-link=` +
                config.id;
              window.open(configLinkUrl, "_self");
            }}
          >
            Import
          </button>
        </svelte:fragment>
      </ConfigCardBrowser>
    {/each}
  </div>
</div>

<style>
  /* Main container */
  #main {
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 0;
    overflow: hidden;
  }

  /* Filter toggle button */
  .filter-toggle {
    display: flex;
  }

  /* Filters row */
  .filters-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    gap: 0.5rem; /* gap-2 */
  }

  /* Configs grid */
  .configs-grid {
    overflow-y: auto;
    width: 100%;
    height: 100%;
    padding: 0.5rem; /* p-2 */
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    grid-auto-flow: row;
    gap: 1rem; /* gap-4 */
  }

  @media (min-width: 768px) {
    /* md:grid-cols-2 */
    .configs-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    /* lg:py-8 and lg:grid-cols-3 */
    .configs-grid {
      padding-top: 2rem;
      padding-bottom: 2rem;
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* Import button inside ConfigCardBrowser */
  ConfigCardBrowser button {
    border-radius: 0.25rem; /* rounded */
    padding: 0.25rem 1rem; /* py-1 px-4 */
    font-weight: 500; /* font-medium */
    background-color: #10b981; /* dark:bg-emerald-600 */
    color: white;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  ConfigCardBrowser button:hover {
    background-color: #059669; /* dark:hover:bg-emerald-700 */
  }
</style>
