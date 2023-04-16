<script lang="ts">
	import { profilesCollection } from '$lib/collections';
	import { and, getDocs, query, where } from 'firebase/firestore';
	import DisplayOnWeb from './DisplayOnWeb.svelte';
	import DocumentCard from './DocumentCard.svelte';
	import { firebaseUserStore } from '$lib/stores';
	import { get } from 'svelte/store';

	async function listPublicProfiles() {
		// there is a firestore security rule to only list public profiles
		const q = query(
			profilesCollection,
			and(
				where('public', '==', true)
				//or(where('access', 'array-contains', get(firebaseUserStore)?.uid || ''))
			)
		);
		// assign the returned documents to a variable, so it's easy to pass it to Grid Editor
		const profiles = await getDocs(q).then((res) => res.docs);
		return profiles;
	}

	async function listPublicAndAccessibleProfiles() {
		const q = query(
			profilesCollection,
			where('access', 'array-contains', get(firebaseUserStore)?.account?.uid || '')
		);
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
	{#if $firebaseUserStore.account}
		{#await listPublicAndAccessibleProfiles()}
			loading..
		{:then profiles}
			{#each profiles as profile}
				{@const data = profile.data()}
				<DocumentCard {data} />
			{/each}
		{/await}
	{:else}
		{#await listPublicProfiles()}
			loading..
		{:then profiles}
			{#each profiles as profile}
				{@const data = profile.data()}
				<DocumentCard {data} />
			{/each}
		{/await}
	{/if}
</div>

<!-- {#each realtimeProfiles as profile (profile.id)}
	{profile.id}
	<a href="/{profile.owner}/{profile.slug}">{profile.owner}</a>
	<div>{profile.name}</div>
{/each} -->
