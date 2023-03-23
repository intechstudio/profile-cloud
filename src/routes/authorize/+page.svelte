<script lang="ts">
	import { onMount } from 'svelte';

	function handleCredentialResponse(response: { credential: string }) {
		console.log('Encoded JWT ID token: ', response.credential);
		const link = document.createElement('a');
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
			{ theme: 'outline', size: 'large' } // customization attributes
		);
		google.accounts.id.prompt(); // also display the One Tap dialog
	}

	onMount(() => {});
</script>

<div id="buttonDiv" />

<svelte:head>
	<script src="https://accounts.google.com/gsi/client" async defer on:load={initGapi}></script>
</svelte:head>

<style>
	#google-signin-button {
		display: inline-block;
	}
</style>
