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

	let profiles = [];

	async function listAllPublicProfiles() {
		// Create a reference to the "profiles" collection
		const q = query(collection(db, 'profiles'), where('public', '==', true));
		// assign the returned documents to a variable, so it's easy to pass it to Grid Editor
		profiles = await getDocs(q).then((res) => res.docs);
		return profiles;
	}
</script>

<div>
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold ">profile list</h1>
		<div>
			<button
				class="dark:bg-emerald-700 bg-blue-400 hover:bg-blue-500 text-white font-medium dark:hover:bg-emerald-600 rounded px-4 py-2"
				>import profiles from cloud</button
			>
		</div>
	</div>
	<div
		class="pt-4 grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 xl:grid-cols-4 items-stretch gap-4"
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
