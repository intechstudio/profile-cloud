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
  class="flex flex-col flex-1 min-h-0 p-2 overflow-auto"
>
  {#if typeof data !== "undefined"}
    <BlockRow>
      <div class="text-xs flex flex-grow">
        Created by {configOwner === "" ? "Unknown" : configOwner}
      </div>

      {#if data.isEditable}
        {#if deleteConfirmFlag == false}
          <button
            class="flex group relative"
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
            class="bg-red-600 rounded px-1 text-xs">confirm</button
          >
        {/if}
        {#if overwriteApplyFlag == false}
          <button
            class="flex relative group"
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
            class="bg-emerald-600 rounded px-1 text-xs">apply</button
          >
        {/if}
      {/if}
      <slot name="link-button" />
      <slot name="sync-config-button" />
      <slot name="split-config-button" />
      <div class="items-center gap-x-1">
        {#if data.isEditable && data.public !== undefined}
          <slot name="toggle-accessibility" />
        {:else if data.public}
          <div
            class="relative group"
            use:tooltip={{
              instant: true,
              text: "Public",
            }}
          >
            <SvgIcon fill="var(--foreground-muted)" iconPath={"publicIcon"} />
          </div>
        {:else if data.public === false}
          <div
            class="relative group"
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
    </BlockColumn>
    <div
      style="color: var(--foreground-muted)"
      class="flex flex-1 min-h-0 w-full overflow-y-auto"
    >
      <ConfigDescription
        value={data.description}
        disabled={!data.isEditable}
        on:change={handleDescriptionChange}
      />
    </div>
  {:else}
    <div
      style="color: var(--foreground-muted); background: var(--background)"
      class="flex max-h-fit items-center justify-center"
    >
      No configuration is selected
    </div>
  {/if}
</div>
