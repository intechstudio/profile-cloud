<script lang="ts">
  import { get } from "svelte/store";
  import { Sort, sort_key } from "./../../../routes/Sorter";
  import { filter_value, FilterValue } from "./../../../routes/Filter";
  import {
    selected_config,
    show_supported_only,
    config_manager,
    compatible_config_types,
  } from "./../../../routes/EditorLayout";
  import { type Config } from "../../schemas";
  import { Tree } from "./ConfigTree";
  import { createEventDispatcher, onMount } from "svelte";
  import ConfigCardEditor from "./ConfigCardEditor.svelte";
  import { parentIframeCommunication } from "../../utils";
  import TreeComponent from "./Tree.svelte";
  import TreeFolder from "./TreeFolder.svelte";
  import { ModuleType } from "@intechstudio/grid-protocol";
  import { dragTarget } from "../../actions/drag.action";
  import {
    type AbstractFolderData,
    type AbstractItemData,
    AbstractTreeNode,
    TreeItemType,
  } from "./TreeNode.svelte";

  const dispatch = createEventDispatcher();

  export let configs: Config[];

  let root: Tree.Node;
  let expanded: string[];

  $: handleConfigChange(configs);

  function handleConfigChange(configs: Config[]) {
    const node = Tree.create(configs, {
      showSupportedOnly: $show_supported_only,
    });
    const first = configs[0];
    selected_config.set(first);
    if (typeof first !== "undefined") {
      expanded = getIncludingNodes(first.id, node);
      const selected = node.findChild(first.id);

      selected?.update((s) => {
        s.selected = true;
        return s;
      });
    }

    root = node;
  }

  $: filterNode(root, $filter_value);

  $: sortNode(root, $sort_key);

  function filterNode(node: Tree.Node, value: FilterValue) {
    node.filter(value);

    selectClosestMatch(get(selected_config), node);
  }

  function selectClosestMatch(selected: Config | undefined, node: Tree.Node) {
    node.setAll("selected", false);
    const current =
      typeof selected?.id !== "undefined"
        ? root.findChild(selected?.id)
        : undefined;

    if (typeof current === "undefined" || get(current).hidden) {
      const first = root.find((e) => {
        const { type, hidden } = get(e);
        return type === TreeItemType.ITEM && !hidden;
      });

      const config: Config | undefined =
        typeof first === "undefined"
          ? undefined
          : (get(first).data as AbstractItemData<Config>).item;
      selected_config.set(config);

      if (typeof config !== "undefined") {
        expanded = getIncludingNodes(config.id, root);
        first?.update((s) => {
          s.selected = true;
          return s;
        });
      }
    }
  }

  function sortNode(node: Tree.Node, value: Sort.Key) {
    node.sort(value);
  }

  function getIncludingNodes(id: string, node: Tree.Node): string[] {
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

<TreeComponent bind:root bind:expanded>
  <svelte:fragment slot="folder" let:item let:isExpanded let:level>
    <TreeFolder
      {item}
      {isExpanded}
      ctxOptions={getfolderCtxOptions(level, item)}
    />
  </svelte:fragment>

  <svelte:fragment slot="item" let:item let:level let:isExpanded>
    <ConfigCardEditor
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
