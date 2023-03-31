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
		class="dark:bg-neutral-900 flex flex-col justify-between dark:text-white dark:text-opacity-80 transition duration-200 min-h-screen"
	>
		<DisplayOnWeb>
			<nav class="container mx-auto flex w-full justify-between p-4">
				<a href="https://intech.studio">
					<img
						src="https://intech.studio/icon-logo-black-transparent.svg"
						alt="Intech Studio"
						class="h-8 p-1"
					/>
				</a>
				<ToggleSwitch on:toggle={toggleDarkMode} />
			</nav>
		</DisplayOnWeb>

		<slot />

		<DisplayOnWeb>
			<footer class=" bg-emerald-300 dark:bg-emerald-800">
				<div class="container mx-auto flex w-full justify-center p-4 text-center">
					<p class="text-sm">
						<a
							href="https://intech.studio"
							target="_blank"
							rel="noopener noreferrer"
							class="text-neutral-500 hover:text-neutral-600 dark:text-white dark:text-opacity-80 dark:hover:text-opacity-60"
						>
							&copy; {new Date().getFullYear()} Intech Studio
						</a>
					</p>
				</div>
			</footer>
		</DisplayOnWeb>
	</div>
</main>

<style>
	/**
	This is the global style for the scrollbar from the editor.
	*/
	:global(::-webkit-scrollbar) {
		height: 6px;
		width: 6px;
		background: #1e2628;
	}

	:global(::-webkit-scrollbar-thumb) {
		background: #286787;
		box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.75);
	}

	:global(::-webkit-scrollbar-corner) {
		background: #1e2628;
	}
</style>
