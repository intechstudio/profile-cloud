<script lang="ts">
    import { get } from "svelte/store";
    import { filterConfigs } from "./../../../routes/Filter";
    import { sort_key, sortConfigs } from "./../../../routes/Sorter";
    import { filter_value, FilterValue } from "./../../../routes/Filter";
    import {
        selected_config,
        show_supported_only,
        config_manager
    } from "./../../../routes/EditorLayout";
    import { type Config } from "$lib/schemas";
    import { TreeNodeData, createTree } from "./ConfigTree";
    import { tick } from "svelte";
    import { createTreeView } from "@melt-ui/svelte";
    import { setContext } from "svelte";
    import Tree from "./Tree.svelte";

    const ctx = createTreeView({
        defaultExpanded: []
    });
    setContext("tree", ctx);

    const {
        elements: { tree },
        states: { expanded }
    } = ctx;

    export let configs: Config[];

    let root: TreeNodeData<Config>;

    async function scrollToSelectedConfig() {
        await tick();
        const target = document.getElementById($selected_config?.id as string);
        if (!target) {
            return;
        }
        target.scrollIntoView({
            behavior: "smooth"
        });
    }

    function selectClosestMatch() {
        const temp = root.toArray();
        if (temp.length > 0) {
            selected_config.set({ id: temp[0].id, presetIndex: -1 });
            return;
        } else {
            selected_config.set(undefined);
        }
    }

    let filterBuffer = new FilterValue();

    $: {
        root = createTree(configs, $show_supported_only);
        root.filter($filter_value, filterConfigs);
        root.sort($sort_key, sortConfigs);

        if (!filterBuffer.isEqual($filter_value)) {
            selectClosestMatch();
        }

        filterBuffer = $filter_value;

        if ($selected_config) {
            handleSelectedConfigChange($selected_config.id);
        }
    }

    $: {
        if ($selected_config) {
            handleSelectedConfigChange($selected_config.id);
        }
    }

    function handleSelectedConfigChange(id: string) {
        expanded.set([]);
        for (const child of root.children) {
            toggleIncludingNodes(id, child);
        }
        scrollToSelectedConfig();
    }

    function nodeIncludesItem(id: string, node: TreeNodeData<Config>) {
        if (typeof node.items.find((e) => e.id === id) !== "undefined") {
            return true;
        }

        for (const child of node.children) {
            if (nodeIncludesItem(id, child)) {
                return true;
            }
        }

        return false;
    }

    function toggleIncludingNodes(id: string, node: TreeNodeData<Config>) {
        const contains = nodeIncludesItem(id, node);
        if (contains) {
            expanded.update((store) => {
                store.push(node.id);
                return store;
            });
        }

        if (node.children.length > 0) {
            for (const child of node.children) {
                toggleIncludingNodes(id, child);
            }
        }
    }

    function handleDeleteVirtualDirectory(e: any) {
        const { title } = e.detail;
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
</script>

<ul class="flex flex-col w-full h-full max-h-full" {...$tree}>
    <Tree treeItems={root.children} on:delete-virtual-directory={handleDeleteVirtualDirectory} />
</ul>
