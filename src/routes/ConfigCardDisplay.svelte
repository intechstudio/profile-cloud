<script lang="ts">
  import { tooltip } from "./../lib/actions/tooltip";
  import { createEventDispatcher } from "svelte";
  import type { Config } from "../lib/schemas";
  import { applyFocus } from "../lib/utils";
  import { doc, getDoc } from "firebase/firestore";
  import { userCollection } from "../lib/collections";
  import ConfigDescription from "./ConfigDescription.svelte";
  import DataInput from "../lib/components/DataInput.svelte";

  import {
    Block,
    BlockBody,
    BlockColumn,
    BlockRow,
    BlockTitle,
    SvgIcon,
  } from "@intechstudio/grid-uikit";
  const dispatchEvent = createEventDispatcher();

  export let data: Config | undefined;

  let deleteConfirmFlag = false;
  let overwriteApplyFlag = false;

  let configOwner: string = "";

  function handleSelectedConfigChange(config: Config) {
    if (config.owner) {
      const userRef = doc(userCollection, data?.owner);
      getDoc(userRef)
        .then((res) => res.data()?.username)
        .then((username) => {
          if (username) {
            configOwner = "@" + username;
          }
        });
    } else {
      configOwner = "";
    }
  }

  $: if (typeof data !== "undefined") {
    handleSelectedConfigChange(data);
  }

  function handleDescriptionChange(e: CustomEvent<string>) {
    const value = e.detail;
    dispatchEvent("description-change", {
      newDescription: value,
    });
  }
</script>

<div
  style="color: var(--foreground); background: var(--background);"
  class="card-container"
>
  {#if typeof data !== "undefined"}
    <BlockRow>
      <div class="created-by">
        <span>{configOwner === "" ? "Unknown" : configOwner}</span>
        <span class="modified-date"
          >Last modified: {data.modifiedAt.toLocaleDateString()}</span
        >
      </div>

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
            <SvgIcon fill="var(--foreground-muted)" iconPath="deleteIcon" />
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
      <div class="accessibility-actions">
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
            <SvgIcon fill="var(--foreground-muted)" iconPath={"privateIcon"} />
          </div>
        {/if}
        <slot name="import-config-browser-button" />
      </div>
    </BlockRow>
    <BlockColumn>
      <DataInput
        value={data.displayName ?? data.name}
        disabled={!data.isEditable}
        placeholder={"Add name"}
        bold={true}
        on:change={(e) => {
          const { value } = e.detail;
          dispatchEvent("name-change", {
            value,
          });
        }}
      />
      <BlockRow>
        <span>Folder:</span>
        <DataInput
          value={data.virtualPath ?? ""}
          placeholder={"Unsorted"}
          disabled={!data.isEditable}
          on:change={(e) => {
            const { value } = e.detail;
            const path = value;
            dispatchEvent("path-change", {
              value: path === "" ? undefined : path,
            });
          }}
        />
      </BlockRow>
      {#if data.files && data.files.length > 0}
        <span class="border-b">Files:</span>
        <BlockRow>
          <div class="flex flex-col w-full">
            {#each data.files as file}
              <div class="flex w-full justify-between">
                <div class="flex items-center gap-1">
                  <SvgIcon
                    fill="var(--foreground-muted)"
                    iconPath="file"
                    width={14}
                    height={14}
                  />
                  <span>{file.name}</span>
                </div>
                <div>
                  {new TextEncoder().encode(file.content).length}b
                </div>
              </div>
            {/each}
          </div>
        </BlockRow>
      {/if}
    </BlockColumn>
    <div style="color: var(--foreground-muted)" class="description-container">
      <ConfigDescription
        value={data.description}
        disabled={!data.isEditable}
        on:change={handleDescriptionChange}
      />
    </div>
  {:else}
    <div
      style="color: var(--foreground-muted); background: var(--background)"
      class="empty-state"
    >
      No configuration is selected
    </div>
  {/if}
</div>

<style>

  .card-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 0.5rem;
    overflow: auto;
  }

  .created-by {
    font-size: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    flex-grow: 1;
    justify-content: space-between;
  }

  .modified-date {
    color: var(--foreground-muted);
    white-space: nowrap;
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
    padding: 0 0.25rem;
    font-size: 0.75rem;
  }

  .confirm-apply {
    background-color: #059669;
    border-radius: 0.25rem;
    padding: 0 0.25rem;
    font-size: 0.75rem;
  }

  .accessibility-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .description-container {
    display: flex;
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow-y: auto;
  }

  .empty-state {
    display: flex;
    max-height: fit-content;
    align-items: center;
    justify-content: center;
  }
</style>
