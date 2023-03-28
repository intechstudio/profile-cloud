<script lang="ts">
	import AtomicInput from './atomic/AtomicInput.svelte';

	let email = '';
	let password = '';
</script>

<div class="w-full h-full flex flex-col p-1 bg-gray-50 rounded-md border border-black/10 shadow">
	<div class="flex items-center p-2">
		<div class="bg-gray-300 rounded-full w-10 h-10" />
		<h1 class="font-bold px-2">login to profile cloud</h1>
	</div>

	<AtomicInput
		direction="vertical"
		type="text"
		label="e-mail"
		placeholder="something@example.com"
		bind:data={email}
	/>
	<AtomicInput
		direction="vertical"
		type="password"
		label="password"
		placeholder="enter your password..."
		bind:data={password}
	/>

	<div class="p-2 mt-2">
		<button
			class="px-4 w-full py-1 bg-blue-500 text-white font-medium border rounded focus:border-gray-800 border-gray-500 focus:outline-none focus:ring-blue-300 focus:ring-2"
		>
			login
		</button>
	</div>

	<div class="border-b border-gray-300 py-2 mx-2" />

	<div class="p-3 mt-2 text-gray-400">social login work in progress...</div>
</div>
