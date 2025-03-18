<script lang="ts">
  import { getContext } from "svelte";

  const showComponent = getContext("display") === "web";
</script>

{#if showComponent}
  <slot />
{/if}
