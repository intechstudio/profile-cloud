<script lang="ts">
    import { tooltip } from "./../lib/actions/tooltip.ts";
    import { createEventDispatcher } from "svelte";
    import SvgIcon from "$lib/icons/SvgIcon.svelte";
    import type { Config } from "$lib/schemas";
    import { applyFocus } from "$lib/utils";
    import { doc, getDoc } from "firebase/firestore";
    import { userCollection } from "$lib/collections";
    import ConfigDescription from "./ConfigDescription.svelte";

    const dispatchEvent = createEventDispatcher();

    export let data: { selectedConfig: Config; selectedComponentTypes: string[] | undefined };

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

<div class="grid grid-cols-1 grid-rows-[auto_1fr] overflow-hidden w-full h-full bg-secondary p-2">
    {#if typeof data.selectedConfig !== "undefined"}
        <div class="w-full flex flex-row gap-2 items-center justify-between">
            <div class="flex flex-col flex-grow">
                <input
                    bind:this={nameInputField.element}
                    class="w-full mr-1 font-bold border bg-white dark:bg-transparent truncate dark:hover:bg-neutral-800 focus:outline-none
                    {!data.selectedConfig.isEditable ? 'pointer-events-none' : ''} 
                    {nameInputField.doubleClicked ? 'border-emerald-500' : 'border-transparent'}"
                    readonly={!nameInputField.doubleClicked}
                    on:keydown={(e) => {
                        if (e.key == "Enter" && !e.shiftKey) {
                            nameInputField.element?.blur();
                        }
                    }}
                    on:blur={() => {
                        window?.getSelection()?.removeAllRanges();
                        nameInputField.doubleClicked = false;
                        // reset input value if user clicked out without changing the value
                        if (nameInputField.element?.value == "") {
                            nameInputField.element.value = "Add name";
                        }
                        if (nameInputField.element?.value != nameInputField.currentSelection) {
                            dispatchEvent("name-change", {
                                newName: nameInputField.element?.value
                            });
                        }
                    }}
                    on:dblclick|stopPropagation|preventDefault={() => {
                        nameInputField.doubleClicked = true;
                        nameInputField.element?.setSelectionRange(
                            0,
                            nameInputField.element.value.length
                        );
                        nameInputField.currentSelection = nameInputField.element?.value || "";
                    }}
                    value={data.selectedConfig.name}
                />
                <span class="text-black text-xs dark:text-opacity-70 dark:text-white"
                    >{configOwner}</span
                >
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
