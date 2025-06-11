<script context="module" lang="ts">
  import {
    writable,
    type Writable,
    type Subscriber,
    type Unsubscriber,
    type Updater,
    type Readable,
    get,
  } from "svelte/store";
  import { type TreeView } from "@melt-ui/svelte";

  export enum TreeItemType {
    FOLDER = "folder",
    ITEM = "item",
  }

  type UUID = string;

  export interface AbstractFolderData {
    title: string;
  }

  export interface AbstractItemData<T> {
    item: T;
  }

  export interface AbstractTreeNodeData<T> {
    readonly id: UUID;
    parent: AbstractTreeNode<T> | undefined;
    children: AbstractTreeNode<T>[];
    readonly type: TreeItemType;
    data: AbstractFolderData | AbstractItemData<T>;
    hidden: boolean;
    selected: boolean;
  }

  export abstract class AbstractTreeNode<T>
    implements Readable<AbstractTreeNodeData<T>>
  {
    protected internal: Writable<AbstractTreeNodeData<T>>;

    constructor(
      parent: AbstractTreeNode<T> | undefined,
      id: UUID,
      type: TreeItemType,
      data: AbstractFolderData | AbstractItemData<T>,
    ) {
      this.internal = writable({
        id,
        parent,
        type,
        data,
        children: [],
        hidden: false,
        selected: false,
      });
    }

    public setAll<K extends keyof AbstractTreeNodeData<T>, V>(
      key: K,
      value: AbstractTreeNodeData<T>[K],
    ) {
      this.update((s) => {
        s[key] = value;
        return s;
      });

      for (const child of get(this.internal).children) {
        child.setAll(key, value);
      }
    }

    public find(
      callback: (e: AbstractTreeNode<T>) => boolean,
    ): AbstractTreeNode<T> | undefined {
      const { children } = get(this.internal);
      const found = children.find(callback);
      if (typeof found !== "undefined") {
        return found;
      }

      for (const child of children) {
        const found = child.find(callback);
        if (typeof found !== "undefined") {
          return found;
        }
      }
      return undefined;
    }

    public subscribe(
      run: Subscriber<AbstractTreeNodeData<T>>,
      invalidate?: (value?: AbstractTreeNodeData<T>) => void,
    ): Unsubscriber {
      return this.internal.subscribe(run, invalidate);
    }

    public set(value: AbstractTreeNodeData<T>) {
      this.internal.set(value);
    }

    public update(updater: Updater<AbstractTreeNodeData<T>>) {
      this.internal.update(updater);
    }

    public addChild(...children: AbstractTreeNode<T>[]) {
      this.update((s) => {
        for (const child of children) {
          child.update((s) => Object({ ...s, parent: this }));
          s.children.push(child);
        }

        return s;
      });
    }

    public findChild(uuid: UUID): AbstractTreeNode<T> | undefined {
      const { children } = get(this.internal);
      for (const child of children) {
        const { id, children } = get(child);
        if (id === uuid) {
          return child;
        }

        if (children.length > 0 && get(child).type === TreeItemType.FOLDER) {
          const found = child.findChild(uuid);
          if (found) {
            return found;
          }
        }
      }
      return undefined;
    }
  }
</script>

<script lang="ts">
  import { getContext, onMount } from "svelte";
  import TreeChild, {
    type FolderSlotProps,
    type ItemSlotProps,
  } from "./TreeChild.svelte";

  interface $$Slots {
    folder: FolderSlotProps;
    item: ItemSlotProps;
  }

  const {
    states: { expanded },
    elements: { item, group },
    helpers: { isExpanded },
  } = getContext<TreeView>("tree");

  export let node: AbstractTreeNode<any>;
  export let level: number;
  export let parent: HTMLElement;

  const listItems: HTMLLIElement[] = [];

  let resizeObserver: ResizeObserver;

  function measure() {
    const itemsArray = Array.from(listItems.values());

    if (itemsArray.length === 0) return;

    const root = itemsArray[0].parentElement as HTMLElement;
    const index = get(node).children.findIndex((e) => !$isExpanded(get(e).id));

    const closedHeight = itemsArray[index]?.clientHeight ?? 0;
    const rootHeight = root.clientHeight;
    root.style.minHeight = `${closedHeight * itemsArray.length}px`;

    const maxHeight = rootHeight - closedHeight * (itemsArray.length - 1);

    requestAnimationFrame(() => {
      const next = `${maxHeight}px`;
      for (const node of itemsArray) {
        if (node.style.maxHeight !== next) {
          node.style.maxHeight = next;
        }
      }
    });
  }

  onMount(() => {
    if (level > 0) return;

    if (get(node).children.length === 0) {
      return;
    }

    const parent = listItems[0].parentElement as HTMLElement;

    resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  });
</script>

{#each $node.children as child, i}
  <li bind:this={listItems[i]}>
    <TreeChild {child} {level} {parent}>
      <svelte:fragment slot="folder" let:level let:item let:isExpanded>
        <slot name="folder" {level} {item} {isExpanded} />
      </svelte:fragment>

      <svelte:fragment slot="item" let:item let:level let:isExpanded>
        <slot name="item" {level} {item} {isExpanded} />
      </svelte:fragment>
    </TreeChild>
  </li>
{/each}

<style>
  li {
    display: flex;
    flex-direction: column;
  }
</style>
