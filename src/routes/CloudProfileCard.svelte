<script lang="ts">
	import type { EditorReturnType } from '$lib/types';
	import { createEventDispatcher, getContext, onDestroy, onMount } from 'svelte';
	import AtomicButton from '$lib/components/atomic/AtomicButton.svelte';
	import SvgIcon from '$lib/icons/SvgIcon.svelte';
	import type { Profile } from '$lib/schemas';
	import { applyFocus } from '$lib/dom-utils';
	import { userAccountService } from '$lib/stores';
	import { get } from 'svelte/store';

	const dispatchEvent = createEventDispatcher();

	export let data: Profile;

	const display = getContext('display');

	const profileImportDownloadHandler = () => {
		if (display === 'web') {
			return downloadProfile();
		}
		if (display === 'editor') {
			return importProfile();
		}
	};

	function downloadProfile() {
		const element = document.createElement('a');
		var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(data);
		element.href = dataStr;
		element.download = `${data.name}.json`;
		document.body.appendChild(element); // Required for this to work in FireFox
		element.click();
	}

	let importResult = 'imported!';

	async function importProfile() {
		const result: EditorReturnType = await new Promise((resolve, reject) => {
			// create a message channel to communicate with the editor in this scope
			const messageChannel = new MessageChannel();
			// let editor know that it should listen for messages on this channel
			window.parent.postMessage('profileImportCommunication', '*', [messageChannel.port2]);
			// we listen for messages on this channel
			messageChannel.port1.onmessage = ({ data }) => {
				messageChannel.port1.close();
				if (data.ok) {
					resolve(data);
				} else {
					reject(data);
				}
			};
			// send the data to the editor
			messageChannel.port1.postMessage({ channelMessageType: 'IMPORT_PROFILE', ...data });
		});

		if (result.ok) {
			importResult = 'ok';
		} else {
			// do something else
		}
	}

	let deleteConfirmFlag = false;

	function userCanDelete(access: string[]) {
		const uid = get(userAccountService)?.account?.uid;
		if (uid) {
			return access.includes(uid);
		} else {
			return false;
		}
	}

	onMount(() => {
		// we assume editor is listening for this message
	});

	onDestroy(() => {});

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
	on:focusout={(e) => {
		if (e.relatedTarget == null) {
			dispatchEvent('focusout', {});
		}
	}}
	class="{$$props.class} flex flex-col justify-between items-start text-left w-full bg-white rounded-lg border border-black/10 shadow dark:bg-black dark:bg-opacity-60"
>
	<div class="p-3 w-full">
		<div class="w-full flex items-center justify-between">
			<input
				bind:this={nameInputField.element}
				class="w-full mr-1 font-bold border bg-transparent hover:bg-neutral-800 focus:outline-none {nameInputField.doubleClicked
					? 'border-emerald-500'
					: 'border-transparent'}"
				readonly={!nameInputField.doubleClicked}
				on:keydown={(e) => {
					if (e.key == 'Enter' && !e.shiftKey) {
						nameInputField.element?.blur();
					}
				}}
				on:blur={() => {
					window?.getSelection()?.removeAllRanges();
					nameInputField.doubleClicked = false;
					// reset input value if user clicked out without changing the value
					if (nameInputField.element?.value == '') {
						nameInputField.element.value = 'Add name';
					}
					if (nameInputField.element?.value != nameInputField.currentSelection) {
						dispatchEvent('name-change', { newName: nameInputField.element?.value });
					}
				}}
				on:dblclick|preventDefault={() => {
					nameInputField.doubleClicked = true;
					nameInputField.element?.setSelectionRange(0, nameInputField.element.value.length);
					nameInputField.currentSelection = nameInputField.element?.value || '';
				}}
				value={data.name}
			/>
			<div class="relative flex items-center gap-x-1">
				{#if userCanDelete(data.access)}
					{#if deleteConfirmFlag == false}
						<button
							class="flex group relative"
							on:click={() => {
								deleteConfirmFlag = true;
							}}
						>
							<SvgIcon class="w-5" iconPath="delete" />
							<div
								class="group-hover:block font-medium hidden absolute mt-7 top-0 right-0 text-white text-opacity-80  border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
							>
								Delete
							</div>
						</button>
					{:else}
						<button
							use:applyFocus
							on:blur={() => {
								deleteConfirmFlag = false;
							}}
							on:click={() => {
								dispatchEvent('delete-cloud');
								deleteConfirmFlag = false;
							}}
							class="bg-red-600 rounded px-1 py-0.5 text-xs">confirm</button
						>
					{/if}
				{/if}
				<slot name="link-button" />
				<slot name="import-button" />
			</div>
		</div>
		<div class="dark:text-white pt-2 text-black text-opacity-80 dark:text-opacity-70">
			<textarea
				rows={2}
				bind:this={descriptionTextarea.element}
				class="w-full border bg-neutral-900 hover:bg-neutral-800 focus:outline-none {descriptionTextarea.doubleClicked
					? 'border-emerald-500'
					: 'border-transparent'}"
				readonly={!descriptionTextarea.doubleClicked}
				on:keydown={(e) => {
					if (e.key == 'Enter' && !e.shiftKey) {
						descriptionTextarea.element?.blur();
					}
				}}
				on:blur={() => {
					window?.getSelection()?.removeAllRanges();
					descriptionTextarea.doubleClicked = false;
					// reset input value if user clicked out without changing the value
					if (descriptionTextarea.element?.value == '') {
						descriptionTextarea.element.value = 'Add description';
					}
					if (descriptionTextarea.element?.value != descriptionTextarea.currentSelection) {
						dispatchEvent('description-change', {
							newDescription: descriptionTextarea.element?.value
						});
					}
				}}
				on:dblclick|preventDefault={() => {
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

	<div
		class="w-full flex pb-3 px-3 md:p-3 justify-between items-center md:border-t-2 border-neutral-200 dark:border-neutral-700"
	>
		<div class="dark:text-white text-black text-opacity-80 dark:text-opacity-70">{data.type}</div>
		<div class="flex items-center gap-x-1">
			<span class="text-black dark:text-opacity-70 dark:text-white">{data.owner || 'Unknown'}</span>
			<div class="ml-1">
				{#if data.public}
					<slot name="make-private-button" />
				{:else}
					<slot name="make-public-button" />
				{/if}
			</div>
		</div>
	</div>
</button>
