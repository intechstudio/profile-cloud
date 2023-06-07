<script lang="ts">
	import { Pane, Splitpanes } from 'svelte-splitpanes';

	import { getContext, onDestroy, onMount } from 'svelte';
	import DisplayOnWeb from '$lib/components/DisplayOnWeb.svelte';
	import { userAccountService } from '$lib/stores';
	import UserAccount from '$lib/components/UserAccount.svelte';
	import type { EditorReturnType } from '$lib/types';
	import CloudProfileCard from './CloudProfileCard.svelte';
	import {
		Query,
		and,
		deleteDoc,
		doc,
		getDoc,
		getDocs,
		or,
		query,
		setDoc,
		updateDoc,
		where,
		type DocumentData,
		writeBatch
	} from 'firebase/firestore';
	import {
		profileLinksCollection,
		profilesCollection,
		userCollection,
		usernameCollection
	} from '$lib/collections';
	import LocalProfileCard from './LocalProfileCard.svelte';
	import SvgIcon from '$lib/icons/SvgIcon.svelte';
	import { get } from 'svelte/store';
	import { ProfileSchema, type Profile, type ProfileLink, ProfileLinkSchema } from '$lib/schemas';
	import { fade, slide } from 'svelte/transition';
	import ToggleSwitch from '$lib/components/atomic/ToggleSwitch.svelte';
	import { PUBLIC_APP_ENV } from '$env/static/public';
	import { firestore } from '$lib/firebase';

	const display = getContext('display');

	let selectedLocalProfileIndex: number | undefined = undefined;
	let selectedCloudProfileIndex: number | undefined = undefined;

	//let publicProfiles: any[] = [];
	//let myProfiles: any[] = [];
	let cloudProfiles: any[] = [];
	let localProfiles: any[] = [];

	let linkProfiles: any[] = [];
	let linkFlag: string | undefined = undefined;

	let usernameInput = {
		element: null as HTMLInputElement | null,
		exists: false,
		valid: false,
		active: false
	};

	let selectedModuleType: string = '';

	const userAccountSubscription = userAccountService.subscribe(async (userAccount) => {
		cloudProfiles = await getCloudProfiles();
		if (userAccount.account?.uid) {
			const username = await getUserNameByUid(userAccount.account.uid);
			if (username) {
				usernameInput.exists = true;
				usernameInput.element!.value = '@' + username;
			} else {
				usernameInput.exists = false;
			}
		}
	});

	async function checkIfUsernameAvailable(username: string) {
		if (username.length >= 3 && username.length <= 15) {
			const usernameRef = doc(usernameCollection, username);
			const res = await getDoc(usernameRef).then((d) => d.data());
			usernameInput.valid = res == undefined ? true : false;
		} else {
			usernameInput.valid = false;
		}
	}

	async function getUserNameByUid(uid: string) {
		const userRef = doc(userCollection, uid);
		const user: string = await getDoc(userRef).then((res) => res.data()?.username);
		return user;
	}

	function usernameSelectionFeedback(obj: any) {
		let str = '';
		if (obj.element?.value != undefined && obj.element?.value.length > 0) {
			if (obj.element?.value.length > 0) {
				str += '@';
			}
			str += obj.element?.value;
			if (obj.valid == true && obj.element?.value.length > 0) {
				str += ' is available';
			} else if (obj.valid == false) {
				str += ' is not available';
			}
		}
		return str;
	}

	async function setUserName(username?: string) {
		const uid = get(userAccountService).account?.uid;
		// Create refs for both documents
		const userDoc = doc(userCollection, uid);
		const usernameDoc = doc(usernameCollection, username);

		// Commit both docs together as a batch write.
		const batch = writeBatch(firestore);

		batch.set(userDoc, { username });
		batch.set(usernameDoc, { uid });

		await batch.commit().then(() => {
			usernameInput.exists = true;
			usernameInput.element!.value = '@' + username;
		});
	}

	async function editorMessageListener(event: MessageEvent) {
		if (event.data.messageType == 'editorDataSaved') {
			// to do?
		}

		if (event.data.messageType == 'userAuthentication') {
			userAccountService.authenticateUser(event.data.authEvent);
		}

		if (event.data.messageType == 'profileLink') {
			const linkedProfile = await getLinkedProfile(event.data.profileLinkId);
			saveCloudProfileToLocalFolder(linkedProfile!);
		}

		if (event.data.messageType == 'selectedModuleType') {
			selectedModuleType = event.data.selectedModuleType;
		}
	}

	async function getLinkedProfile(id: string) {
		const docRef = doc(profileLinksCollection, id);
		const profileLink = await getDoc(docRef)
			.then((res) => res.data())
			.catch((err) => console.log(err));
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
		profile?: Profile | {}
	) {
		if (!profile) {
			profile = {};
		}
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
			localProfiles = await getListOfLocalProfiles();
		}
	}

	let importFlag: string | undefined = undefined;
	async function saveCloudProfileToLocalFolder(profile: Profile) {
		importFlag = profile.id;
		const result = await parentIframeCommunication({
			windowPostMessageName: 'profileImportCommunication',
			channelPostMessage: {
				channelMessageType: 'IMPORT_PROFILE'
			},
			dataForParent: profile
		});
		if (result.ok) {
			localProfiles = await getListOfLocalProfiles();
			importFlag = undefined;
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
				cloudProfiles = await getCloudProfiles();
			})
			.catch((error) => {
				console.log('error updating profile', error);
			});
	}

	// visibiltiy = public true / false
	async function changeCloudProfileVisibility(profile: Profile, visibility: boolean) {
		await updateDoc(doc(profilesCollection, profile.id), {
			public: visibility
		})
			.then(async () => {
				cloudProfiles = await getCloudProfiles();
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

		if (!usernameInput.exists) {
			return;
		}

		// reassign, else profile to delete id is overwritten!
		const profileToSave = { ...profile };

		profileToSave.owner = userData.uid;
		profileToSave.access = [userData.uid];
		profileToSave.public = false;
		profileToSave.id = newProfileRef.id;

		const parsedProfile = ProfileSchema.safeParse(profileToSave);

		if (parsedProfile.success) {
		} else {
			console.log(parsedProfile.error);
			return;
		}

		await setDoc(newProfileRef, parsedProfile.data)
			.then(async () => {
				// profile is successfully saved to cloud
			})
			.catch((error) => {
				// profile is not saved to cloud
				console.error('Profile save to cloud was unsuccessful', error);
			});

		await deleteLocalProfile(profile);
		cloudProfiles = await getCloudProfiles();
	}

	async function deleteCloudProfile(profile: Profile) {
		const profileRef = doc(profilesCollection, profile.id!);
		await deleteDoc(profileRef)
			.then(async (res) => {
				cloudProfiles = await getCloudProfiles();
			})
			.catch((err) => {
				console.log('Error deleting profile', err);
			});
	}

	async function getCloudProfiles() {
		let q: Query | undefined = undefined;
		if (get(userAccountService)?.account?.uid) {
			q = query(
				profilesCollection,
				or(
					where('public', '==', true),
					where('access', 'array-contains', get(userAccountService)?.account?.uid || '')
				)
			);
		} else {
			q = query(profilesCollection, where('public', '==', true));
		}

		// assign the returned documents to a variable, so it's easy to pass it to Grid Editor
		const profiles = await getDocs(q).then((res) => res.docs);
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

		profileLink.owner = userData.uid;
		profileLink.access = [userData.uid];
		profileLink.public = true;
		profileLink.id = newProfileLinkRef.id;

		const parsedProfileLink = ProfileLinkSchema.safeParse(profileLink);

		if (parsedProfileLink.success) {
			// do nothing, continue
		} else {
			console.log(parsedProfileLink.error);
			return;
		}

		await setDoc(newProfileLinkRef, parsedProfileLink.data)
			.then((res) => {
				// profile is successfully saved to cloud
			})
			.catch(() => {
				// profile is not saved to cloud
				console.error('Profile link save to cloud was unsuccessful');
			});

		const protocol = PUBLIC_APP_ENV === 'production' ? 'grid-editor://' : 'grid-editor-dev://';

		const profileLinkUrl = protocol + '?profile-link=' + newProfileLinkRef.id;

		await parentIframeCommunication({
			windowPostMessageName: 'createCloudProfileLink',
			channelPostMessage: {
				channelMessageType: 'CREATE_CLOUD_PROFILE_LINK'
			},
			dataForParent: { profileLinkUrl }
		}).then((res) => {
			linkFlag = profile.id;
			setTimeout(() => {
				linkFlag = undefined;
			}, 1750);
		});
	}

	onMount(async () => {
		window.addEventListener('message', editorMessageListener);

		localProfiles = await getListOfLocalProfiles();

		cloudProfiles = await getCloudProfiles();
	});

	onDestroy(() => {
		window.removeEventListener('message', editorMessageListener);
		userAccountSubscription();
	});
</script>

<section class="w-full h-full flex-grow bg-neutral-100 dark:bg-primary">
	{#if false}
		<DisplayOnWeb>
			<div class="p-4 w-full md:w-1/2 lg:md:w-1/3">
				<UserAccount />
			</div>
		</DisplayOnWeb>
	{/if}

	<div class="w-full h-full bg-neutral-100 dark:bg-primary/100">
		<div class="px-4 container mx-auto flex flex-col max-w-screen-xl h-full">
			<DisplayOnWeb>
				<div
					class="flex flex-col justify-between pt-8 text-opacity-80 text-black dark:text-opacity-80 dark:text-white"
				>
					<h1 class="text-3xl font-bold pb-2">profile list</h1>
					<h2 class="py-2 ">Profile Cloud is coming with Grid Editor version 1.2.35.</h2>
					<p class="text-opacity-60 text-black dark:text-white dark:text-opacity-60">
						<a href="https://links.intech.studio/discord" class="hover:underline text-blue-500"
							>Join the discord channel</a
						> to get support and early access.
					</p>
				</div>
			</DisplayOnWeb>

			{#if display == 'editor'}
				<div class="flex flex-grow h-screen relative z-0 overflow-hidden">
					<Splitpanes horizontal={true} theme="modern-theme">
						<Pane size={31} minSize={20}>
							<div class="flex flex-col pb-4 h-full ">
								<div class="py-4 flex items-center justify-between">
									<div class="flex flex-col">
										<div class="">Local profiles</div>
										<div class="text-xs dark:text-white dark:text-opacity-60">
											Only you can see these profiles.
										</div>
									</div>
									<div>
										<button
											on:click={() => {
												createNewLocalProfileWithTheSelectedModulesConfigurationFromEditor();
												provideSelectedProfileForOptionalUploadingToOneOreMoreModules({});
											}}
											class="rounded px-4 py-1 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-medium"
											>save local profile</button
										>
									</div>
								</div>
								<div
									class="overflow-y-scroll h-full pr-2 lg:py-8 grid grid-flow-row auto-rows-min items-start gap-4"
								>
									{#each [...linkProfiles, ...localProfiles.filter((p) => p.folder == 'local')] as profile, index}
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
											on:focusout={(e) => {
												selectedLocalProfileIndex = undefined;
											}}
											on:save-to-cloud={() => {
												saveLocalProfileToCloud(profile);
												provideSelectedProfileForOptionalUploadingToOneOreMoreModules({});
											}}
											on:delete-local={async () => {
												deleteLocalProfile(profile);
												provideSelectedProfileForOptionalUploadingToOneOreMoreModules({});
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
												provideSelectedProfileForOptionalUploadingToOneOreMoreModules({});
											}}
											class={index == selectedLocalProfileIndex
												? 'border-emerald-500'
												: 'border-white/10'}
											data={{ ...profile, selectedModuleType: selectedModuleType }}
										/>
									{/each}
								</div>
							</div>
						</Pane>

						<Pane minSize={28}>
							<div class="flex flex-col h-full pb-4">
								<div class="">
									{#if $userAccountService.account}
										<div
											class="{!usernameInput.exists
												? 'pb-2'
												: ''} flex items-center justify-between"
										>
											<div class="w-full flex flex-col  text-left py-4">
												{#if usernameInput.exists == false}
													<div class="pb-2">
														Before using the cloud, enter a username which will be displayed with
														your public profiles.
													</div>
												{:else}
													<div>Profile Cloud - {usernameInput.element?.value}</div>
													<div class="text-white text-opacity-60	">
														Public profiles from others and save yours as private or public here.
													</div>
												{/if}

												<div class="flex items-center ">
													<input
														id="display-name"
														bind:this={usernameInput.element}
														on:input={(event) => {
															checkIfUsernameAvailable(event.target?.value);
														}}
														on:keydown={(event) => {
															if (event.key == 'Enter') {
																usernameInput.active = false;
																setUserName(usernameInput.element?.value);
															}
														}}
														readonly={usernameInput.exists}
														placeholder="Username"
														class="{!usernameInput.exists
															? 'border-amber-500 focus:border-emerald-500 animate-pulse dark:bg-secondary focus:animate-none'
															: 'border-transparent bg-transparent text-white text-opacity-80 hidden'}  w-full border focus:outline-none "
														value={usernameInput.element?.value || ''}
													/>
													{#if usernameInput.exists == false}
														<button
															on:click={() => {
																usernameInput.active = false;
																setUserName(usernameInput.element?.value);
															}}
															class="mx-2 relative group"
														>
															<SvgIcon iconPath={'save_as_02'} class="w-5" />
															<div
																class="group-hover:block font-medium hidden absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
															>
																Save
															</div>
														</button>
													{/if}
												</div>
												{#if usernameInput.exists == false}
													<div class={usernameInput.valid ? 'text-emerald-500' : 'text-amber-500'}>
														{usernameSelectionFeedback(usernameInput)}
													</div>
												{/if}
											</div>
											{#if usernameInput.exists == true}
												<button
													on:click={() => {
														logoutFromProfileCloud();
													}}
													class="ml-1 relative group rounded px-1 text-xs border dark:border-white dark:border-opacity-10 dark:hover:bg-neutral-700 font-medium"
												>
													<SvgIcon iconPath={'log_out'} class="w-5" />
													<div
														class="group-hover:block font-medium hidden absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
													>
														Logout
													</div>
												</button>
											{/if}
										</div>
									{:else}
										<div class="py-4">
											<div class="rounded-md border border-amber-500 p-4 bg-secondary/90">
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
										</div>
									{/if}
								</div>
								<div
									class="overflow-y-scroll h-full pr-2 lg:py-8 grid grid-flow-row auto-rows-min items-start gap-4"
								>
									{#each cloudProfiles as profile, index (profile.id)}
										{@const data = profile.data()}
										<div in:slide>
											<CloudProfileCard
												on:click={() => {
													if (selectedCloudProfileIndex == index) {
														return;
													}
													// reset the selection on the local profiles
													selectedLocalProfileIndex = undefined;
													provideSelectedProfileForOptionalUploadingToOneOreMoreModules(data);
													selectedCloudProfileIndex = index;
												}}
												on:focusout={(e) => {
													selectedCloudProfileIndex = undefined;
												}}
												on:delete-cloud={async () => {
													selectedCloudProfileIndex = undefined;
													deleteCloudProfile(data);
													provideSelectedProfileForOptionalUploadingToOneOreMoreModules();
												}}
												on:description-change={(e) => {
													const { newDescription } = e.detail;
													textEditCloudProfile({ description: newDescription, profile: data });
												}}
												on:name-change={(e) => {
													const { newName } = e.detail;
													textEditCloudProfile({ name: newName, profile });
												}}
												class={index === selectedCloudProfileIndex
													? 'border-emerald-500'
													: 'border-white/10'}
												data={{ ...data, selectedModuleType: selectedModuleType }}
											>
												<svelte:fragment slot="link-button">
													<button
														class="relative group flex"
														on:click|stopPropagation={() => {
															createCloudProfileLink(data);
															provideSelectedProfileForOptionalUploadingToOneOreMoreModules({});
														}}
													>
														<SvgIcon class="w-4" iconPath="link" />
														<div
															class="group-hover:block font-medium hidden absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
														>
															Link
														</div>
														{#if linkFlag == data.id}
															<div
																transition:fade={{ duration: 100 }}
																class="block font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80  border border-white border-opacity-10 bg-emerald-700 rounded-lg px-2 py-0.5"
															>
																Copied to clipboard!
															</div>
														{/if}
													</button>
												</svelte:fragment>
												<svelte:fragment slot="import-button">
													<button
														on:click|stopPropagation={async () => {
															saveCloudProfileToLocalFolder(data);
															provideSelectedProfileForOptionalUploadingToOneOreMoreModules({});
														}}
														class="flex items-center group relative"
													>
														{#if importFlag == data.id}
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
												<span slot="toggle-accessibility">
													<ToggleSwitch
														checkbox={data.public}
														on:toggle={(e) => {
															console.log(e.detail);
															changeCloudProfileVisibility(data, e.detail);
														}}
													>
														<div class="relative group" slot="on">
															<SvgIcon display={true} iconPath={'public'} class="mr-1" />
															<div
																class="group-hover:block font-medium hidden absolute mt-1 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
															>
																Public
															</div>
														</div>
														<div class="relative group" slot="off">
															<SvgIcon
																display={true}
																iconPath={'private'}
																class="mr-1 text-opacity-70"
															/>
															<div
																class="group-hover:block font-medium hidden absolute mt-1 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
															>
																Private
															</div>
														</div>
													</ToggleSwitch>

													<!-- <button
														class="relative group"
														on:click|stopPropagation={async () => {
															changeCloudProfileVisibility(data, false);
														}}
													>
														<SvgIcon iconPath={'public'} />
														<div
															class="group-hover:block font-medium hidden absolute mt-1 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
														>
															Public
														</div>
													</button> -->
												</span>
												<!-- <svelte:fragment slot="make-public-button">
													<button
														class="relative group"
														on:click|stopPropagation={async () => {
															changeCloudProfileVisibility(data, true);
														}}
													>
														<SvgIcon iconPath={'private'} />
														<div
															class="group-hover:block font-medium hidden absolute mt-1 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
														>
															Private
														</div>
													</button>
												</svelte:fragment> -->
											</CloudProfileCard>
										</div>
									{/each}
								</div>
							</div>
						</Pane>
					</Splitpanes>
				</div>
			{:else}
				<div class="flex py-4 h-full ">
					<div
						class="overflow-y-auto w-full h-full p-2 lg:py-8 grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 gap-4"
					>
						{#each cloudProfiles as profile, index}
							{@const data = profile.data()}
							<CloudProfileCard
								on:click={() => {
									provideSelectedProfileForOptionalUploadingToOneOreMoreModules(data);
									selectedCloudProfileIndex = index;
									selectedLocalProfileIndex = undefined;
								}}
								class={index == selectedCloudProfileIndex ? 'border-emerald-500' : ''}
								{data}
							/>
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
