<script lang="ts">
	import { Pane, Splitpanes } from 'svelte-splitpanes';

	import { onDestroy, onMount } from 'svelte';
	import DisplayOnWeb from '$lib/components/DisplayOnWeb.svelte';
	import { userAccountStore } from '$lib/stores';
	import UserAccount from '$lib/components/UserAccount.svelte';
	import type { EditorReturnType, Profile } from '$lib/types';
	import DocumentCard from '$lib/components/DocumentCard.svelte';
	import { getDocs, query, where } from 'firebase/firestore';
	import { profilesCollection } from '$lib/collections';
	import LocalProfileCard from './LocalProfileCard.svelte';
	import SvgIcon from '$lib/icons/SvgIcon.svelte';

	let selectedLocalProfileIndex: number | undefined = undefined;
	let selectedCloudProfileIndex: number | undefined = undefined;

	function editorMessageListener(event: MessageEvent) {
		if (event.data.messageType == 'editorDataSaved') {
			// to do?
		}
		if (event.data.messageType == 'userAuthentication') {
			userAccountStore.authenticateUser(event.data.authEvent);
		}
	}

	async function parentIframeCommunication({
		windowPostMessageName,
		channelPostMessage,
		dataForParent
	}: {
		windowPostMessageName: string;
		channelPostMessage: any;
		dataForParent: any;
	}): Promise<EditorReturnType> {
		return new Promise((resolve, reject) => {
			// create a message channel to communicate with the editor in this scope
			const messageChannel = new MessageChannel();
			// let editor know that it should listen for messages on this channel
			window.parent.postMessage(windowPostMessageName, '*', [messageChannel.port2]);
			// we listen for messages on this channel
			messageChannel.port1.onmessage = ({ data }) => {
				messageChannel.port1.close();
				if (data.ok) {
					resolve(data);
				} else {
					reject(data);
				}
			};
			// send the data to the editor
			messageChannel.port1.postMessage({ ...channelPostMessage, ...dataForParent });
		});
	}

	let localProfiles: any[] = [];
	async function getListOfLocalProfiles() {
		const result = await parentIframeCommunication({
			windowPostMessageName: 'getListOfLocalProfiles',
			channelPostMessage: { channelMessageType: 'GET_LIST_OF_LOCAL_PROFILES' },
			dataForParent: {}
		});
		if (result.ok) {
			console.log(result.data);
			localProfiles = result.data;
		}
	}

	async function provideSelectedProfileForOptionalUploadingToOneOreMoreModules(profile: Profile) {
		const result = await parentIframeCommunication({
			windowPostMessageName: 'provideSelectedProfileForOptionalUploadingToOneOreMoreModules',
			channelPostMessage: {
				channelMessageType: 'PROVIDE_SELECTED_PROFILE_FOR_OPTIONAL_UPLOADING_TO_ONE_OR_MORE_MODULES'
			},
			dataForParent: { profile }
		});
		if (result.ok) {
			console.log('provider...', result.data);
		}
	}

	async function deleteLocalProfile(profile: Profile) {
		const result = await parentIframeCommunication({
			windowPostMessageName: 'deleteLocalProfile',
			channelPostMessage: {
				channelMessageType: 'DELETE_LOCAL_PROFILE'
			},
			dataForParent: { profile }
		});
		if (result.ok) {
			console.log('delete success', result.data);
			getListOfLocalProfiles();
		}
	}

	async function createNewLocalProfileWithTheSelectedModulesConfigurationFromEditor() {
		const result = await parentIframeCommunication({
			windowPostMessageName: 'createNewLocalProfileWithTheSelectedModulesConfigurationFromEditor',
			channelPostMessage: {
				channelMessageType:
					'CREATE_NEW_LOCAL_PROFILE_WITH_THE_SELECTED_MODULES_CONFIGURATION_FROM_EDITOR'
			},
			dataForParent: {}
		});
		if (result.ok) {
			console.log('create success', result.data);
			getListOfLocalProfiles();
		}
	}

	let importFlag = false;
	async function saveCloudProfileToLocalFolder(profile: Profile) {
		importFlag = true;
		const result = await parentIframeCommunication({
			windowPostMessageName: 'profileImportCommunication',
			channelPostMessage: {
				channelMessageType: 'IMPORT_PROFILE'
			},
			dataForParent: profile
		});
		console.log('return result', result);
		if (result.ok) {
			console.log('save success', result.data);
			getListOfLocalProfiles();
			importFlag = false;
		}
	}

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

	onMount(() => {
		window.addEventListener('message', editorMessageListener);
		getListOfLocalProfiles();
	});

	onDestroy(() => {
		window.removeEventListener('message', editorMessageListener);
	});
</script>

