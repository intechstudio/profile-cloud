<script lang="ts">
  import {
    contextTarget,
    type ContextMenuOptions,
  } from "@intechstudio/grid-uikit";

  import { SvgIcon } from "@intechstudio/grid-uikit";
  import {
    type AbstractFolderData,
    type AbstractTreeNode,
    TreeItemType,
  } from "./TreeNode.svelte";
  import { get } from "svelte/store";

  export let item: AbstractTreeNode<any>;
  export let expanded: boolean;
  export let ctxOptions: ContextMenuOptions = { items: [] };
  export let level: number;

  let iconPath = "";

  $: {
    if (level !== 0) {
      iconPath = expanded ? "folder_open" : "folder_closed";
    } else {
      if (data.title === "My Configs") {
        iconPath = "profile";
      } else if (data.title === "Community Configs") {
        iconPath = "publicIcon";
      } else if (data.title === "Other Configs") {
        iconPath = "publicIcon";
      } else if (data.title === "Recommended Configs") {
        iconPath = "tick";
      } else if (data.title === "Workflow Configs") {
        iconPath = "tick";
      } else if (data.title === "Unsupported Configs") {
        iconPath = "deleteIcon";
      }
    }
  }

  let data: AbstractFolderData;
  $: data = $item.data as AbstractFolderData;
</script>

<div class="header" class:expanded use:contextTarget={ctxOptions}>
  <SvgIcon fill="var(--foreground-muted)" {iconPath} />
  <div class="title">
    <slot name="title-label">
      {`${data.title} (${
        $item.children.filter((e) => get(e).type !== TreeItemType.FOLDER).length
      })`}</slot
    >
  </div>
</div>

<style>
  .header {
    display: flex;
    gap: 0.5rem;
    width: 100%;
    align-items: center;
    padding: 0.25rem;
    color: var(--foreground-muted);
  }
  .header:hover {
    background-color: var(--background);
  }

  .expanded {
    color: var(--foreground);
    background-color: var(--background2);
    font-weight: bolder;
  }

  .title {
    display: flex;
    flex-grow: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
