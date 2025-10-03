<script lang="ts">
  import { Sort, sort_key } from "./Sorter";
  import { MeltSelect } from "@intechstudio/grid-uikit";

  function handleDirectionChange() {
    sort_key.update((store) => {
      store.direction =
        store.direction === Sort.Direction.ASC
          ? Sort.Direction.DESC
          : Sort.Direction.ASC;

      return store;
    });
  }
</script>

<div class="flex flex-grow flex-row items-center gap-2">
  <label
    id="sort-label"
    for="sorting select"
    class="uppercase text-gray-500 py-1 min-w-fit text-xs"
  >
    sort by
  </label>
  <div class="flex flex-row gap-1 flex-grow flex-nowrap pb-2">
    <MeltSelect
      bind:target={$sort_key.type}
      options={[
        { title: Sort.Type.NAME, value: Sort.Type.NAME },
        { title: Sort.Type.DATE, value: Sort.Type.DATE },
        { title: Sort.Type.TYPE, value: Sort.Type.TYPE },
      ]}
      disabled={false}
    />

    <button id="sort-order-button" on:click={handleDirectionChange}>
      {#if $sort_key.direction == Sort.Direction.DESC}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 11H15M11 15H18M11 19H21M9 7L6 4L3 7M6 6V20"
            class="stroke-2"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {:else}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 5H21M11 9H18M11 13H15M3 17L6 20L9 17M6 18V4"
            class="stroke-2"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {/if}
    </button>
  </div>
</div>

<style>
  svg {
    stroke: var(--foreground);
  }
</style>
