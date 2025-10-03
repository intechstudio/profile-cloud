<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { stringToTerms, type Term } from "./Filter";

  const dispatch = createEventDispatcher();

  export let value: string = "";
  export let suggestions: string[];

  let showSuggestions = false;
  let suggestionContainer: HTMLElement;
  let input: HTMLInputElement;

  let displayedSuggestions: string[] = [];

  function handleValueChange(value: string) {
    const position = input.selectionStart;
    if (!position) {
      return;
    }

    const terms = stringToTerms(value.trim(), false, false);
    let count = 0;
    let current: Term | undefined;

    for (const term of terms) {
      current = term;
      if (position <= count + term.value.length) {
        break;
      } else {
        count += term.value.length;
      }
    }

    if (current) {
      displayedSuggestions = suggestions.filter((e) =>
        e
          .toLowerCase()
          .includes(current.value.replaceAll("$", "").toLocaleLowerCase()),
      );
    }

    dispatch("change", { value: value });
  }

  $: if (input) {
    handleValueChange(value);
  }

  function handleSuggestionClicked(suggestion: string) {
    const position = input.selectionStart;
    dispatch("suggestion-clicked", {
      value: suggestion,
      caretPosition: position,
    });
  }

  function handleSearchbarFocus() {
    showSuggestions = true;
  }

  function handleSearchbarBlur(event: FocusEvent) {
    // Delay the update of showSuggestions to ensure that blur event on suggestion container fires first
    setTimeout(() => {
      showSuggestions = false;
    }, 150);
  }

  function handleInput(e: any) {
    dispatch("input", e.detail);
  }
</script>

<div id="searchbar" class="flex flex-col w-full relative">
  <div class="relative w-full">
    <svg
      class="absolute left-3 bottom-[28%]"
      width="14"
      height="14"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.2095 11.6374C14.2989 10.1509 14.7868 8.30791 14.5756
                  6.47715C14.3645 4.64639 13.4699 2.96286 12.0708 1.76338C10.6717
                  0.563893 8.87126 -0.0630888 7.02973 0.0078685C5.1882 0.0788258
                  3.44137 0.84249 2.13872 2.14608C0.83606 3.44967 0.0736462 5.19704
                  0.00400665 7.03862C-0.0656329 8.8802 0.562637 10.6802 1.76312
                  12.0784C2.96361 13.4767 4.64778 14.3701 6.47869 14.5799C8.3096
                  14.7897 10.1522 14.3005 11.6379 13.2101H11.6368C11.6705 13.2551
                  11.7065 13.2979 11.747 13.3395L16.0783 17.6707C16.2892 17.8818
                  16.5754 18.0005 16.8738 18.0006C17.1723 18.0007 17.4585 17.8822
                  17.6696 17.6713C17.8807 17.4603 17.9994 17.1742 17.9995
                  16.8758C17.9996 16.5773 17.8811 16.2911 17.6702 16.08L13.3389
                  11.7487C13.2987 11.708 13.2554 11.6704 13.2095
                  11.6362V11.6374ZM13.4998 7.31286C13.4998 8.12541 13.3397 8.93001
                  13.0288 9.68071C12.7178 10.4314 12.2621 11.1135 11.6875
                  11.6881C11.113 12.2626 10.4308 12.7184 9.68014 13.0294C8.92944
                  13.3403 8.12484 13.5004 7.31229 13.5004C6.49974 13.5004 5.69514
                  13.3403 4.94444 13.0294C4.19373 12.7184 3.51163 12.2626 2.93707
                  11.6881C2.3625 11.1135 1.90674 10.4314 1.59578 9.68071C1.28483
                  8.93001 1.12479 8.12541 1.12479 7.31286C1.12479 5.67183 1.77669
                  4.09802 2.93707 2.93763C4.09745 1.77725 5.67126 1.12536 7.31229
                  1.12536C8.95332 1.12536 10.5271 1.77725 11.6875 2.93763C12.8479
                  4.09802 13.4998 5.67183 13.4998 7.31286V7.31286Z"
        fill="#CDCDCD"
      />
    </svg>

    {#if value != ""}
      <button
        class="absolute right-2 bottom-[25%]"
        on:click={() => (value = "")}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 39 39"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24.25 32.9102L14.75 23.4102M24.25 23.4102L14.75 32.9102"
            stroke="#FFF"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    {/if}
    <input
      type="text"
      bind:this={input}
      bind:value
      on:focus={handleSearchbarFocus}
      on:blur={handleSearchbarBlur}
      on:input={handleInput}
      class="flex w-full py-2 px-12
  dark:placeholder-gray-400 text-md focus:outline-none"
      placeholder="Find..."
    />
  </div>
  {#if showSuggestions && displayedSuggestions.length > 0}
    <div
      bind:this={suggestionContainer}
      class="suggestionbox absolute top-full left-0 z-[1] rounded-b flex flex-col w-full max-h-36 overflow-y-auto"
    >
      {#each displayedSuggestions as suggestion}
        <button
          on:click={() => handleSuggestionClicked(suggestion)}
          class="suggestionbutton text-xs text-left
  py-0.5 px-1 h-min"
        >
          {suggestion}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  input {
    background-color: var(--background-soft);
  }

  input::placeholder {
    color: var(--foreground-soft);
  }

  div.suggestionbox {
    border: 1px solid var(--foreground-muted);
    background-color: var(--popover-background);
  }
  button.suggestionbutton {
    padding: 0.5rem;
  }
  button.suggestionbutton:hover {
    background-color: var(--popover-selection);
  }
</style>
