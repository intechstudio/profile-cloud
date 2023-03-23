<script lang="ts">
	import { auth, db } from '$lib/firebase';
	import {
		getAuth,
		onAuthStateChanged,
		signInWithCredential,
		signInWithEmailAndPassword,
		signOut,
		type User
	} from 'firebase/auth';
	import { UserImpl } from '@firebase/auth/internal';
	import {
		addDoc,
		collection,
		doc,
		Firestore,
		getDoc,
		getDocs,
		onSnapshot,
		query,
		QueryDocumentSnapshot,
		setDoc,
		Timestamp,
		where,
		type DocumentData
	} from 'firebase/firestore';
	import { onDestroy, onMount } from 'svelte';

	//$: console.log('curruser?', auth);

	interface IProfile {
		owner: string;
		name: string;
		public: boolean;
		slug: string;
		description: string;
		isGridProfile: boolean;
		version: {
			major: number;
			minor: number;
			patch: number;
		};
		productType: string;
		editorData: string;
		createdAt: Timestamp | undefined;
	}

	let profileDoc: IProfile = {
		owner: '',
		public: true,
		name: '',
		slug: '',
		description: '',
		version: {
			major: 1,
			minor: 2,
			patch: 3
		},
		isGridProfile: true,
		productType: '',
		createdAt: undefined,
		editorData: ''
	};

	let realtimeDb: () => void;
	let profiles: any = [];
	const q = query(collection(db, 'profiles'), where('public', '==', true));
	realtimeDb = onSnapshot(q, (querySnapshot) => {
		profiles = [];
		querySnapshot.forEach((doc) => {
			profiles = [...profiles, { id: doc.id, ...doc.data() }];
		});
		console.log('profilee', profiles);
	});

	async function getProfiles() {
		const q = query(collection(db, 'profiles'), where('public', '==', true));
		// Create a reference to the "profiles" collection
		return await getDocs(q)
			.then((res) => res.docs)
			.catch((err) => console.log(err));
	}

	let profileToUpload: IProfile;
	let isFirestoreUploading = false;
	async function uploadProfile() {
		profileToUpload = profileDoc;
		profileToUpload.slug = profileDoc.name.toLowerCase().replace(/ /g, '-');
		profileToUpload.editorData = profileDoc.editorData;
		// good practice to create documents with timestamps
		console.log('AUTH USED', auth);
		profileToUpload.createdAt = Timestamp.now();
		isFirestoreUploading = true;
		const res = await addDoc(collection(db, 'profiles'), profileToUpload).catch((err) =>
			console.log(err)
		);
		isFirestoreUploading = false;
	}

	let browserPassword = '';
	let browserEmail = 'kkerti@riseup.net';

	let iframeUser: any = null;

	onAuthStateChanged(auth, (user) => {
		if (user) {
			console.log('user chabged', user);
			iframeUser = user;
		} else {
			iframeUser = null;
		}
	});

	function login() {
		signInWithEmailAndPassword(auth, browserEmail, browserPassword)
			.then((res) => {
				console.log(res);
			})
			.catch((err) => {
				console.log(err);
			});
	}

	function logout() {
		signOut(auth);
	}

	function createUserFromSerializedData(currentUser: string) {
		const userData = JSON.parse(currentUser);
		const user: User = UserImpl._fromJSON(getAuth() as any, userData);
		auth.updateCurrentUser(user);
	}

	function authenticateUser(credential: string) {
		signInWithCredential(auth, credential);
	}

	window.addEventListener(
		'message',
		function (event) {
			const { credential } = event.data;

			authenticateUser(credential);

			console.log('Child received:  ', event.origin, window.location.origin, event.data);

			// signInWithEmailAndPassword(auth, email, password)
			// 	.then((res) => {
			// 		console.log(res);
			// 	})
			// 	.catch((err) => {
			// 		console.log(err);
			// 	});
		},
		false
	);

	onDestroy(() => {
		realtimeDb();
	});
</script>

{iframeUser?.uid}

<div id="my-message">nothing</div>

{#if window.self === window.top}
	<div>
		<label for="email">Email</label>
		<input type="text" id="email" bind:value={browserEmail} placeholder="email" />
	</div>
	<div>
		<label for="password">Password</label>
		<input type="password" id="password" bind:value={browserPassword} placeholder="password" />
	</div>
	<div>
		<button
			on:click={() => {
				login();
			}}>Sign In</button
		>
	</div>
{/if}

<div>
	<button
		on:click={() => {
			logout();
		}}>Sign Out</button
	>
</div>

<h1>Profile Cloud</h1>

{#await getProfiles() then profiles}
	{#each profiles as profile}
		{@const data = profile.data()}
		<a href="/{data.owner}/{data.slug}">{data.owner}</a>
		<div>{data.name}</div>
	{/each}
{/await}

{#each profiles as profile (profile.id)}
	{profile.id}
	<a href="/{profile.owner}/{profile.slug}">{profile.owner}</a>
	<div>{profile.name}</div>
{/each}

<h1>Upload profile</h1>

<div>
	<label for="profile-owner">Owner</label>
	<input type="text" id="profile-owner" bind:value={profileDoc.owner} placeholder="owner name" />
</div>

<div>
	<label for="profile-public">Public</label>
	<input type="checkbox" id="profile-public" bind:checked={profileDoc.public} />
</div>

<div>
	<label for="profile-name">Name</label>
	<input
		type="text"
		id="profile-name"
		bind:value={profileDoc.name}
		placeholder="Name of the profile"
	/>
</div>
<div>
	<label for="profile-description">Description</label>
	<textarea
		name=""
		id="profile-description"
		bind:value={profileDoc.description}
		cols="30"
		rows="5"
	/>
</div>
<div>
	<label for="profile-product-type">Product Type</label>
	<select bind:value={profileDoc.productType} name="" id="profile-product-type">
		{#each ['BU16', 'PBF4', 'PO16', 'EF44', 'EN16'] as type}
			<option value={type}>{type}</option>
		{/each}
	</select>
</div>

<div>
	<label for="profile-page-json">Page JSON</label>
	<textarea name="" id="profile-page-json" bind:value={profileDoc.editorData} cols="30" rows="5" />
</div>

<div>
	<button
		on:click={() => {
			uploadProfile();
		}}>Upload Profile</button
	>
	{#if isFirestoreUploading}
		<div>Uploading...</div>
	{/if}
	{#if profileToUpload}
		<pre>{JSON.stringify(profileToUpload)}</pre>
	{/if}
</div>
