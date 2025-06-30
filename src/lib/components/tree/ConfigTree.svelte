<script lang="ts">
  import { get } from "svelte/store";
  import { Sort, sort_key } from "./../../../routes/Sorter";
  import {
    filter_value,
    filterConfigs,
    FilterValue,
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
  import { ModuleType } from "@intechstudio/grid-protocol";
  import { dragTarget } from "../../actions/drag.action";
  import { ContextMenuOptions } from "@intechstudio/grid-uikit";
  import TreeComponent, { type TreeProperties } from "./Tree.svelte";
  import {
    AbstractTreeNode,
    type AbstractFolderData,
    type AbstractItemData,
    TreeItemType,
  } from "./TreeNode.svelte";
  import TreeFolder from "./TreeFolder.svelte";
  import ProfileCloudTreeItem from "./ProfileCloudTreeItem.svelte";

  const dispatch = createEventDispatcher();

  export let configs: Config[];

  let treeProps: TreeProperties;

  $: treeProps = buildProps(
    configs,
    $filter_value,
    $sort_key,
    $show_supported_only,
  );

  function buildProps(
    configs: Config[],
    filter: FilterValue,
    key: Sort.Key,
    supported: boolean,
  ): TreeProperties {
    const filteredConfigs = filterConfigs(configs, filter);
    const node = Tree.create(filteredConfigs, {
      showSupportedOnly: supported,
    }).sort(key);

    selectClosestMatch($selected_config, filteredConfigs);

    return {
      root: node,
      selected: $selected_config?.id,
      expanded: node.getIncludingNodes($selected_config?.id),
      scrollToSelected: true,
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

  async function handleConfigSelected(e: any) {
    const { config } = e.detail;
    await parentIframeCommunication({
      windowPostMessageName: "provideSelectedConfigForEditor",
      dataForParent: { config: config },
    });

    await parentIframeCommunication({
      windowPostMessageName: "showOverlay",
      dataForParent: { value: true },
    });
  }

  function isCompatible(node: AbstractTreeNode<any>, types: string[]) {
    const data = (get(node).data as AbstractItemData<Config>).item;
    if (data.configType === "snippet") {
      return true;
    } else if (
      data.type === ModuleType.VSN1L ||
      data.type === ModuleType.VSN1R
    ) {
      return (
        types.includes(ModuleType.VSN1L) || types.includes(ModuleType.VSN1R)
      );
    } else {
      return types.includes(data.type);
    }
  }

  function handleDragStart(node: AbstractTreeNode<any>) {
    const config = (get(node).data as AbstractItemData<Config>).item;
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
    const config = (get(node).data as AbstractItemData<Config>).item;
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

  function handleClick(node: AbstractTreeNode<any>) {
    const config = (get(node).data as AbstractItemData<Config>).item;
    console.log(config);
    selected_config.set(config);
    dispatch("config-selected", { config: config });
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
                (get(e).data as AbstractItemData<Config>).item.syncStatus !==
                  "local",
            ),
        },
      ],
    };
  }
</script>

<TreeComponent {...treeProps}>
  <svelte:fragment slot="folder" let:item let:expanded let:level>
    <TreeFolder
      {item}
      {expanded}
      ctxOptions={getfolderCtxOptions(level, item)}
    />
  </svelte:fragment>

  <svelte:fragment slot="item" let:item let:level let:expanded>
    <ProfileCloudTreeItem
      on:config-selected={handleConfigSelected}
      {item}
      compatible={isCompatible(item, $compatible_config_types)}
      selected={get(item).id === $selected_config?.id}
      {expanded}
      on:drag-start={() => handleDragStart(item)}
      on:drag-end={() => handleDragEnd(item)}
      on:click={() => handleClick(item)}
    />
  </svelte:fragment>
</TreeComponent>
