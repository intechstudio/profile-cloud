<script lang="ts">
    import { FilterValue } from "./Filter";
    import { filter_value, stringToTerms } from "./Filter";
    import { createEventDispatcher } from "svelte";
    import SearchBar from "./SearchBar.svelte";
    import { config_manager, selected_config } from "./EditorLayout.js";
    import { parentIframeCommunication } from "../lib/utils.js";
    import { get } from "svelte/store";

    export let visible: boolean = true;

    export function reset() {
        searchValue = "";
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
        "TEK2",
        "Button",
        "Encoder",
        "Potentiometer",
        "Fader",
        "System",
        "Endless"
    ];

    let searchValue = "";

    $: handleSearchValueChange(searchValue);

    function handleSearchValueChange(value: string) {
        const terms = stringToTerms(value.trim(), false, false);
        filter_value.set(new FilterValue(...terms));
    }

    function handleSuggestionClicked(e: CustomEvent) {
        const { value } = e.detail;
        searchValue = value;
    }

    function handleInput() {
        const selected = $selected_config?.id;
        const configs = $config_manager?.configs;
        if (configs) {
            parentIframeCommunication({
                windowPostMessageName: "provideSelectedConfigForEditor",
                dataForParent: { config: get(configs).find((e) => e.id === selected) }
            });
        }
    }
</script>

<container class:hidden={!visible} class="w-full h-full">
    <SearchBar
        bind:value={searchValue}
        suggestions={searchSuggestions}
        on:suggestion-clicked={handleSuggestionClicked}
        on:input={handleInput}
    />
</container>
