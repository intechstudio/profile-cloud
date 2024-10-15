<script lang="ts">
    import { get } from "svelte/store";
    import { filterConfigs } from "./../../../routes/Filter";
    import { sort_key, sortConfigs } from "./../../../routes/Sorter";
    import { filter_value, FilterValue } from "./../../../routes/Filter";
    import { selected_config, show_supported_only } from "./../../../routes/EditorLayout";
    import TreeNode from "./TreeNode.svelte";
    import { type Config } from "../../schemas";
    import { TreeNodeData, createTree } from "./ConfigTree";
    import { createEventDispatcher, tick } from "svelte";

    export let configs: Config[];

    type ConfigTreeData = TreeNodeData<Config>[];
    let data: ConfigTreeData = [];

    const dispatch = createEventDispatcher();

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

    function handleDataChange(data: ConfigTreeData) {
        const openContainingCategories = (
            id: string | undefined,
            current: TreeNodeData<Config>
        ): string | undefined => {
            for (const node of current.nodes) {
                const opened = openContainingCategories(id, node);
                if (opened) {
                    current.open.set(true);
                }
            }

            const found = current.children.find((e) => e.id === id);
            if (found) {
                current.open.set(true);
            }

            return get(current.open);
        };

        const selected = get(selected_config)?.id;
        if (typeof selected === "undefined") {
            return undefined;
        }

        for (const root of data) {
            openContainingCategories(selected, root);
        }

        scrollToSelectedConfig();
    }

    function selectClosestMatch() {
        for (const root of data) {
            const temp = root.toArray();
            if (temp.length > 0) {
                selected_config.set({ id: temp[0].id, presetIndex: -1 });
                return;
            }
        }

        selected_config.set(undefined);
    }

    let filterBuffer = new FilterValue();

    $: {
        data = createTree(configs, $show_supported_only);
        data.forEach((root) => {
            root.filter($filter_value, filterConfigs);
            root.sort($sort_key, sortConfigs);
        });

        if (!filterBuffer.isEqual($filter_value)) {
            selectClosestMatch();
        }

        filterBuffer = $filter_value;
    }

    $: handleDataChange(data);

    function handleToggle(toggled: TreeNodeData<Config>, value: boolean) {
        if (value) {
            for (let node of data) {
                if (node.id !== toggled.id) {
                    node.open.set(false);
                }
            }
        }
    }
</script>

<div class="flex flex-col w-full h-full max-h-full">
    {#each data as rootNode}
        {#key rootNode.open}
            <TreeNode
                data={rootNode}
                on:toggle={(e) => {
                    const { value } = e.detail;
                    handleToggle(rootNode, value);
                }}
            />
        {/key}
    {/each}
</div>
