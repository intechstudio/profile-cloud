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
  import { ElementType, grid, ModuleType } from "@intechstudio/grid-protocol";
  import { dragTarget } from "../../actions/drag.action";
  import {
    type AbstractFolderData,
    type AbstractItemData,
    AbstractTreeNode,
    TreeItemType,
    TreeFolder,
    Tree as TreeComponent,
    ProfileCloudTreeItem,
    ContextMenuOptions,
    type TreeProperties,
  } from "@intechstudio/grid-uikit";

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

  function isElementType(value: string): value is ElementType {
    return Object.values(ElementType).includes(value as ElementType);
  }

  function isModuleType(value: string): value is ModuleType {
    return Object.values(ModuleType).includes(value as ModuleType);
  }

  function isCompatible(node: Tree.Node, types: string[]) {
    const { item } = get(node).data as AbstractItemData<Config>;
    if (item.type === ModuleType.VSN1L || item.type === ModuleType.VSN1R) {
      return (
        types.includes(ModuleType.VSN1L) || types.includes(ModuleType.VSN1R)
      );
    } else {
      switch (item.configType) {
        case "profile": {
          const moduleTypes = types.filter((t): t is ModuleType =>
            isModuleType(t),
          );
          return moduleTypes.includes(item.type as ModuleType);
        }
        case "preset": {
          const elementTypes = types.filter((t): t is ElementType =>
            isElementType(t),
          );
          const leftCompatible = elementTypes.some((e) =>
            grid.is_element_compatible_with(e, item.type as ElementType),
          );
          const rightCompatible = elementTypes.some((e) =>
            grid.is_element_compatible_with(item.type as ElementType, e),
          );
          return leftCompatible || rightCompatible;
        }
        case "snippet": {
          return true;
        }
      }
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

  <svelte:fragment
    slot="item"
    let:item
    let:level
    let:expanded
    let:itemFunction
    let:itemProps
  >
    <ProfileCloudTreeItem
      on:config-selected={handleConfigSelected}
      {itemFunction}
      {itemProps}
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
