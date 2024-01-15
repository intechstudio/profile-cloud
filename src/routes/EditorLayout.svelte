<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { userAccountService } from "$lib/stores";
    import { doc, setDoc } from "firebase/firestore";
    import { configLinksCollection } from "$lib/collections";
    import SvgIcon from "$lib/icons/SvgIcon.svelte";
    import { get } from "svelte/store";
    import { type Config, LocalConfigSchema, BaseConfigSchema } from "$lib/schemas";
    import type { CloudConfig } from "$lib/schemas";
    import { fade, slide } from "svelte/transition";
    import ToggleSwitch from "$lib/components/atomic/ToggleSwitch.svelte";
    import { parentIframeCommunication } from "$lib/utils";
    import {
        updateLocalConfigs,
        type ConfigManager,
        createConfigManager
    } from "$lib/configmanager/ConfigManager";
    import ConfigCard from "./ConfigCard.svelte";
    import { submitAnalytics } from "./analytics";
    import UserLogin from "./UserLogin.svelte";

    import { loginToProfileCloud } from "./user_account";
    import Filter from "./Filter.svelte";

    let selectedConfigIndex: number | undefined = undefined;

    let configManager: ConfigManager | undefined = undefined;
    let configs: Config[] = [];
    let filteredConfigs: Config[] = [];

    let linkFlag: string | undefined = undefined;

    let filter: Filter;

    let usernameInput = {
        element: null as HTMLInputElement | null,
        exists: false,
        valid: false,
        active: false
    };

    let selectedComponentTypes: string[] = [];

    let configTypeSelector = "profile";

    let isSearchSortingShows = false;

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

    async function createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor(
        type: "profile" | "preset"
    ) {
        const configResponse = await parentIframeCommunication({
            windowPostMessageName: "getCurrenConfigurationFromEditor",
            dataForParent: { configType: type }
        });
        if (configResponse.ok) {
            filter.reset();
            configManager?.saveConfig(BaseConfigSchema.parse(configResponse.data), true);
        }
    }

    function splitConfig(config: Config) {
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

    function handleFilter(e: any) {
        const { configs } = e.detail;
        filteredConfigs = configs;
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
    });

    onDestroy(() => {
        window.removeEventListener("message", editorMessageListener);
        configManager?.cancel();
        configManager = undefined;
    });
</script>

<div class="flex flex-grow h-screen relative z-0 overflow-hidden">
    <div class="flex flex-col pb-4 h-full">
        <div class="py-4 flex items-center justify-between">
            <div class="flex flex-col">
                <div>Profile Cloud</div>
                <div class="text-white text-opacity-60">
                    Public Profiles and Presets from others, save yours as private or public here.
                </div>
            </div>
            <button
                on:click={() => {
                    createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor("preset");
                    provideSelectedConfigForEditor({});
                    submitAnalytics({
                        eventName: "Local Config",
                        payload: {
                            task: "Save config"
                        }
                    });
                }}
                class="rounded px-4 py-1 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-medium"
                >Save Preset</button
            >
            <button
                on:click={() => {
                    createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor("profile");
                    provideSelectedConfigForEditor({});
                    submitAnalytics({
                        eventName: "Local Config",
                        payload: {
                            task: "Save config"
                        }
                    });
                }}
                class="rounded px-4 py-1 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-medium"
                >Save Profile</button
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

        <Filter
            bind:this={filter}
            visible={isSearchSortingShows}
            {configs}
            on:filter={handleFilter}
            class="pb-3"
            display={"editor"}
        />
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
                            selectedComponentTypes: selectedComponentTypes
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
                                            config.syncStatus === "local" &&
                                            !$userAccountService.account
                                        ) {
                                            loginToProfileCloud();
                                            return;
                                        }
                                        let configToSave = config;
                                        console.log("TEST", {
                                            configToSave
                                        });
                                        if (!configToSave.isEditable) {
                                            configToSave = {
                                                ...configToSave,
                                                name: `Copy of ${configToSave.name}`,
                                                owner: undefined,
                                                id: ""
                                            };
                                            console.log({
                                                configToSave
                                            });
                                        }
                                        configManager?.saveConfig(configToSave, true);
                                        provideSelectedConfigForEditor({});
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
                                        class={!config.isEditable ? "w-4" : "w-5 -m-0.5"}
                                        iconPath={!config.isEditable
                                            ? "import"
                                            : config.syncStatus === "cloud"
                                            ? "download_from_cloud"
                                            : "move_to_cloud_02"}
                                    />
                                    <div
                                        class="group-hover:block hidden font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
                                    >
                                        {!config.isEditable
                                            ? "Import"
                                            : config.syncStatus === "cloud"
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
                                    <SvgIcon class="w-5 -m-0.5" iconPath="split_config" />
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
                                    configManager?.changeCloudVisibility(config, e.detail);
                                }}
                            >
                                <div class="relative group" slot="on">
                                    <SvgIcon display={true} iconPath={"public"} class="mr-1" />
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
        <UserLogin {usernameInput} />
    </div>
</div>

<style>
</style>
