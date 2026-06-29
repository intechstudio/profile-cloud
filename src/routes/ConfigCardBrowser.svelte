<script lang="ts">
  import { tooltip } from "../lib/actions/tooltip";
  import {
    createEventDispatcher,
    getContext,
    onDestroy,
    onMount,
  } from "svelte";
  import { SvgIcon } from "@intechstudio/grid-uikit";
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
  class="card"
  class:card-selected={isSelected}
>
  <div class="card-body">
    <div class="card-header">
      <input
        bind:this={nameInputField.element}
        class="name-input"
        class:editing={nameInputField.doubleClicked}
        class:disabled={!data.isEditable || !isSelected}
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
            nameInputField.element.value.length,
          );
          nameInputField.currentSelection = nameInputField.element?.value || "";
        }}
        value={data.name}
      />
      <div class="actions-row">
        {#if data.isEditable}
          {#if deleteConfirmFlag == false}
            <button
              class="icon-button"
              on:click|stopPropagation={() => {
                deleteConfirmFlag = true;
              }}
              use:tooltip={{
                instant: true,
                text: "Delete",
              }}
            >
              <SvgIcon fill="var(--foreground-muted)" iconPath="delete" />
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
              class="confirm-delete">confirm</button
            >
          {/if}
          {#if overwriteApplyFlag == false}
            <button
              class="icon-button"
              on:click|stopPropagation={() => {
                overwriteApplyFlag = true;
              }}
              use:tooltip={{
                instant: true,
                text: "Overwrite",
              }}
            >
              <SvgIcon
                fill="var(--foreground-muted)"
                iconPath="overwrite_profile"
              />
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
              class="confirm-apply">apply</button
            >
          {/if}
        {/if}
        <slot name="link-button" />
        <slot name="sync-config-button" />
        <slot name="split-config-button" />
        <slot name="import-config-browser-button" />
      </div>
    </div>
    <div class="description-section">
      <textarea
        rows={2}
        bind:this={descriptionTextarea.element}
        class="description-input"
        class:editing={descriptionTextarea.doubleClicked}
        class:disabled={(!data.isEditable || !isSelected) &&
          display === "editor"}
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
            descriptionTextarea.element.value.length,
          );
          descriptionTextarea.currentSelection =
            descriptionTextarea.element?.value || "";
        }}
        value={data.description}
      />
    </div>
  </div>

  <div class="card-footer">
    <div
      class="type-badge"
      class:type-badge-active={data.selectedComponentTypes?.includes(
        data.type,
      ) ?? false}
    >
      {data.type}
    </div>
    <div class="footer-right" class:footer-right-editor={display === "editor"}>
      <span class="modified-date"
        >Last modified: {data.modifiedAt.toLocaleDateString()}</span
      >
      <span class="owner-name">{configOwner}</span>
      {#if display == "editor"}
        <div class="visibility-container">
          {#if data.isEditable && data.public !== undefined}
            <slot name="toggle-accessibility" />
          {:else if data.public}
            <div
              class="icon-button"
              use:tooltip={{
                instant: true,
                text: "Public",
              }}
            >
              <SvgIcon fill="var(--foreground-muted)" iconPath={"publicIcon"} />
            </div>
          {:else if data.public === false}
            <div
              class="icon-button"
              use:tooltip={{
                instant: true,
                text: "Private",
              }}
            >
              <SvgIcon
                fill="var(--foreground-muted)"
                iconPath={"privateIcon"}
              />
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</button>

<style>
  .card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    text-align: left;
    width: 100%;
    color: var(--foreground);
    background-color: var(--background);
    border-radius: 0.25rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: pointer;
  }

  .card-selected {
    border-color: #10b981;
  }

  .card-body {
    padding: 0.75rem 0.75rem 0;
    width: 100%;
  }

  .card-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .name-input {
    width: 100%;
    margin-right: 0.25rem;
    font-weight: bold;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    outline: none;
  }

  .name-input:hover {
    background-color: var(--background-muted);
  }

  .name-input.editing {
    border-color: #10b981;
  }

  .name-input.disabled {
    pointer-events: none;
  }

  .actions-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .icon-button {
    display: flex;
    position: relative;
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .confirm-delete {
    background-color: #dc2626;
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    font-size: 0.75rem;
  }

  .confirm-apply {
    background-color: #059669;
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    font-size: 0.75rem;
  }

  .description-section {
    padding-top: 0.5rem;
    color: var(--foreground-muted);
  }

  .description-input {
    overflow: visible;
    width: 100%;
    border: 1px solid transparent;
    background-color: var(--background-muted);
    color: inherit;
    outline: none;
  }

  .description-input:hover {
    background-color: var(--background-muted);
  }

  .description-input.editing {
    border-color: #10b981;
  }

  .description-input.disabled {
    pointer-events: none;
  }

  .card-footer {
    width: 100%;
    display: flex;
    padding: 0.25rem 0.75rem;
    justify-content: space-between;
    align-items: center;
    border-top: 2px solid var(--border, rgba(255, 255, 255, 0.1));
  }

  .type-badge {
    color: var(--foreground-muted);
    padding: 0.125rem 0.5rem;
    border: 1px solid transparent;
  }

  .type-badge-active {
    color: var(--foreground);
    border-color: rgba(255, 255, 255, 0.1);
    background-color: rgba(255, 255, 255, 0.1);
  }

  .footer-right {
    display: flex;
    align-items: center;
  }

  .footer-right-editor {
    gap: 0.25rem;
  }

  .modified-date {
    color: var(--foreground-muted);
    font-size: 0.75rem;
  }

  .owner-name {
    color: var(--foreground-muted);
  }

  .visibility-container {
    margin-left: 0.25rem;
  }
</style>
