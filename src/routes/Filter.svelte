<script lang="ts">
    import { FilterValue } from "./Filter.ts";
    import { filter_value, stringToTerms } from "./Filter";
    import { createEventDispatcher } from "svelte";
    import SearchBar from "./SearchBar.svelte";

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
</script>

<container class:hidden={!visible} class="w-full h-full">
    <SearchBar
        bind:value={searchValue}
        suggestions={searchSuggestions}
        on:suggestion-clicked={handleSuggestionClicked}
    />
</container>
