<script lang="ts">
	import { goto } from '$app/navigation';
import { PUBLIC_APP_ENV } from '$env/static/public';
	import { onMount } from 'svelte';

	type AuthStatus = {
		status: number;
		message: string;
	};

	const Auth: { [key: string]: AuthStatus } = {
		NOT_AUTHORIZED: {
			status: 0,
			message: 'not authorized',
		},
		AUTHORIZED: {
			status: 1,
			message: 'authorized',
		},
		AUTH_ERROR: {
			status: 2,
			message: 'error',
		},
	};

	let authStatus = Auth.NOT_AUTHORIZED;

	let credential: string = '';

	let showCloseBrowserNotification = false


	function buildProtocolUrl(credential: string) {
		let url = PUBLIC_APP_ENV === 'development' ? 'grid-editor-dev://' : 'grid-editor://'
		return url + 'credential=' + credential;
	}

	function handleCredentialResponse(response: { credential: string }) {
		if(response.credential == undefined){
			authStatus = Auth.AUTH_ERROR;
			return;
		}
		credential = response.credential;
		const link = document.createElement('a');
		link.href = buildProtocolUrl(credential);
		document.body.appendChild(link);
		authStatus = Auth.AUTHORIZED;
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
	}


	
</script>

<svelte:head>
	<script src="https://accounts.google.com/gsi/client" async defer on:load={initGapi} on:error={(e)=> console.log('e', e)}></script>
</svelte:head>

<div class="w-full h-full">
	<div
		class="container text-center items-center flex flex-col mx-auto max-w-xl p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md shadow border dark:border-white dark:border-opacity-10 border-black border-opacity-10"
	>
		{#if authStatus.status == 0}
				<h2 class="text-2xl font-bold pb-4">authorize your social account</h2>
				<h3 class="pb-4 text-black dark:text-opacity-70 dark:text-white text-opacity-70">
					When you login through social accounts, please click on the appropiate button below to proceed
					with authorization.
				</h3>
				<div class="flex justify-center items-center w-full h-[44px] p-0 m-0">
					<div id="buttonDiv" />
				</div>
			{:else if authStatus.status == 1}
				<h2 class="text-2xl font-bold pb-4">authorization successful </h2>
				<h3 class="pb-4 text-black dark:text-opacity-70 dark:text-white text-opacity-70">
					Click the button below, and open the application.
				</h3>
				<div class="flex justify-center items-center w-full h-[44px] p-0 m-0 ">
					<a class="bg-blue-400 hover:bg-blue-500 py-2 px-6 rounded text-white dark:bg-emerald-400 dark:hover:bg-emerald-500 font-medium" href={buildProtocolUrl(credential)}>launch desktop app</a>
				</div>
				<div class="pt-2 flex items-center text-sm">
					<div class="w-6 h-6 p-1">
						<svg class="fill-current dark:text-white text-black" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,1A11,11,0,1,0,23,12,11.013,11.013,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9.011,9.011,0,0,1,12,21ZM17.737,8.824a1,1,0,0,1-.061,1.413l-6,5.5a1,1,0,0,1-1.383-.03l-3-3a1,1,0,0,1,1.415-1.414l2.323,2.323,5.294-4.853A1,1,0,0,1,17.737,8.824Z"/></svg>
					</div>
					<div>
					Grid Editor for Desktop
					</div>
				</div>
		{/if}

</div>

</div>

<style>
	#google-signin-button {
		display: inline-block;
	}
</style>
