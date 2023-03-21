<script>
	export let data;

	console.log('fe', data);
</script>

<svelte:head>
	<title>Profile: {data.params.profile}</title>
</svelte:head>

<h1>{data.params.owner}</h1>
{data.params.profile}
