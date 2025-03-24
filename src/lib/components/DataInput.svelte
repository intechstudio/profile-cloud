<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value = "";
  export let placeholder = "";
  export let disabled = false;
  export let bold = false;

  const dispatch = createEventDispatcher();
  let edited = false;
  let element: HTMLInputElement;

  $: displayedText = edited ? value : value || placeholder;

  function handleBlur() {
    window?.getSelection()?.removeAllRanges();
    edited = false;

    if (value !== displayedText) {
      value = displayedText;
      dispatch("change", { value });
    }
  }

  function handleDblClick() {
    edited = true;
    element?.setSelectionRange(0, element.value.length);
  }
</script>

<input
  bind:this={element}
  class="w-full mr-1 border bg-white dark:bg-transparent truncate dark:hover:bg-neutral-800 focus:outline-none {edited
    ? 'border-emerald-500'
    : 'border-transparent'}"
  class:pointer-events-none={disabled}
  class:font-bold={bold}
  readonly={!edited}
  on:keydown={(e) => e.key == "Enter" && !e.shiftKey && element?.blur()}
  on:blur={handleBlur}
  on:dblclick|stopPropagation|preventDefault={handleDblClick}
  bind:value={displayedText}
/>
