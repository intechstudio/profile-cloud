<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const GOOGLE_CLIENT_ID =
		'420254436941-1ppbje3ii3gvj9ria545nccmvfjlnn1n.apps.googleusercontent.com';

	const dispatch = createEventDispatcher();

	function callbackFunction(response: any) {
		if (response.credential) {
			dispatch('google-signin', response.credential);
		}
	}

	function initGapi() {
		google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: callbackFunction
		});
		google.accounts.id.renderButton(
			document.getElementById('buttonDiv'),
			{ theme: 'outline', size: 'large', width: '240px', text: 'continue_with' } // customization attributes
		);
	}
</script>

<svelte:head>
	<script src="https://accounts.google.com/gsi/client" async defer on:load={initGapi}></script>
</svelte:head>

<div id="buttonDiv" />
