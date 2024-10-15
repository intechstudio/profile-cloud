<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { type Config } from "../../schemas";
    import { TreeNodeData } from "./ConfigTree";
    import { selected_config } from "./../../../routes/EditorLayout";
    import { get } from "svelte/store";
    import ConfigCardEditor from "../../../routes/ConfigCardEditor.svelte";

    const dispatch = createEventDispatcher();

    export let data: TreeNodeData<Config>;
    export let indentation = 0;

    function toggleNode(current: TreeNodeData<Config>, value: boolean) {
        if (value) {
            current.open.set(true);
        } else {
            current.open.set(false);
            for (const node of current.nodes) {
                toggleNode(node, false);
            }
        }
        dispatch("toggle", { value: get(open) });
    }

    const open = data.open;
</script>

<div
    class="flex flex-col mb-1 border-b h-5 border-white/40"
    style="margin-left: {indentation * 15}px;"
>
    <button type="button" on:click={() => toggleNode(data, !get(open))} class="flex items-center">
        <div class="flex-grow text-left text-white/80 truncate">
            {`${data.label} (${data.children.length})`}
        </div>
        <div>
            <svg
                width="14"
                height="11"
                class={$open ? "" : "-rotate-90"}
                viewBox="0 0 14 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M6.99968 11L0.9375 0.5L13.0619 0.500001L6.99968 11Z" fill="#D9D9D9" />
            </svg>
        </div>
    </button>
</div>
{#if $open}
    <div
        class="flex flex-col"
        class:max-h-full={indentation === 0}
        class:overflow-y-scroll={indentation === 0}
        class:pr-1={indentation === 0}
    >
        {#each data.nodes as node}
            <svelte:self data={node} indentation={indentation + 1} />
        {/each}
        {#each data.children as child (child.id)}
            <div class="mb-1" style="margin-left: {(indentation + 1) * 15}px;">
                <ConfigCardEditor
                    data={child}
                    isSelected={child.id === $selected_config?.id &&
                        $selected_config?.presetIndex === -1}
                />
            </div>
        {/each}
    </div>
{/if}
