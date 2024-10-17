<script lang="ts">
    import { selected_config } from "./../../../routes/EditorLayout";
    import { melt, type TreeView } from "@melt-ui/svelte";
    import { getContext, createEventDispatcher } from "svelte";
    import { TreeNodeData } from "./ConfigTree";
    import { type Config } from "$lib/schemas";
    import ConfigCardEditor from "../../../routes/ConfigCardEditor.svelte";
    import { contextTarget } from "@intechstudio/grid-uikit";

    const dispatch = createEventDispatcher();

    export let treeItems: TreeNodeData<Config>[];
    export let level = 0;

    const {
        elements: { item, group },
        helpers: { isExpanded },
        states: { expanded }
    } = getContext<TreeView>("tree");

    // Function to handle expanding/collapsing
    function toggleExpand(id: string, level: number, value: boolean) {
        if (level === 0 && value) {
            expanded.set([id]);
        }
    }

    function handleDeleteVirtualDirectory(title: string) {
        dispatch("delete-virtual-directory", { title: title });
    }
</script>

{#each treeItems as child}
    <div
        class="flex flex-col mb-1 border-b h-5 border-white/40"
        style="margin-left: {level * 15}px;"
    >
        <button
            type="button"
            use:melt={$item({
                id: child.id,
                hasChildren: true
            })}
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
            on:click={() => toggleExpand(child.id, level, $isExpanded(child.id))}
            class="flex items-center"
        >
            <div class="flex-grow text-left text-white/80 truncate">
                {`${child.title} (${child.itemCount()})`}
            </div>
            <div>
                <svg
                    width="14"
                    height="11"
                    class={$isExpanded(child.id) ? "" : "-rotate-90"}
                    viewBox="0 0 14 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M6.99968 11L0.9375 0.5L13.0619 0.500001L6.99968 11Z" fill="#D9D9D9" />
                </svg>
            </div>
        </button>
    </div>
    {#if $isExpanded(child.id)}
        <div
            class="flex flex-col"
            class:max-h-full={level === 0}
            class:overflow-y-scroll={level === 0}
            class:pr-1={level === 0}
            class:ml-2={level > 0}
        >
            {#if child.children}
                <ul use:melt={$group({ id: child.id })}>
                    <svelte:self
                        treeItems={child.children}
                        level={level + 1}
                        on:delete-virtual-directory={(e) => {
                            const { title } = e.detail;
                            handleDeleteVirtualDirectory(title);
                        }}
                    />
                </ul>
            {/if}

            {#each child.items as item (item.id)}
                <div class="mb-1" style="margin-left: {level * 15}px;">
                    <ConfigCardEditor
                        data={item}
                        isSelected={item.id === $selected_config?.id &&
                            $selected_config?.presetIndex === -1}
                    />
                </div>
            {/each}
        </div>
    {/if}
{/each}
