<script lang="ts" context="module">
  export interface TreeScrollBehaviour {
    scrollToIndex?: boolean;
    easing?: "smooth" | "instant";
    scrollTrigger?: number;
  }

  export interface TreeProperties {
    root: AbstractTreeNode<any>;
    expanded?: string[];
    selected?: string | undefined;
    scrollBehaviour?: TreeScrollBehaviour;
  }
</script>

<script lang="ts">
  import { createTreeView } from "@melt-ui/svelte";
  import type { TreeView } from "@melt-ui/svelte";
  import { setContext, tick } from "svelte";
  import TreeNode from "./TreeNode.svelte";
  import type { AbstractTreeNode } from "./TreeNode.svelte";
  import type { FolderSlotProps, ItemSlotProps } from "./TreeChild.svelte";
  import { get } from "svelte/store";

  interface $$Slots {
    folder: FolderSlotProps;
    item: ItemSlotProps;
  }

  export let root: AbstractTreeNode<any>;
  export let expanded: string[] = [];
  export let selected: string | undefined = undefined;
  export let scrollBehaviour: TreeScrollBehaviour = {};

  let rootElement: HTMLUListElement;
  let rootHeight: number;

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

  let scrollTimeout: any;
  let lastScrollTrigger: number | undefined;
  async function scrollToNode(
    id: string,
    attempt = 0,
    block: ScrollLogicalPosition = "center",
    behavior: ScrollBehavior = scrollBehaviour.easing ?? "smooth",
  ) {
    clearTimeout(scrollTimeout);
    await tick();
    scrollTimeout = setTimeout(() => {
      const target = rootElement?.querySelector(
        `#${CSS.escape(id)}`,
      ) as HTMLElement;
      if (target) {
        target.scrollIntoView({
          behavior,
          block,
          inline: "nearest",
        });
        return;
      }

      if (attempt < 4) {
        scrollToNode(id, attempt + 1, block, behavior);
      }
    }, 100);
  }

  $: if (
    selected &&
    rootElement &&
    (scrollBehaviour.scrollToIndex ?? false) &&
    scrollBehaviour.scrollTrigger !== undefined &&
    scrollBehaviour.scrollTrigger !== lastScrollTrigger
  ) {
    lastScrollTrigger = scrollBehaviour.scrollTrigger;
    scrollToNode(selected);
  }

  // When the tree is re-rendered (e.g. because treeRoot rebuilt due to reactive
  // dependency changes after a click), restore the selected item into view.
  // Using block:"nearest" avoids any visible scroll if it's already in viewport.
  let prevTree: typeof tree;
  $: if (tree !== prevTree) {
    const wasRendered = prevTree !== undefined;
    prevTree = tree;
    if (wasRendered && selected) {
      scrollToNode(selected, 0, "nearest", "instant");
    }
  }
</script>

{#key tree}
  <ul
    bind:this={rootElement}
    bind:clientHeight={rootHeight}
    {...$tree}
    class="tree"
  >
    <TreeNode node={root} level={0} {rootElement} {rootHeight}>
      <svelte:fragment slot="folder" let:level let:item let:expanded>
        <slot name="folder" {level} {item} {expanded} />
      </svelte:fragment>

      <svelte:fragment
        slot="item"
        let:item
        let:level
        let:expanded
        let:itemFunction
        let:itemProps
      >
        <slot
          name="item"
          {level}
          {item}
          {expanded}
          {itemFunction}
          {itemProps}
        />
      </svelte:fragment>
    </TreeNode>
  </ul>
{/key}

<style>
  ul {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .tree {
    height: 100%;
    width: 100%;
    background-color: transparent;
    cursor: pointer;
  }
</style>
