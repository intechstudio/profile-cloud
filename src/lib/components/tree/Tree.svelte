<script lang="ts">
  import { createTreeView, TreeView } from "@melt-ui/svelte";
  import { setContext } from "svelte";
  import TreeNode, { type AbstractTreeNode } from "./TreeNode.svelte";
  import { type FolderSlotProps, type ItemSlotProps } from "./TreeChild.svelte";
  import { get } from "svelte/store";

  interface $$Slots {
    folder: FolderSlotProps;
    item: ItemSlotProps;
  }

  export let root: AbstractTreeNode<any>;
  export let expanded: string[];
  export let scrollToSelected: boolean = true;

  let rootElement: HTMLUListElement;

  let ctx: TreeView;
  $: if ($root?.id) {
    ctx = createTreeView({ onExpandedChange: handleExpandedChange });
    setContext("tree", ctx);
  }

  $: tree = ctx?.elements.tree;
  $: ctx?.states.expanded.set(expanded ?? []);

  function handleExpandedChange({
    curr,
    next,
  }: {
    curr: string[];
    next: string[];
  }) {
    if (next.length > curr.length) {
      const diff = next.find((e) => !curr.includes(e))!;
      const rootNodes = get(root).children.map((e) => get(e).id);
      if (rootNodes.includes(diff)) {
        const others = next.filter((e) => !rootNodes.includes(e));
        return [...others, diff];
      } else {
        return next;
      }
    } else {
      return next;
    }
  }
</script>

{#key tree}
  <ul bind:this={rootElement} {...$tree} class="tree">
    <TreeNode node={root} level={0} parent={rootElement}>
      <svelte:fragment slot="folder" let:level let:item let:isExpanded>
        <slot name="folder" {level} {item} {isExpanded} />
      </svelte:fragment>

      <svelte:fragment slot="item" let:item let:level let:isExpanded>
        <slot name="item" {level} {item} {isExpanded} />
      </svelte:fragment>
    </TreeNode>
  </ul>
{/key}

<style>
  .tree {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    max-height: 100%;
    overflow: hidden;
  }
</style>
