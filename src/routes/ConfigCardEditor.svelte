<script lang="ts">
    import { selected_config } from "./EditorLayout";
    import { compatible_config_types } from "./EditorLayout";
    import { createEventDispatcher } from "svelte";
    import type { Config } from "../lib/schemas";
    import { grid, ModuleType, ElementType } from "@intechstudio/grid-protocol";

    const dispatch = createEventDispatcher();

    export let data: Config;
    export let isSelected: boolean;

    let compatible = false;
    let open = false;

    $: handleCompatibleConfigsChange($compatible_config_types);

    function handleCompatibleConfigsChange(types: string[]) {
        compatible = types.includes(data.type);
    }

    function handleToggle() {
        open = !open;
    }

    let moduleType = ModuleType[data.type as keyof typeof ModuleType];
    let elements = grid
        .get_module_element_list(moduleType)
        ?.reduce((array: Array<{ index: number; type: ElementType }>, type, index) => {
            if (typeof type !== "undefined") {
                array.push({ index, type });
            }
            return array;
        }, []);

    function handleSelection(id: string, presetIndex: number) {
        // Temporarily set to a different value to force reactivity
        // Important to being able to reopen the overlay, when same
        // Config is clicked, that is currently selected
        selected_config.set(undefined);
        selected_config.set({ id, presetIndex }); // Now set to the actual value
    }

    function getPresetName(preset: any) {
        const initConfig = preset.events.find((e: any) => e.event === 0).config;
        const regex = /--\[\[@sn\]\] self:gen\(["']([^"']+)["']\)/;

        const value = initConfig.match(regex)?.at(1);
        return value;
    }
</script>

<button
    id={data.id}
    on:click={() => {
        handleSelection(data.id, -1);
        dispatch("click");
    }}
    on:focusout={(e) => {
        if (e.relatedTarget == null) {
            dispatch("focusout");
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
    <div class="pl-2 py-1 grid grid-cols-[1fr_auto_auto] gap-1 w-full items-center">
        <span class="truncate text-left" class:opacity-75={!compatible}>{data.name}</span>
        <div
            class="dark:text-white text-black text-opacity-80 py-0.5 px-2 dark:border
                {compatible
                ? 'dark:text-opacity-100 dark:border-white dark:border-opacity-10 dark:bg-white dark:bg-opacity-10'
                : 'dark:text-opacity-75 dark:border-transparent line-through'} truncate"
        >
            {data.type}
        </div>
        {#if data.configType === "profile"}
            <button class="mr-1" on:click={handleToggle}>
                <svg
                    width="14"
                    height="11"
                    class:-rotate-90={!open}
                    viewBox="0 0 14 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M6.99968 11L0.9375 0.5L13.0619 0.500001L6.99968 11Z" fill="#D9D9D9" />
                </svg>
            </button>
        {/if}
    </div>
</button>

{#if open}
    <div class="flex flex-col ml-4 gap-1 my-1">
        {#each data.configs as preset, index}
            {@const element = elements.find((e) => e.index === preset.controlElementNumber)}
            {@const elementName = getPresetName(preset)}
            <svelte:self
                isSelected={preset.controlElementNumber === $selected_config?.presetIndex}
                data={{
                    type: element?.type,
                    name:
                        typeof elementName !== "undefined"
                            ? elementName
                            : `Element ${index} (${
                                  elements[index].type.at(0)?.toUpperCase() +
                                  elements[index].type?.slice(1)
                              })`
                }}
                on:click={() => {
                    handleSelection(data.id, preset.controlElementNumber);
                }}
                on:focusout={(e) => {
                    if (e.relatedTarget == null) {
                        dispatch("focusout");
                    }
                }}
            />
        {/each}
    </div>
{/if}
