<script lang="ts">
	import { applyFocus } from '$lib/dom-utils';
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

	let descriptionTextarea = {
		element: null as HTMLTextAreaElement | null,
		doubleClicked: false,
		currentSelection: ''
	};
</script>

<button
	on:click={() => {
		dispatchEvent('click', {});
	}}
	on:blur={() => {
		dispatchEvent('blur', {});
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
					on:keydown={(e) => {
						if (e.key == 'Enter') {
							nameInputField.element?.blur();
						}
					}}
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
				<div class="flex gap-x-1 items-center">
					<button class="flex" on:click={() => dispatchEvent('split-profile')}> split </button>
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
							use:applyFocus
							on:blur={() => {
								console.log('good bye');
								deleteConfirmFlag = false;
							}}
							on:click={() => {
								dispatchEvent('delete-local');
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
				<textarea
					bind:this={descriptionTextarea.element}
					class="w-full border bg-transparent focus:outline-none {descriptionTextarea.doubleClicked
						? 'border-emerald-500'
						: 'border-transparent'}"
					readonly={!descriptionTextarea.doubleClicked}
					on:keydown={(e) => {
						if (e.key == 'Enter') {
							descriptionTextarea.element?.blur();
						}
					}}
					on:blur={() => {
						window?.getSelection()?.removeAllRanges();
						descriptionTextarea.doubleClicked = false;
						// reset input value if user clicked out without changing the value
						if (descriptionTextarea.element?.value == '') {
							descriptionTextarea.element.value = descriptionTextarea.currentSelection;
						}
						if (descriptionTextarea.element?.value != descriptionTextarea.currentSelection) {
							dispatchEvent('description-change', {
								newDescription: descriptionTextarea.element?.value
							});
						}
					}}
					on:dblclick={() => {
						descriptionTextarea.doubleClicked = true;
						descriptionTextarea.element?.setSelectionRange(
							0,
							descriptionTextarea.element.value.length
						);
						descriptionTextarea.currentSelection = descriptionTextarea.element?.value || '';
					}}
					value={data.description}
				/>
			</div>
		</div>
	</div>
</button>
