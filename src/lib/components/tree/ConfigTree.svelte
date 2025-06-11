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
  import {
    type AbstractFolderData,
    type AbstractItemData,
    AbstractTreeNode,
    TreeItemType,
    TreeFolder,
    Tree as TreeComponent,
    TreeCard,
  } from "@intechstudio/grid-uikit";

  const dispatch = createEventDispatcher();

  export let configs: Config[];

  let root: Tree.Node;
  let expanded: string[];
  let selected: string | undefined;

  $: root = buildRoot(configs, $filter_value, $sort_key, $show_supported_only);

  function buildRoot(
    configs: Config[],
    filter: FilterValue,
    key: Sort.Key,
    supported: boolean,
  ) {
    const filteredConfigs = filterConfigs(configs, filter);
    const node = Tree.create(filteredConfigs, {
      showSupportedOnly: supported,
    }).sort(key);

    selectClosestMatch($selected_config, filteredConfigs);
    selected = $selected_config?.id;
    expanded = getIncludingNodes($selected_config?.id, node);

    return node;
  }

  function getIncludingNodes(
    id: string | undefined,
    node: Tree.Node,
  ): string[] {
    if (typeof id === "undefined") {
      return [];
    }

    const found = typeof node.findChild(id) !== "undefined";
    let res: string[] = [];
    if (found) {
      res.push(get(node).id);

      for (const child of get(node).children) {
        res = [...res, ...getIncludingNodes(id, child as Tree.Node)];
      }
    }
    return res;
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

  function handleConfigurationClicked(node: AbstractTreeNode<any>) {
    const config = (get(node).data as AbstractItemData<Config>).item;
    selected_config.set(config);
    dispatch("config-selected", { config: config });
  }

  function getfolderCtxOptions(level: number, child: AbstractTreeNode<any>) {
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

<TreeComponent bind:root bind:expanded bind:selected>
  <svelte:fragment slot="folder" let:item let:isExpanded let:level>
    <TreeFolder
      {item}
      {isExpanded}
      ctxOptions={getfolderCtxOptions(level, item)}
    />
  </svelte:fragment>

  <svelte:fragment slot="item" let:item let:level let:isExpanded>
    <TreeCard
      on:config-selected={handleConfigSelected}
      {item}
      isCompatible={isCompatible(item, $compatible_config_types)}
      isSelected={get(item).id === $selected_config?.id}
      {isExpanded}
      on:drag-start={() => handleDragStart(item)}
      on:drag-end={() => handleDragEnd(item)}
      on:click={() => handleConfigurationClicked(item)}
    />
  </svelte:fragment>
</TreeComponent>
