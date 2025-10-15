<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value = "";
  export let placeholder = "";
  export let disabled = false;
  export let bold = false;

  const dispatch = createEventDispatcher();
  let edited = false;
  let element: HTMLInputElement;

  $: displayedText = value.trim();

  function handleBlur() {
    window?.getSelection()?.removeAllRanges();
    edited = false;

    if (value !== displayedText.trim()) {
      value = displayedText.trim();
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
  style="color: var(--foreground)"
  class:edited
  class:isdisabled={disabled}
  class:isbold={bold}
  on:keydown={(e) => e.key == "Enter" && !e.shiftKey && element?.blur()}
  on:blur={handleBlur}
  on:dblclick|stopPropagation|preventDefault={handleDblClick}
  bind:value={displayedText}
  {placeholder}
/>

<style>
  input {
    background-color: transparent;
    width: 100%;
    margin-right: 1rem;
    border: 1px solid transparent;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    outline-style: none;
  }

  input:hover {
    background-color: var(--background-muted);
  }

  input.isbold {
    font-weight: bold;
    font-size: 110%;
  }

  input.edited {
    background-color: var(--background-soft);
    border-color: green;
  }

  input.isdisabled {
    pointer-events: none;
  }
</style>
