<script lang="ts">
	import { db } from '$lib/firebase';
	import { collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
	import { onMount } from 'svelte';

	async function getProfiles() {
		const q = query(collection(db, 'profiles'));
		return await getDocs(q).then((res) => res.docs);
	}
</script>

<h1>Profile Cloud</h1>

{#await getProfiles() then profiles}
	{#each profiles as profile}
		{@const data = profile.data()}
		<a href="/{data.owner}/{data.name}">{data.owner}</a>
		<div>{data.name}</div>
	{/each}
{/await}
