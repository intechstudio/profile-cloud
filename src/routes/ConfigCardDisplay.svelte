<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Config } from "../lib/schemas";
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
    IconButton,
    tooltip,
  } from "@intechstudio/grid-uikit";
  const dispatchEvent = createEventDispatcher();

  export let data: Config | undefined;

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
        <IconButton
          iconPath="deleteIcon"
          tooltipText="Delete"
          tooltipExtendedText={`Delete '${data.name}'?`}
          tooltipButtons={[
            { label: "Cancel", handler: undefined },
            { label: "Confirm", handler: () => dispatchEvent("delete-config") },
          ]}
        />
        <IconButton
          iconPath="overwrite_profile"
          tooltipText="Overwrite"
          tooltipExtendedText={`Overwrite '${data.name}'?`}
          tooltipButtons={[
            { label: "Cancel", handler: undefined },
            {
              label: "Confirm",
              handler: () => dispatchEvent("overwrite-profile"),
            },
          ]}
        />
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
      {#if data.files && data.files.length > 0}
        <div class="files-scroll">
          <table class="files-table">
            <thead>
              <tr>
                <th>Page files for File Manager</th>
                <th style="text-align: right;">Size</th>
              </tr>
            </thead>
            <tbody>
              {#each data.files as file}
                <tr>
                  <td>
                    <div class="accessibility-actions">
                      <SvgIcon
                        fill="var(--foreground-muted)"
                        iconPath="file"
                        width={1.2}
                        height={1.2}
                      />
                      <span>{file.name}</span>
                    </div>
                  </td>
                  <td class="size-cell">
                    {new TextEncoder().encode(file.content).length}b
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
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

  .files-table {
    width: 100%;
    border-collapse: collapse;
    font-size: inherit;
  }

  .files-scroll {
    max-height: calc(4 * 2rem + 2rem); /* header + 4 rows before scrolling */
    overflow-y: auto;
  }

  .files-table th {
    text-align: left;
    padding: 0.25rem 0.5rem;
    color: var(--foreground-muted);
    font-weight: normal;
    position: sticky;
    top: 0;
    background: var(--background);
  }

  .files-table td {
    padding: 0.25rem 0.5rem;
  }

  .files-table thead tr {
    border-bottom: 1px solid gray;
  }

  .size-cell {
    text-align: right;
    white-space: nowrap;
    color: var(--foreground-muted);
  }
</style>
