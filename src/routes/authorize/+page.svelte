<script lang="ts">
	import { onMount } from 'svelte';

	function handleCredentialResponse(response: { credential: string }) {
		console.log('Encoded JWT ID token: ', response.credential);
		const link = document.createElement('a');

		// need to handle dev and prod links

		link.href = `grid-editor-dev://credential=${response.credential}`;
		document.body.appendChild(link);
		link.click();
	}

	const GOOGLE_CLIENT_ID =
		'420254436941-1ppbje3ii3gvj9ria545nccmvfjlnn1n.apps.googleusercontent.com';

	function initGapi() {
		google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: handleCredentialResponse
		});
		google.accounts.id.renderButton(
			document.getElementById('buttonDiv'),
			{ theme: 'outline', size: 'large', width: '240px', text: 'continue_with' } // customization attributes
		);
		//google.accounts.id.prompt(); // also display the One Tap dialog
		console.log('done gapi');
	}

	onMount(() => {
		console.log('inmount');
	});
</script>

<svelte:head>
	<script src="https://accounts.google.com/gsi/client" async defer on:load={initGapi}></script>
</svelte:head>

<div class="w-full h-full">
	<div
		class="container text-center mx-auto max-w-xl p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md shadow border dark:border-white dark:border-opacity-10 border-black border-opacity-10"
	>
		<h2 class="text-2xl font-bold pb-4">authorize your social account</h2>
		<h3 class="pb-4 text-black dark:text-opacity-70 dark:text-white text-opacity-70">
			When you login through social accounts, please click on the appropiate button below to proceed
			with authorization.
		</h3>
		<div class="flex justify-center items-center w-full h-[44px] p-0 m-0">
			<div id="buttonDiv" />
		</div>
	</div>
</div>

<style>
	#google-signin-button {
		display: inline-block;
	}
</style>