<section class="w-full h-full flex-grow bg-neutral-100 dark:bg-neutral-950">
	{#if false}
		<DisplayOnWeb>
			<div class="p-4 w-full md:w-1/2 lg:md:w-1/3">
				<UserAccount />
			</div>
		</DisplayOnWeb>
	{/if}

	<div class="w-full h-full bg-neutral-100 dark:bg-neutral-950">
		<div class="px-4 container mx-auto flex flex-col max-w-screen-xl h-full">
			<DisplayOnWeb>
				<div
					class="flex flex-col justify-between pt-8 text-opacity-80 text-black dark:text-opacity-80 dark:text-white"
				>
					<h1 class="text-3xl font-bold pb-2">profile list</h1>
					<h2 class="py-2 ">
						This is a preview of Profile Cloud. Official release date is <span
							class="font-bold text-blue-500 dark:text-emerald-500">2023-06-02</span
						>.
					</h2>
					<p class="text-opacity-60 text-black dark:text-white dark:text-opacity-60">
						Grid users will finally be able to browse, create and share profiles.
					</p>
				</div>
			</DisplayOnWeb>

			<div class="flex flex-grow h-screen relative z-0">
				<Splitpanes horizontal={true} theme="modern-theme">
					<Pane size={31}>
						<div class="flex flex-col py-4 h-full ">
							<div class="pb-4 px-2 flex items-center justify-between">
								<div class="">Local profiles</div>
								<div>
									<button
										on:click={() => {
											createNewLocalProfileWithTheSelectedModulesConfigurationFromEditor();
										}}
										class="rounded px-4 py-1 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-medium"
										>save profile</button
									>
								</div>
							</div>
							<div
								class="overflow-y-auto h-full p-2 lg:py-8  grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 xl:grid-cols-4 gap-4"
							>
								{#each localProfiles.filter((p) => p.folder == 'local') as profile, index}
									<LocalProfileCard
										on:click={() => {
											provideSelectedProfileForOptionalUploadingToOneOreMoreModules(profile);
											selectedLocalProfileIndex = index;
											selectedCloudProfileIndex = undefined;
										}}
										on:delete={() => {
											deleteLocalProfile(profile);
										}}
										class={index == selectedLocalProfileIndex ? 'border-emerald-500' : ''}
										data={profile}
									/>
								{/each}
							</div>
						</div>
					</Pane>
					<Pane minSize={28}>
						<div class="flex py-4 h-full ">
							<div
								class="overflow-y-auto h-full p-2 lg:py-8  grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 xl:grid-cols-4 gap-4"
							>
								{#await listPublicProfiles()}
									loading..
								{:then profiles}
									{#each profiles as profile, index}
										{@const data = profile.data()}
										<DocumentCard
											on:click={() => {
												provideSelectedProfileForOptionalUploadingToOneOreMoreModules(data);
												selectedCloudProfileIndex = index;
												selectedLocalProfileIndex = undefined;
											}}
											class={index == selectedCloudProfileIndex ? 'border-emerald-500' : ''}
											{data}
										>
											<span slot="import-button">
												<button
													on:click|stopPropagation={() => {
														saveCloudProfileToLocalFolder(data);
													}}
													class=""
												>
													{#if importFlag}
														loading...
													{/if}
													<SvgIcon class="w-4" iconPath="import" />
												</button>
											</span>
										</DocumentCard>
									{/each}
								{/await}
							</div>
						</div>
					</Pane>
				</Splitpanes>
			</div>
		</div>
	</div>
</section>

<style lang="postcss">
	:global(.splitpanes.modern-theme .splitpanes__pane) {
		/*  @apply bg-secondary; */
		position: relative;
		overflow: visible;
	}

	/*betty magic selector*/
	:global(.splitpanes.modern-theme .splitpanes__pane.leftPane) {
		overflow: hidden;
	}

	:global(.splitpanes.modern-theme .splitpanes__splitter) {
		background-color: #4c4c4c;
		position: relative;
	}
	:global(.splitpanes.modern-theme .splitpanes__splitter:before) {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		transition: opacity 0.3s;
		background-color: #2db9d2;
		width: 200;
		opacity: 0;
		z-index: 1;
	}
	:global(.splitpanes.modern-theme .splitpanes__splitter:hover:before) {
		opacity: 1;
	}
	:global(.splitpanes.modern-theme .splitpanes__splitter.splitpanes__splitter__active) {
		z-index: 2;
		/* Fix an issue of overlap fighting with a near hovered splitter */
	}
	:global(.modern-theme.splitpanes--vertical > .splitpanes__splitter:before) {
		left: -3px;
		right: -3px;
		height: 100%;
		cursor: col-resize;
	}
	:global(.modern-theme.splitpanes--horizontal > .splitpanes__splitter:before) {
		top: -3px;
		bottom: -3px;
		width: 100%;
		cursor: row-resize;
	}
	:global(.splitpanes.no-splitter .splitpanes__pane) {
		background-color: #0e100f;
	}
	:global(.splitpanes.no-splitter .splitpanes__splitter) {
		background-color: #4c4c4c;
		position: relative;
	}
	:global(.no-splitter.splitpanes--horizontal > .splitpanes__splitter:before) {
		width: 0.05rem;
		pointer-events: none;
		cursor: none;
	}
	:global(.no-splitter.splitpanes--vertical > .splitpanes__splitter:before) {
		height: 0.05rem;
		pointer-events: none;
		cursor: none;
	}
</style>
