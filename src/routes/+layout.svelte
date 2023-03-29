<script lang="ts">
	import ToggleSwitch from '$lib/components/atomic/ToggleSwitch.svelte';
	import { getContext, onMount, setContext } from 'svelte';
	import '../app.css';

	let darkMode = true;

	function toggleDarkMode() {
		darkMode = !darkMode;
	}

	function isThisAnIframe() {
		return true;

		try {
			return window.self !== window.top;
		} catch (e) {
			return true;
		}
	}

	if (isThisAnIframe()) {
		setContext('display', 'editor');
	} else {
		setContext('display', 'web');
	}

	console.log('Application context: ', getContext('display'));
</script>

<main class={darkMode ? 'dark' : ''}>
	<div
		class="dark:bg-neutral-900 dark:text-white dark:text-opacity-80 transition duration-200 min-h-screen"
	>
		<nav class="container mx-auto flex w-full justify-end p-4">
			<ToggleSwitch on:toggle={toggleDarkMode} />
		</nav>

		<slot />
	</div>
</main>
