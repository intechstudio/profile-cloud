<script lang="ts">
	import type { Profile } from '$lib/types';
	import { getContext, onDestroy, onMount } from 'svelte';
	import AtomicButton from './atomic/AtomicButton.svelte';

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
		const file = new Blob([JSON.parse(data?.editorData)], { type: 'application/json' });
		element.href = URL.createObjectURL(file);
		element.download = `${data.name}.json`;
		document.body.appendChild(element); // Required for this to work in FireFox
		element.click();
	}

	function importProfile() {
		// start the import process, ask editor to do it, it completes an async task.

		window.parent.postMessage(
			{
				messageType: 'editorData',
				document: data
			},
			'*'
		);

		// once editor is done, it will send a message back to the web app, and then we can resolve the promise?

		// update UI to "update complete"

		// const importProfileInEditor = new Promise((resolve, reject) => {
		// 	window.addEventListener('message', (event) => {
		// 		if (event.data.messageType === 'editorData') {
		// 			resolve('ok');
		// 		}
		// 	});
		// });
	}
</script>

<div
	class="flex flex-col justify-between w-full h-full bg-white rounded-lg border border-black/10 shadow dark:bg-neutral-800"
>
	<div class="p-3">
		<h2 class="font-bold pb-2">{data.name}</h2>

		<div
			class="dark:text-white text-blacktext-opacity-60 break-all bg-blue-600/5 dark:text-opacity-50 dark:bg-blue-300/5 font-mono text-xs rounded p-1"
		>
			{data.editorData?.substring(0, 75) || 'data is not present'}
		</div>
		<div class="dark:text-white pt-2 text-black text-opacity-80 dark:text-opacity-70">
			{data.description?.substring(0, 100) || 'description is not available'}
		</div>
	</div>

	<div
		class="flex pb-3 px-3 md:p-3 justify-between {display === 'editor'
			? 'items-end'
			: 'items-center'} md:border-t-2 border-neutral-200 dark:border-neutral-700"
	>
		<span class="text-black text-opacity-70 dark:text-white mr-4">{data.owner || 'CREATOR'}</span>

		<div class="">
			<AtomicButton
				label={display == 'editor' ? 'import' : 'download'}
				functionToCall={profileImportDownloadHandler}
			/>
		</div>
	</div>
</div>
