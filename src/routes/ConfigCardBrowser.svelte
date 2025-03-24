<script lang="ts">
  import { tooltip } from "../lib/actions/tooltip";
  import {
    createEventDispatcher,
    getContext,
    onDestroy,
    onMount,
  } from "svelte";
  import SvgIcon from "../lib/icons/SvgIcon.svelte";
  import type { Config } from "../lib/schemas";
  import { applyFocus } from "../lib/utils";
  import { doc, getDoc } from "firebase/firestore";
  import { userCollection } from "../lib/collections";

  const dispatchEvent = createEventDispatcher();

  interface SelectedComponentTypes {
    selectedComponentTypes: string[] | undefined;
  }

  export let data: Config & SelectedComponentTypes;

  export let isSelected: boolean;

  const display = getContext("display");

  let deleteConfirmFlag = false;
  let overwriteApplyFlag = false;

  let configOwner: string = "";
  onMount(() => {
    if (data.owner) {
      const userRef = doc(userCollection, data.owner);
      getDoc(userRef)
        .then((res) => res.data()?.username)
        .then((username) => {
          if (username) {
            configOwner = "@" + username;
          }
        });
    }
  });

  onDestroy(() => {});

  let nameInputField = {
    element: null as HTMLInputElement | null,
    doubleClicked: false,
    currentSelection: "",
  };

  let descriptionTextarea = {
    element: null as HTMLTextAreaElement | null,
    doubleClicked: false,
    currentSelection: "",
  };
</script>

<button
  on:click={() => {
    dispatchEvent("click", {});
  }}
  on:focusout={(e) => {
    if (e.relatedTarget == null) {
      dispatchEvent("focusout", {});
    }
  }}
  class="{isSelected
    ? 'border-emerald-500'
    : 'border-white/10'} flex flex-col justify-between items-start text-left w-full bg-white rounded border shadow dark:bg-secondary"
