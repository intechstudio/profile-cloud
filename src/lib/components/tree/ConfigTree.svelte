<script lang="ts">
  import { get } from "svelte/store";
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
    config_manager,
    compatible_config_types,
    selectClosestMatch,
  } from "./../../../routes/EditorLayout";
  import { type Config } from "../../schemas";
  import { Tree } from "./ConfigTree";
  import { createEventDispatcher } from "svelte";
  import { parentIframeCommunication } from "../../utils";
  import { dragTarget } from "../../actions/drag.action";
  import {
    type AbstractFolderData,
    AbstractTreeNode,
    TreeItemType,
    TreeFolder,
    Tree as TreeComponent,
    ProfileCloudTreeItem,
    type ContextMenuOptions,
    type TreeProperties,
  } from "@intechstudio/grid-uikit";

  const dispatch = createEventDispatcher();

  export let configs: Config[];

  let treeProps: TreeProperties;

  $: {
    treeProps = buildProps(
      configs,
      $filter_value,
      $sort_key,
      $show_supported_only,
      $compatible_config_types,
    );
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

  function buildProps(
    configs: Config[],
    filter: FilterValue,
    key: Sort.Key,
    supported: boolean,
    compatibileTypes: string[],
  ): TreeProperties {
    const filteredConfigs = configs.filter((e) => matches(e, filter));
    const root = Tree.create(configs, {
      showSupportedOnly: supported,
      compatibileTypes,
    }).sort(key);

    filterNode(root, filter);

    selectClosestMatch($selected_config, filteredConfigs);

    return {
      root: root,
      selected: $selected_config?.id,
      expanded: root.getIncludingNodes($selected_config?.id),
      scrollBehaviour: { scrollToIndex: true, easing: "instant" },
    };
  }

  function handleDeleteVirtualDirectory(title: string) {
    const cm = get(config_manager);

    for (const config of configs) {
      if (config.virtualPath?.includes(title)) {
        const newPath = config.virtualPath
          .split("/")
          .filter((e: string) => e !== title)
          .join("/");
        config.virtualPath = newPath === "" ? undefined : newPath;
        cm?.saveConfig(config, false);
      }
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

  function getfolderCtxOptions(
    level: number,
    child: AbstractTreeNode<any>,
  ): ContextMenuOptions {
    const { title } = get(child).data as AbstractFolderData;
    return {
      items: [
        {
          text: [`Delete virtual directory`, ``],
          handler: () => handleDeleteVirtualDirectory(title),
          isDisabled: () =>
            level === 0 ||
            get(child).children.some(
              (e) =>
                get(e).type === TreeItemType.ITEM &&
                (get(e).data as Tree.ItemData).item.syncStatus !== "local",
            ),
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

<TreeComponent {...treeProps}>
  <svelte:fragment slot="folder" let:item let:expanded let:level>
    {@const data = getFolderData(item)}
    <TreeFolder {item} {expanded} ctxOptions={getfolderCtxOptions(level, item)}>
      <span slot="title-label"
        >{@html `${highlightMatches(data.title, $filter_value)} (${getItemCount(item)})`}</span
      >
    </TreeFolder>
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
    <ProfileCloudTreeItem
      {itemFunction}
      {itemProps}
      {item}
      compatible={data.compatible}
      selected={data.item.id === $selected_config?.id}
      {expanded}
      on:drag-start={() => handleDragStart(item)}
      on:drag-end={() => handleDragEnd(item)}
      on:click={() => handleClick(item)}
    >
      <div slot="button-label">
        {@html highlightMatches(data.item.name, $filter_value)}
      </div>
      <div slot="type-label">
        {@html highlightMatches(data.item.type, $filter_value)}
      </div>
    </ProfileCloudTreeItem>
  </svelte:fragment>
</TreeComponent>
