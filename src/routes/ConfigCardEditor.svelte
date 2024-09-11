<script lang="ts">
    import { compatible_config_types } from "./EditorLayout";
    import { createEventDispatcher } from "svelte";
    import type { Config } from "$lib/schemas";

    const dispatchEvent = createEventDispatcher();

    export let data: Config;
    export let isSelected: boolean;

    let compatible = false;

    $: handleCompatibleConfigsChange($compatible_config_types);

    function handleCompatibleConfigsChange(types: string[]) {
        compatible = types.includes(data.type);
    }
</script>

<button
    id={data.id}
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
        <span class="truncate text-left" class:opacity-75={!compatible}>{data.name}</span>
        <div
            class="dark:text-white text-black text-opacity-80 py-0.5 px-2 dark:border
                {compatible
                ? 'dark:text-opacity-100 dark:border-white dark:border-opacity-10 dark:bg-white dark:bg-opacity-10'
                : 'dark:text-opacity-75 dark:border-transparent line-through'} truncate"
        >
            {data.type}
        </div>
    </div>
</button>
