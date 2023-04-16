<script lang="ts">
	import { firebaseAuth } from '$lib/firebase';
	import { signInWithEmailAndPassword } from 'firebase/auth';
	import AtomicButton from './atomic/AtomicButton.svelte';
	import AtomicInput from './atomic/AtomicInput.svelte';
	import GoogleAuth from './GoogleAuth.svelte';
	import { firebaseUserStore } from '$lib/stores';

	let email = '';
	let password = '';

	async function login() {
		firebaseUserStore.authenticateUser({
			providerId: 'password',
			email: email,
			password: password
		});
	}

	function handleWebCredentialResponse(event: CustomEvent) {
		if (event.detail == undefined || event.detail == null || event.detail == '') {
			return;
		}

		firebaseUserStore.authenticateUser({
			providerId: 'google.com',
			idToken: event.detail
		});
	}
</script>

<div
	class="w-full h-full flex flex-col p-1 bg-neutral-50 dark:bg-neutral-700 dark:text-white/80 rounded-md border border-black/10 shadow"
>
	{#if !$firebaseUserStore.account}
		<div class="flex items-center p-2">
			<div class="bg-gray-300 rounded-full w-10 h-10" />
			<h1 class="font-bold px-2">login to profile cloud</h1>
		</div>

		<AtomicInput
			direction="vertical"
			type="text"
			label="e-mail"
			placeholder="something@example.com"
			bind:data={email}
		/>
		<AtomicInput
			direction="vertical"
			type="password"
			label="password"
			placeholder="enter your password..."
			bind:data={password}
		/>

		<div class="p-2 mt-2">
			<AtomicButton functionToCall={login} label={'login'} />
		</div>

		<div class="flex items-center py-1">
			<div class="flex-grow border-b border-gray-300 py-2 mx-2" />
			<div class="mt-3 text-sm text-black text-opacity-50">social authentication</div>
			<div class="flex-grow  border-b border-gray-300 py-2 mx-2" />
		</div>

		<div class="p-3 min-h-[44px] flex justify-center">
			<GoogleAuth on:google-signin={handleWebCredentialResponse} />
		</div>
	{:else}
		<div class="flex items-center justify-between">
			<div class="flex items-center p-2">
				<div class="bg-gray-300 rounded-full w-10 h-10">
					<img class="rounded-full" alt="" src={$firebaseUserStore.account.photoURL} />
				</div>
				<h1 class="font-bold px-2">Welcome {$firebaseUserStore.account.displayName}!</h1>
			</div>
			<div class="w-24 mr-2">
				<AtomicButton
					functionToCall={firebaseUserStore.logout}
					importance={'secondary'}
					label={'sign out'}
				/>
			</div>
		</div>
	{/if}
</div>
