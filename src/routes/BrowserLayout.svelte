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

<div class="flex-col py-4 h-full">
  <div class="flex justify-end">
    <button
      on:click={() => {
        filterShowHide();
      }}
      class="text-left font-xs"
    >
      {#if isSearchSortingShows}
        Hide Filters
      {:else}
        Show Filters
      {/if}
    </button>
  </div>
  <div class="flex flex-row w-full gap-2" class:hidden={!isSearchSortingShows}>
    <Filter />
    <Sorter />
  </div>
  <div
    class="overflow-y-auto w-full h-full p-2 lg:py-8 grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 gap-4"
  >
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
            class="rounded px-4 py-1 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-medium"
          >
            Import
          </button>
        </svelte:fragment>
      </ConfigCardBrowser>
    {/each}
  </div>
</div>
