<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let checkbox = false;

  const toggle = () => {
    dispatch("toggle", !checkbox);
  };
</script>

<!-- Toggle B -->
<label class="flex items-center cursor-pointer">
  <!-- label -->
  <div class=" dark:text-white font-medium rounded-r-full ml-1">
    {#if checkbox}
      <slot name="on" />
    {:else}
      <slot name="off" />
    {/if}
  </div>
  <!-- toggle -->
  <div class="relative">
    <!-- input -->
    <input
      type="checkbox"
      on:change|stopPropagation|preventDefault={toggle}
      bind:checked={checkbox}
      class="sr-only"
    />
    <!-- line -->
    <div
      class="block bg-neutral-300 dark:bg-neutral-800 w-7 h-4 rounded-full mr-1"
    />
    <!-- dot -->
    <div
      class="dot absolute left-0.5 top-0.5 bg-neutral-500 w-3 h-3 rounded-full transition"
    />
  </div>
</label>

<style lang="postcss">
  /* Toggle B */
  input:checked ~ .dot {
    transform: translateX(100%);
    @apply bg-emerald-400;
  }
</style>