>
  <div class="px-3 pt-3 w-full">
    <div class="w-full flex items-center justify-between">
      <input
        bind:this={nameInputField.element}
        class="w-full mr-1 font-bold border bg-white dark:bg-transparent dark:hover:bg-neutral-800 focus:outline-none
                    {!data.isEditable || !isSelected
          ? 'pointer-events-none'
          : ''} 
                    {nameInputField.doubleClicked
          ? 'border-emerald-500'
          : 'border-transparent'}"
        readonly={!nameInputField.doubleClicked}
        on:keydown={(e) => {
          if (e.key == "Enter" && !e.shiftKey) {
            nameInputField.element?.blur();
          }
        }}
        on:blur={() => {
          window?.getSelection()?.removeAllRanges();
          nameInputField.doubleClicked = false;
          // reset input value if user clicked out without changing the value
          if (nameInputField.element?.value == "") {
            nameInputField.element.value = "Add name";
          }
          if (
            nameInputField.element?.value != nameInputField.currentSelection
          ) {
            dispatchEvent("name-change", {
              newName: nameInputField.element?.value,
            });
          }
        }}
        on:dblclick|stopPropagation|preventDefault={() => {
          nameInputField.doubleClicked = true;
          nameInputField.element?.setSelectionRange(
            0,
            nameInputField.element.value.length
          );
          nameInputField.currentSelection = nameInputField.element?.value || "";
        }}
        value={data.name}
      />
      <div class="relative flex items-center gap-x-1">
        {#if data.isEditable}
          {#if deleteConfirmFlag == false}
            <button
              class="flex group relative"
              on:click|stopPropagation={() => {
                deleteConfirmFlag = true;
              }}
              use:tooltip={{
                nowrap: true,
                placement: "bottom",
                duration: 75,
                instant: true,
                class: "px-2 py-1",
                text: "Delete",
              }}
            >
              <SvgIcon class="w-5" iconPath="delete" />
            </button>
          {:else}
            <button
              use:applyFocus
              on:blur|stopPropagation={() => {
                deleteConfirmFlag = false;
              }}
              on:click|stopPropagation={() => {
                dispatchEvent("delete-config");
                deleteConfirmFlag = false;
              }}
              class="bg-red-600 rounded px-1 py-0.5 text-xs">confirm</button
            >
          {/if}
          {#if overwriteApplyFlag == false}
            <button
              class="flex relative group"
              on:click|stopPropagation={() => {
                overwriteApplyFlag = true;
              }}
              use:tooltip={{
                nowrap: true,
                placement: "bottom",
                duration: 75,
                instant: true,
                class: "px-2 py-1",
                text: "Overwrite",
              }}
            >
              <SvgIcon class="w-5" iconPath="overwrite_profile" />
            </button>
          {:else}
            <button
              use:applyFocus
              on:blur={() => {
                overwriteApplyFlag = false;
              }}
              on:click|stopPropagation={() => {
                dispatchEvent("overwrite-profile");
                overwriteApplyFlag = false;
              }}
              class="bg-emerald-600 rounded px-1 py-0.5 text-xs">apply</button
            >
          {/if}
        {/if}
        <slot name="link-button" />
        <slot name="sync-config-button" />
        <slot name="split-config-button" />
        <slot name="import-config-browser-button" />
      </div>
    </div>
    <div
      class="dark:text-white pt-2 text-black text-opacity-80 dark:text-opacity-70"
    >
      <textarea
        rows={2}
        bind:this={descriptionTextarea.element}
        class="overflow-none w-full border bg-neutral-100 dark:bg-primary dark:hover:bg-neutral-800 focus:outline-none
                    {(!data.isEditable || !isSelected) && display === 'editor'
          ? 'pointer-events-none'
          : ''} 
                    {descriptionTextarea.doubleClicked
          ? 'border-emerald-500'
          : 'border-transparent'}"
        readonly={!descriptionTextarea.doubleClicked || display !== "editor"}
        on:keydown={(e) => {
          if (e.key == "Enter" && !e.shiftKey) {
            descriptionTextarea.element?.blur();
          }
        }}
        on:blur={() => {
          window?.getSelection()?.removeAllRanges();
          descriptionTextarea.doubleClicked = false;
          // reset input value if user clicked out without changing the value
          if (descriptionTextarea.element?.value == "") {
            descriptionTextarea.element.value = "Add description";
          }
          if (
            descriptionTextarea.element?.value !=
            descriptionTextarea.currentSelection
          ) {
            dispatchEvent("description-change", {
              newDescription: descriptionTextarea.element?.value,
            });
          }
        }}
        on:dblclick|stopPropagation|preventDefault={() => {
          descriptionTextarea.doubleClicked = true;
          descriptionTextarea.element?.setSelectionRange(
            0,
            descriptionTextarea.element.value.length
          );
          descriptionTextarea.currentSelection =
            descriptionTextarea.element?.value || "";
        }}
        value={data.description}
      />
    </div>
  </div>

  <div
    class=" w-full flex py-1 px-3 justify-between items-center md:border-t-2 border-neutral-200 dark:border-neutral-700"
  >
    <div
      class="dark:text-white text-black text-opacity-80 py-0.5 px-2 dark:border
                {data.selectedComponentTypes?.includes(data.type) ?? false
        ? 'dark:text-opacity-100 dark:border-white dark:border-opacity-10 dark:bg-white dark:bg-opacity-10'
        : 'dark:text-opacity-70 dark:border-transparent'}"
    >
      {data.type}
    </div>
    <div class="flex items-center {display === 'editor' ? 'gap-x-1' : ''}">
      <span class="text-black dark:text-opacity-70 dark:text-white"
        >{configOwner}</span
      >
      {#if display == "editor"}
        <div class="ml-1">
          {#if data.isEditable && data.public !== undefined}
            <slot name="toggle-accessibility" />
          {:else if data.public}
            <div
              class="relative group"
              use:tooltip={{
                nowrap: true,
                placement: "bottom",
                duration: 75,
                instant: true,
                class: "px-2 py-1",
                text: "Public",
              }}
            >
              <SvgIcon display={true} iconPath={"public"} />
            </div>
          {:else if data.public === false}
            <div
              class="relative group"
              use:tooltip={{
                nowrap: true,
                placement: "bottom",
                duration: 75,
                instant: true,
                class: "px-2 py-1",
                text: "Private",
              }}
            >
              <SvgIcon display={true} iconPath={"private"} />
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</button>
