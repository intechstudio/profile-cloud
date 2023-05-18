<script lang="ts">
	import SvgIcon from '$lib/icons/SvgIcon.svelte';
	import type { Profile } from '$lib/types';
	import { createEventDispatcher, getContext } from 'svelte';

	const dispatchEvent = createEventDispatcher();

	export let data: Profile;

	const display = getContext('display');

	let deleteConfirmFlag = false;

	let nameInputField = {
		element: null as HTMLInputElement | null,
		doubleClicked: false,
		currentSelection: ''
	};

	function focusConfirmButton(el: HTMLElement) {
		el.focus();
	}
</script>

<button
	on:click|preventDefault={() => {
		dispatchEvent('click', {});
	}}
	class="{$$props.class} flex flex-col justify-between items-start text-left w-full h-full bg-white rounded-lg border border-black/10 shadow dark:bg-black dark:bg-opacity-60"
>
	<div class="flex w-full justify-between">
		<div class="flex-grow p-3">
			<div class="flex justify-between items-center">
				<input
					bind:this={nameInputField.element}
					class="w-full mr-1 font-bold border bg-transparent focus:outline-none {nameInputField.doubleClicked
						? 'border-emerald-500'
						: 'border-transparent'}"
					readonly={!nameInputField.doubleClicked}
					on:blur={() => {
						window?.getSelection()?.removeAllRanges();
						nameInputField.doubleClicked = false;
						// reset input value if user clicked out without changing the value
						if (nameInputField.element?.value == '') {
							nameInputField.element.value = nameInputField.currentSelection;
						}
						if (nameInputField.element?.value != nameInputField.currentSelection) {
							dispatchEvent('name-change', { newName: nameInputField.element?.value });
						}
					}}
					on:dblclick={() => {
						nameInputField.doubleClicked = true;
						nameInputField.element?.setSelectionRange(0, nameInputField.element.value.length);
						nameInputField.currentSelection = nameInputField.element?.value || '';
					}}
					value={data.name}
				/>
				<div class="flex gap-x-1">
					{#if deleteConfirmFlag == false}
						<button
							class="flex"
							on:click={() => {
								deleteConfirmFlag = true;
							}}
						>
							<SvgIcon class="w-5" iconPath="delete" />
						</button>
					{:else}
						<button
							use:focusConfirmButton
							on:blur={() => {
								console.log('good bye');
								deleteConfirmFlag = false;
							}}
							on:click={() => {
								dispatchEvent('delete');
								deleteConfirmFlag = false;
							}}
							class="bg-red-600 rounded px-1 py-0.5 text-xs">confirm</button
						>
					{/if}
					<button
						class="flex"
						on:click={() => {
							dispatchEvent('save-to-cloud');
						}}
					>
						<SvgIcon class="w-5" iconPath="move_to_cloud_02" />
					</button>
					<button class="flex" on:click={() => dispatchEvent('overwrite-profile')}>
						<SvgIcon class="w-5" iconPath="overwrite_profile" />
					</button>
				</div>
			</div>
			<div class="dark:text-white pt-2 text-black text-opacity-80 dark:text-opacity-70">
				{data.description?.substring(0, 100) || 'description is not available'}
			</div>
		</div>
	</div>
</button>
