<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Config } from "$lib/schemas";

    const dispatchEvent = createEventDispatcher();

    interface SelectedComponentTypes {
        selectedComponentTypes: string[] | undefined;
    }

    export let data: Config & SelectedComponentTypes;
    export let isSelected: boolean;

    $: console.log();
</script>

<button
    on:click={() => {
        dispatchEvent("click", {});
    }}
    on:focusout={(e) => {
        if (e.relatedTarget == null) {
            dispatchEvent("focusout", {});
        }
    }}
    class="{isSelected
        ? 'border-emerald-500'
        : 'border-white/10'} flex flex-row items-center w-full bg-white border shadow dark:bg-secondary"
>
    <div class="w-1 h-8 grid grid-rows-2">
        <div
            class="{data.syncStatus === 'cloud' || data.syncStatus === 'synced'
                ? 'bg-emerald-300 '
                : 'bg-emerald-500/10'}  w-full h-full"
        />
        <div
            class="{data.syncStatus === 'local' || data.syncStatus === 'synced'
                ? 'bg-emerald-500 '
                : 'bg-emerald-500/10'}  w-full h-full"
        />
    </div>
    <div class="px-2 py-1 grid grid-cols-[1fr_auto] w-full items-center">
        <span class="truncate text-left">{data.name}</span>
        <div
            class="dark:text-white text-black text-opacity-80 py-0.5 px-2 dark:border
                {data.selectedComponentTypes?.includes(data.type) ?? false
                ? 'dark:text-opacity-100 dark:border-white dark:border-opacity-10 dark:bg-white dark:bg-opacity-10'
                : 'dark:text-opacity-70 dark:border-transparent'} truncate"
        >
            {data.type}
        </div>
    </div>
</button>
