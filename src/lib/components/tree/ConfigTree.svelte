<script lang="ts">
  import { get, writable, type Writable } from "svelte/store";
  import { Sort, sort_key } from "./../../../routes/Sorter";
  import {
    filter_value,
    matches,
    FilterValue,
    highlightMatches,
  } from "./../../../routes/Filter";
  import {
    selected_config,
    show_supported_only,
    hide_community_configs,
    config_manager,
    compatible_config_types,
    selectClosestMatch,
  } from "./../../../routes/EditorLayout";
  import type { Config } from "../../schemas";
  import { Tree } from "./ConfigTree";
  import { createEventDispatcher, tick } from "svelte";
  import { parentIframeCommunication } from "../../utils";
  import { dragTarget } from "../../actions/drag.action";
  import ProfileCloudTreeItem from "./ProfileCloudTreeItem.svelte";
  import { TreeItemType } from "./TreeNode.svelte";
  import type { AbstractFolderData, AbstractTreeNode } from "./TreeNode.svelte";
  import type { TreeProperties } from "./TreeComponent.svelte";
  import {
    type ContextMenuOptions,
    MoltenInput,
    IconButton,
  } from "@intechstudio/grid-uikit";

  import TreeFolder from "./TreeFolder.svelte";

  import TreeComponent from "./TreeComponent.svelte";

  const dispatch = createEventDispatcher();

  export let configs: Config[];
  export let scrollToSelectionTrigger = 0;

  let treeProps: TreeProperties;
  let treeRoot: Tree.Node;
  let filteredConfigs: Config[] = [];
  let manuallyExpanded: string[] = [];
  // Nodes the user explicitly collapsed. Without this, forcedNodes below
  // would keep re-forcing open any folder that's an ancestor of the
  // selected config, making it impossible to close that folder while its
  // config stays selected.
  let manuallyClosed: Set<string> = new Set();
  let previousSelectedId: string | undefined;

  function sameIds(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    const set = new Set(a);
    return b.every((id) => set.has(id));
  }

  function handleExpandedChange(event: CustomEvent<string[]>) {
    if (sameIds(manuallyExpanded, event.detail)) return;
    const next = event.detail;
    for (const id of manuallyExpanded) {
      if (!next.includes(id)) manuallyClosed.add(id);
    }
    for (const id of next) {
      manuallyClosed.delete(id);
    }
    manuallyExpanded = next;
  }

  export function debounced<T>(store: Writable<T>, delay = 300) {
    let timeout: ReturnType<typeof setTimeout>;
    const debouncedStore = writable<T>(get(store));

    store.subscribe((value) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        debouncedStore.set(value);
      }, delay);
    });

    return debouncedStore;
  }

  export const debounced_filter_value = debounced(filter_value, 300);

  $: {
    const tree = buildTree(
      configs,
      $debounced_filter_value,
      $sort_key,
      $show_supported_only,
      $hide_community_configs,
      $compatible_config_types,
    );
    treeRoot = tree.root;
    filteredConfigs = tree.filteredConfigs;
  }

  $: if (treeRoot) {
    selectClosestMatch($selected_config, filteredConfigs);
    const selected = get(selected_config);

    // A fresh selection should reveal its location, overriding any folder
    // the user previously closed by hand. Re-selecting the same config
    // (e.g. toggling a folder it lives in) must not reset that choice.
    if (selected?.id !== previousSelectedId) {
      manuallyClosed.clear();
      previousSelectedId = selected?.id;
    }

    // getIncludingNodes forces every ancestor of the selected config open so
    // the selection stays visible. Drop any node the user explicitly closed
    // (including a top-level category) so that choice sticks instead of
    // snapping back open.
    const includingNodes = treeRoot.getIncludingNodes(selected?.id);
    const forcedNodes = includingNodes.filter((e) => !manuallyClosed.has(e));
    treeProps = {
      root: treeRoot,
      selected: selected?.id,
      expanded: Array.from(new Set([...forcedNodes, ...manuallyExpanded])),
      scrollBehaviour: {
        scrollToIndex: scrollToSelectionTrigger > 0,
        scrollTrigger: scrollToSelectionTrigger,
        easing: "smooth",
      },
    };
  }

  function filterNode(node: Tree.Node, filter: FilterValue, level = 0) {
    const filtered: Tree.Node[] = [];
    for (const child of get(node).children) {
      const { children, type, data } = get(child);

      switch (type) {
        case TreeItemType.FOLDER: {
          const { title } = get(child).data as AbstractFolderData;
          if (
            filter.some((e) =>
              e.caseMatch
                ? title.includes(e.value)
                : title.toLowerCase().includes(e.value.toLowerCase()),
            )
          ) {
            filtered.push(child as Tree.Node);
            break;
          }

          filterNode(child as Tree.Node, filter, level + 1);

          if (get(child).children.length > 0 || level === 0) {
            filtered.push(child as Tree.Node);
          }
          break;
        }
        case TreeItemType.ITEM: {
          filterNode(child as Tree.Node, filter, level + 1);

          if (
            matches((data as Tree.ItemData).item, filter) ||
            get(child).children.length > 0
          ) {
            filtered.push(child as Tree.Node);
          }
          break;
        }
      }
    }

    node.update((s) => {
      s.children = filtered;
      return s;
    });
  }

  function buildTree(
    configs: Config[],
    filter: FilterValue,
    key: Sort.Key,
    supported: boolean,
    community: boolean,
    compatibileTypes: string[],
  ) {
    const filteredConfigs = configs.filter((e) => matches(e, filter));
    const root = Tree.create(configs, {
      showSupportedOnly: supported,
      hideCommunityConfigs: community,
      compatibileTypes,
    }).sort(key);

    filterNode(root, filter);

    return { root, filteredConfigs };
  }

  async function handleDeleteVirtualDirectory(title: string) {
    const cm = get(config_manager);

    const affected = configs.filter((c) =>
      (c.virtualPath?.split("/") ?? []).includes(title),
    );
    try {
      for (const config of affected) {
        const newPath = config
          .virtualPath!.split("/")
          .filter((e) => e !== title)
          .join("/");
        await cm?.saveConfig(
          { ...config, virtualPath: newPath === "" ? undefined : newPath },
          false,
        );
      }
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "success",
          message: `Deleted virtual directory '${title}'`,
        },
      });
    } catch (e) {
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "fail",
          message: `Failed to delete virtual directory '${title}'. ${e}`,
        },
      });
    }
  }

  function handleDragStart(node: AbstractTreeNode<any>) {
    const config = (get(node).data as Tree.ItemData).item;
    parentIframeCommunication({
      windowPostMessageName: "configDragChange",
      dataForParent: {
        drag: "start",
        config,
      },
    });

    parentIframeCommunication({
      windowPostMessageName: "showOverlay",
      dataForParent: { value: false },
    });
  }

  function handleDragEnd(node: AbstractTreeNode<any>) {
    const config = (get(node).data as Tree.ItemData).item;
    parentIframeCommunication({
      windowPostMessageName: "configDragChange",
      dataForParent: {
        drag: "end",
        config,
        target: get(dragTarget),
      },
    });

    dragTarget.set(undefined);
  }

  async function handleClick(node: AbstractTreeNode<any>) {
    const config = (get(node).data as Tree.ItemData).item;
    selected_config.set(config);
    await parentIframeCommunication({
      windowPostMessageName: "provideSelectedConfigForEditor",
      dataForParent: { config: config },
    });

    await parentIframeCommunication({
      windowPostMessageName: "showOverlay",
      dataForParent: { value: true },
    });
  }

  function handleContextMenu(node: AbstractTreeNode<any>) {
    const config = (get(node).data as Tree.ItemData).item;
    selected_config.set(config);
  }

  // ── Inline rename ──────────────────────────────────────────────────────────

  let renamingConfigId: string | null = null;
  let renameValue = "";
  let renameInProgress = false;
  let renameError: string | null = null;
  let renameInput: MoltenInput;
  // Set once confirmRename's save resolves, holding the name we're waiting to
  // see land back in `configs`. saveConfig's promise only resolves once the
  // write completes, not once the file-watcher-driven reload reports it back
  // to us - closing the inline editor right away would flash the old name
  // for a moment. The reactive block below watches for it to land and only
  // then exits edit mode.
  let pendingRenameName: string | null = null;
  let pendingRenameTimeout: ReturnType<typeof setTimeout> | undefined;

  async function startRename(config: Config) {
    renamingConfigId = config.id;
    renameValue = config.name;
    renameError = null;
    await tick();
    renameInput?.focus();
  }

  function cancelRename() {
    clearTimeout(pendingRenameTimeout);
    renamingConfigId = null;
    renameValue = "";
    renameError = null;
    pendingRenameName = null;
  }

  async function confirmRename(config: Config) {
    if (renamingConfigId !== config.id) return;
    const newName = renameValue.trim();
    if (!newName || newName === config.name) {
      cancelRename();
      return;
    }
    renameInProgress = true;
    renameError = null;
    try {
      const cm = get(config_manager);
      await cm?.saveConfig({ ...config, name: newName }, false);
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "success",
          message: `Config '${newName}' saved`,
        },
      });
      pendingRenameName = newName;
      clearTimeout(pendingRenameTimeout);
      // Safety net: if the reload never lands (e.g. watcher hiccup), don't
      // leave the editor stuck open forever.
      pendingRenameTimeout = setTimeout(() => {
        if (renamingConfigId === config.id) cancelRename();
      }, 5000);
    } catch (e) {
      renameError = String(e);
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "fail",
          message: `Failed to rename '${config.name}'. ${e}`,
        },
      });
    } finally {
      renameInProgress = false;
    }
  }

  $: if (
    renamingConfigId &&
    pendingRenameName &&
    configs.find((c) => c.id === renamingConfigId)?.name === pendingRenameName
  ) {
    cancelRename();
  }

  // ── Inline rename (virtual directory) ─────────────────────────────────────
  // A virtual directory is just a shared segment string in each config's
  // virtualPath (see buildVirtualFolders in ./ConfigTree.ts) - there's no
  // single entity to rename, so this rewrites that segment on every config
  // that has it, the same way handleDeleteVirtualDirectory removes it.

  let renamingFolderTitle: string | null = null;
  let renameFolderValue = "";
  let renameFolderInProgress = false;
  let renameFolderError: string | null = null;
  let renameFolderInput: MoltenInput;
  let folderRenameSaved = false;
  let folderRenameTimeout: ReturnType<typeof setTimeout> | undefined;

  async function startRenameFolder(title: string) {
    renamingFolderTitle = title;
    renameFolderValue = title;
    renameFolderError = null;
    folderRenameSaved = false;
    await tick();
    renameFolderInput?.focus();
  }

  function cancelRenameFolder() {
    clearTimeout(folderRenameTimeout);
    renamingFolderTitle = null;
    renameFolderValue = "";
    renameFolderError = null;
    folderRenameSaved = false;
  }

  async function confirmRenameFolder(oldTitle: string) {
    if (renamingFolderTitle !== oldTitle) return;
    const newTitle = renameFolderValue.trim();
    if (!newTitle || newTitle === oldTitle) {
      cancelRenameFolder();
      return;
    }
    renameFolderInProgress = true;
    renameFolderError = null;
    try {
      const cm = get(config_manager);
      const affected = configs.filter((c) =>
        c.virtualPath?.split("/").includes(oldTitle),
      );
      // Sequential rather than Promise.all: each save round-trips through
      // grid-editor's file watcher, and there's no need to have several
      // in flight at once for a rename that isn't performance-sensitive.
      for (const config of affected) {
        const newPath = config
          .virtualPath!.split("/")
          .map((segment) => (segment === oldTitle ? newTitle : segment))
          .join("/");
        await cm?.saveConfig({ ...config, virtualPath: newPath }, false);
      }
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "success",
          message: `Renamed virtual directory '${oldTitle}' to '${newTitle}' (${affected.length} config${affected.length === 1 ? "" : "s"})`,
        },
      });
      folderRenameSaved = true;
      clearTimeout(folderRenameTimeout);
      // Safety net: if the reload never lands, don't leave the editor stuck
      // open forever.
      folderRenameTimeout = setTimeout(() => {
        if (renamingFolderTitle === oldTitle) cancelRenameFolder();
      }, 5000);
    } catch (e) {
      renameFolderError = String(e);
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "fail",
          message: `Failed to rename virtual directory '${oldTitle}'. ${e}`,
        },
      });
    } finally {
      renameFolderInProgress = false;
    }
  }

  $: if (
    renamingFolderTitle &&
    folderRenameSaved &&
    !configs.some((c) =>
      c.virtualPath?.split("/").includes(renamingFolderTitle!),
    )
  ) {
    cancelRenameFolder();
  }

  // Both rename inputs sit inside melt-ui's tree item <button> (see
  // TreeChild.svelte), which handles Space/Enter/arrow keys for tree
  // navigation. stopPropagation on the wrapping row keeps that JS listener
  // from firing, but Space also triggers a native browser default action -
  // the input is invalidly nested inside a <button>, and Chromium treats
  // Space as "activate the nearest button ancestor", moving focus there and
  // closing the editor via blur. Only preventDefault() can stop a native
  // default action, but doing that also blocks the browser's own "insert
  // this character" default - so for Space specifically, prevent it and
  // insert the character ourselves, preserving cursor position.
  function handleRenameKeydown(
    e: CustomEvent<KeyboardEvent>,
    getValue: () => string,
    setValue: (value: string) => void,
    onConfirm: () => void,
    onCancel: () => void,
  ) {
    const native = e.detail;
    if (native.key === "Enter") {
      onConfirm();
    } else if (native.key === "Escape") {
      onCancel();
    } else if (native.key === " ") {
      native.preventDefault();
      const input = native.target as HTMLInputElement;
      const value = getValue();
      const start = input.selectionStart ?? value.length;
      const end = input.selectionEnd ?? value.length;
      setValue(value.slice(0, start) + " " + value.slice(end));
      tick().then(() => input.setSelectionRange(start + 1, start + 1));
    }
  }

  function getfolderCtxOptions(
    level: number,
    child: AbstractTreeNode<any>,
  ): ContextMenuOptions {
    const { title } = get(child).data as AbstractFolderData;
    const isDisabled = () =>
      level === 0 ||
      get(child).children.some(
        (e) =>
          get(e).type === TreeItemType.ITEM &&
          (get(e).data as Tree.ItemData).item.syncStatus !== "local",
      );
    return {
      items: [
        {
          text: [`Rename virtual directory`, ``],
          handler: () => startRenameFolder(title),
          isDisabled,
        },
        {
          text: [`Delete virtual directory`, ``],
          handler: () => handleDeleteVirtualDirectory(title),
          isDisabled,
        },
      ],
    };
  }

  function getItemCtxOptions(node: AbstractTreeNode<any>): ContextMenuOptions {
    const { item } = get(node).data as Tree.ItemData;
    return {
      items: [
        {
          text: [`Show in folder`, ``],
          handler: () => get(config_manager)?.showConfigInFolder(item),
          isDisabled: () => !get(config_manager)?.hasLocalFile(item),
        },
        {
          text: [`Create a copy`, ``],
          handler: () => dispatch("create-copy", item),
        },
        {
          text: [`Rename`, ``],
          handler: () => startRename(item),
          isDisabled: () => !item.isEditable,
        },
        {
          text: [`Delete`, ``],
          handler: () => get(config_manager)?.deleteConfig(item),
          isDisabled: () => !item.isEditable,
        },
      ],
    };
  }

  function getItemCount(item: AbstractTreeNode<any>) {
    const { type, children } = get(item);

    let count = type === TreeItemType.ITEM ? 1 : 0;

    if (type === TreeItemType.FOLDER) {
      for (const child of children) {
        count += getItemCount(child as Tree.Node);
      }
    }

    return count;
  }

  function getFolderData(node: AbstractTreeNode<any>) {
    return get(node).data as AbstractFolderData;
  }

  function getItemData(node: AbstractTreeNode<any>) {
    return get(node).data as Tree.ItemData;
  }
