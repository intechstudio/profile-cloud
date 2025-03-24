<script lang="ts" context="module">
  export enum ConfigurationSaveType {
    MODULE = 0,
    ELEMENT = 1,
    SNIPPET = 2,
  }

  enum ConfigurationSaveState {
    SELECT = 0,
    SAVE = 1,
  }
</script>

<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let data: string[] | undefined = undefined;

  const dispatch = createEventDispatcher();

  $: {
    if (typeof data !== "undefined") {
      handleDatachange(data!);
    }
  }

  function handleDatachange(array: string[]) {
    if (array.length === 0) {
      module = element = "";
      return;
    }

    module = array[0];
    element = array[1].at(0)?.toUpperCase() + array[1].slice(1);
  }

  let module: string;
  let element: string;
  let selected: ConfigurationSaveType | undefined = undefined;

  function handleSelectionChange(value: ConfigurationSaveType) {
    selected = value;
    switch (value) {
      case ConfigurationSaveType.ELEMENT: {
        nameInputValue = `New ${element} Configuration`;
        break;
      }
      case ConfigurationSaveType.MODULE: {
        nameInputValue = `New ${module} Configuration`;
        break;
      }
      case ConfigurationSaveType.SNIPPET: {
        nameInputValue = `New Snippet`;
        break;
      }
    }
  }

  let state = ConfigurationSaveState.SELECT;

  function handleNextClicked(value: ConfigurationSaveState) {
    switch (value) {
      case ConfigurationSaveState.SELECT: {
        state = ConfigurationSaveState.SAVE;
        break;
      }
      case ConfigurationSaveState.SAVE: {
        dispatch("save", { type: selected, name: nameInputValue });
        dispatch("close");
        break;
      }
    }
  }

  function handleBackClicked(value: ConfigurationSaveState) {
    switch (value) {
      case ConfigurationSaveState.SELECT: {
        dispatch("close");
        break;
      }
      case ConfigurationSaveState.SAVE: {
        state = ConfigurationSaveState.SELECT;
        break;
      }
    }
  }

  $: {
    switch (state) {
      case ConfigurationSaveState.SELECT: {
        break;
      }
      case ConfigurationSaveState.SAVE: {
        nameInput?.focus();
        break;
      }
    }
  }

  $: handleStateChange(state);

  function handleStateChange(state: ConfigurationSaveState) {
    dispatch("state-change", { state: state });
  }

  let nameInputValue: string;
  let nameInput: HTMLInputElement | undefined;
</script>

<container class="flex w-full">
  {#if state === ConfigurationSaveState.SELECT}
    <div class="flex flex-row gap-2 w-full">
      <div class="grid grid-flow-col w-full gap-2">
        <button
          class="flex w-full dark:bg-primary-700 dark:hover:bg-secondary items-center justify-center {selected ===
          ConfigurationSaveType.ELEMENT
            ? 'border-white'
            : 'border-transparent'} border-opacity-75 border-2"
          on:click={() => handleSelectionChange(ConfigurationSaveType.ELEMENT)}
        >
          {element} Element
        </button>
        <button
          class="flex w-full dark:bg-primary-700 dark:hover:bg-secondary items-center justify-center {selected ===
          ConfigurationSaveType.MODULE
            ? 'border-white'
            : 'border-transparent'} border-opacity-75 border-2"
          on:click={() => handleSelectionChange(ConfigurationSaveType.MODULE)}
        >
          {module} Module
        </button>
        <button
          class="flex w-full dark:bg-primary-700 dark:hover:bg-secondary items-center justify-center {selected ===
          ConfigurationSaveType.SNIPPET
            ? 'border-white'
            : 'border-transparent'} border-opacity-75 border-2"
          on:click={() => handleSelectionChange(ConfigurationSaveType.SNIPPET)}
        >
          Snippet
        </button>
      </div>
      <div class="flex flex-col gap-2 w-20">
        <button
          class="px-4 py-1 dark:bg-primary-700 dark:hover:bg-secondary"
          on:click={() => handleBackClicked(ConfigurationSaveState.SELECT)}
          >Cancel</button
        >
        <button
          class="px-4 py-1 dark:bg-emerald-600 font-medium"
          class:opacity-50={typeof selected === "undefined"}
          class:dark:hover:bg-emerald-700={typeof selected !== "undefined"}
          disabled={typeof selected === "undefined"}
          on:click={() => handleNextClicked(ConfigurationSaveState.SELECT)}
          >Next</button
        >
      </div>
    </div>
  {:else if state === ConfigurationSaveState.SAVE}
    <div class="grid grid-cols-[1fr_auto] gap-2 w-full">
      <div class="flex flex-col gap-2 w-full">
        {#if selected === ConfigurationSaveType.ELEMENT}
          <span>{element} Configuration</span>
        {:else if selected === ConfigurationSaveType.MODULE}
          <span>{module} Configuration</span>
        {:else if selected === ConfigurationSaveType.SNIPPET}
          <span>Snippet Name:</span>
        {/if}

        <input
          type="text"
          bind:this={nameInput}
          bind:value={nameInputValue}
          class="flex w-full p-2 bg-white dark:bg-primary-700
                        dark:placeholder-gray-400 text-md focus:outline-none"
          placeholder="My Configuration..."
        />
      </div>
      <div class="flex flex-col gap-2 w-20">
        <button
          class="px-4 py-1 dark:bg-primary-700 dark:hover:bg-secondary"
          on:click={() => handleBackClicked(ConfigurationSaveState.SAVE)}
          >Back</button
        >
        <button
          class="px-4 py-1 dark:bg-emerald-600 font-medium"
          class:opacity-50={typeof selected === "undefined"}
          class:dark:hover:bg-emerald-700={typeof selected !== "undefined"}
          disabled={typeof selected === "undefined"}
          on:click={() => handleNextClicked(ConfigurationSaveState.SAVE)}
          >Save</button
        >
      </div>
    </div>
  {/if}
</container>
