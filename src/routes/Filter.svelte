<script lang="ts">
    import { FilterValue } from "./Filter";
    import { filter_value, stringToTerms } from "./Filter";
    import { createEventDispatcher } from "svelte";
    import SearchBar from "./SearchBar.svelte";
    import { config_manager, selected_config } from "./EditorLayout.js";
    import { parentIframeCommunication } from "../lib/utils.js";
    import { get } from "svelte/store";
    import { MeltCombo } from "@intechstudio/grid-uikit";

    export let visible: boolean = true;

    export function reset() {
        searchValue = "";
    }

    const dispatch = createEventDispatcher();

    const suggestions = [
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
    ].map((e) => Object({ value: e, info: e }));

    let searchValue = "";

    $: handleSearchValueChange(searchValue);

    function handleSearchValueChange(value: string) {
        const terms = stringToTerms(value.trim(), false, false);
        filter_value.set(new FilterValue(...terms));
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
    <!-- <SearchBar
        bind:value={searchValue}
        suggestions={searchSuggestions}
        on:suggestion-clicked={handleSuggestionClicked}
        on:input={handleInput}
    /> -->
    <MeltCombo
        title={"Search"}
        bind:value={searchValue}
        {suggestions}
        on:change={() => dispatch("sync")}
    />
</container>
