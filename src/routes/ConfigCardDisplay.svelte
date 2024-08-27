<script lang="ts">
    import { tooltip } from "./../lib/actions/tooltip.ts";
    import { createEventDispatcher } from "svelte";
    import SvgIcon from "$lib/icons/SvgIcon.svelte";
    import type { Config } from "$lib/schemas";
    import { applyFocus } from "$lib/utils";
    import { doc, getDoc } from "firebase/firestore";
    import { userCollection } from "$lib/collections";
    import ConfigDescription from "./ConfigDescription.svelte";
    import DataInput from "$lib/components/DataInput.svelte";

    const dispatchEvent = createEventDispatcher();

    export let data: { selectedConfig: Config; selectedComponentTypes: string[] | undefined };

    $: console.log(data);

    let deleteConfirmFlag = false;
    let overwriteApplyFlag = false;

    let configOwner: string = "";

    function handleSelectedConfigChange(config: Config) {
        if (config.owner) {
            const userRef = doc(userCollection, data.selectedConfig.owner);
            getDoc(userRef)
                .then((res) => res.data()?.username)
                .then((username) => {
                    if (username) {
                        configOwner = "@" + username;
                    }
                });
        }
    }

    $: if (typeof data.selectedConfig !== "undefined") {
        handleSelectedConfigChange(data.selectedConfig);
    }

    let nameInputField = {
        element: null as HTMLInputElement | null,
        doubleClicked: false,
        currentSelection: ""
    };

    function handleDescriptionChange(e: CustomEvent<string>) {
        const value = e.detail;
        console.log(value);
        dispatchEvent("description-change", {
            newDescription: value
        });
    }
</script>

<div
    class="grid grid-cols-1 grid-rows-[auto_1fr] gap-1 overflow-hidden w-full h-full bg-secondary p-2"
>
    {#if typeof data.selectedConfig !== "undefined"}
        <div class="w-full flex flex-row gap-2 items-center justify-between">
            <div class="flex flex-col flex-grow">
                <DataInput
                    value={data.selectedConfig.name}
                    disabled={!data.selectedConfig.isEditable}
                    placeholder={"Add name"}
                    bold={true}
                    on:change={(e) => {
                        const { newName } = e.detail;
                        dispatchEvent("name-change", {
                            newName
                        });
                    }}
                />
                <span class="text-black text-xs dark:text-opacity-70 dark:text-white"
                    >{configOwner}</span
                >
                <div class="flex flex-row gap-2 items-center">
                    <span>Folder:</span>
                    <DataInput
                        value={data.selectedConfig.virtualPath ?? "Unsorted"}
                        disabled={!data.selectedConfig.isEditable}
                        on:change={(e) => {
                            /*
                        const { newName } = e.detail;
                        dispatchEvent("name-change", {
                            newName
                        });
                        */
                        }}
                    />
                </div>
            </div>
            <div class="relative flex items-center gap-x-1">
                {#if data.selectedConfig.isEditable}
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
                    {#if data.selectedConfig.isEditable && data.selectedConfig.public !== undefined}
                        <slot name="toggle-accessibility" />
                    {:else if data.selectedConfig.public}
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
                    {:else if data.selectedConfig.public === false}
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
        <div class="flex text-white text-opacity-70 overflow-scroll">
            <ConfigDescription
                value={data.selectedConfig.description}
                disabled={!data.selectedConfig.isEditable}
                on:change={handleDescriptionChange}
            />
        </div>
    {:else}
        <div class="flex bg-primary w-full h-full items-center justify-center">
            <span class="text-white text-opacity-70">No configuration is selected</span>
        </div>
    {/if}
</div>
