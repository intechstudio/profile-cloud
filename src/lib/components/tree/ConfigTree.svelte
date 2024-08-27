<script lang="ts" context="module">
    import { selected_config } from "./../../../routes/EditorLayout";
    export type TreeNode = {
        label: string;
        children: Array<TreeNode | any>;
        open: boolean;
    };
</script>

<script lang="ts">
    import { get } from "svelte/store";
    import ConfigCardEditor from "../../../routes/ConfigCardEditor.svelte";
    import { createEventDispatcher } from "svelte";
    import { tree_key } from "../../../routes/EditorLayout";
    export let data: TreeNode;
    export let indentation = 0;

    const dispatch = createEventDispatcher();

    function handleSelection(config: any) {
        dispatch("select", { config });
    }

    function handleToggleCategory(category: string) {
        const key = get(tree_key);
        if (key !== category) {
            tree_key.set(category);
        } else {
            tree_key.set(undefined);
        }
    }
</script>

<ul class="flex flex-col gap-1 overflow-auto max-h-full">
    {#each data?.children ?? [] as child}
        {#if child.children}
            <li
                class="flex flex-col border-b border-white/40"
                style="margin-left: {indentation * 20}px;"
            >
                <button
                    type="button"
                    on:click={() => handleToggleCategory(child.label)}
                    class="flex items-center"
                >
                    <div class="flex-grow text-left text-white/80">
                        {`${child.label} (${
                            child.children.filter((e) => typeof e.label === "undefined").length
                        })`}
                    </div>
                    <div>
                        <svg
                            width="14"
                            height="11"
                            class={child.label === $tree_key ? "" : "-rotate-90"}
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
                </button>
            </li>
            <svelte:self
                data={child}
                indentation={indentation + 1}
                on:select={(e) => {
                    //Bubbling events
                    const { config } = e.detail;
                    handleSelection(config);
                }}
            />
        {:else if data.label === $tree_key}
            <div class="mr-1" style="margin-left: {(indentation - 1) * 20}px;">
                <ConfigCardEditor
                    on:click={() => handleSelection(child)}
                    data={child}
                    isSelected={child.id === $selected_config}
                />
            </div>
        {/if}
    {/each}
</ul>
