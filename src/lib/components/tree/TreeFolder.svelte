<script lang="ts">
  import {
    contextTarget,
    type ContextMenuOptions,
  } from "@intechstudio/grid-uikit";

  import {
    type AbstractFolderData,
    type AbstractTreeNode,
    TreeItemType,
  } from "./TreeNode.svelte";
  import { get } from "svelte/store";

  export let item: AbstractTreeNode<any>;
  export let expanded: boolean;
  export let ctxOptions: ContextMenuOptions = { items: [] };

  let data: AbstractFolderData;
  $: data = $item.data as AbstractFolderData;
</script>

<div class="header" class:expanded use:contextTarget={ctxOptions}>
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
    flex-grow: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
