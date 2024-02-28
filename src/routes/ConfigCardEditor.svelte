<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Config } from "$lib/schemas";

    const dispatchEvent = createEventDispatcher();

    interface SelectedComponentTypes {
        selectedComponentTypes: string[] | undefined;
    }

    export let data: Config & SelectedComponentTypes;
    export let isSelected: boolean;
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
        : 'border-white/10'} grid grid-cols-[1fr_auto] items-center px-2 py-1 w-full bg-white border shadow dark:bg-secondary"
>
    <span class="truncate text-left">{data.name}</span>

    <div
        class="dark:text-white text-black text-opacity-80 py-0.5 px-2 dark:border
                {data.selectedComponentTypes?.includes(data.type) ?? false
            ? 'dark:text-opacity-100 dark:border-white dark:border-opacity-10 dark:bg-white dark:bg-opacity-10'
            : 'dark:text-opacity-70 dark:border-transparent'} truncate"
    >
        {data.type}
    </div>
</button>
