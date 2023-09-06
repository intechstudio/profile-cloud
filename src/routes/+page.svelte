<script lang="ts">
    import { Pane, Splitpanes } from "svelte-splitpanes";

    import { getContext, onDestroy, onMount } from "svelte";
    import DisplayOnWeb from "$lib/components/DisplayOnWeb.svelte";
    import { userAccountService } from "$lib/stores";
    import UserAccount from "$lib/components/UserAccount.svelte";
    import CloudProfileCard from "./CloudProfileCard.svelte";
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
    } from "firebase/firestore";
    import {
        profileLinksCollection,
        profilesCollection,
        userCollection,
        usernameCollection
    } from "$lib/collections";
    import LocalProfileCard from "./LocalProfileCard.svelte";
    import SvgIcon from "$lib/icons/SvgIcon.svelte";
    import { get } from "svelte/store";
    import { ProfileSchema, type Profile, type ProfileLink, ProfileLinkSchema } from "$lib/schemas";
    import { fade, slide } from "svelte/transition";
    import ToggleSwitch from "$lib/components/atomic/ToggleSwitch.svelte";
    import { PUBLIC_APP_ENV } from "$env/static/public";
    import { firestore } from "$lib/firebase";
    import { parentIframeCommunication } from "$lib/utils";

    const display = getContext("display");

    let searchSuggestions = [
        {
            value: "BU16"
        },
        {
            value: "EF44"
        },
        {
            value: "EN16"
        },
        {
            value: "PBF4"
        },
        {
            value: "PO16"
        }
    ];

    let selectedLocalProfileIndex: number | undefined = undefined;
    let selectedCloudProfileIndex: number | undefined = undefined;

    //let publicProfiles: any[] = [];
    //let myProfiles: any[] = [];
    let cloudProfiles: any[] = [];
    let localProfiles: any[] = [];
    let filteredProfiles: any[] = [];
    let allProfiles: any[] = [];

    let linkProfiles: any[] = [];
    let linkFlag: string | undefined = undefined;

    let usernameInput = {
        element: null as HTMLInputElement | null,
        exists: false,
        valid: false,
        active: false
    };

    let selectedModuleType: string = "";

    let isSearchSortingShows = false;
    let searchbarValue = "";
    let animateFade;

    let sortAsc = true;
    let sortField = "name";

    $: {
        if (cloudProfiles || localProfiles) {
            getAllProfiles().then((profiles) => {
                allProfiles = profiles;
                console.log(allProfiles);
            });
        }
    }

    let compareNameAscending = (a: any, b: any) => {
        return a.data.name
            .toLowerCase()
            .localeCompare(b.data.name.toLowerCase(), undefined, { numeric: true });
    };

    let compareNameDescending = (a: any, b: any) => {
        return b.data.name
            .toLowerCase()
            .localeCompare(a.data.name.toLowerCase(), undefined, { numeric: true });
    };

    function compareDateAscending(a: any, b: any) {
        return a.data.fsModifiedAt - b.data.fsModifiedAt;
    }

    function compareDateDescending(a: any, b: any) {
        return b.data.fsModifiedAt - a.data.fsModifiedAt;
    }

    function compareModuleAscending(a: any, b: any) {
        return a.data.type.localeCompare(b.data.type, undefined, {
            numeric: true
        });
    }

    function compareModuleDescending(a: any, b: any) {
        return b.data.type.localeCompare(a.data.type, undefined, {
            numeric: true
        });
    }

    $: cloudProfiles, updateSearchFilter(searchbarValue);

    function updateSearchFilter(input: string) {
        animateFade = false;

        filteredProfiles = [];
        const arrayOfSearchTerms = input.trim().toLowerCase().split(" ");
        allProfiles.forEach((profile) => {
            const data = profile.data;
            const currentProfileSearchable =
                data.name.toLowerCase() + " " + data.type.toLowerCase();
            let filterMatch = true;

            arrayOfSearchTerms.forEach((searchTerm) => {
                if (currentProfileSearchable.indexOf(searchTerm) === -1) {
                    filterMatch = false;
                }
            });

            if (filterMatch) {
                filteredProfiles = [...filteredProfiles, profile];
            }
        });

        sortProfileCloud(sortField, sortAsc);
    }

    function sortProfileCloud(field: string, asc: boolean) {
        if (field == "name") {
            if (asc == true) {
                filteredProfiles = filteredProfiles.sort(compareNameAscending);
            }

            if (asc == false) {
                filteredProfiles = filteredProfiles.sort(compareNameDescending);
            }
        }

        if (field == "date") {
            if (asc == true) {
                filteredProfiles = filteredProfiles.sort(compareDateAscending);
            }

            if (asc == false) {
                filteredProfiles = filteredProfiles.sort(compareDateDescending);
            }
        }

        if (field == "module") {
            if (asc == true) {
                filteredProfiles = filteredProfiles.sort(compareModuleAscending);
            }
            if (asc == false) {
                filteredProfiles = filteredProfiles.sort(compareModuleDescending);
            }
        }
    }

    async function submitAnalytics({ eventName, payload }: { eventName: string; payload: any }) {
        await parentIframeCommunication({
            windowPostMessageName: "submitAnalytics",
            channelPostMessage: { channelMessageType: "SUBMIT_ANALYTICS" },
            dataForParent: {
                eventName,
                payload
            }
        });
    }

    const userAccountSubscription = userAccountService.subscribe(async (userAccount) => {
        cloudProfiles = await getCloudProfiles();

        if (userAccount.account?.uid) {
            const username = await getUserNameByUid(userAccount.account.uid);
            if (username) {
                usernameInput.exists = true;
                usernameInput.element!.value = "@" + username;
            } else {
                usernameInput.exists = false;
            }

            submitAnalytics({
                eventName: "Authentication",
                payload: {
                    task: "Login",
                    username: username || userAccount.account.displayName
                }
            });
        } else {
            submitAnalytics({
                eventName: "Authentication",
                payload: {
                    task: "Logout"
                }
            });
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
        let str = "";
        if (obj.element?.value != undefined && obj.element?.value.length > 0) {
            if (obj.element?.value.length > 0) {
                str += "@";
            }
            str += obj.element?.value;
            if (obj.valid == true && obj.element?.value.length > 0) {
                str += " is available";
            } else if (obj.valid == false) {
                str += " is not available";
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
            usernameInput.element!.value = "@" + username;
        });
    }

    async function editorMessageListener(event: MessageEvent) {
        if (event.data.messageType == "editorDataSaved") {
            // to do?
        }

        if (event.data.messageType == "userAuthentication") {
            userAccountService.authenticateUser(event.data.authEvent);
        }

        if (event.data.messageType == "profileLink") {
            const linkedProfile = await getLinkedProfile(event.data.profileLinkId);
            submitAnalytics({
                eventName: "Profile Link",
                payload: {
                    task: "Import",
                    owner: linkedProfile?.owner,
                    profileName: linkedProfile?.name,
                    profileType: linkedProfile?.type
                }
            });
            saveCloudProfileToLocalFolder(linkedProfile!);
        }

        if (event.data.messageType == "selectedModuleType") {
            selectedModuleType = event.data.selectedModuleType;
        }
    }

    async function getAllProfiles() {
        //LOCAL
        let local: any[] = await getListOfLocalProfiles();
        local = local.map((p: any) => {
            return {
                data: p,
                location: "local"
            };
        });

        //CLOUD
        let cloud: any[] = await getCloudProfiles();

        cloud = cloud.map((p) => {
            return {
                data: p.data(),
                location: "cloud"
            };
        });

        //MERGED
        let profiles = [...local, ...cloud];
        return profiles;
    }

    async function getLinkedProfile(id: string) {
        const docRef = doc(profileLinksCollection, id);
        const profileLink = await getDoc(docRef)
            .then((res) => res.data())
            .catch((err) => console.log(err));
        return profileLink;
    }

    async function getListOfLocalProfiles() {
        if (display == "web") {
            return [];
        }

        const result = await parentIframeCommunication({
            windowPostMessageName: "getListOfLocalProfiles",
            channelPostMessage: { channelMessageType: "GET_LIST_OF_LOCAL_PROFILES" },
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
            windowPostMessageName: "provideSelectedProfileForOptionalUploadingToOneOreMoreModules",
            channelPostMessage: {
                channelMessageType:
                    "PROVIDE_SELECTED_PROFILE_FOR_OPTIONAL_UPLOADING_TO_ONE_OR_MORE_MODULES"
            },
            dataForParent: { profile }
        });
        if (result.ok) {
        }
    }

    async function deleteLocalProfile(profile: Profile) {
        const result = await parentIframeCommunication({
            windowPostMessageName: "deleteLocalProfile",
            channelPostMessage: {
                channelMessageType: "DELETE_LOCAL_PROFILE"
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
            windowPostMessageName:
                "createNewLocalProfileWithTheSelectedModulesConfigurationFromEditor",
            channelPostMessage: {
                channelMessageType:
                    "CREATE_NEW_LOCAL_PROFILE_WITH_THE_SELECTED_MODULES_CONFIGURATION_FROM_EDITOR"
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
            windowPostMessageName: "profileImportCommunication",
            channelPostMessage: {
                channelMessageType: "IMPORT_PROFILE"
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
            windowPostMessageName: "splitLocalProfile",
            channelPostMessage: {
                channelMessageType: "SPLIT_LOCAL_PROFILE"
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
            windowPostMessageName: "textEditLocalProfile",
            channelPostMessage: {
                channelMessageType: "TEXT_EDIT_LOCAL_PROFILE"
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
        if (name) details["name"] = name;
        if (description) details["description"] = description;

        await updateDoc(doc(profilesCollection, profile.id), {
            ...details
        })
            .then(async () => {
                cloudProfiles = await getCloudProfiles();
            })
            .catch((error) => {
                console.log("error updating profile", error);
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
                console.log("error updating profile", error);
            });
    }

    async function overwriteLocalProfile(profile: Profile) {
        const result = await parentIframeCommunication({
            windowPostMessageName: "overwriteLocalProfile",
            channelPostMessage: {
                channelMessageType: "OVERWRITE_LOCAL_PROFILE"
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
                console.error("Profile save to cloud was unsuccessful", error);
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
                console.log("Error deleting profile", err);
            });
    }

    async function getCloudProfiles() {
        let q: Query | undefined = undefined;
        if (get(userAccountService)?.account?.uid) {
            q = query(
                profilesCollection,
                or(
                    where("public", "==", true),
                    where("access", "array-contains", get(userAccountService)?.account?.uid || "")
                )
            );
        } else {
            q = query(profilesCollection, where("public", "==", true));
        }

        let profiles = await getDocs(q).then((res) => res.docs);

        return profiles;
    }

    async function loginToProfileCloud() {
        await parentIframeCommunication({
            windowPostMessageName: "loginToProfileCloud",
            channelPostMessage: {
                channelMessageType: "LOGIN_TO_PROFILE_CLOUD"
            },
            dataForParent: {}
        });
    }

    async function logoutFromProfileCloud() {
        await parentIframeCommunication({
            windowPostMessageName: "logoutFromProfileCloud",
            channelPostMessage: {
                channelMessageType: "LOGOUT_FROM_PROFILE_CLOUD"
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
                console.error("Profile link save to cloud was unsuccessful");
            });

        const profileLinkUrl = "grid-editor://?profile-link=" + newProfileLinkRef.id;

        await parentIframeCommunication({
            windowPostMessageName: "createCloudProfileLink",
            channelPostMessage: {
                channelMessageType: "CREATE_CLOUD_PROFILE_LINK"
            },
            dataForParent: { profileLinkUrl }
        }).then((res) => {
            linkFlag = profile.id;
            setTimeout(() => {
                linkFlag = undefined;
            }, 1750);
        });
    }

    async function profileCloudMounted() {
        return await parentIframeCommunication({
            windowPostMessageName: "profileCloudMounted",
            channelPostMessage: {
                channelMessageType: "PROFILE_CLOUD_MOUNTED"
            },
            dataForParent: {}
        });
    }

    function filterShowHide() {
        isSearchSortingShows = !isSearchSortingShows;
        animateFade = true;
    }

    function useSearchSuggestion(suggestionText: string) {
        updateSearchFilter((searchbarValue = suggestionText));
    }

    onMount(async () => {
        window.addEventListener("message", editorMessageListener);

        await profileCloudMounted();

        console.log("onmount");

        localProfiles = await getListOfLocalProfiles();
        cloudProfiles = await getCloudProfiles();
    });

    onDestroy(() => {
        window.removeEventListener("message", editorMessageListener);
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
                        <a
                            href="https://links.intech.studio/discord"
                            class="hover:underline text-blue-500">Join the discord channel</a
                        > to get support and early access.
                    </p>
                </div>
            </DisplayOnWeb>

            {#if display == "editor"}
                <div class="flex flex-grow h-screen relative z-0 overflow-hidden">
                    <div class="flex flex-col h-full w-full pb-4">
                        <div class="py-4 flex flex-row items-center justify-between">
                            <div class="flex flex-col mr-2">
                                <div>Profile Cloud</div>
                                <div class="text-white text-opacity-60">
                                    Public profiles from others and save yours as private or public
                                    here.
                                </div>
                            </div>
                            <button
                                on:click={() => {
                                    createNewLocalProfileWithTheSelectedModulesConfigurationFromEditor();
                                    provideSelectedProfileForOptionalUploadingToOneOreMoreModules(
                                        {}
                                    );
                                    submitAnalytics({
                                        eventName: "Local Profile",
                                        payload: {
                                            task: "Save local profile"
                                        }
                                    });
                                }}
                                class="rounded px-4 py-1 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-medium min-w-fit"
                                >save local profile</button
                            >
                        </div>

                        <div class="flex justify-end">
                            <button
                                on:click={() => {
                                    filterShowHide();
                                }}
                                class="text-white text-left font-xs"
                            >
                                {#if isSearchSortingShows}
                                    Hide Filters
                                {:else}
                                    Show Filters
                                {/if}
                            </button>
                        </div>
                        {#if isSearchSortingShows == true}
                            <!--
										<div
										in:fadeAnimation|local={{ fn: fade, y: 50, duration: 150 }}
										out:fadeAnimation|local={{ fn: fade, y: 50, duration: 150 }}
										>
									-->
                            <div>
                                <div class="flex flex-col gap-1 px-3 pt-3 ">
                                    <div class="relative">
                                        <svg
                                            class="absolute left-3 bottom-[28%]"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 18 18"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                d="M13.2095 11.6374C14.2989 10.1509 14.7868 8.30791 14.5756
												6.47715C14.3645 4.64639 13.4699 2.96286 12.0708 1.76338C10.6717
												0.563893 8.87126 -0.0630888 7.02973 0.0078685C5.1882 0.0788258
												3.44137 0.84249 2.13872 2.14608C0.83606 3.44967 0.0736462 5.19704
												0.00400665 7.03862C-0.0656329 8.8802 0.562637 10.6802 1.76312
												12.0784C2.96361 13.4767 4.64778 14.3701 6.47869 14.5799C8.3096
												14.7897 10.1522 14.3005 11.6379 13.2101H11.6368C11.6705 13.2551
												11.7065 13.2979 11.747 13.3395L16.0783 17.6707C16.2892 17.8818
												16.5754 18.0005 16.8738 18.0006C17.1723 18.0007 17.4585 17.8822
												17.6696 17.6713C17.8807 17.4603 17.9994 17.1742 17.9995
												16.8758C17.9996 16.5773 17.8811 16.2911 17.6702 16.08L13.3389
												11.7487C13.2987 11.708 13.2554 11.6704 13.2095
												11.6362V11.6374ZM13.4998 7.31286C13.4998 8.12541 13.3397 8.93001
												13.0288 9.68071C12.7178 10.4314 12.2621 11.1135 11.6875
												11.6881C11.113 12.2626 10.4308 12.7184 9.68014 13.0294C8.92944
												13.3403 8.12484 13.5004 7.31229 13.5004C6.49974 13.5004 5.69514
												13.3403 4.94444 13.0294C4.19373 12.7184 3.51163 12.2626 2.93707
												11.6881C2.3625 11.1135 1.90674 10.4314 1.59578 9.68071C1.28483
												8.93001 1.12479 8.12541 1.12479 7.31286C1.12479 5.67183 1.77669
												4.09802 2.93707 2.93763C4.09745 1.77725 5.67126 1.12536 7.31229
												1.12536C8.95332 1.12536 10.5271 1.77725 11.6875 2.93763C12.8479
												4.09802 13.4998 5.67183 13.4998 7.31286V7.31286Z"
                                                fill="#CDCDCD"
                                            />
                                        </svg>

                                        {#if searchbarValue != ""}
                                            <button
                                                class="absolute right-2 bottom-[25%]"
                                                on:click={() =>
                                                    updateSearchFilter((searchbarValue = ""))}
                                            >
                                                <svg
                                                    width="28"
                                                    height="28"
                                                    viewBox="0 0 39 39"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path
                                                        d="M24.25 32.9102L14.75 23.4102M24.25 23.4102L14.75 32.9102"
                                                        stroke="#FFF"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                    />
                                                </svg>
                                            </button>
                                        {/if}

                                        <input
                                            type="text"
                                            bind:value={searchbarValue}
                                            on:keyup={() => updateSearchFilter(searchbarValue)}
                                            on:input={() => updateSearchFilter(searchbarValue)}
                                            on:change={() => updateSearchFilter(searchbarValue)}
                                            class="w-full py-2 px-12 bg-primary-700 text-white
											placeholder-gray-400 text-md focus:outline-none"
                                            placeholder="Find Profile..."
                                        />
                                    </div>

                                    <div class="flex flex-row gap-1 py-1 flex-wrap">
                                        {#each searchSuggestions as suggestion}
                                            <button
                                                on:click={() =>
                                                    useSearchSuggestion(suggestion.value)}
                                                class="border hover:border-primary-500 text-xs text-primary-100 rounded-md
											py-0.5 px-1 h-min {searchbarValue.toLowerCase() == suggestion.value.toLowerCase()
                                                    ? 'border-primary-100'
                                                    : 'border-primary-700'}"
                                            >
                                                {suggestion.value}
                                            </button>
                                        {/each}
                                    </div>
                                </div>

                                <div class="flex gap-2 items-center justify-between flex-wrap p-3">
                                    <label
                                        for="sorting select"
                                        class="uppercase text-gray-500 py-1 text-xs"
                                    >
                                        sort by
                                    </label>

                                    <select
                                        class="bg-secondary border-none flex-grow text-white p-1 focus:outline-none"
                                        id="sortingSelectBox"
                                        on:change={(e) => {
                                            sortField = e.target.value;
                                            sortProfileCloud(sortField, sortAsc);
                                        }}
                                        name="sorting select"
                                    >
                                        <option
                                            selected
                                            class="text-white bg-secondary py-1 border-none"
                                            value="name"
                                        >
                                            name
                                        </option>

                                        <option
                                            class="text-white bg-secondary py-1 border-none"
                                            value="module"
                                        >
                                            module
                                        </option>
                                    </select>

                                    <button
                                        on:click={() => {
                                            sortAsc = !sortAsc;
                                            sortProfileCloud(sortField, sortAsc);
                                        }}
                                    >
                                        {#if sortAsc == false}
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    d="M11 11H15M11 15H18M11 19H21M9 7L6 4L3 7M6 6V20"
                                                    stroke="white"
                                                    stroke-width="2"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                />
                                            </svg>
                                        {:else}
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    d="M11 5H21M11 9H18M11 13H15M3 17L6 20L9 17M6 18V4"
                                                    stroke="white"
                                                    stroke-width="2"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                />
                                            </svg>
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        {/if}
                        <div
                            class="overflow-y-scroll h-full pr-2 lg:py-8 grid grid-flow-row auto-rows-min items-start gap-4"
                        >
                            {#each filteredProfiles as profile, index (profile.data.id)}
                                {@const data = profile.data}
                                <div in:slide>
                                    {#if profile.location === "cloud"}
                                        <CloudProfileCard
                                            on:click={() => {
                                                if (selectedCloudProfileIndex == index) {
                                                    return;
                                                }
                                                // reset the selection on the local profiles
                                                selectedLocalProfileIndex = undefined;
                                                provideSelectedProfileForOptionalUploadingToOneOreMoreModules(
                                                    data
                                                );
                                                selectedCloudProfileIndex = index;
                                            }}
                                            on:focusout={(e) => {
                                                selectedCloudProfileIndex = undefined;
                                            }}
                                            on:delete-cloud={async () => {
                                                selectedCloudProfileIndex = undefined;
                                                deleteCloudProfile(data);
                                                provideSelectedProfileForOptionalUploadingToOneOreMoreModules();
                                                submitAnalytics({
                                                    eventName: "Profile Cloud",
                                                    payload: {
                                                        task: "Delete",
                                                        profileName: data.name,
                                                        public: data.public
                                                    }
                                                });
                                            }}
                                            on:description-change={(e) => {
                                                const { newDescription } = e.detail;
                                                textEditCloudProfile({
                                                    description: newDescription,
                                                    profile: data
                                                });
                                                submitAnalytics({
                                                    eventName: "Profile Cloud",
                                                    payload: {
                                                        task: "Edit description",
                                                        oldDescription: data.description,
                                                        newDescription: newDescription
                                                    }
                                                });
                                            }}
                                            on:name-change={(e) => {
                                                const { newName } = e.detail;

                                                textEditCloudProfile({
                                                    name: newName,
                                                    profile
                                                });
                                                submitAnalytics({
                                                    eventName: "Profile Cloud",
                                                    payload: {
                                                        task: "Edit name",
                                                        oldProfileName: data.name,
                                                        newProfileName: newName
                                                    }
                                                });
                                            }}
                                            class={index === selectedCloudProfileIndex
                                                ? "border-emerald-500"
                                                : "border-white/10"}
                                            data={{
                                                ...data,
                                                selectedModuleType: selectedModuleType
                                            }}
                                        >
                                            <svelte:fragment slot="link-button">
                                                <button
                                                    class="relative group flex"
                                                    on:click|stopPropagation={() => {
                                                        createCloudProfileLink(data);
                                                        provideSelectedProfileForOptionalUploadingToOneOreMoreModules(
                                                            {}
                                                        );
                                                        submitAnalytics({
                                                            eventName: "Profile Link",
                                                            payload: {
                                                                task: "Create",
                                                                profileName: data.name
                                                            }
                                                        });
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
                                                            transition:fade={{
                                                                duration: 100
                                                            }}
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
                                                        provideSelectedProfileForOptionalUploadingToOneOreMoreModules(
                                                            {}
                                                        );
                                                        submitAnalytics({
                                                            eventName: "Profile Cloud",
                                                            payload: {
                                                                task: "Import to local",
                                                                profileName: data.name
                                                            }
                                                        });
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
                                                        submitAnalytics({
                                                            eventName: "Profile Cloud",
                                                            payload: {
                                                                task: "Set visibility",
                                                                profileName: data.name,
                                                                visibility: e.detail
                                                            }
                                                        });
                                                        changeCloudProfileVisibility(
                                                            data,
                                                            e.detail
                                                        );
                                                    }}
                                                >
                                                    <div class="relative group" slot="on">
                                                        <SvgIcon
                                                            display={true}
                                                            iconPath={"public"}
                                                            class="mr-1"
                                                        />
                                                        <div
                                                            class="group-hover:block font-medium hidden absolute mt-1 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
                                                        >
                                                            Public
                                                        </div>
                                                    </div>
                                                    <div class="relative group" slot="off">
                                                        <SvgIcon
                                                            display={true}
                                                            iconPath={"private"}
                                                            class="mr-1 text-opacity-70"
                                                        />
                                                        <div
                                                            class="group-hover:block font-medium hidden absolute mt-1 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
                                                        >
                                                            Private
                                                        </div>
                                                    </div>
                                                </ToggleSwitch>
                                            </span>
                                        </CloudProfileCard>
                                    {/if}
                                    {#if profile.location === "local"}
                                        {#each [...linkProfiles, ...localProfiles.filter((p) => p.folder == "local")] as profile, index}
                                            <LocalProfileCard
                                                on:click={() => {
                                                    if (selectedLocalProfileIndex == index) {
                                                        return;
                                                    }
                                                    // reset the selected cloud profile index
                                                    selectedCloudProfileIndex = undefined;
                                                    provideSelectedProfileForOptionalUploadingToOneOreMoreModules(
                                                        profile
                                                    );
                                                    selectedLocalProfileIndex = index;
                                                }}
                                                on:focusout={(e) => {
                                                    selectedLocalProfileIndex = undefined;
                                                }}
                                                on:save-to-cloud={() => {
                                                    saveLocalProfileToCloud(profile);
                                                    provideSelectedProfileForOptionalUploadingToOneOreMoreModules(
                                                        {}
                                                    );
                                                    submitAnalytics({
                                                        eventName: "Local Profile",
                                                        payload: {
                                                            task: "Save to cloud",
                                                            ...profile
                                                        }
                                                    });
                                                }}
                                                on:delete-local={async () => {
                                                    deleteLocalProfile(profile);
                                                    provideSelectedProfileForOptionalUploadingToOneOreMoreModules(
                                                        {}
                                                    );
                                                    submitAnalytics({
                                                        eventName: "Local Profile",
                                                        payload: {
                                                            task: "Delete",
                                                            ...profile
                                                        }
                                                    });
                                                }}
                                                on:split-profile={() => {
                                                    //splitLocalProfile(profile);
                                                }}
                                                on:name-change={(e) => {
                                                    const { newName } = e.detail;
                                                    textEditLocalProfile({
                                                        name: newName,
                                                        profile
                                                    });
                                                    submitAnalytics({
                                                        eventName: "Local Profile",
                                                        payload: {
                                                            task: "Edit name",
                                                            oldName: profile.name,
                                                            newName: newName
                                                        }
                                                    });
                                                }}
                                                on:description-change={(e) => {
                                                    const { newDescription } = e.detail;
                                                    textEditLocalProfile({
                                                        description: newDescription,
                                                        profile
                                                    });
                                                    submitAnalytics({
                                                        eventName: "Local Profile",
                                                        payload: {
                                                            task: "Edit description",
                                                            oldDescription: profile.description,
                                                            newDescription: newDescription
                                                        }
                                                    });
                                                }}
                                                on:overwrite-profile={() => {
                                                    overwriteLocalProfile(profile);
                                                    provideSelectedProfileForOptionalUploadingToOneOreMoreModules(
                                                        {}
                                                    );
                                                    submitAnalytics({
                                                        eventName: "Local Profile",
                                                        payload: {
                                                            task: "Overwrite",
                                                            ...profile
                                                        }
                                                    });
                                                }}
                                                class={index == selectedLocalProfileIndex
                                                    ? "border-emerald-500"
                                                    : "border-white/10"}
                                                data={{
                                                    ...profile,
                                                    selectedModuleType: selectedModuleType
                                                }}
                                            />
                                        {/each}
                                    {/if}
                                </div>
                            {/each}
                        </div>
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
                                                Before using the cloud, enter a username which will
                                                be displayed with your public profiles.
                                            </div>
                                        {:else}
                                            <div>
                                                Profile Cloud - {usernameInput.element?.value}
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
                                                    if (event.key == "Enter") {
                                                        usernameInput.active = false;
                                                        setUserName(usernameInput.element?.value);
                                                        submitAnalytics({
                                                            eventName: "Set Username",
                                                            payload: {
                                                                handler: "Enter key",
                                                                username:
                                                                    usernameInput.element?.value
                                                            }
                                                        });
                                                    }
                                                }}
                                                readonly={usernameInput.exists}
                                                placeholder="Username"
                                                class="{!usernameInput.exists
                                                    ? 'border-amber-500 focus:border-emerald-500 animate-pulse dark:bg-secondary focus:animate-none'
                                                    : 'border-transparent bg-transparent text-white text-opacity-80 hidden'}  w-full border focus:outline-none "
                                                value={usernameInput.element?.value || ""}
                                            />
                                            {#if usernameInput.exists == false}
                                                <button
                                                    on:click={() => {
                                                        usernameInput.active = false;
                                                        setUserName(usernameInput.element?.value);
                                                        submitAnalytics({
                                                            eventName: "Set Username",
                                                            payload: {
                                                                handler: "Button",
                                                                username:
                                                                    usernameInput.element?.value
                                                            }
                                                        });
                                                    }}
                                                    class="mx-2 relative group"
                                                >
                                                    <SvgIcon iconPath={"save_as_02"} class="w-5" />
                                                    <div
                                                        class="group-hover:block font-medium hidden absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
                                                    >
                                                        Save
                                                    </div>
                                                </button>
                                            {/if}
                                        </div>
                                        {#if usernameInput.exists == false}
                                            <div
                                                class={usernameInput.valid
                                                    ? "text-emerald-500"
                                                    : "text-amber-500"}
                                            >
                                                {usernameSelectionFeedback(usernameInput)}
                                            </div>
                                        {/if}
                                    </div>
                                    {#if usernameInput.exists == true}
                                        <button
                                            on:click={() => {
                                                logoutFromProfileCloud();
                                                submitAnalytics({
                                                    eventName: "Authentication",
                                                    payload: {
                                                        task: "Logout attempt"
                                                    }
                                                });
                                            }}
                                            class="ml-1 relative group rounded px-1 text-xs border dark:border-white dark:border-opacity-10 dark:hover:bg-neutral-700 font-medium"
                                        >
                                            <SvgIcon iconPath={"log_out"} class="w-5" />
                                            <div
                                                class="group-hover:block font-medium hidden absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
                                            >
                                                Logout
                                            </div>
                                        </button>
                                    {/if}
                                </div>
                            {:else}
                                <div class="pt-4">
                                    <div
                                        class="rounded-md border border-amber-500 p-4 bg-secondary/90"
                                    >
                                        <div class="pb-1 text-white">
                                            login to save and browse your profiles
                                        </div>
                                        <div class="pt-1">
                                            <button
                                                on:click={() => {
                                                    loginToProfileCloud();
                                                    submitAnalytics({
                                                        eventName: "Authentication",
                                                        payload: {
                                                            task: "Login attempt"
                                                        }
                                                    });
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
                    </div>
                </div>
            {:else}
                <div class="flex-col py-4 h-full ">
                    <div class="flex justify-end">
                        <button
                            on:click={() => {
                                filterShowHide();
                            }}
                            class="text-left font-xs"
                        >
                            {#if isSearchSortingShows}
                                Hide Filters
                            {:else}
                                Show Filters
                            {/if}
                        </button>
                    </div>
                    {#if isSearchSortingShows == true}
                        <!--
						<div
						in:fadeAnimation|local={{ fn: fade, y: 50, duration: 150 }}
						out:fadeAnimation|local={{ fn: fade, y: 50, duration: 150 }}
						>
					-->
                        <div>
                            <div class="flex flex-col gap-1 px-3 pt-3 ">
                                <div class="relative">
                                    <svg
                                        class="absolute left-3 bottom-[28%]"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 18 18"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M13.2095 11.6374C14.2989 10.1509 14.7868 8.30791 14.5756
								6.47715C14.3645 4.64639 13.4699 2.96286 12.0708 1.76338C10.6717
								0.563893 8.87126 -0.0630888 7.02973 0.0078685C5.1882 0.0788258
								3.44137 0.84249 2.13872 2.14608C0.83606 3.44967 0.0736462 5.19704
								0.00400665 7.03862C-0.0656329 8.8802 0.562637 10.6802 1.76312
								12.0784C2.96361 13.4767 4.64778 14.3701 6.47869 14.5799C8.3096
								14.7897 10.1522 14.3005 11.6379 13.2101H11.6368C11.6705 13.2551
								11.7065 13.2979 11.747 13.3395L16.0783 17.6707C16.2892 17.8818
								16.5754 18.0005 16.8738 18.0006C17.1723 18.0007 17.4585 17.8822
								17.6696 17.6713C17.8807 17.4603 17.9994 17.1742 17.9995
								16.8758C17.9996 16.5773 17.8811 16.2911 17.6702 16.08L13.3389
								11.7487C13.2987 11.708 13.2554 11.6704 13.2095
								11.6362V11.6374ZM13.4998 7.31286C13.4998 8.12541 13.3397 8.93001
								13.0288 9.68071C12.7178 10.4314 12.2621 11.1135 11.6875
								11.6881C11.113 12.2626 10.4308 12.7184 9.68014 13.0294C8.92944
								13.3403 8.12484 13.5004 7.31229 13.5004C6.49974 13.5004 5.69514
								13.3403 4.94444 13.0294C4.19373 12.7184 3.51163 12.2626 2.93707
								11.6881C2.3625 11.1135 1.90674 10.4314 1.59578 9.68071C1.28483
								8.93001 1.12479 8.12541 1.12479 7.31286C1.12479 5.67183 1.77669
								4.09802 2.93707 2.93763C4.09745 1.77725 5.67126 1.12536 7.31229
								1.12536C8.95332 1.12536 10.5271 1.77725 11.6875 2.93763C12.8479
								4.09802 13.4998 5.67183 13.4998 7.31286V7.31286Z"
                                            fill="#CDCDCD"
                                        />
                                    </svg>

                                    {#if searchbarValue != ""}
                                        <button
                                            class="absolute right-2 bottom-[25%]"
                                            on:click={() =>
                                                updateSearchFilter((searchbarValue = ""))}
                                        >
                                            <svg
                                                width="28"
                                                height="28"
                                                viewBox="0 0 39 39"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    d="M24.25 32.9102L14.75 23.4102M24.25 23.4102L14.75 32.9102"
                                                    stroke="#FFF"
                                                    stroke-width="2"
                                                    stroke-linecap="round"
                                                />
                                            </svg>
                                        </button>
                                    {/if}

                                    <input
                                        type="text"
                                        bind:value={searchbarValue}
                                        on:keyup={() => updateSearchFilter(searchbarValue)}
                                        on:input={() => updateSearchFilter(searchbarValue)}
                                        on:change={() => updateSearchFilter(searchbarValue)}
                                        class="w-full py-2 px-12 bg-white dark:bg-primary-700 
							dark:placeholder-gray-400 text-md focus:outline-none"
                                        placeholder="Find Profile..."
                                    />
                                </div>

                                <div class="flex flex-row gap-1 py-1 flex-wrap">
                                    {#each searchSuggestions as suggestion}
                                        <button
                                            on:click={() => useSearchSuggestion(suggestion.value)}
                                            class="border hover:border-primary-500 text-xs dark:text-primary-100 rounded-md
							py-0.5 px-1 h-min {searchbarValue.toLowerCase() == suggestion.value.toLowerCase()
                                                ? 'border-primary-100'
                                                : 'border-primary-700'}"
                                        >
                                            {suggestion.value}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <div class="flex gap-2 items-center justify-between flex-wrap p-3">
                                <label
                                    for="sorting select"
                                    class="uppercase text-gray-500 py-1 text-xs"
                                >
                                    sort by
                                </label>

                                <select
                                    class="bg-white dark:bg-secondary border-none flex-grow p-1 focus:outline-none"
                                    id="sortingSelectBox"
                                    on:change={(e) => {
                                        sortField = e.target.value;
                                        sortProfileCloud(sortField, sortAsc);
                                    }}
                                    name="sorting select"
                                >
                                    <option
                                        selected
                                        class="bg-white dark:bg-secondary py-1 border-none"
                                        value="name"
                                    >
                                        name
                                    </option>

                                    <option
                                        class="bg-white dark:bg-secondary py-1 border-none"
                                        value="module"
                                    >
                                        module
                                    </option>
                                </select>

                                <button
                                    on:click={() => {
                                        sortAsc = !sortAsc;
                                        sortProfileCloud(sortField, sortAsc);
                                    }}
                                >
                                    {#if sortAsc == false}
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                class="stroke-black dark:stroke-white stroke-2"
                                                d="M11 11H15M11 15H18M11 19H21M9 7L6 4L3 7M6 6V20"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                        </svg>
                                    {:else}
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                d="M11 5H21M11 9H18M11 13H15M3 17L6 20L9 17M6 18V4"
                                                class="stroke-black dark:stroke-white stroke-2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                        </svg>
                                    {/if}
                                </button>
                            </div>
                        </div>
                    {/if}
                    <div
                        class="overflow-y-auto w-full h-full p-2 lg:py-8 grid grid-cols-1 md:grid-cols-2 grid-flow-row lg:grid-cols-3 gap-4"
                    >
                        {#each cloudProfiles as profile, index}
                            {@const data = profile.data()}
                            <CloudProfileCard
                                on:click={() => {
                                    provideSelectedProfileForOptionalUploadingToOneOreMoreModules(
                                        data
                                    );
                                    selectedCloudProfileIndex = index;
                                    selectedLocalProfileIndex = undefined;
                                }}
                                class={index == selectedCloudProfileIndex
                                    ? "border-emerald-500"
                                    : ""}
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
        content: "";
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
