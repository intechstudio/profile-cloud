<script lang="ts">
    import { tree_key } from "./ConfigTree";
    import { get } from "svelte/store";
    import { filterConfigs } from "./../../../routes/Filter";
    import { sort_key, sortConfigs } from "./../../../routes/Sorter";
    import { filter_value, FilterValue } from "./../../../routes/Filter";
    import { selected_config, show_supported_only } from "./../../../routes/EditorLayout";
    import TreeNode from "./TreeNode.svelte";
    import { type Config } from "$lib/schemas";
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
        const findCategory = (
            id: string | undefined,
            root: TreeNodeData<Config>
        ): string | undefined => {
            if (typeof id === "undefined") {
                return undefined;
            }

            const found = root.children.find((e) => e.id === id);
            if (found) {
                return root.label;
            }
            for (const node of root.nodes) {
                const found = findCategory(id, node);
                if (found) {
                    return found;
                }
            }
            return undefined;
        };

        const selected = get(selected_config)?.id;
        let found = undefined;
        for (const root of data) {
            const category = findCategory(selected, root);
            if (typeof category !== "undefined") {
                found = category;
                break;
            }
        }

        if (found) {
            tree_key.set({ label: found });
        } else {
            selected_config.set(undefined);
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
</script>

<div class="flex flex-col w-full h-full max-h-full">
    {#each data as rootNode}
        <TreeNode data={rootNode} />
    {/each}
</div>
