<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Config } from "$lib/schemas";
    import SearchBar from "./SearchBar.svelte";

    export let visible: boolean = false;
    export let configs: Config[] = [];
    export let display: "editor" | "browser" = "editor";

    export function reset() {
        searchbarValue = "";
        sortAsc = true;
        sortField = SortFieldType.date;
    }

    const dispatch = createEventDispatcher();

    let searchSuggestions: string[] = [
        "Profile",
        "Preset",
        "BU16",
        "EF44",
        "EN16",
        "PBF4",
        "PO16",
        "Button",
        "Encoder",
        "Potentiometer",
        "Fader",
        "System"
    ];

    enum SortFieldType {
        name = "name",
        date = "date",
        module = "module"
    }

    let searchbarValue = "";
    let sortAsc = true;
    let sortField: SortFieldType = SortFieldType.date;

    $: {
        const filtered: Config[] = filterConfigs(searchbarValue, configs);
        const sorted: Config[] = sortConfigs(sortField, sortAsc, filtered);
        dispatch("filter", { configs: sorted, isFiltering: searchbarValue.trim().length != 0 });
    }

    function filterConfigs(searchString: string, array: Config[]): Config[] {
        const arrayOfSearchTerms = searchString.trim().toLowerCase().split(" ");

        const filtered = array.filter((config) => {
            const currentProfileSearchable = String(
                `${config.name} ${config.type} ${config.configType}`
            ).toLocaleLowerCase();

            for (const searchTerm of arrayOfSearchTerms) {
                if (currentProfileSearchable.indexOf(searchTerm.toLocaleLowerCase()) === -1) {
                    return false;
                }
            }
            return true;
        });

        return filtered;
        //Only sort when ordering explicitly changes (like file explorer)
    }

    function sortConfigs(sortType: SortFieldType, ascending: boolean, array: Config[]): Config[] {
        const compareFieldsMap = new Map([
            [
                SortFieldType.name,
                (a: any, b: any) => {
                    return a.name
                        .toLowerCase()
                        .localeCompare(b.name.toLowerCase(), undefined, { numeric: true });
                }
            ],
            [
                SortFieldType.module,
                (a: any, b: any) => {
                    return a.type.localeCompare(b.type, undefined, {
                        numeric: true
                    });
                }
            ],
            [
                SortFieldType.date,
                (a: any, b: any) => {
                    return a.modifiedAt - b.modifiedAt;
                }
            ]
        ]);

        array.sort(compareFieldsMap.get(sortType));

        if (ascending) {
            array.reverse();
        }

        return array;
    }

    function handleSuggestionClicked(value: string) {
        searchbarValue = value;
    }
</script>

<container class={$$props.class} class:hidden={!visible}>
    <div
        class="w-full grid {display !== 'browser'
            ? 'grid-cols-1'
            : 'grid-cols-[1fr_auto]'} grid gap-x-2 gap-y-2 items-center"
    >
        <div class="flex flex-row w-full gap-2">
            <SearchBar suggestions={searchSuggestions} />
            <slot />
        </div>
        <div class="flex flex-grow flex-row items-center gap-2">
            <label
                id="sort-label"
                for="sorting select"
                class="uppercase text-gray-500 py-1 min-w-fit text-xs"
            >
                sort by
            </label>
            <div class="flex flex-row gap-1 flex-grow flex-nowrap">
                <select
                    class="bg-white dark:bg-secondary border-none flex-grow p-1 focus:outline-none min-w-fit"
                    id="sort-select-box"
                    name="sorting select"
                    bind:value={sortField}
                >
                    {#each Object.values(SortFieldType) as sortType}
                        <option
                            class="bg-white dark:bg-secondary py-1 border-none"
                            value={sortType}
                        >
                            {sortType}
                        </option>
                    {/each}
                </select>

                <button
                    id="sort-order-button"
                    on:click={() => {
                        sortAsc = !sortAsc;
                    }}
                >
                    {#if sortAsc == false}
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M11 11H15M11 15H18M11 19H21M9 7L6 4L3 7M6 6V20"
                                class="stroke-black dark:stroke-white stroke-2"
                                stroke="white"
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
                                class="stroke-black dark:stroke-white stroke-2"
                                stroke="white"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    {/if}
                </button>
            </div>
        </div>
    </div>
</container>
