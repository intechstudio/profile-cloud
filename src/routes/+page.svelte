<script lang="ts">
	import { auth, db } from '$lib/firebase';
	import { signInWithEmailAndPassword } from 'firebase/auth';
	import {
		addDoc,
		collection,
		doc,
		Firestore,
		getDoc,
		getDocs,
		query,
		QueryDocumentSnapshot,
		setDoc,
		Timestamp,
		where,
		type DocumentData
	} from 'firebase/firestore';
	import { onMount } from 'svelte';

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
		profileToUpload.createdAt = Timestamp.now();
		isFirestoreUploading = true;
		const res = await addDoc(collection(db, 'profiles'), profileToUpload);
		isFirestoreUploading = false;
	}

	onMount(() => {
		signInWithEmailAndPassword(auth, 'kkerti@riseup.net', 'macgyver2')
			.then((res) => {
				console.log(res);
			})
			.catch((err) => {
				console.log(err);
			});
	});
</script>

<h1>Profile Cloud</h1>

{#await getProfiles() then profiles}
	{#each profiles as profile}
		{@const data = profile.data()}
		<a href="/{data.owner}/{data.slug}">{data.owner}</a>
		<div>{data.name}</div>
	{/each}
{/await}

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
