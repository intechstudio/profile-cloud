<script lang="ts">
    import { type Config } from "$lib/schemas";
    import { TreeNode, type TreeKey, tree_key } from "./ConfigTree";
    import { selected_config } from "./../../../routes/EditorLayout";
    import { get } from "svelte/store";
    import ConfigCardEditor from "../../../routes/ConfigCardEditor.svelte";
    import { createEventDispatcher } from "svelte";
    import { slide } from "svelte/transition";

    export let data: TreeNode<Config>;
    export let hideRoot = false;
    export let indentation = 0;

    const dispatch = createEventDispatcher();
    const isRoot = indentation === 0;
    let isOpen = false;

    function handleSelection(config: Config) {
        dispatch("select", { config });
    }

    function handleToggleCategory(category: string) {
        const key = get(tree_key);
        isOpen = !isOpen;
        if (key !== category) {
            tree_key.set(category);
        } else {
            tree_key.set(undefined);
        }
    }

    $: handleKeyChange($tree_key);

    function handleKeyChange(key: TreeKey) {}
</script>

<ul class="flex flex-col gap-1 h-full">
    <li class="flex flex-col border-b border-white/40" style="margin-left: {indentation * 15}px;">
        <button
            type="button"
            on:click={() => handleToggleCategory(data.label)}
            class="flex items-center"
        >
            <div class="flex-grow text-left text-white/80 truncate">
                {`${data.label} (${data.children.length})`}
            </div>
            <div>
                <svg
                    width="14"
                    height="11"
                    class={isOpen ? "" : "-rotate-90"}
                    viewBox="0 0 14 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M6.99968 11L0.9375 0.5L13.0619 0.500001L6.99968 11Z" fill="#D9D9D9" />
                </svg>
            </div>
        </button>
    </li>
    {#if isOpen}
        <div class="flex flex-col gap-1 h-full bg-red-500">
            {#each data.nodes as node}
                <svelte:self
                    data={node}
                    indentation={indentation + 1}
                    {hideRoot}
                    on:select={(e) => {
                        //Bubbling events
                        const { config } = e.detail;
                        handleSelection(config);
                    }}
                />
            {/each}
            {#each data.children as child}
                <div style="margin-left: {(indentation + 1) * 15}px;">
                    <ConfigCardEditor
                        on:click={() => handleSelection(child)}
                        data={child}
                        isSelected={child.id === $selected_config}
                    />
                </div>
            {/each}
        </div>
    {/if}
</ul>
