<script lang="ts" context="module">
    export type TreeNode = {
        label: string;
        children: Array<TreeNode | any>;
        open: boolean;
    };
</script>

<script lang="ts">
    import ConfigCardEditor from "../../../routes/ConfigCardEditor.svelte";
    import { createEventDispatcher } from "svelte";
    export let data: TreeNode;
    export let indentation = 0;
    export let selectedConfigId: any;

    const dispatch = createEventDispatcher();
    function handleSelection(config: any) {
        dispatch("select", { config });
    }
</script>

<ul class="flex flex-col gap-1 max-h-full overflow-auto">
    {#each data?.children ?? [] as child}
        {#if typeof child.children !== "undefined"}
            <li
                class="flex flex-col border-b border-white/40"
                style="margin-left: {indentation * 10}px;"
            >
                <button
                    type="button"
                    on:click={() => {
                        child.open = !child.open;
                    }}
                    class="flex items-center"
                >
                    <div class="flex-grow text-left text-white/80">
                        {`${child.label} (${child.children.length})`}
                    </div>
                    <div>
                        <svg
                            width="14"
                            height="11"
                            class={child.open ? "" : "-rotate-90"}
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
            {#if child.open}
                <svelte:self
                    data={child}
                    indentation={indentation + 1}
                    {selectedConfigId}
                    on:select={(e) => {
                        //Bubbling events
                        const { config } = e.detail;
                        handleSelection(config);
                    }}
                />
            {/if}
        {:else}
            <div class="mr-1" style="margin-left: {(indentation - 1) * 10}px;">
                <ConfigCardEditor
                    on:click={() => handleSelection(child)}
                    data={{
                        ...child,
                        selectedComponentTypes: [] //selectedComponentTypes
                    }}
                    isSelected={child.id === selectedConfigId}
                />
            </div>
        {/if}
    {/each}
</ul>
