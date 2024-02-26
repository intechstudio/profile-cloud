<script lang="ts">
    import { createEventDispatcher, getContext, onDestroy, onMount } from "svelte";
    import SvgIcon from "$lib/icons/SvgIcon.svelte";
    import type { Config } from "$lib/schemas";
    import { applyFocus } from "$lib/utils";
    import { doc, getDoc } from "firebase/firestore";
    import { userCollection } from "$lib/collections";

    const dispatchEvent = createEventDispatcher();

    interface SelectedComponentTypes {
        selectedComponentTypes: string[] | undefined;
    }

    export let data: Config & SelectedComponentTypes;

    export let isSelected: boolean;

    const display = getContext("display");

    let deleteConfirmFlag = false;
    let overwriteApplyFlag = false;

    let configOwner: string = "";
    onMount(() => {
        if (data.owner) {
            const userRef = doc(userCollection, data.owner);
            getDoc(userRef)
                .then((res) => res.data()?.username)
                .then((username) => {
                    if (username) {
                        configOwner = "@" + username;
                    }
                });
        }
    });

    onDestroy(() => {});

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
    class="{isSelected
        ? 'border-emerald-500'
        : 'border-white/10'} flex flex-row justify-between items-center px-2 py-1 w-full bg-white border shadow dark:bg-secondary"
>
    <span>{data.name}</span>

    <div
        class="dark:text-white text-black text-opacity-80 py-0.5 px-2 dark:border
                {data.selectedComponentTypes?.includes(data.type) ?? false
            ? 'dark:text-opacity-100 dark:border-white dark:border-opacity-10 dark:bg-white dark:bg-opacity-10'
            : 'dark:text-opacity-70 dark:border-transparent'} truncate"
    >
        {data.type}
    </div>
</button>
