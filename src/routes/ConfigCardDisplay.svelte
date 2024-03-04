<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import SvgIcon from "$lib/icons/SvgIcon.svelte";
    import type { Config } from "$lib/schemas";
    import { applyFocus } from "$lib/utils";
    import { doc, getDoc } from "firebase/firestore";
    import { userCollection } from "$lib/collections";

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

    let descriptionTextarea = {
        element: null as HTMLTextAreaElement | null,
        doubleClicked: false,
        currentSelection: ""
    };
</script>

<div class="flex flex-col gap-1 w-full h-full bg-secondary p-2">
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
                        >
                            <SvgIcon class="w-5" iconPath="delete" />
                            <div
                                class="group-hover:block font-medium hidden absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2"
                            >
                                Delete
                            </div>
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
                        >
                            <SvgIcon class="w-5" iconPath="overwrite_profile" />
                            <div
                                class="group-hover:block hidden font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2"
                            >
                                Overwrite
                            </div>
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
                        <div class="relative group">
                            <SvgIcon display={true} iconPath={"public"} />
                            <div
                                class="group-hover:block font-medium hidden absolute mt-1 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2"
                            >
                                Public
                            </div>
                        </div>
                    {:else if data.selectedConfig.public === false}
                        <div class="relative group">
                            <SvgIcon display={true} iconPath={"private"} />
                            <div
                                class="group-hover:block font-medium hidden absolute mt-1 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2"
                            >
                                Private
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
        <div class="flex flex-grow text-white text-opacity-70">
            <textarea
                rows={2}
                bind:this={descriptionTextarea.element}
                class="overflow-none w-full border resize-none bg-neutral-100 dark:bg-primary focus:outline-none
                    {descriptionTextarea.doubleClicked
                    ? 'border-emerald-500'
                    : 'border-transparent'}"
                class:dark:hover:bg-neutral-800={data.selectedConfig.isEditable}
                readonly={!descriptionTextarea.doubleClicked}
                on:keydown={(e) => {
                    if (e.key == "Enter" && !e.shiftKey) {
                        descriptionTextarea.element?.blur();
                    }
                }}
                on:blur={() => {
                    if (!data.selectedConfig.isEditable) {
                        return;
                    }
                    window?.getSelection()?.removeAllRanges();
                    descriptionTextarea.doubleClicked = false;
                    // reset input value if user clicked out without changing the value
                    if (descriptionTextarea.element?.value == "") {
                        descriptionTextarea.element.value = "Add description";
                    }
                    if (
                        descriptionTextarea.element?.value != descriptionTextarea.currentSelection
                    ) {
                        dispatchEvent("description-change", {
                            newDescription: descriptionTextarea.element?.value
                        });
                    }
                }}
                on:dblclick|stopPropagation|preventDefault={() => {
                    if (!data.selectedConfig.isEditable) {
                        return;
                    }
                    descriptionTextarea.doubleClicked = true;
                    descriptionTextarea.element?.setSelectionRange(
                        0,
                        descriptionTextarea.element.value.length
                    );
                    descriptionTextarea.currentSelection = descriptionTextarea.element?.value || "";
                }}
                value={data.selectedConfig.description}
            />
        </div>
    {:else}
        <div class="flex bg-primary w-full h-full items-center justify-center">
            <span class="text-white text-opacity-70">No configuration is selected</span>
        </div>
    {/if}
</div>
