<script lang="ts" context="module">
  export interface FolderSlotProps {
    level: number;
    item: AbstractTreeNode<any>;
    isExpanded: boolean;
  }
  export interface ItemSlotProps {
    level: number;
    item: AbstractTreeNode<any>;
    isExpanded: boolean;
  }
</script>

<script lang="ts">
  import TreeNode, {
    type AbstractTreeNode,
    TreeItemType,
  } from "./TreeNode.svelte";
  import { type TreeView } from "@melt-ui/svelte";
  import { getContext, tick } from "svelte";
  import { get } from "svelte/store";

  const {
    states: { expanded },
    elements: { item, group },
    helpers: { isExpanded },
  } = getContext<TreeView>("tree");

  type T = unknown;
  export let child: AbstractTreeNode<T>;
  export let level: number;
  export let parent: HTMLElement;

  async function scrollToNode(node: AbstractTreeNode<any>) {
    const target = parent.querySelector(`#${CSS.escape(get(node).id)}`);

    if (!target) {
      return;
    }
    target.scrollIntoView({
      behavior: "smooth",
    });
  }

  $: {
    if ($child.type === TreeItemType.ITEM && $child.selected) {
      scrollToNode(child);
    }
  }
</script>

{#if !$child.hidden}
  <button
    id={$child.id}
    type="button"
    {...$item({ id: $child.id, hasChildren: $child.children.length > 0 })}
    use:item
    class:folder={$child.type === TreeItemType.FOLDER}
    class:item={$child.type === TreeItemType.ITEM}
  >
    {#if $child.type === TreeItemType.FOLDER}
      <slot
        name="folder"
        {level}
        item={child}
        isExpanded={$isExpanded($child.id)}
      />
    {:else if $child.type === TreeItemType.ITEM}
      <slot
        name="item"
        {level}
        item={child}
        isExpanded={$isExpanded($child.id)}
      />
    {/if}
  </button>
  {#if $isExpanded($child.id)}
    <ul
      {...$group({ id: $child.id })}
      use:group
      class="subtree"
      class:root-subtree={level === 0}
    >
      <TreeNode node={child} level={level + 1} {parent}>
        <svelte:fragment slot="folder" let:level let:item let:isExpanded>
          <slot name="folder" {level} {item} {isExpanded} />
        </svelte:fragment>

        <svelte:fragment slot="item" let:level let:item let:isExpanded>
          <slot name="item" {level} {item} {isExpanded} />
        </svelte:fragment>
      </TreeNode>
    </ul>
  {/if}
{/if}

<style>
  .subtree {
    padding-left: 1rem;
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .root-subtree {
    overflow-y: scroll;
    padding-right: 4px;
  }
  button {
    display: flex;
    align-items: center;
    width: 100%;
    font-family: inherit;
    font-feature-settings: inherit;
    font-variation-settings: inherit;
    font-size: 100%;
    font-weight: inherit;
    line-height: inherit;
    letter-spacing: inherit;
    color: inherit;
    margin: 0;
    padding: 0;
    background-color: transparent;
    cursor: pointer;
  }

  .folder {
    margin-bottom: 2px;
  }

  .item {
    display: flex;
    width: 100%;
    margin-bottom: 4px;
  }
</style>
