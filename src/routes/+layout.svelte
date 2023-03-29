<script lang="ts">
	import ToggleSwitch from '$lib/components/atomic/ToggleSwitch.svelte';
	import DisplayOnWeb from '$lib/components/DisplayOnWeb.svelte';
	import { getContext, onMount, setContext } from 'svelte';
	import '../app.css';

	function isThisAnIframe() {
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

	let darkMode = getContext('display') === 'editor' ? true : false;

	function toggleDarkMode() {
		darkMode = !darkMode;
	}

	let fontSize = getContext('display') === 'editor' ? '12px' : '16px';

	console.log('Dark mode:', darkMode);

	console.log('Application context:', getContext('display'));
</script>

<main style={'font-size: ' + fontSize} class={darkMode ? 'dark' : ''}>
	<div
		class="dark:bg-neutral-900 dark:text-white dark:text-opacity-80 transition duration-200 min-h-screen"
	>
		<DisplayOnWeb>
			<nav class="container mx-auto flex w-full justify-end p-4">
				<ToggleSwitch on:toggle={toggleDarkMode} />
			</nav>
		</DisplayOnWeb>

		<slot />
	</div>
</main>
