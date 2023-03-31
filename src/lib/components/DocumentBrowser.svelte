<script lang="ts">
	import { db } from '$lib/firebase';
	import { profilesCollection } from '$lib/collections';
	import { collection, getDocs, onSnapshot, query, QuerySnapshot, where } from 'firebase/firestore';
	import DisplayOnWeb from './DisplayOnWeb.svelte';
	import DocumentCard from './DocumentCard.svelte';

	async function listAllPublicProfiles() {
		// Create a reference to the "profiles" collection
		const q = query(profilesCollection);
		// assign the returned documents to a variable, so it's easy to pass it to Grid Editor
		const profiles = await getDocs(q).then((res) => res.docs);
		return profiles;
	}
</script>

<DisplayOnWeb>
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold pt-8">profile list</h1>
	</div>
</DisplayOnWeb>
<div
	class="py-4 lg:py-8  grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 xl:grid-cols-4 gap-4"
>
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
