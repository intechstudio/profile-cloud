<script lang="ts">
	import { auth, db } from '$lib/firebase';
	import {
		AuthCredential,
		getAuth,
		onAuthStateChanged,
		signInWithCredential,
		signOut,
		type User
	} from 'firebase/auth';
	import { UserImpl } from '@firebase/auth/internal';
	import { getContext, onDestroy, onMount } from 'svelte';
	import { error } from '@sveltejs/kit';
	import Login from '$lib/components/Login.svelte';
	import DocumentBrowser from '$lib/components/DocumentBrowser.svelte';
	import type { IProfile } from '$lib/interfaces';

	let profileDoc: IProfile = {
		owner: '',
		public: true,
		name: '',
		slug: '',
		description: '',
		isGridProfile: true,
		productType: '',
		createdAt: undefined,
		editorData: ''
	};

	let iframeUser: any = null;

	onAuthStateChanged(auth, (user) => {
		if (user) {
			console.log('user chabged', user);
			iframeUser = user;
		} else {
			iframeUser = null;
		}
	});

	function logout() {
		signOut(auth);
	}

	function createUserFromSerializedData(currentUser: string) {
		const userData = JSON.parse(currentUser);
		const user: User = UserImpl._fromJSON(getAuth() as any, userData);
		auth.updateCurrentUser(user);
	}

	function authenticateUser(credential: AuthCredential) {
		signInWithCredential(auth, credential).catch((error) => {
			console.log(error);
		});
	}

	window.addEventListener(
		'message',
		function (event) {
			const { credential } = event.data;

			authenticateUser(credential);

			console.log('Child received:  ', event.origin, window.location.origin, event.data);
		},
		false
	);

	onDestroy(() => {
		//realtimeDb();
	});
</script>

<section class="container mx-auto flex flex-col md:items-center max-w-screen-xl">
	{#if getContext('display') == 'web'}
		<div class="p-4 w-full lg:w-1/3">
			<Login />
		</div>
	{/if}

	<div class="p-4">
		<DocumentBrowser />
	</div>
</section>

<div>
	<button
		on:click={() => {
			logout();
		}}>Sign Out</button
	>
</div>
