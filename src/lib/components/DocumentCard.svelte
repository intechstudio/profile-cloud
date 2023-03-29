<script lang="ts">
	import type { IProfile } from '$lib/interfaces';
	import AtomicButton from './atomic/AtomicButton.svelte';

	export let data: IProfile;
</script>

<div
	class="flex flex-row  md:flex-col justify-between w-full h-full bg-white rounded-lg border border-black/10 shadow dark:bg-neutral-800"
>
	<div class="p-3">
		<h2 class="font-bold pb-2">{data.name}</h2>

		<div
			class="dark:text-white text-blacktext-opacity-60 dark:text-opacity-50 dark:bg-blue-300/5 font-mono rounded p-1"
		>
			{data.editorData?.substring(0, 100) || 'data is not present'}
		</div>
		<div class="dark:text-white pt-2 text-black text-opacity-80 dark:text-opacity-70">
			{data.description?.substring(0, 100) || 'description is not available'}
		</div>
	</div>

	<div
		class="flex p-3 justify-between items-center md:border-t-2 border-neutral-200 dark:border-neutral-700"
	>
		<span class="w-1/2 text-black text-opacity-80 dark:text-white mr-4"
			>{data.owner || 'CREATOR'}</span
		>

		<div class="w-1/2 ">
			<AtomicButton label={'import'} />
		</div>
	</div>
</div>
