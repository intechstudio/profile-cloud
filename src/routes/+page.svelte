<script lang="ts">
	import { Pane, Splitpanes } from 'svelte-splitpanes';

	import { getContext, onDestroy, onMount } from 'svelte';
	import DisplayOnWeb from '$lib/components/DisplayOnWeb.svelte';
	import { userAccountService } from '$lib/stores';
	import UserAccount from '$lib/components/UserAccount.svelte';
	import type { EditorReturnType } from '$lib/types';
	import CloudProfileCard from './CloudProfileCard.svelte';
	import {
		and,
		deleteDoc,
		doc,
		getDoc,
		getDocs,
		or,
		query,
		setDoc,
		updateDoc,
		where
	} from 'firebase/firestore';
	import { profileLinksCollection, profilesCollection } from '$lib/collections';
	import LocalProfileCard from './LocalProfileCard.svelte';
	import SvgIcon from '$lib/icons/SvgIcon.svelte';
	import { get } from 'svelte/store';
	import { ProfileSchema, type Profile, type ProfileLink, ProfileLinkSchema } from '$lib/schemas';

	const display = getContext('display');

	let selectedLocalProfileIndex: number | undefined = undefined;
	let selectedCloudProfileIndex: number | undefined = undefined;

	let publicProfiles: any[] = [];
	let myProfiles: any[] = [];
	let localProfiles: any[] = [];

	const userAccountSubscription = userAccountService.subscribe(async (userAccount) => {
		if (userAccount.account) {
			myProfiles = await getListMyPrivateProfiles();
		} else {
			myProfiles = [];
		}
	});

	async function editorMessageListener(event: MessageEvent) {
		if (event.data.messageType == 'editorDataSaved') {
			// to do?
		}
		if (event.data.messageType == 'userAuthentication') {
			userAccountService.authenticateUser(event.data.authEvent);
		}

		if (event.data.messageType == 'profileLink') {
			const linkedProfile = await getLinkedProfile(event.data.profileLinkId);
			localProfiles = [...localProfiles, linkedProfile];
		}
	}

	async function getLinkedProfile(id: string) {
		const docRef = doc(profileLinksCollection, id);
		const profileLink = await getDoc(docRef)
			.then((res) => res.data())
			.catch((err) => console.log(err));
		console.log(profileLink);
		return profileLink;
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

	async function getListOfLocalProfiles() {
		if (display == 'web') {
			return [];
		}

		const result = await parentIframeCommunication({
			windowPostMessageName: 'getListOfLocalProfiles',
			channelPostMessage: { channelMessageType: 'GET_LIST_OF_LOCAL_PROFILES' },
			dataForParent: {}
		});
		if (result.ok) {
			return result.data;
		}
	}

	async function provideSelectedProfileForOptionalUploadingToOneOreMoreModules(
		profile: typeof Object
	) {
		const result = await parentIframeCommunication({
			windowPostMessageName: 'provideSelectedProfileForOptionalUploadingToOneOreMoreModules',
			channelPostMessage: {
				channelMessageType: 'PROVIDE_SELECTED_PROFILE_FOR_OPTIONAL_UPLOADING_TO_ONE_OR_MORE_MODULES'
			},
			dataForParent: { profile }
		});
		if (result.ok) {
		}
	}

	async function deleteLocalProfile(profile: Profile) {
		const result = await parentIframeCommunication({
			windowPostMessageName: 'deleteLocalProfile',
			channelPostMessage: {
				channelMessageType: 'DELETE_LOCAL_PROFILE'
			},
			dataForParent: { profile }
		}).catch((err) => {
			return { ok: false, data: {} };
		});

		if (result.ok) {
			console.log('delete success', result.data);
			localProfiles = await getListOfLocalProfiles();
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
			localProfiles = await getListOfLocalProfiles();
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
		if (result.ok) {
			console.log('save success', result.data);
			localProfiles = await getListOfLocalProfiles();
			importFlag = false;
		}
	}

	async function splitLocalProfile(profile: Profile) {
		const result = await parentIframeCommunication({
			windowPostMessageName: 'splitLocalProfile',
			channelPostMessage: {
				channelMessageType: 'SPLIT_LOCAL_PROFILE'
			},
			dataForParent: { profileToSplit: profile }
		});
		if (result.ok) {
			console.log('split success', result.data);
		}
	}

	async function textEditLocalProfile({
		name,
		description,
		profile
	}: {
		name?: string;
		description?: string;
		profile: Profile;
	}) {
		const result = await parentIframeCommunication({
			windowPostMessageName: 'textEditLocalProfile',
			channelPostMessage: {
				channelMessageType: 'TEXT_EDIT_LOCAL_PROFILE'
			},
			dataForParent: { name, description, profile }
		});
		if (result.ok) {
			console.log('update success', result.data);
			localProfiles = await getListOfLocalProfiles();
		}
	}

	async function textEditCloudProfile({
		name,
		description,
		profile
	}: {
		name?: string;
		description?: string;
		profile: Profile;
	}) {
		interface ProfileTextDetails {
			name?: string;
			description?: string;
		}

		let details: ProfileTextDetails = {};
		if (name) details['name'] = name;
		if (description) details['description'] = description;

		await updateDoc(doc(profilesCollection, profile.id), {
			...details
		})
			.then(async () => {
				console.log('profile updated');
				myProfiles = await getListMyPrivateProfiles();
			})
			.catch((error) => {
				console.log('error updating profile', error);
			});
	}

	async function overwriteLocalProfile(profile: Profile) {
		const result = await parentIframeCommunication({
			windowPostMessageName: 'overwriteLocalProfile',
			channelPostMessage: {
				channelMessageType: 'OVERWRITE_LOCAL_PROFILE'
			},
			dataForParent: { profileToOverwrite: profile }
		});
		if (result.ok) {
			localProfiles = await getListOfLocalProfiles();
		}
	}

	async function saveLocalProfileToCloud(profile: Profile) {
		const newProfileRef = doc(profilesCollection);
		const userData = get(userAccountService)?.account;
		if (!userData) {
			loginToProfileCloud();
			return;
		}

		// reassign, else profile to delete id is overwritten!
		const profileToSave = { ...profile };

		profileToSave.owner = userData.displayName || userData.email;
		profileToSave.access = [userData.uid];
		profileToSave.public = false;
		profileToSave.id = newProfileRef.id;

		const isObjectValid = ProfileSchema.safeParse(profileToSave);

		if (isObjectValid.success) {
			console.log('profile object is valid');
		} else {
			console.log('profile is not valid');
			console.log(isObjectValid.error);
			return;
		}

		await setDoc(newProfileRef, profileToSave)
			.then(async () => {
				// profile is successfully saved to cloud
			})
			.catch((error) => {
				// profile is not saved to cloud
				console.error('Profile save to cloud was unsuccessful', error);
			});

		await deleteLocalProfile(profile);
		myProfiles = await getListMyPrivateProfiles();
	}

	async function deleteCloudProfile(profile: Profile) {
		const profileRef = doc(profilesCollection, profile.id!);
		await deleteDoc(profileRef)
			.then(async (res) => {
				console.log('Profile successfully deleted', res);
				myProfiles = await getListMyPrivateProfiles();
			})
			.catch((err) => {
				console.log('Error deleting profile', err);
			});
	}

	async function getListPublicProfiles() {
		// there is a firestore security rule to only list public profiles
		const q = query(
			profilesCollection,
			where('public', '==', true) // having a read rule restriction in firestore rules is not enough! We must explicitly define the query here
		);
		// assign the returned documents to a variable, so it's easy to pass it to Grid Editor
		const profiles = await getDocs(q).then((res) => res.docs);
		return profiles;
	}

	async function getListMyPrivateProfiles() {
		const q = query(
			profilesCollection,
			and(
				where('public', '==', false),
				where('access', 'array-contains', get(userAccountService)?.account?.uid || '')
			)
		);
		const profiles = await getDocs(q)
			.then((res) => res.docs)
			.catch((err) => {
				console.log('user not logged in');
				return [];
			});
		return profiles;
	}

	async function loginToProfileCloud() {
		await parentIframeCommunication({
			windowPostMessageName: 'loginToProfileCloud',
			channelPostMessage: {
				channelMessageType: 'LOGIN_TO_PROFILE_CLOUD'
			},
			dataForParent: {}
		});
	}

	async function logoutFromProfileCloud() {
		await parentIframeCommunication({
			windowPostMessageName: 'logoutFromProfileCloud',
			channelPostMessage: {
				channelMessageType: 'LOGOUT_FROM_PROFILE_CLOUD'
			},
			dataForParent: {}
		});
	}

	async function createCloudProfileLink(profile: Profile) {
		const newProfileLinkRef = doc(profileLinksCollection);
		const userData = get(userAccountService)?.account;
		if (!userData) {
			loginToProfileCloud();
			return;
		}

		const profileLink: ProfileLink = {
			...profile,
			linked: true
		};

		profileLink.owner = userData.displayName || userData.email;
		profileLink.access = [userData.uid];
		profileLink.public = true;
		profileLink.id = newProfileLinkRef.id;

		const isObjectValid = ProfileLinkSchema.safeParse(profileLink);

		if (isObjectValid.success) {
			// do nothing, continue
		} else {
			console.log(isObjectValid.error);
			return;
		}

		await setDoc(newProfileLinkRef, profileLink)
			.then(async (res) => {
				getDoc(newProfileLinkRef).then((snap) => {
					console.log('Here is the document you wrote to', snap.data());
				});
			})
			.catch(() => {
				// profile is not saved to cloud
				console.error('Profile link save to cloud was unsuccessful');
			});

		const profileLinkUrl = 'grid-editor-dev://?profile-link=' + newProfileLinkRef.id;

		await parentIframeCommunication({
			windowPostMessageName: 'createCloudProfileLink',
			channelPostMessage: {
				channelMessageType: 'CREATE_CLOUD_PROFILE_LINK'
			},
			dataForParent: { profileLinkUrl }
		}).then((res) => {
			console.log('createCloudProfileLink', res);
		});
	}

	onMount(async () => {
		window.addEventListener('message', editorMessageListener);

		localProfiles = await getListOfLocalProfiles();

		publicProfiles = await getListPublicProfiles();

		myProfiles = await getListMyPrivateProfiles();
	});

	onDestroy(() => {
		window.removeEventListener('message', editorMessageListener);
		userAccountSubscription();
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

			{#if display == 'editor'}
				<div class="flex flex-grow h-screen relative z-0 overflow-hidden">
					<Splitpanes horizontal={true} theme="modern-theme">
						<Pane size={31} minSize={20}>
							<div class="flex flex-col pb-4 h-full ">
								<div class="py-4 px-2 flex items-center justify-between">
									<div class="">Local profiles</div>
									<div>
										<button
											on:click={() => {
												createNewLocalProfileWithTheSelectedModulesConfigurationFromEditor();
											}}
											class="rounded px-4 py-1 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-medium"
											>save local profile</button
										>
									</div>
								</div>
								<div
									class="overflow-y-scroll h-full pr-2 lg:py-8 grid grid-flow-row auto-rows-min items-start gap-4"
								>
									{#each localProfiles.filter((p) => p.folder == 'local') as profile, index}
										<LocalProfileCard
											on:click={() => {
												if (selectedLocalProfileIndex == index) {
													return;
												}
												// reset the selected cloud profile index
												selectedCloudProfileIndex = undefined;
												provideSelectedProfileForOptionalUploadingToOneOreMoreModules(profile);
												selectedLocalProfileIndex = index;
											}}
											on:blur={(e) => {
												//selectedLocalProfileIndex = undefined;
											}}
											on:save-to-cloud={() => {
												saveLocalProfileToCloud(profile);
											}}
											on:delete-local={() => {
												deleteLocalProfile(profile);
											}}
											on:split-profile={() => {
												splitLocalProfile(profile);
											}}
											on:name-change={(e) => {
												const { newName } = e.detail;
												textEditLocalProfile({ name: newName, profile });
											}}
											on:description-change={(e) => {
												const { newDescription } = e.detail;
												textEditLocalProfile({ description: newDescription, profile });
											}}
											on:overwrite-profile={() => {
												overwriteLocalProfile(profile);
											}}
											class={index == selectedLocalProfileIndex
												? 'border-emerald-500'
												: 'border-transparent'}
											data={profile}
										/>
									{/each}
								</div>
							</div>
						</Pane>

						<Pane minSize={28}>
							<div class="flex flex-col py-4 h-full ">
								<div class="pb-4 ">
									{#if $userAccountService.account}
										<div class="flex items-center justify-between">
											<div class="flex items-center">
												{#if $userAccountService.account?.photoURL}
													<img
														class="h-5 w-5 rounded-full"
														src={$userAccountService?.account?.photoURL}
														alt="user profile"
													/>
												{:else}
													<div class="w-5 h-5 bg-neutral-700 rounded-full" />
												{/if}

												<div class="ml-2">
													{$userAccountService.account?.displayName ||
														$userAccountService.account?.email}
												</div>
											</div>
											<button
												on:click={() => {
													logoutFromProfileCloud();
												}}
												class="rounded px-4 py-1 text-xs border dark:border-white dark:border-opacity-10 dark:hover:bg-neutral-700 font-medium"
											>
												logout
											</button>
										</div>
									{:else}
										<div class="rounded-md border border-amber-500 p-4 bg-neutral-900">
											<div class="pb-1 text-white">login to save and browse your profiles</div>
											<div class="pt-1">
												<button
													on:click={() => {
														loginToProfileCloud();
													}}
													class="rounded px-4 py-1 border dark:border-emerald-500 dark:hover:bg-emerald-700 font-medium"
												>
													login
												</button>
											</div>
										</div>
									{/if}
								</div>
								<div
									class="overflow-y-scroll h-full pr-2 lg:py-8 grid grid-flow-row auto-rows-min items-start gap-4"
								>
									{#each [...myProfiles, ...publicProfiles] as profile, index}
										{@const data = profile.data()}
										<CloudProfileCard
											on:click={() => {
												if (selectedCloudProfileIndex == index) {
													return;
												}
												console.log('click');
												// reset the selection on the local profiles
												selectedLocalProfileIndex = undefined;
												provideSelectedProfileForOptionalUploadingToOneOreMoreModules(data);
												selectedCloudProfileIndex = index;
											}}
											on:blur={(e) => {
												//selectedCloudProfileIndex = undefined;
											}}
											on:delete-cloud={() => {
												deleteCloudProfile(data);
											}}
											on:description-change={(e) => {
												const { newDescription } = e.detail;
												textEditCloudProfile({ description: newDescription, profile: data });
											}}
											on:name-change={(e) => {
												const { newName } = e.detail;
												textEditCloudProfile({ name: newName, profile });
											}}
											class={index == selectedCloudProfileIndex ? 'border-emerald-500' : ''}
											{data}
										>
											<svelte:fragment>
												<button
													class="relative group flex"
													on:click={() => {
														createCloudProfileLink(data);
													}}
												>
													<SvgIcon class="w-5" iconPath="link" />
													<div
														class="group-hover:block font-medium hidden absolute mt-7 top-0 right-0 text-white text-opacity-80  border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
													>
														Link
													</div>
												</button>
											</svelte:fragment>
											<svelte:fragment slot="import-button">
												<button
													on:click|stopPropagation={() => {
														saveCloudProfileToLocalFolder(data);
													}}
													class="flex items-center group relative"
												>
													{#if importFlag}
														loading...
													{/if}
													<SvgIcon class="w-4" iconPath="import" />
													<div
														class="group-hover:block hidden font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80  border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
													>
														Import
													</div>
												</button>
											</svelte:fragment>
										</CloudProfileCard>
									{/each}
								</div>
							</div>
						</Pane>
					</Splitpanes>
				</div>
			{:else}
				<div class="flex py-4 h-full ">
					<div
						class="overflow-y-auto h-full p-2 lg:py-8  grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 xl:grid-cols-4 gap-4"
					>
						{#each publicProfiles as profile, index}
							{@const data = profile.data()}
							<CloudProfileCard
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
							</CloudProfileCard>
						{/each}
					</div>
				</div>
			{/if}
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
