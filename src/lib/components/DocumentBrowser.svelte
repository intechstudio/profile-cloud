<script lang="ts">
	import { db } from '$lib/firebase';
	import type { IProfile } from '$lib/interfaces';
	import { collection, getDocs, onSnapshot, query, QuerySnapshot, where } from 'firebase/firestore';
	import DisplayOnWeb from './DisplayOnWeb.svelte';
	import DocumentCard from './DocumentCard.svelte';

	let realtimeDb: () => void;
	let realtimeProfiles: any = [];
	const q = query(collection(db, 'profiles'), where('public', '==', true));
	realtimeDb = onSnapshot(q, (querySnapshot) => {
		realtimeProfiles = [];
		querySnapshot.forEach((doc) => {
			realtimeProfiles = [...realtimeProfiles, { id: doc.id, ...doc.data() }];
		});
		console.log('realtimeProfiles', realtimeProfiles);
	});

	let profiles = [];

	async function listAllPublicProfiles() {
		// Create a reference to the "profiles" collection
		const q = query(collection(db, 'profiles'), where('public', '==', true));
		// assign the returned documents to a variable, so it's easy to pass it to Grid Editor
		profiles = await getDocs(q).then((res) => res.docs);
		return profiles;
	}
</script>

<DisplayOnWeb>
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold pt-8">profile list</h1>
	</div>
</DisplayOnWeb>
<div class="py-8 grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 xl:grid-cols-4 gap-4">
	{#await listAllPublicProfiles()}
		loading..
	{:then profiles}
		{#each profiles as profile}
			{@const data = profile.data()}
			<DocumentCard {data} />
		{/each}
	{/await}
</div>

<!-- {#each realtimeProfiles as profile (profile.id)}
	{profile.id}
	<a href="/{profile.owner}/{profile.slug}">{profile.owner}</a>
	<div>{profile.name}</div>
{/each} -->
