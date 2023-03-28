<script lang="ts">
	import { db } from '$lib/firebase';
	import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
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

	async function listAllPublicProfiles() {
		const q = query(collection(db, 'profiles'), where('public', '==', true));
		// Create a reference to the "profiles" collection
		return await getDocs(q).then((res) => res.docs);
	}
</script>

<div>
	<h1 class="text-3xl font-bold pb-4">library</h1>
	<div
		class="grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 xl:grid-cols-4  items-stretch gap-4"
	>
		{#await listAllPublicProfiles()}
			loading..
		{:then profiles}
			{#each profiles as profile}
				{@const data = profile.data()}
				<div class="w-full">
					<DocumentCard {data} />
				</div>
			{/each}
		{/await}
	</div>
</div>

<!-- {#each realtimeProfiles as profile (profile.id)}
	{profile.id}
	<a href="/{profile.owner}/{profile.slug}">{profile.owner}</a>
	<div>{profile.name}</div>
{/each} -->