</script>

<TreeComponent {...treeProps} on:expandedChange={handleExpandedChange}>
  <svelte:fragment slot="folder" let:item let:expanded let:level>
    {@const data = getFolderData(item)}
    {#if renamingFolderTitle === data.title}
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <div class="rename-row" on:keydown|stopPropagation>
        <div class="rename-input">
          <MoltenInput
            bind:this={renameFolderInput}
            bind:target={renameFolderValue}
            on:blur={() => confirmRenameFolder(data.title)}
            on:keydown={(e) =>
              handleRenameKeydown(
                e,
                () => renameFolderValue,
                (v) => (renameFolderValue = v),
                () => confirmRenameFolder(data.title),
                cancelRenameFolder,
              )}
          />
        </div>
        <div class="rename-cancel">
          <IconButton
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelRenameFolder}
            iconPath="close"
            tooltipText="Cancel"
          />
        </div>
      </div>
      {#if renameFolderError}
        <p class="rename-error">{renameFolderError}</p>
      {/if}
    {:else}
      <TreeFolder
        {item}
        {level}
        {expanded}
        ctxOptions={getfolderCtxOptions(level, item)}
      >
        <span slot="title-label"
          >{@html `${highlightMatches(data.title, $filter_value)} (${getItemCount(item)})`}</span
        >
      </TreeFolder>
    {/if}
  </svelte:fragment>

  <svelte:fragment
    slot="item"
    let:item
    let:level
    let:expanded
    let:itemFunction
    let:itemProps
  >
    {@const data = getItemData(item)}
    {@const isRenaming = renamingConfigId === data.item.id}
    <ProfileCloudTreeItem
      {itemFunction}
      {itemProps}
      {item}
      compatible={data.compatible}
      selected={data.item.id === $selected_config?.id}
      {expanded}
      editing={isRenaming}
      ctxOptions={getItemCtxOptions(item)}
      on:drag-start={() => handleDragStart(item)}
      on:drag-end={() => handleDragEnd(item)}
      on:click={() => handleClick(item)}
      on:contextmenu={() => handleContextMenu(item)}
    >
      <div slot="button-label">
        {@html highlightMatches(data.item.name, $filter_value)}
      </div>
      <div slot="type-label">
        {@html highlightMatches(data.item.type, $filter_value)}
      </div>
      <svelte:fragment slot="edit-content">
        <div class="rename-input">
          <MoltenInput
            bind:this={renameInput}
            bind:target={renameValue}
            on:blur={() => confirmRename(data.item)}
            on:keydown={(e) =>
              handleRenameKeydown(
                e,
                () => renameValue,
                (v) => (renameValue = v),
                () => confirmRename(data.item),
                cancelRename,
              )}
          />
        </div>
        <div class="rename-cancel">
          <IconButton
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelRename}
            iconPath="close"
            tooltipText="Cancel"
          />
        </div>
      </svelte:fragment>
    </ProfileCloudTreeItem>
    {#if isRenaming && renameError}
      <p class="rename-error">{renameError}</p>
    {/if}
  </svelte:fragment>
</TreeComponent>

<style>
  .rename-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.25rem;
  }

  .rename-input {
    flex-grow: 1;
    min-width: 0;
  }

  /* MoltenInput's <input> doesn't set box-sizing, so width:100% adds its own
     padding/border on top of that. Profile Cloud's standalone pages hide this
     via a global box-sizing reset, but that reset isn't present when this app
     is embedded as the profile-cloud-web-component (shadow:none, no app.css),
     so without this the input overflows its flex row and pushes the cancel
     button onto its own line in narrow/deeply-nested rows. */
  .rename-input :global(input) {
    box-sizing: border-box;
  }

  .rename-cancel {
    flex-shrink: 0;
  }

  .rename-error {
    color: var(--error);
    font-size: 0.75rem;
    padding: 0 0.25rem;
    margin: 0;
  }
</style>
