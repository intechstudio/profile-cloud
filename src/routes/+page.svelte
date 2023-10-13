<script lang="ts">
    import { Pane, Splitpanes } from "svelte-splitpanes";

    import { getContext, onDestroy, onMount } from "svelte";
    import DisplayOnWeb from "$lib/components/DisplayOnWeb.svelte";
    import { userAccountService } from "$lib/stores";
    import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
    import { configLinksCollection, userCollection, usernameCollection } from "$lib/collections";
    import SvgIcon from "$lib/icons/SvgIcon.svelte";
    import { get } from "svelte/store";
    import { type Config, LocalConfigSchema, BaseConfigSchema } from "$lib/schemas";
    import type { CloudConfig } from "$lib/schemas";
    import { fade, slide } from "svelte/transition";
    import ToggleSwitch from "$lib/components/atomic/ToggleSwitch.svelte";
    import { PUBLIC_APP_ENV } from "$env/static/public";
    import { PUBLIC_VERSION_STRING } from "$env/static/public";
    import { firestore } from "$lib/firebase";
    import { parentIframeCommunication } from "$lib/utils";
    import { compareSemVer } from "semver-parser";
    import {
        updateLocalConfigs,
        type ConfigManager,
        createConfigManager
    } from "$lib/configmanager/ConfigManager";
    import ConfigCard from "./ConfigCard.svelte";

    enum SortFieldType {
        name = "name",
        date = "date",
        module = "module"
    }

    const display = getContext("display");

    let searchSuggestions: string[] = [];

    let selectedConfigIndex: number | undefined = undefined;

    let configManager: ConfigManager | undefined = undefined;
    let configs: Config[] = [];
    let filteredConfigs: Config[] = [];

    let linkFlag: string | undefined = undefined;

    let usernameInput = {
        element: null as HTMLInputElement | null,
        exists: false,
        valid: false,
        active: false
    };

    let selectedComponentTypes: string[] = [];

    let configTypeSelector = "profile";

    let isSearchSortingShows = false;
    let searchbarValue = "";

    let sortAsc = false;
    let sortField: SortFieldType = SortFieldType.date;
    let isEditorVersionCompatible = true;

    let compareFieldsMap = new Map([
        [
            SortFieldType.name,
            (a: any, b: any) => {
                return a.name
                    .toLowerCase()
                    .localeCompare(b.name.toLowerCase(), undefined, { numeric: true });
            }
        ],
        [
            SortFieldType.module,
            (a: any, b: any) => {
                return a.type.localeCompare(b.type, undefined, {
                    numeric: true
                });
            }
        ],
        [
            SortFieldType.date,
            (a: any, b: any) => {
                return a.modifiedAt - b.modifiedAt;
            }
        ]
    ]);

    $: configTypeSelector, updateSearchSuggestions();

    function updateSearchSuggestions() {
        if (configTypeSelector === "profile") {
            searchSuggestions = ["BU16", "EF44", "EN16", "PBF4", "PO16"];
        } else if (configTypeSelector === "preset") {
            searchSuggestions = ["button", "encoder", "potentiometer", "fader"];
        }
    }

    $: configs, searchbarValue, configTypeSelector, updateSearchFilter();
    function updateSearchFilter() {
        const input = searchbarValue;
        const arrayOfSearchTerms = input.trim().toLowerCase().split(" ");

        filteredConfigs = configs.filter((config) => {
            if (config.configType !== configTypeSelector) {
                return false;
            }
            const currentProfileSearchable =
                config.name.toLowerCase() + " " + config.type.toLowerCase();

            for (const searchTerm of arrayOfSearchTerms) {
                if (currentProfileSearchable.indexOf(searchTerm) === -1) {
                    return false;
                }
            }
            return true;
        });
        //Only sort when ordering explicitly changes (like file explorer)
    }

    $: sortField, sortAsc, sortProfileCloud();
    function sortProfileCloud() {
        if (sortField) {
            configs.sort(compareFieldsMap.get(sortField));
        }
        if (sortAsc) {
            configs.reverse();
        }
        updateSearchFilter();
    }

    $: configTypeSelector, resetPageState();

    function resetPageState() {
        selectedConfigIndex = undefined;
        provideSelectedConfigForEditor({});
    }

    async function submitAnalytics({ eventName, payload }: { eventName: string; payload: any }) {
        await parentIframeCommunication({
            windowPostMessageName: "submitAnalytics",
            dataForParent: {
                eventName,
                payload
            }
        });
    }

    const userAccountSubscription = userAccountService.subscribe(async (userAccount) => {
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
        if (event.data.messageType == "localConfigs") {
            const localConfigs = (event.data.configs as any[]).map((config) =>
                LocalConfigSchema.parse(config)
            );
            updateLocalConfigs(localConfigs);
        }

        if (event.data.messageType == "userAuthentication") {
            userAccountService.authenticateUser(event.data.authEvent);
        }

        if (event.data.messageType == "configLink") {
            const linkedConfig = await configManager?.importLinkedConfig(event.data.configLinkId);

            if (linkedConfig) {
                submitAnalytics({
                    eventName: "Config Link",
                    payload: {
                        task: "Import",
                        owner: linkedConfig?.owner,
                        profileName: linkedConfig?.name,
                        profileType: linkedConfig?.type
                    }
                });
                configTypeSelector = linkedConfig?.configType;
            }
        }

        if (event.data.messageType == "selectedComponentTypes") {
            selectedComponentTypes = event.data.selectedComponentTypes;
        }
    }

    async function provideSelectedConfigForEditor(config?: Config | {}) {
        await parentIframeCommunication({
            windowPostMessageName: "provideSelectedConfigForEditor",
            dataForParent: { config: config ?? {} }
        });
    }

    async function createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor() {
        const configResponse = await parentIframeCommunication({
            windowPostMessageName: "getCurrenConfigurationFromEditor",
            dataForParent: { configType: configTypeSelector }
        });
        if (configResponse.ok) {
            configManager?.saveConfig(BaseConfigSchema.parse(configResponse.data), true);
        }
    }

    async function splitConfig(config: Config) {
        if (config.configType !== "profile") return;

        for (let configElement of config.configs) {
            let name = `${config.name} - Element ${configElement.controlElementNumber}`;
            let description = "";
            let type = "";
            if (config.type == "BU16") {
                type = "button";
            }

            if (config.type == "PO16") {
                type = "potentiometer";
            }

            if (config.type == "EN16") {
                type = "encoder";
            }

            if (config.type == "EF44") {
                if ([0, 1, 2, 3].includes(configElement.controlElementNumber)) {
                    type = "encoder";
                }
                if ([4, 5, 6, 7].includes(configElement.controlElementNumber)) {
                    type = "fader";
                }
            }

            if (config.type == "PBF4") {
                if ([0, 1, 2, 3].includes(configElement.controlElementNumber)) {
                    type = "potentiometer";
                }
                if ([4, 5, 6, 7].includes(configElement.controlElementNumber)) {
                    type = "fader";
                }
                if ([8, 9, 10, 11].includes(configElement.controlElementNumber)) {
                    type = "button";
                }
            }

            if (configElement.controlElementNumber === 255) {
                type = "system";
            }

            let preset = {
                name: name,
                description: description,
                type: type,
                configType: "preset",
                version: config.version,
                configs: {
                    ...configElement
                },
                id: "" //ID will be generated on save
            };
            configManager?.saveConfig(BaseConfigSchema.parse(preset), true);
        }
    }

    async function loginToProfileCloud() {
        await parentIframeCommunication({
            windowPostMessageName: "loginToProfileCloud",
            dataForParent: {}
        });
    }

    async function logoutFromProfileCloud() {
        await parentIframeCommunication({
            windowPostMessageName: "logoutFromProfileCloud",
            dataForParent: {}
        });
    }

    async function createCloudConfigLink(config: Config) {
        const newConfigLinkRef = doc(configLinksCollection);
        const userData = get(userAccountService)?.account;
        if (!userData) {
            loginToProfileCloud();
            return;
        }

        const configLink: CloudConfig = {
            ...config,
            owner: userData.uid,
            access: [userData.uid],
            public: true,
            id: newConfigLinkRef.id
        };

        await setDoc(newConfigLinkRef, configLink)
            .then(async (res) => {
                const configLinkUrl = "grid-editor://?config-link=" + newConfigLinkRef.id;

                await parentIframeCommunication({
                    windowPostMessageName: "createCloudConfigLink",
                    dataForParent: { configLinkUrl }
                }).then((res) => {
                    linkFlag = config.id;
                    setTimeout(() => {
                        linkFlag = undefined;
                    }, 1750);
                });
            })
            .catch(() => {
                // config is not saved to cloud
                console.error("Config link save to cloud was unsuccessful");
            });
    }

    async function profileCloudMounted() {
        return await parentIframeCommunication({
            windowPostMessageName: "profileCloudMounted",
            dataForParent: {}
        });
    }

    async function overwriteConfigWithEditorConfig(config: Config) {
        const configResponse = await parentIframeCommunication({
            windowPostMessageName: "getCurrenConfigurationFromEditor",
            dataForParent: { configType: configTypeSelector }
        });
        if (configResponse.ok) {
            let editorConfig = BaseConfigSchema.parse(configResponse.data);
            let newConfig = {
                ...config,
                configs: editorConfig.configs,
                type: editorConfig.type,
                version: editorConfig.version,
                configType: editorConfig.configType
            };
            configManager?.saveConfig(newConfig, false);
        }
    }

    function filterShowHide() {
        isSearchSortingShows = !isSearchSortingShows;
    }

    function useSearchSuggestion(suggestionText: string) {
        searchbarValue = suggestionText;
    }

    onMount(async () => {
        window.addEventListener("message", editorMessageListener);

        configManager = createConfigManager({
            next: (newConfigs) => {
                newConfigs.sort((a, b) => {
                    let ai = configs.findIndex((e) => e.id === a.id);
                    let bi = configs.findIndex((e) => e.id === b.id);
                    return ai - bi;
                });
                configs = newConfigs;
            }
        });

        let editorVersionResponse = await profileCloudMounted();
        if (
            editorVersionResponse.data &&
            compareSemVer(editorVersionResponse.data, "1.2.45") >= 0
        ) {
            isEditorVersionCompatible = true;
        } else {
            isEditorVersionCompatible = false;
        }
    });

    onDestroy(() => {
        window.removeEventListener("message", editorMessageListener);
        userAccountSubscription();
        configManager?.cancel();
        configManager = undefined;
    });
</script>

<section class="w-full h-full flex-grow bg-neutral-100 dark:bg-primary">
    <div class="w-full h-full bg-neutral-100 dark:bg-primary/100">
        <div class="px-4 container mx-auto flex flex-col max-w-screen-xl h-full">
            <DisplayOnWeb>
                <div
                    class="flex flex-col justify-between pt-8 text-opacity-80 text-black dark:text-opacity-80 dark:text-white"
                >
                    <h1 class="text-3xl font-bold pb-2">profile list</h1>
                    <h2 class="py-2">Profile Cloud is coming with Grid Editor version 1.2.35.</h2>
                    <p class="text-opacity-60 text-black dark:text-white dark:text-opacity-60">
                        <a
                            href="https://links.intech.studio/discord"
                            class="hover:underline text-blue-500">Join the discord channel</a
                        > to get support and early access.
                    </p>
                </div>
            </DisplayOnWeb>
            {#if display == "editor" && !isEditorVersionCompatible}
                <div class="flex justify-center items-center h-screen px-4">
                    <p class="text-center text-lg">
                        Your Editor is not compatible with the current Profile Cloud version. Please
                        update your Editor to the latest version!
                    </p>
                </div>
            {/if}
            {#if display == "editor"}
                {#if isEditorVersionCompatible}
                    <div class="flex flex-grow h-screen relative z-0 overflow-hidden">
                        <Splitpanes horizontal={true} theme="modern-theme">
                            <Pane minSize={28}>
                                <div class="flex flex-col pb-4 h-full">
                                    <ul class="flex">
                                        <li>
                                            <button
                                                class="block px-2 py-1 {configTypeSelector ===
                                                'profile'
                                                    ? 'bg-emerald-600'
                                                    : ''}"
                                                on:click={() => (configTypeSelector = "profile")}
                                                >Profiles</button
                                            >
                                        </li>
                                        <li>
                                            <button
                                                class="block px-2 py-1 {configTypeSelector ===
                                                'preset'
                                                    ? 'bg-emerald-600'
                                                    : ''}"
                                                on:click={() => (configTypeSelector = "preset")}
                                                >Presets</button
                                            >
                                        </li>
                                    </ul>
                                    <div class="py-4 flex items-center justify-between">
                                        <div class="flex flex-col">
                                            <div>Profile Cloud</div>
                                            <div class="text-white text-opacity-60">
                                                Public {configTypeSelector}s from others and save
                                                yours as private or public here.
                                            </div>
                                        </div>
                                        <button
                                            on:click={() => {
                                                createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor();
                                                provideSelectedConfigForEditor({});
                                                submitAnalytics({
                                                    eventName: "Local Config",
                                                    payload: {
                                                        task: "Save config"
                                                    }
                                                });
                                            }}
                                            class="rounded px-4 py-1 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-medium"
                                            >save {configTypeSelector}</button
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
                                        <div>
                                            <div class="flex flex-col gap-1 px-3 pt-3">
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
                                                            on:click={() => (searchbarValue = "")}
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
                                                        on:keyup={() => updateSearchFilter()}
                                                        on:input={() => updateSearchFilter()}
                                                        on:change={() => updateSearchFilter()}
                                                        class="w-full py-2 px-12 bg-primary-700 text-white
                                        placeholder-gray-400 text-md focus:outline-none"
                                                        placeholder="Find {configTypeSelector}..."
                                                    />
                                                </div>

                                                <div class="flex flex-row gap-1 py-1 flex-wrap">
                                                    {#each searchSuggestions as suggestion}
                                                        <button
                                                            on:click={() =>
                                                                useSearchSuggestion(suggestion)}
                                                            class="border hover:border-primary-500 text-xs text-primary-100 rounded-md
                                        py-0.5 px-1 h-min {searchbarValue.toLowerCase() ==
                                                            suggestion.toLowerCase()
                                                                ? 'border-primary-100'
                                                                : 'border-primary-700'}"
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    {/each}
                                                </div>
                                            </div>

                                            <div
                                                class="flex gap-2 items-center justify-between flex-wrap p-3"
                                            >
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
                                                    }}
                                                    name="sorting select"
                                                >
                                                    <option
                                                        class="text-white bg-secondary py-1 border-none"
                                                        value="date"
                                                    >
                                                        date
                                                    </option>
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
                                        {#each filteredConfigs as config, index (config.id)}
                                            <div in:slide>
                                                <ConfigCard
                                                    on:click={() => {
                                                        if (selectedConfigIndex == index) {
                                                            return;
                                                        }
                                                        provideSelectedConfigForEditor(config);
                                                        selectedConfigIndex = index;
                                                    }}
                                                    on:focusout={(e) => {
                                                        selectedConfigIndex = undefined;
                                                    }}
                                                    on:delete-config={async () => {
                                                        selectedConfigIndex = undefined;
                                                        configManager?.deleteConfig(config);
                                                        provideSelectedConfigForEditor({});
                                                        submitAnalytics({
                                                            eventName: "Profile Cloud",
                                                            payload: {
                                                                task: "Delete",
                                                                profileName: config.name,
                                                                public: config.public
                                                            }
                                                        });
                                                    }}
                                                    on:description-change={(e) => {
                                                        const { newDescription } = e.detail;
                                                        let oldDescription = config.description;
                                                        let newConfig = {
                                                            ...config,
                                                            description: newDescription
                                                        };
                                                        configManager?.saveConfig(newConfig, false);
                                                        submitAnalytics({
                                                            eventName: "Profile Cloud",
                                                            payload: {
                                                                task: "Edit description",
                                                                oldDescription,
                                                                newDescription: newDescription
                                                            }
                                                        });
                                                    }}
                                                    on:name-change={(e) => {
                                                        const { newName } = e.detail;
                                                        let oldConfigName = config.name;
                                                        let newConfig = {
                                                            ...config,
                                                            name: newName
                                                        };
                                                        configManager?.saveConfig(newConfig, false);
                                                        submitAnalytics({
                                                            eventName: "Profile Cloud",
                                                            payload: {
                                                                task: "Edit name",
                                                                oldConfigName,
                                                                newProfileName: newName
                                                            }
                                                        });
                                                    }}
                                                    on:overwrite-profile={() => {
                                                        overwriteConfigWithEditorConfig(config);
                                                    }}
                                                    isSelected={index === selectedConfigIndex}
                                                    data={{
                                                        ...config,
                                                        selectedComponentTypes:
                                                            selectedComponentTypes
                                                    }}
                                                >
                                                    <svelte:fragment slot="link-button">
                                                        <button
                                                            class="relative group flex"
                                                            on:click|stopPropagation={() => {
                                                                createCloudConfigLink(config);
                                                                provideSelectedConfigForEditor({});
                                                                submitAnalytics({
                                                                    eventName: "Profile Link",
                                                                    payload: {
                                                                        task: "Create",
                                                                        profileName: config.name
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
                                                            {#if linkFlag == config.id}
                                                                <div
                                                                    transition:fade={{
                                                                        duration: 100
                                                                    }}
                                                                    class="block font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-emerald-700 rounded-lg px-2 py-0.5"
                                                                >
                                                                    Copied to clipboard!
                                                                </div>
                                                            {/if}
                                                        </button>
                                                    </svelte:fragment>
                                                    <svelte:fragment slot="sync-config-button">
                                                        {#if config.syncStatus != "synced" || !config.isEditable}
                                                            <button
                                                                on:click|stopPropagation={async () => {
                                                                    if (
                                                                        config.isEditable &&
                                                                        config.syncStatus ===
                                                                            "local" &&
                                                                        !$userAccountService.account
                                                                    ) {
                                                                        loginToProfileCloud();
                                                                        return;
                                                                    }
                                                                    configManager?.saveConfig(
                                                                        config,
                                                                        true
                                                                    );
                                                                    provideSelectedConfigForEditor(
                                                                        {}
                                                                    );
                                                                    submitAnalytics({
                                                                        eventName: "Profile Cloud",
                                                                        payload: {
                                                                            task: "Sync config",
                                                                            profileName: config.name
                                                                        }
                                                                    });
                                                                }}
                                                                class="flex items-center group relative"
                                                            >
                                                                <SvgIcon
                                                                    class="w-4"
                                                                    iconPath={!config.isEditable
                                                                        ? "import"
                                                                        : config.syncStatus ===
                                                                          "cloud"
                                                                        ? "download_from_cloud"
                                                                        : "move_to_cloud_02"}
                                                                />
                                                                <div
                                                                    class="group-hover:block hidden font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
                                                                >
                                                                    {!config.isEditable
                                                                        ? "Import"
                                                                        : config.syncStatus ===
                                                                          "cloud"
                                                                        ? "Download"
                                                                        : "Upload"}
                                                                </div>
                                                            </button>
                                                        {/if}
                                                    </svelte:fragment>
                                                    <svelte:fragment slot="split-config-button">
                                                        {#if config.configType === "profile"}
                                                            <button
                                                                on:click|stopPropagation={async () => {
                                                                    splitConfig(config);
                                                                    configTypeSelector = "preset";
                                                                    submitAnalytics({
                                                                        eventName: "Profile Cloud",
                                                                        payload: {
                                                                            task: "Split config",
                                                                            profileName: config.name
                                                                        }
                                                                    });
                                                                }}
                                                                class="flex items-center group relative"
                                                            >
                                                                <SvgIcon
                                                                    class="w-4"
                                                                    iconPath="split_config"
                                                                />
                                                                <div
                                                                    class="group-hover:block hidden font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
                                                                >
                                                                    Split
                                                                </div>
                                                            </button>
                                                        {/if}
                                                    </svelte:fragment>
                                                    <span slot="toggle-accessibility">
                                                        <ToggleSwitch
                                                            checkbox={config.public}
                                                            on:toggle={(e) => {
                                                                submitAnalytics({
                                                                    eventName: "Profile Cloud",
                                                                    payload: {
                                                                        task: "Set visibility",
                                                                        profileName: config.name,
                                                                        visibility: e.detail
                                                                    }
                                                                });
                                                                configManager?.changeCloudVisibility(
                                                                    config,
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
                                                </ConfigCard>
                                            </div>
                                        {/each}
                                    </div>
                                    <div>
                                        {#if $userAccountService.account}
                                            <div
                                                class="{!usernameInput.exists
                                                    ? 'pb-2'
                                                    : ''} flex items-center justify-between"
                                            >
                                                <div
                                                    class="group w-full flex flex-col text-left py-4"
                                                >
                                                    {#if usernameInput.exists == false}
                                                        <div class="pb-2">
                                                            Before using the cloud, enter a username
                                                            which will be displayed with your public
                                                            profiles.
                                                        </div>
                                                    {:else}
                                                        <div>
                                                            Profile Cloud - {usernameInput.element
                                                                ?.value}
                                                        </div>
                                                    {/if}
                                                    <div
                                                        class="group-hover:block font-medium hidden absolute mt-7 bottom-2 left-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
                                                    >
                                                        {PUBLIC_APP_ENV} - {PUBLIC_VERSION_STRING}
                                                    </div>
                                                    <div class="flex items-center">
                                                        <input
                                                            id="display-name"
                                                            bind:this={usernameInput.element}
                                                            on:input={(event) => {
                                                                checkIfUsernameAvailable(
                                                                    event.target?.value
                                                                );
                                                            }}
                                                            on:keydown={(event) => {
                                                                if (event.key == "Enter") {
                                                                    usernameInput.active = false;
                                                                    setUserName(
                                                                        usernameInput.element?.value
                                                                    );
                                                                    submitAnalytics({
                                                                        eventName: "Set Username",
                                                                        payload: {
                                                                            handler: "Enter key",
                                                                            username:
                                                                                usernameInput
                                                                                    .element?.value
                                                                        }
                                                                    });
                                                                }
                                                            }}
                                                            readonly={usernameInput.exists}
                                                            placeholder="Username"
                                                            class="{!usernameInput.exists
                                                                ? 'border-amber-500 focus:border-emerald-500 animate-pulse dark:bg-secondary focus:animate-none'
                                                                : 'border-transparent bg-transparent text-white text-opacity-80 hidden'}  w-full border focus:outline-none"
                                                            value={usernameInput.element?.value ||
                                                                ""}
                                                        />
                                                        {#if usernameInput.exists == false}
                                                            <button
                                                                on:click={() => {
                                                                    usernameInput.active = false;
                                                                    setUserName(
                                                                        usernameInput.element?.value
                                                                    );
                                                                    submitAnalytics({
                                                                        eventName: "Set Username",
                                                                        payload: {
                                                                            handler: "Button",
                                                                            username:
                                                                                usernameInput
                                                                                    .element?.value
                                                                        }
                                                                    });
                                                                }}
                                                                class="mx-2 relative group"
                                                            >
                                                                <SvgIcon
                                                                    iconPath={"save_as_02"}
                                                                    class="w-5"
                                                                />
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
                                                            {usernameSelectionFeedback(
                                                                usernameInput
                                                            )}
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
                            </Pane>
                        </Splitpanes>
                    </div>
                {/if}
            {:else}
                <div class="flex-col py-4 h-full">
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
                            <div class="flex flex-col gap-1 px-3 pt-3">
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
                                            on:click={() => (searchbarValue = "")}
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
                                        on:keyup={() => updateSearchFilter()}
                                        on:input={() => updateSearchFilter()}
                                        on:change={() => updateSearchFilter()}
                                        class="w-full py-2 px-12 bg-white dark:bg-primary-700
							dark:placeholder-gray-400 text-md focus:outline-none"
                                        placeholder="Find Profile..."
                                    />
                                </div>

                                <div class="flex flex-row gap-1 py-1 flex-wrap">
                                    {#each searchSuggestions as suggestion}
                                        <button
                                            on:click={() => useSearchSuggestion(suggestion)}
                                            class="border hover:border-primary-500 text-xs dark:text-primary-100 rounded-md
							py-0.5 px-1 h-min {searchbarValue.toLowerCase() == suggestion.toLowerCase()
                                                ? 'border-primary-100'
                                                : 'border-primary-700'}"
                                        >
                                            {suggestion}
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
                                    }}
                                    name="sorting select"
                                >
                                    <option
                                        class="text-white bg-secondary py-1 border-none"
                                        value="date"
                                    >
                                        date
                                    </option>
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
                        {#each filteredConfigs as config, index (config.id)}
                            <ConfigCard
                                on:click={() => {
                                    selectedConfigIndex = index;
                                }}
                                isSelected={index === selectedConfigIndex}
                                data={{
                                    ...config,
                                    selectedComponentTypes: selectedComponentTypes
                                }}
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
