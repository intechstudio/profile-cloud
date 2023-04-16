<script lang="ts">
	import { onDestroy } from 'svelte';
	import DocumentBrowser from '$lib/components/DocumentBrowser.svelte';
	import DisplayOnWeb from '$lib/components/DisplayOnWeb.svelte';
	import { firebaseUserStore } from '$lib/stores';
	import UserAccount from '$lib/components/UserAccount.svelte';

	function editorMessageListener(event: MessageEvent) {
		if (event.data.messageType == 'editorDataSaved') {
			// to do?
		}
		if (event.data.messageType == 'userAuthentication') {
			firebaseUserStore.authenticateUser(event.data.credential);
		}
		console.log('Child received:  ', event.origin, window.location.origin, event.data);
	}

	window.addEventListener('message', editorMessageListener);

	onDestroy(() => {
		window.removeEventListener('message', editorMessageListener);
	});
</script>

<section class="w-full h-full flex-grow bg-neutral-100 dark:bg-neutral-950">
	{#if true}
		<DisplayOnWeb>
			<div class="p-4 w-full md:w-1/2 lg:md:w-1/3">
				<UserAccount />
			</div>
		</DisplayOnWeb>
	{/if}

	<div class="w-full h-full bg-neutral-100 dark:bg-neutral-950">
		<div class="px-4 container mx-auto flex flex-col max-w-screen-xl">
			<DocumentBrowser />
		</div>
	</div>
</section>
