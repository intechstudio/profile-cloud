<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let checkbox = false;

	const toggle = () => {
		dispatch('toggle');
	};
</script>

<!-- Toggle B -->
<label
	for="toggle"
	class="flex items-center cursor-pointer dark:bg-neutral-600 bg-neutral-200 rounded-full"
>
	<!-- label -->
	<div class=" dark:text-white font-medium rounded-r-full">
		{#if checkbox}
			<img class="w-6 h-6 p-1" src="/sun_icon.svg" alt="light mode icon" />
		{:else}
			<img class="w-6 h-6" src="/moon_icon.svg" alt="dark mode icon" />
		{/if}
	</div>
	<!-- toggle -->
	<div class="relative">
		<!-- input -->
		<input type="checkbox" on:change={toggle} bind:checked={checkbox} id="toggle" class="sr-only" />
		<!-- line -->
		<div class="block bg-neutral-300 dark:bg-neutral-700 w-10 h-6 rounded-full" />
		<!-- dot -->
		<div class="dot absolute left-1 top-1 bg-emerald-400 w-4 h-4 rounded-full transition" />
	</div>
</label>

<style lang="postcss">
	/* Toggle B */
	input:checked ~ .dot {
		transform: translateX(100%);
		@apply bg-blue-400;
	}
</style>
