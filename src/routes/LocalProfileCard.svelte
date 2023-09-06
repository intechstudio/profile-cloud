<script lang="ts">
    import { applyFocus } from "$lib/utils";
    import SvgIcon from "$lib/icons/SvgIcon.svelte";
    import { createEventDispatcher, getContext } from "svelte";
    import type { Profile } from "$lib/schemas";

    const dispatchEvent = createEventDispatcher();

    interface SelectedModuleType {
        selectedModuleType: string;
    }

    export let data: Profile & SelectedModuleType;

    const display = getContext("display");

    let deleteConfirmFlag = false;
    let overwriteApplyFlag = false;

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

<button
    on:click={() => {
        dispatchEvent("click", {});
    }}
    on:focusout={(e) => {
        if (e.relatedTarget == null) {
            dispatchEvent("focusout", {});
        }
    }}
    class="{$$props.class} flex flex-col justify-between items-start text-left w-full bg-white rounded border-y border-r shadow dark:bg-secondary"
>
    <div class="flex w-full justify-between">
        <div class="flex flex-row h-full w-full">
            <div class="bg-emerald-500 w-1 mr-2 rounded-l " />
            <div class="flex-grow py-3 pr-3">
                <div class="flex justify-between items-center">
                    <input
                        bind:this={nameInputField.element}
                        class="w-full mr-1 font-bold border bg-transparent hover:bg-neutral-800 focus:outline-none {nameInputField.doubleClicked
                            ? 'border-emerald-500'
                            : 'border-transparent'}"
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
                        on:dblclick|preventDefault|stopPropagation={() => {
                            nameInputField.doubleClicked = true;
                            nameInputField.element?.setSelectionRange(
                                0,
                                nameInputField.element.value.length
                            );
                            nameInputField.currentSelection = nameInputField.element?.value || "";
                        }}
                        value={data.name}
                    />
                    <div class="flex gap-x-1 items-center">
                        <!-- <button class="flex" on:click={() => dispatchEvent('split-profile')}> split </button> -->
                        {#if deleteConfirmFlag == false}
                            <button
                                class="flex relative group"
                                on:click|stopPropagation={() => {
                                    deleteConfirmFlag = true;
                                }}
                            >
                                <SvgIcon class="w-5" iconPath="delete" />
                                <div
                                    class="group-hover:block hidden font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80  border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
                                >
                                    Delete
                                </div>
                            </button>
                        {:else}
                            <button
                                use:applyFocus
                                on:blur={() => {
                                    console.log("good bye");
                                    deleteConfirmFlag = false;
                                }}
                                on:click|stopPropagation={() => {
                                    dispatchEvent("delete-local");
                                    deleteConfirmFlag = false;
                                }}
                                class="bg-red-600 rounded px-1 py-0.5 text-xs">confirm</button
                            >
                        {/if}
                        <button
                            class="flex relative group"
                            on:click|stopPropagation={() => {
                                dispatchEvent("save-to-cloud");
                            }}
                        >
                            <SvgIcon class="w-5" iconPath="move_to_cloud_02" />
                            <div
                                class="group-hover:block hidden font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80  border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
                            >
                                Upload
                            </div>
                        </button>
                        {#if overwriteApplyFlag == false}
                            <button
                                class="flex relative group"
                                on:click|stopPropagation={() => {
                                    overwriteApplyFlag = true;
                                }}
                            >
                                <SvgIcon class="w-5" iconPath="overwrite_profile" />
                                <div
                                    class="group-hover:block hidden font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80  border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
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
                                class="bg-emerald-600 rounded px-1 py-0.5 text-xs">apply</button
                            >
                        {/if}
                    </div>
                </div>
                <div class="dark:text-white pt-2 text-black text-opacity-80 dark:text-opacity-70">
                    <textarea
                        rows={2}
                        bind:this={descriptionTextarea.element}
                        class="w-full border bg-primary hover:bg-neutral-800 focus:outline-none {descriptionTextarea.doubleClicked
                            ? 'border-emerald-500'
                            : 'border-transparent'}"
                        readonly={!descriptionTextarea.doubleClicked}
                        on:keydown={(e) => {
                            if (e.key == "Enter" && !e.shiftKey) {
                                descriptionTextarea.element?.blur();
                            }
                        }}
                        on:blur={() => {
                            window?.getSelection()?.removeAllRanges();
                            descriptionTextarea.doubleClicked = false;
                            // reset input value if user clicked out without changing the value
                            if (descriptionTextarea.element?.value == "") {
                                descriptionTextarea.element.value = "Add description";
                            }
                            if (
                                descriptionTextarea.element?.value !=
                                descriptionTextarea.currentSelection
                            ) {
                                dispatchEvent("description-change", {
                                    newDescription: descriptionTextarea.element?.value
                                });
                            }
                        }}
                        on:dblclick|preventDefault|stopPropagation={() => {
                            descriptionTextarea.doubleClicked = true;
                            descriptionTextarea.element?.setSelectionRange(
                                0,
                                descriptionTextarea.element.value.length
                            );
                            descriptionTextarea.currentSelection =
                                descriptionTextarea.element?.value || "";
                        }}
                        value={data.description}
                    />
                </div>
                <div
                    class="flex justify-between pt-2 dark:text-white text-black text-opacity-80 {data.type ===
                    data.selectedModuleType
                        ? 'dark:text-opacity-100'
                        : 'dark:text-opacity-70'}"
                >
                    <div
                        class="dark:border py-0.5 px-2 {data.type === data.selectedModuleType
                            ? 'dark:border-white dark:border-opacity-10 dark:bg-white dark:bg-opacity-10'
                            : 'dark:border-transparent'}"
                    >
                        {data.type}
                    </div>
                    {#if data.linked}
                        <div>Imported from link.</div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</button>
