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
	import type { Profile } from '$lib/types';
	import DisplayOnWeb from '$lib/components/DisplayOnWeb.svelte';

	let profileDoc: Profile = {
		owner: '',
		name: '',
		description: '',
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
			if (event.data.messageType == 'editorDataSaved') {
			}
			console.log('Child received:  ', event.origin, window.location.origin, event.data);
		},
		false
	);

	onDestroy(() => {
		//realtimeDb();
	});
</script>

<section class="">
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

	<div class="w-full bg-neutral-100 dark:bg-neutral-950">
		<div class="px-4 container mx-auto flex flex-col max-w-screen-xl">
			<DocumentBrowser />
		</div>
	</div>
</section>
