<script lang="ts">
	import SvgIcon from '$lib/icons/SvgIcon.svelte';
	import type { Profile } from '$lib/types';
	import { createEventDispatcher, getContext } from 'svelte';

	const dispatchEvent = createEventDispatcher();

	export let data: Profile;

	const display = getContext('display');

	let deleteConfirmFlag = false;
</script>

<button
	on:click={() => {
		dispatchEvent('click', {});
	}}
	class="{$$props.class} flex flex-col justify-between items-start text-left w-full h-full bg-white rounded-lg border border-black/10 shadow dark:bg-black dark:bg-opacity-60"
>
	<div class="flex w-full justify-between">
		<div class="flex-grow p-3">
			<div class="flex justify-between items-center">
				<div class="font-bold ">{data.name}</div>
				<div class="flex gap-x-1">
					<button
						class="flex"
						on:click={() => {
							deleteConfirmFlag = true;
						}}
					>
						{#if deleteConfirmFlag == false}
							<SvgIcon class="w-5" iconPath="delete" />
						{:else}
							<button
								on:click|stopPropagation={() => {
									dispatchEvent('delete');
									deleteConfirmFlag = false;
								}}
								class="bg-red-600 rounded px-1 py-0.5 text-xs">confirm</button
							>
						{/if}
					</button>
					<SvgIcon class="w-5" iconPath="move_to_cloud_02" />
					<SvgIcon class="w-5" iconPath="overwrite_profile" />
				</div>
			</div>
			<div class="dark:text-white pt-2 text-black text-opacity-80 dark:text-opacity-70">
				{data.description?.substring(0, 100) || 'description is not available'}
			</div>
		</div>
	</div>
</button>
