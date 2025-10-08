<script lang="ts" context="module">
  export enum ConfigurationSaveType {
    NONE = 0,
    MODULE = 1,
    ELEMENT = 2,
    SNIPPET = 3,
  }

  enum ConfigurationSaveState {
    SELECT = 0,
    SAVE = 1,
  }
</script>

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import {
    MoltenPushButton,
    MoltenInput,
    MeltRadio,
    BlockTitle,
  } from "@intechstudio/grid-uikit";
  import {
    BlockRow,
    BlockColumn,
    Block,
    BlockBody,
  } from "@intechstudio/grid-uikit";

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
  let selected: ConfigurationSaveType = ConfigurationSaveType.NONE;

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

  $: handleStateChange(state);

  function handleStateChange(state: ConfigurationSaveState) {
    dispatch("state-change", { state: state });
  }

  $: handleSelectionChange(selected);

  let options = [];

  $: {
    options = [
      { title: `${element} Element`, value: ConfigurationSaveType.ELEMENT },
      { title: `${module} Module`, value: ConfigurationSaveType.MODULE },
      { title: `Snippet`, value: ConfigurationSaveType.SNIPPET },
    ];
  }

  let nameInputValue: string;
</script>

{#if state === ConfigurationSaveState.SELECT}
  <BlockColumn>
    <MeltRadio
      style="button"
      bind:target={selected}
      orientation="horizontal"
      size="full"
      {options}
    />
    <BlockRow>
      <MoltenPushButton
        click={() => {
          handleBackClicked(ConfigurationSaveState.SELECT);
        }}
        text={`Back`}
        style={"normal"}
      />

      <MoltenPushButton
        click={() => {
          handleNextClicked(ConfigurationSaveState.SELECT);
        }}
        disabled={selected === ConfigurationSaveType.NONE}
        text={`Next`}
        style={"accept"}
      />
    </BlockRow>
  </BlockColumn>
{:else if state === ConfigurationSaveState.SAVE}
  <BlockColumn>
    {#if selected === ConfigurationSaveType.ELEMENT}
      <BlockTitle>{element} Configuration</BlockTitle>
    {:else if selected === ConfigurationSaveType.MODULE}
      <BlockTitle>{module} Configuration</BlockTitle>
    {:else if selected === ConfigurationSaveType.SNIPPET}
      <BlockTitle>Snippet Name</BlockTitle>
    {/if}

    <MoltenInput bind:target={nameInputValue} />
    <BlockRow>
      <MoltenPushButton
        click={() => {
          handleBackClicked(ConfigurationSaveState.SAVE);
        }}
        text={`Back`}
        style={"normal"}
      />

      <MoltenPushButton
        click={() => {
          handleNextClicked(ConfigurationSaveState.SAVE);
        }}
        disabled={selected === ConfigurationSaveType.NONE}
        text={`Save`}
        style={"accept"}
      />
    </BlockRow>
  </BlockColumn>
{/if}

<style>
</style>
