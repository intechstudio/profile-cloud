<script lang="ts">
	import { goto } from '$app/navigation';
	import { PUBLIC_APP_ENV } from '$env/static/public';
	import { onMount } from 'svelte';

	import GoogleAuth from '$lib/components/GoogleAuth.svelte';

	type AuthStatus = {
		status: number;
		message: string;
	};

	const Auth: { [key: string]: AuthStatus } = {
		NOT_AUTHORIZED: {
			status: 0,
			message: 'not authorized'
		},
		AUTHORIZED: {
			status: 1,
			message: 'authorized'
		},
		AUTH_ERROR: {
			status: 2,
			message: 'error'
		}
	};

	let authStatus = Auth.NOT_AUTHORIZED;

	let credential: string = '';

	let showCloseBrowserNotification = false;

	function buildProtocolUrl(credential: string) {
		let url = PUBLIC_APP_ENV === 'production' ? 'grid-editor://' : 'grid-editor-dev://';
		return url + '?credential=' + credential;
	}

	function handleCredentialResponse(event: CustomEvent) {
		if (event.detail == undefined || event.detail == null || event.detail == '') {
			authStatus = Auth.AUTH_ERROR;
			return;
		}

		credential = event.detail;

		const link = document.createElement('a');
		link.href = buildProtocolUrl(credential);
		document.body.appendChild(link);
		authStatus = Auth.AUTHORIZED;
	}
</script>

<div class="w-full h-full">
	<div
		class="container text-center items-center flex flex-col mx-auto max-w-xl p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md shadow border dark:border-white dark:border-opacity-10 border-black border-opacity-10"
	>
		{#if authStatus.status == 0}
			<h2 class="text-2xl font-bold pb-4">authorize your social account</h2>
			<h3 class="pb-4 text-black dark:text-opacity-70 dark:text-white text-opacity-70">
				When you login through social accounts, please click on the appropiate button below to
				proceed with authorization.
			</h3>
			<div class="flex justify-center items-center w-full h-[44px] p-0 m-0">
				<GoogleAuth on:google-signin={handleCredentialResponse} />
			</div>
		{:else if authStatus.status == 1}
			<h2 class="text-2xl font-bold pb-4">authorization successful</h2>
			<h3 class="pb-4 text-black dark:text-opacity-70 dark:text-white text-opacity-70">
				Click the button below, and open the application.
			</h3>
			<div class="flex justify-center items-center w-full h-[44px] p-0 m-0 ">
				<a
					class="bg-blue-400 hover:bg-blue-500 py-2 px-6 rounded text-white dark:bg-emerald-400 dark:hover:bg-emerald-500 font-medium"
					href={buildProtocolUrl(credential)}>launch desktop app</a
				>
			</div>
			<div class="pt-2 flex items-center text-sm">
				<div class="w-6 h-6 p-1">
					<svg
						class="fill-current dark:text-white text-black"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						><path
							d="M12,1A11,11,0,1,0,23,12,11.013,11.013,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9.011,9.011,0,0,1,12,21ZM17.737,8.824a1,1,0,0,1-.061,1.413l-6,5.5a1,1,0,0,1-1.383-.03l-3-3a1,1,0,0,1,1.415-1.414l2.323,2.323,5.294-4.853A1,1,0,0,1,17.737,8.824Z"
						/></svg
					>
				</div>
				<div>Grid Editor for Desktop</div>
			</div>
		{/if}
	</div>
</div>

<style>
	#google-signin-button {
		display: inline-block;
	}
</style>
