<script lang="ts">
    import { type Config } from "$lib/schemas";
    import { TreeNodeData, type TreeKey, tree_key } from "./ConfigTree";
    import { selected_config } from "./../../../routes/EditorLayout";
    import { get } from "svelte/store";
    import ConfigCardEditor from "../../../routes/ConfigCardEditor.svelte";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let data: TreeNodeData<Config>;
    export let hideRoot = false;
    export let indentation = 0;

    let open = false;

    function handleSelection(config: Config) {
        dispatch("select", { config });
    }

    function handleToggleNode() {
        const key = get(tree_key);
        if (isOpen(data, key)) {
            tree_key.set(
                typeof data.parent === "undefined" ? undefined : { label: data.parent.label }
            );
        } else {
            tree_key.set({ label: data.label });
        }
    }

    $: handleKeyChange($tree_key);

    function isOpen(node: TreeNodeData<Config>, key: TreeKey): boolean {
        return key?.label === node.label || node.nodes.some((e) => isOpen(e, key));
    }

    function handleKeyChange(key: TreeKey) {
        open = isOpen(data, key);
    }
</script>

<div
    class="flex flex-col mb-1 border-b h-5 border-white/40"
    style="margin-left: {indentation * 15}px;"
>
    <button type="button" on:click={handleToggleNode} class="flex items-center">
        <div class="flex-grow text-left text-white/80 truncate">
            {`${data.label} (${data.children.length})`}
        </div>
        <div>
            <svg
                width="14"
                height="11"
                class={open ? "" : "-rotate-90"}
                viewBox="0 0 14 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M6.99968 11L0.9375 0.5L13.0619 0.500001L6.99968 11Z" fill="#D9D9D9" />
            </svg>
        </div>
    </button>
</div>
{#if open}
    <div
        class="flex flex-col"
        class:max-h-full={indentation === 0}
        class:overflow-y-scroll={indentation === 0}
        class:pr-1={indentation === 0}
    >
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
        {#each data.children as child (child.id)}
            <div class="mb-1" style="margin-left: {(indentation + 1) * 15}px;">
                <ConfigCardEditor
                    on:click={() => handleSelection(child)}
                    data={child}
                    isSelected={child.id === $selected_config}
                />
            </div>
        {/each}
    </div>
{/if}
