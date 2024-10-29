<script lang="ts">
    import { melt, type TreeView } from "@melt-ui/svelte";
    import { getContext } from "svelte";
    import { TreeNodeData } from "./ConfigTree";
    import { type Config } from "../../schemas";

    export let treeItems: TreeNodeData<Config>[] = [];
    export let level = 0;
    export let toggleMainLevels = true;

    const {
        elements: { item, group },
        helpers: { isExpanded },
        states: { expanded }
    } = getContext<TreeView>("tree");

    function toggleExpand(id: string, level: number, value: boolean) {
        if (!toggleMainLevels) {
            return;
        }

        if (level === 0 && value) {
            expanded.set([id]);
        }
    }
</script>

{#each treeItems as child}
    <button
        type="button"
        use:melt={$item({ id: child.id, hasChildren: true })}
        on:click={() => toggleExpand(child.id, level, $isExpanded(child.id))}
        class="flex items-center w-full"
    >
        <slot name="folder" {level} {child} isExpanded={$isExpanded(child.id)} />
    </button>

    {#if $isExpanded(child.id)}
        <div
            class="flex flex-col"
            class:max-h-full={level === 0}
            class:overflow-y-scroll={level === 0}
            class:pr-1={level === 0}
        >
            {#if child.children && child.children.length > 0}
                <div use:melt={$group({ id: child.id })} class="pl-4">
                    <svelte:self treeItems={child.children} level={level + 1}>
                        <svelte:fragment slot="folder" let:level let:child let:isExpanded>
                            <slot name="folder" {level} {child} {isExpanded} />
                        </svelte:fragment>

                        <svelte:fragment slot="file" let:item>
                            <slot name="file" {item} />
                        </svelte:fragment>
                    </svelte:self>
                </div>
            {/if}

            {#each child.items as item (item.id)}
                <slot name="file" {item} />
            {/each}
        </div>
    {/if}
{/each}
