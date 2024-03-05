<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";

    export let key: string | undefined | null;

    const store = getContext<
        Writable<{ key: string | undefined | null; duration: number; easing: number }>
    >("svelte-collapsible-accordion");

    $: params = {
        open: $store.key === key,
        duration: $store.duration,
        easing: $store.easing
    };

    function handleToggle() {
        if (params.open) {
            store.update((s) => Object.assign(s, { key: null }));
        } else {
            store.update((s) => Object.assign(s, { key }));
        }
    }
</script>

<li class="flex flex-col {params.open ? 'overflow-hidden' : ''} border-b border-white/40">
    <button type="button" on:click={handleToggle} class="flex items-center">
        <div class="flex-grow text-left text-white/80">
            <slot name="header" />
        </div>
        <div>
            <svg
                width="14"
                height="11"
                class={params.open ? "" : "-rotate-90"}
                viewBox="0 0 14 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M6.99968 11L0.9375 0.5L13.0619 0.500001L6.99968 11Z" fill="#D9D9D9" />
            </svg>
        </div>
    </button>

    <div class="flex flex-grow flex-col pr-2 overflow-auto w-full {params.open ? '' : 'hidden'}">
        <slot name="body" />
    </div>

    <slot />
</li>
