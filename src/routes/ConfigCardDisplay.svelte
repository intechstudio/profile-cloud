<script lang="ts">
    import { grid } from "@intechstudio/grid-protocol";
    import { ModuleType, ElementType } from "@intechstudio/grid-protocol";
    import { tooltip } from "./../lib/actions/tooltip";
    import { createEventDispatcher } from "svelte";
    import SvgIcon from "../lib/icons/SvgIcon.svelte";
    import type { Config } from "../lib/schemas";
    import { applyFocus } from "../lib/utils";
    import { doc, getDoc } from "firebase/firestore";
    import { userCollection } from "../lib/collections";
    import ConfigDescription from "./ConfigDescription.svelte";
    import DataInput from "../lib/components/DataInput.svelte";
    import { selected_config } from "./EditorLayout";

    const dispatchEvent = createEventDispatcher();

    export let data: Config | undefined;

    let deleteConfirmFlag = false;
    let overwriteApplyFlag = false;

    let configOwner: string = "";

    function handleSelectedConfigChange(config: Config) {
        if (config.owner) {
            const userRef = doc(userCollection, data?.owner);
            getDoc(userRef)
                .then((res) => res.data()?.username)
                .then((username) => {
                    if (username) {
                        configOwner = "@" + username;
                    }
                });
        } else {
            configOwner = "";
        }
    }

    $: if (typeof data !== "undefined") {
        handleSelectedConfigChange(data);
    }

    function handleDescriptionChange(e: CustomEvent<string>) {
        const value = e.detail;
        dispatchEvent("description-change", {
            newDescription: value
        });
    }

    let partialPresetName: string;

    $: {
        if (typeof $selected_config !== "undefined" && $selected_config.presetIndex !== -1) {
            let moduleType = ModuleType[data?.type as keyof typeof ModuleType];
            let elements = grid
                .get_module_element_list(moduleType)
                .reduce((array: Array<{ index: number; type: ElementType }>, element, index) => {
                    if (typeof element !== "undefined") {
                        array.push({ index, type: element });
                    }
                    return array;
                }, []);

            const index = elements.findIndex((e) => e.index === $selected_config.presetIndex);

            // Check if index is valid and the element exists
            if (index !== -1 && elements[index]?.type) {
                partialPresetName = `Element ${index} (${
                    elements[index].type.at(0)?.toUpperCase() + elements[index].type?.slice(1)
                })`;
            } else {
                // Handle case when element or index is not valid
                throw "Element not found or invalid";
            }
        }
    }
</script>

<div class="w-full h-full bg-secondary p-2 overflow-hidden">
    {#if typeof data !== "undefined"}
        <div class="grid grid-rows-[auto_1fr] gap-1 w-full h-full">
            <div class="w-full flex flex-row gap-2 items-center justify-between">
                <div class="flex flex-col flex-grow">
                    <DataInput
                        value={data.name +
                            ($selected_config?.presetIndex === -1 ? "" : ` / ${partialPresetName}`)}
                        disabled={!data.isEditable || $selected_config?.presetIndex !== -1}
                        placeholder={"Add name"}
                        bold={true}
                        on:change={(e) => {
                            const { value } = e.detail;
                            dispatchEvent("name-change", {
                                value
                            });
                        }}
                    />

                    <div class="flex flex-row gap-2 items-center">
                        <span>Folder:</span>
                        <DataInput
                            value={data.virtualPath ?? "Unsorted"}
                            disabled={!data.isEditable || $selected_config?.presetIndex !== -1}
                            on:change={(e) => {
                                const { value } = e.detail;
                                const path = value.trim();
                                dispatchEvent("path-change", {
                                    value: path === "" ? undefined : path
                                });
                            }}
                        />
                    </div>
                </div>
                <div class="flex flex-col items-end">
                    <span class="text-black text-xs dark:text-opacity-70 dark:text-white"
                        >{configOwner}</span
                    >

                    <div class="relative flex items-center gap-x-1">
                        {#if data.isEditable}
                            {#if deleteConfirmFlag == false}
                                <button
                                    class="flex group relative"
                                    on:click|stopPropagation={() => {
                                        deleteConfirmFlag = true;
                                    }}
                                    use:tooltip={{
                                        nowrap: true,
                                        placement: "bottom",
                                        duration: 75,
                                        instant: true,
                                        class: "px-2 py-1",
                                        text: "Delete"
                                    }}
                                >
                                    <SvgIcon class="w-5" iconPath="delete" />
                                </button>
                            {:else}
                                <button
                                    use:applyFocus
                                    on:blur|stopPropagation={() => {
                                        deleteConfirmFlag = false;
                                    }}
                                    on:click|stopPropagation={() => {
                                        dispatchEvent("delete-config");
                                        deleteConfirmFlag = false;
                                    }}
                                    class="bg-red-600 rounded px-1 text-xs">confirm</button
                                >
                            {/if}
                            {#if overwriteApplyFlag == false}
                                <button
                                    class="flex relative group"
                                    on:click|stopPropagation={() => {
                                        overwriteApplyFlag = true;
                                    }}
                                    use:tooltip={{
                                        nowrap: true,
                                        placement: "bottom",
                                        duration: 75,
                                        instant: true,
                                        class: "px-2 py-1",
                                        text: "Overwrite"
                                    }}
                                >
                                    <SvgIcon class="w-5" iconPath="overwrite_profile" />
                                </button>
                            {:else}
                                <button
                                    use:applyFocus
                                    on:blur={() => {
                                        overwriteApplyFlag = false;
                                    }}
                                    on:click|stopPropagation={() => {
                                        dispatchEvent("overwrite-profile");
                                        overwriteApplyFlag = false;
                                    }}
                                    class="bg-emerald-600 rounded px-1 text-xs">apply</button
                                >
                            {/if}
                        {/if}
                        <slot name="link-button" />
                        <slot name="sync-config-button" />
                        <slot name="split-config-button" />
                        <slot name="import-config-browser-button" />
                        <div class="flex items-center gap-x-1">
                            {#if data.isEditable && data.public !== undefined}
                                <slot name="toggle-accessibility" />
                            {:else if data.public}
                                <div
                                    class="relative group"
                                    use:tooltip={{
                                        nowrap: true,
                                        placement: "bottom",
                                        duration: 75,
                                        instant: true,
                                        class: "px-2 py-1",
                                        text: "Public"
                                    }}
                                >
                                    <SvgIcon display={true} iconPath={"public"} />
                                </div>
                            {:else if data.public === false}
                                <div
                                    class="relative group"
                                    use:tooltip={{
                                        nowrap: true,
                                        placement: "bottom",
                                        duration: 75,
                                        instant: true,
                                        class: "px-2 py-1",
                                        text: "Private"
                                    }}
                                >
                                    <SvgIcon display={true} iconPath={"private"} />
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex text-white text-opacity-70 overflow-scroll">
                <ConfigDescription
                    value={data.description}
                    disabled={!data.isEditable || $selected_config?.presetIndex !== -1}
                    on:change={handleDescriptionChange}
                />
            </div>
        </div>
    {:else}
        <div class="flex bg-primary h-full items-center justify-center">
            <span class="text-white text-opacity-70">No configuration is selected</span>
        </div>
    {/if}
</div>
