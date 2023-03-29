<script lang="ts">
	export let data;
</script>

<div
	class="w-full h-full flex flex-col p-3 border-black/10 border rounded-md shadow dark:bg-neutral-800"
>
	<div class="flex justify-between items-center">
		<h2 class="font-bold ">{data.name}</h2>
		<span class="text-opacity-50">{data.creator || 'CREATOR'}</span>
	</div>
</div>
