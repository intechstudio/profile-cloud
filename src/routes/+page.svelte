<script lang="ts">
	import { auth, db } from '$lib/firebase';
	import {
		AuthCredential,
		EmailAuthCredential,
		EmailAuthProvider,
		getAuth,
		GoogleAuthProvider,
		onAuthStateChanged,
		reauthenticateWithCredential,
		signInWithCredential,
		signOut,
		type User
	} from 'firebase/auth';
	import { UserImpl } from '@firebase/auth/internal';
	import { getContext, onDestroy, onMount } from 'svelte';
	import Login from '$lib/components/Login.svelte';
	import DocumentBrowser from '$lib/components/DocumentBrowser.svelte';
	import DisplayOnWeb from '$lib/components/DisplayOnWeb.svelte';
	import { firebaseUserStore } from '$lib/stores';

	function logout() {
		signOut(auth);
	}

	function createUserFromSerializedData(currentUser: string) {
		const userData = JSON.parse(currentUser);
		const user: User = UserImpl._fromJSON(getAuth() as any, userData);
		auth.updateCurrentUser(user);
	}

	function authenticateUser(credential: any) {
		let cred;

		if (!credential) {
			signOut(auth);
			return;
		}

		if (credential.providerId == 'google.com') {
			cred = GoogleAuthProvider.credential(credential.idToken);
		} else if (credential.providerId == 'password') {
			cred = EmailAuthProvider.credential(credential.email, credential.password);
		}

		if (!cred) return;

		signInWithCredential(auth, cred)
			.then((user) => {
				console.log('authenticated in iframe (profile cloud)', user);
			})
			.catch((error) => {
				console.log(error);
			});
	}

	window.addEventListener(
		'message',
		function (event) {
			if (event.data.messageType == 'editorDataSaved') {
				// to do?
			}
			if (event.data.messageType == 'userAuthentication') {
				authenticateUser(event.data.credential);
			}
			console.log('Child received:  ', event.origin, window.location.origin, event.data);
		},
		false
	);

	auth.onAuthStateChanged(function (user) {
		if (user) {
			firebaseUserStore.set(user);
			console.log('user is signed in', user);
		} else {
			firebaseUserStore.set(null);
			console.log('user is signed out');
		}
	});

	onDestroy(() => {
		//realtimeDb();
	});
</script>

<section class="w-full h-full flex-grow bg-neutral-100 dark:bg-neutral-950">
	{#if true}
		<DisplayOnWeb>
			<div class="p-4 w-full lg:w-1/3">
				<Login />
				<div>
					<button
						on:click={() => {
							logout();
						}}>Sign Out</button
					>
				</div>
			</div>
		</DisplayOnWeb>
	{/if}

	<div class="w-full h-full bg-neutral-100 dark:bg-neutral-950">
		<div class="px-4 container mx-auto flex flex-col max-w-screen-xl">
			<DocumentBrowser />
		</div>
	</div>
</section>
