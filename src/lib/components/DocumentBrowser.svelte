<script lang="ts">
	import { profilesCollection } from '$lib/collections';
	import { and, getDocs, or, query, where } from 'firebase/firestore';
	import DocumentCard from './DocumentCard.svelte';
	import { userAccountStore } from '$lib/stores';
	import { get } from 'svelte/store';

	async function listPublicProfiles() {
		// there is a firestore security rule to only list public profiles
		const q = query(
			profilesCollection,
			where('public', '==', true) // having a read rule restriction in firestore rules is not enough! We must explicitly define the query here
		);
		// assign the returned documents to a variable, so it's easy to pass it to Grid Editor
		const profiles = await getDocs(q).then((res) => res.docs);
		return profiles;
	}

	async function listPublicAndAccessibleProfiles() {
		const q = query(
			profilesCollection,
			or(
				where('public', '==', true),
				where('access', 'array-contains', get(userAccountStore)?.account?.uid || '')
			)
		);
		const profiles = await getDocs(q).then((res) => res.docs);
		return profiles;
	}
</script>

<div
	class="{$$props.class} p-2 lg:py-8  grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 xl:grid-cols-4 gap-4"
>
	{#if $userAccountStore.account}
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
