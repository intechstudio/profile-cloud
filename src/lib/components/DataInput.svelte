<script lang="ts">
    import { createEventDispatcher } from "svelte";
    export let value = "";
    export let placeholder = "";
    export let disabled = false;
    export let bold = false;

    const dispatch = createEventDispatcher();

    let edited = false;
    let element: HTMLInputElement;
    let currentSelection = "";
</script>

<input
    bind:this={element}
    class="w-full mr-1 border bg-white dark:bg-transparent truncate dark:hover:bg-neutral-800 focus:outline-none {edited
        ? 'border-emerald-500'
        : 'border-transparent'}"
    class:pointer-events-none={disabled}
    class:font-bold={bold}
    readonly={!edited}
    on:keydown={(e) => {
        if (e.key == "Enter" && !e.shiftKey) {
            element?.blur();
        }
    }}
    on:blur={() => {
        window?.getSelection()?.removeAllRanges();
        edited = false;
        // reset input value if user clicked out without changing the value
        if (element?.value == "") {
            element.value = placeholder;
        }
        if (element?.value != currentSelection) {
            dispatch("change", {
                value: element?.value
            });
        }
    }}
    on:dblclick|stopPropagation|preventDefault={() => {
        edited = true;
        element?.setSelectionRange(0, element.value.length);
        currentSelection = element?.value || "";
    }}
    {value}
/>
