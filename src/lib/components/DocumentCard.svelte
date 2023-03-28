<script lang="ts">
	export let data;
</script>

<div class="w-full h-full flex flex-col p-3 border-black/10 border rounded shadow">
	<div class="grid grid-rows-2 grid-cols-2">
		<h2 class="col-span-2 text-xl font-bold pb-4">{data.name}</h2>
		<h3 class="row-span-1 font-medium">{data.owner}</h3>
		<div>
			Uploaded: {data.createdAt
				? new Date(data.createdAt).toLocaleDateString()
				: new Date().toLocaleDateString()}
		</div>
	</div>

	<div>
		<p class="italic">{@html data.description?.substr(0, 200)}</p>
	</div>
</div>
