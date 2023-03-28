<script lang="ts">
	export let label: string = 'LABEL';
	export let data: string | number = 'VALUE';
	export let placeholder: string = 'PLACEHOLDER';
	export let type: string = 'text';
	export let direction: 'horizontal' | 'vertical' = 'horizontal';
</script>

<div
	class:grid-cols-3={direction === 'horizontal'}
	class:grid-rows-2={direction === 'vertical'}
	class="grid items-center p-2"
>
	<label class="{direction == 'horizontal' ? 'col-span-1' : ''} text-black font-light" for=""
		>{label}</label
	>
	{#if type === 'password'}
		<input
			type="password"
			{placeholder}
			bind:value={data}
			class="{direction == 'horizontal'
				? 'col-span-2'
				: ''} w-full p-1 border rounded focus:border-gray-800 border-gray-500 focus:outline-none focus:ring-blue-300 focus:ring-2"
		/>
	{:else if type === 'text'}
		<input
			type="text"
			{placeholder}
			bind:value={data}
			class="{direction == 'horizontal'
				? 'col-span-2'
				: ''} w-full p-1 border rounded focus:border-gray-800 border-gray-500 focus:outline-none focus:ring-blue-300 focus:ring-2"
		/>
	{/if}
</div>
