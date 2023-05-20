<script lang="ts">
	import type { EditorReturnType, Profile } from '$lib/types';
	import { createEventDispatcher, getContext, onDestroy, onMount } from 'svelte';
	import AtomicButton from './atomic/AtomicButton.svelte';
	import SvgIcon from '$lib/icons/SvgIcon.svelte';

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
		var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(data.editorData);
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

	onMount(() => {
		// we assume editor is listening for this message
	});

	onDestroy(() => {});
</script>

<button
	on:click={() => {
		dispatchEvent('click', {});
	}}
	class="{$$props.class} flex flex-col justify-between items-start text-left w-full bg-white rounded-lg border border-black/10 shadow dark:bg-black dark:bg-opacity-60"
>
	<div class="p-3">
		<h2 class="font-bold pb-2">{data.name}</h2>

		<div
			class="dark:text-white text-blacktext-opacity-60 break-all bg-blue-600/5 dark:text-opacity-50 dark:bg-blue-300/5 font-mono text-xs rounded p-1"
		>
			{data.editorData?.substring(0, 75) ||
				JSON.stringify(data)?.substring(0, 75) ||
				'data is not present'}
		</div>
		<div class="dark:text-white pt-2 text-black text-opacity-80 dark:text-opacity-70">
			{data.description?.substring(0, 100) || 'description is not available'}
		</div>
	</div>

	<div
		class="w-full flex pb-3 px-3 md:p-3 justify-between items-center md:border-t-2 border-neutral-200 dark:border-neutral-700"
	>
		<div class="flex items-center gap-x-1">
			<div class="mr-1">
				{#if data.public}
					<SvgIcon display={true} iconPath={'public'} />
				{:else}
					<SvgIcon display={true} iconPath={'private'} />
				{/if}
			</div>
			<span class="text-black text-opacity-70 dark:text-white mr-4">{data.owner || 'CREATOR'}</span>
		</div>

		<div class="relative">
			{#if display === 'editor' && importResult === 'ok'}
				<div
					class="absolute top-1.5 p-0.5 right-1.5 rounded-full bg-emerald-300 text-black text-opacity-60  text-xs"
				>
					<img class="w-3 h-3 p-0.5" src="/check_mark.svg" alt="check mark" />
				</div>
			{/if}

			<slot name="import-button" />
		</div>
	</div>
</button>
