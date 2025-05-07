<script lang="ts">
  import { FilterValue, Term } from "./Filter";
  import { filter_value, stringToTerms } from "./Filter";
  import { createEventDispatcher } from "svelte";
  import SearchBar from "./SearchBar.svelte";
  import { config_manager, selected_config } from "./EditorLayout.js";
  import { parentIframeCommunication } from "../lib/utils.js";
  import { get } from "svelte/store";
  import { grid } from "@intechstudio/grid-protocol";

  export let visible: boolean = true;

  export function reset() {
    searchValue = "";
  }

  const dispatch = createEventDispatcher();

  let searchSuggestions: string[] = [];

  const defaultSuggestions = [
    "Profile",
    "Preset",
    "BU16",
    "EF44",
    "EN16",
    "PBF4",
    "PO16",
    "TEK2",
    "VSN1L",
    "VSN1R",
    "VSN2",
    "Button",
    "Encoder",
    "Potmeter",
    "Fader",
    "System",
    "Endless",
  ];
  const blockSuggestions = Object.values(grid.ActionBlock.shortHumanMap).map(
    (e) => e.replaceAll(" ", "").replaceAll("&", "And"),
  );

  let searchValue = "";

  $: handleSearchValueChange(searchValue);

  function handleSearchValueChange(value: string) {
    const terms = stringToTerms(value.trim(), false, false);
    const isSpecialSearch =
      typeof terms.find((e) => e.value.startsWith("$")) !== "undefined";

    searchSuggestions = defaultSuggestions;

    if (isSpecialSearch) {
      searchSuggestions = [...blockSuggestions, ...searchSuggestions];
    }

    filter_value.set(new FilterValue(...terms));
  }

  function handleSuggestionClicked(e: CustomEvent) {
    const { value, caretPosition } = e.detail;
    const terms = stringToTerms(searchValue.trim(), false, false);
    let count = 0;
    let current: Term | undefined;

    for (const term of terms) {
      current = term;
      if (caretPosition <= count + term.value.length) {
        break;
      } else {
        count += term.value.length;
      }
    }

    if (current) {
      if (blockSuggestions.includes(value)) {
        current.value = "$" + value;
      } else {
        current.value = value;
      }
      searchValue = terms.map((e) => e.value).join(" ");
    }
  }

  function handleInput() {
    const selected = $selected_config?.id;
    const configs = $config_manager?.configs;
    if (configs) {
      parentIframeCommunication({
        windowPostMessageName: "provideSelectedConfigForEditor",
        dataForParent: { config: get(configs).find((e) => e.id === selected) },
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
