<script lang="ts">
    import { get, writable, type Writable } from "svelte/store";
    import { filterConfigs } from "./../../../routes/Filter";
    import { sort_key, sortConfigs } from "./../../../routes/Sorter";
    import { filter_value, FilterValue } from "./../../../routes/Filter";
    import {
        selected_config,
        show_supported_only,
        config_manager
    } from "./../../../routes/EditorLayout";
    import { type Config } from "../../schemas";
    import { TreeNodeData, createTree } from "./ConfigTree";
    import { tick } from "svelte";
    import { createTreeView } from "@melt-ui/svelte";
    import { setContext } from "svelte";
    import { contextTarget, Tree } from "@intechstudio/grid-uikit";
    import ConfigCardEditor from "../../../routes/ConfigCardEditor.svelte";

    const ctx = createTreeView({
        defaultExpanded: []
    });
    setContext("tree", ctx);

    const {
        elements: { tree },
        states: { expanded }
    } = ctx;

    export let configs: Config[];

    let root: Writable<TreeNodeData<Config>> = writable();

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
        const temp = get(root).toArray();
        if (temp.length > 0) {
            selected_config.set({ id: temp[0].id, presetIndex: -1 });
            return;
        } else {
            selected_config.set(undefined);
        }
    }

    let filterBuffer = new FilterValue();

    $: {
        root.set(createTree(configs, $show_supported_only));
        get(root).filter($filter_value, filterConfigs);

        if (!filterBuffer.isEqual($filter_value)) {
            selectClosestMatch();
            filterBuffer = $filter_value;
        }

        handleSelectedConfigChange();
    }

    $: {
        $root.sort($sort_key, sortConfigs);
        root.update((store) => store);
        scrollToSelectedConfig();
    }

    function handleSelectedConfigChange() {
        const selected = $selected_config?.id;
        if (typeof selected === "undefined") {
            return;
        }

        expanded.set([]);
        for (const child of get(root).children) {
            toggleIncludingNodes(selected, child);
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
</script>

<ul class="flex flex-col w-full h-full max-h-full" {...$tree}>
    <Tree treeItems={$root.children}>
        <svelte:fragment slot="folder" let:child let:isExpanded let:level>
            <div
                class="flex w-full items-center mb-1 border-b h-5 border-white/40"
                use:contextTarget={{
                    items: [
                        {
                            text: [`Delete virtual directory`, ``],
                            handler: () => handleDeleteVirtualDirectory(child.title),
                            isDisabled: () =>
                                level === 0 || child.items.some((e) => e.syncStatus !== "local")
                        }
                    ]
                }}
            >
                <div class="flex-grow text-left text-white/80 truncate">
                    {`${child.title} (${child.itemCount()})`}
                </div>
                <div>
                    <svg
                        width="14"
                        height="11"
                        class={isExpanded ? "" : "-rotate-90"}
                        viewBox="0 0 14 11"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M6.99968 11L0.9375 0.5L13.0619 0.500001L6.99968 11Z"
                            fill="#D9D9D9"
                        />
                    </svg>
                </div>
            </div>
        </svelte:fragment>

        <svelte:fragment slot="file" let:item>
            <div class="mb-1">
                <ConfigCardEditor
                    data={item}
                    isSelected={item.id === $selected_config?.id &&
                        $selected_config?.presetIndex === -1}
                />
            </div>
        </svelte:fragment>
    </Tree>
</ul>
