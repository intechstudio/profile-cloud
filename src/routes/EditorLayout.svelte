<script lang="ts">
    import { tooltip } from "./../lib/actions/tooltip.ts";
    import ConfigurationSave, { ConfigurationSaveType } from "./ConfigurationSave.svelte";
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
    import ConfigCardEditor from "./ConfigCardEditor.svelte";
    import { submitAnalytics } from "./analytics";
    import UserLogin from "./UserLogin.svelte";

    import { loginToProfileCloud } from "./user_account";
    import Filter from "./Filter.svelte";
    import ConfigCardDisplay from "./ConfigCardDisplay.svelte";
    import { Pane, Splitpanes } from "svelte-splitpanes";
    import Accordion from "$lib/components/accordion/Accordion.svelte";
    import AccordionItem from "$lib/components/accordion/AccordionItem.svelte";
    import configuration from "../../Configuration.json";

    let selectedConfigId: string | undefined = undefined;
    let selectedConfigIndex: number;

    let configManager: ConfigManager | undefined = undefined;
    let configs: Config[] = [];
    let filteredConfigs: Config[] = [];
    let isFiltering: boolean = false;

    let linkFlag: string | undefined = undefined;

    let filter: Filter;

    let usernameInput = {
        element: null as HTMLInputElement | null,
        exists: false,
        valid: false,
        active: false
    };

    let selectedComponentTypes: string[] = [];

    let configTypeSelector: "profile" | "preset" = "profile";

    let isSearchSortingShows = true;
    let configurationSaveVisible = false;

    let accordionKey: string | undefined = "my_configs";

    function updateFontSize(size: string) {
        const main = document.querySelector("#main") as HTMLElement;
        if (!main) {
            console.error("Element with id 'main' not found.");
            return;
        }

        main.style.fontSize = size;
    }

    async function editorMessageListener(event: MessageEvent) {
        if (event.data.messageType == "updateFontSize") {
            updateFontSize(event.data.fontSize);
        }
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
                    eventName: "Cloud Action",
                    payload: {
                        click: "Config Link Import"
                    }
                });
                configTypeSelector = linkedConfig?.configType;
            }
        }

        if (event.data.messageType == "selectedComponentTypes") {
            selectedComponentTypes = event.data.selectedComponentTypes;
        }
    }

    async function provideSelectedConfigForEditor(config?: Config | undefined) {
        await parentIframeCommunication({
            windowPostMessageName: "provideSelectedConfigForEditor",
            dataForParent: { config: config ?? undefined }
        });
    }

    async function createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor(
        type: "profile" | "preset",
        name: string
    ) {
        const configResponse = await parentIframeCommunication({
            windowPostMessageName: "getCurrenConfigurationFromEditor",
            dataForParent: { configType: type }
        });
        configResponse.data.name = name;
        if (configResponse.ok) {
            configManager
                ?.saveConfig(BaseConfigSchema.parse(configResponse.data), true)
                .then(() => {
                    filter.reset();
                });
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
        const configCloudId = configManager?.getConfigCloudId(config);
        if (!configCloudId) {
            parentIframeCommunication({
                windowPostMessageName: "sendLogMessage",
                dataForParent: {
                    type: "fail",
                    message: `Upload config before linking!`
                }
            });
            return;
        }
        const configLinkUrl =
            `${configuration.DEEPLINK_PROTOCOL_NAME}://?config-link=` + configCloudId;

        await parentIframeCommunication({
            windowPostMessageName: "createCloudConfigLink",
            dataForParent: { configLinkUrl }
        })
            .then((res) => {
                linkFlag = config.id;
                setTimeout(() => {
                    linkFlag = undefined;
                }, 1750);
            })
            .catch((e) => {
                parentIframeCommunication({
                    windowPostMessageName: "sendLogMessage",
                    dataForParent: {
                        type: "fail",
                        message: `Config link creation failed. ${e.data}`
                    }
                });
            });
    }

    async function overwriteConfigWithEditorConfig(config: Config) {
        const configResponse = await parentIframeCommunication({
            windowPostMessageName: "getCurrenConfigurationFromEditor",
            dataForParent: { configType: config.configType }
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

    function getConfigCategory(config: any): string {
        var isMyConfig =
            config.syncStatus == "local" || config.owner === configManager?.getCurrentOwnerId();
        var isOfficialConfig = configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(
            config.owner ?? ""
        );

        if (isMyConfig) {
            return "my_configs";
        } else if (!isMyConfig && isOfficialConfig) {
            return isFiltering ? "other_configs" : "recommended_configs";
        } else {
            return "other_configs";
        }
    }

    function handleFilter(e: any) {
        const { configs } = e.detail;
        filteredConfigs = configs;
        isFiltering = e.detail.isFiltering;
        selectedConfigIndex = filteredConfigs.findIndex((e) => e.id === selectedConfigId);

        let category = undefined;
        if (filteredConfigs.length > 0) {
            if (selectedConfigIndex == -1) {
                selectedConfigIndex = 0;
                selectedConfigId = filteredConfigs[0].id;
                category = getConfigCategory(filteredConfigs[0]);
            } else {
                const config = filteredConfigs.find((e) => e.id === selectedConfigId);
                category = getConfigCategory(config);
            }
        } else {
            selectedConfigId = undefined;
        }
        accordionKey = category;
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

    function handleConfigurationSaverCloseClicked() {
        configurationSaveVisible = false;
    }

    function handleConfigurationSaverSaveClicked(e: any) {
        const { type, name } = e.detail;
        switch (type) {
            case ConfigurationSaveType.ELEMENT: {
                createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor("preset", name);
                break;
            }
            case ConfigurationSaveType.MODULE: {
                createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor("profile", name);
                break;
            }
        }

        provideSelectedConfigForEditor(undefined);
        submitAnalytics({
            eventName: "Local Config",
            payload: {
                task: "Save config"
            }
        });
    }

    function handleOpenconfigurationSave() {
        provideSelectedConfigForEditor(undefined);
        configurationSaveVisible = true;
    }
</script>

<div id="main" class="flex flex-grow h-screen relative z-0 overflow-hidden">
    <div class="flex flex-col gap-2 h-full w-full">
        <div class="px-4 pt-4">
            {#if configurationSaveVisible}
                <div class="pb-[7px]">
                    <ConfigurationSave
                        data={selectedComponentTypes}
                        on:close={handleConfigurationSaverCloseClicked}
                        on:save={handleConfigurationSaverSaveClicked}
                    />
                </div>
            {:else}
                <Filter
                    bind:this={filter}
                    visible={isSearchSortingShows}
                    {configs}
                    on:filter={handleFilter}
                    display={"editor"}
                >
                    <button
                        class="text-2xl px-8 dark:bg-primary-700 dark:hover:bg-secondary"
                        on:click={handleOpenconfigurationSave}
                    >
                        +
                    </button>
                </Filter>
            {/if}
        </div>

        <div
            class="overflow-hidden flex flex-col h-full relative"
            class:opacity-75={configurationSaveVisible}
        >
            <Splitpanes
                horizontal={true}
                theme="modern-theme"
                pushOtherPanes={false}
                class="h-full w-full"
            >
                <Pane size={60}>
                    <div class="h-full flex-grow overflow-hidden pb-3 px-4">
                        <Accordion bind:key={accordionKey}>
                            {#each isFiltering ? ["my_configs", "other_configs"] : ["my_configs", "recommended_configs", "community_configs"] as configType}
                                {@const categoryList = filteredConfigs.filter((e) => {
                                    var isMyConfig =
                                        e.syncStatus == "local" ||
                                        e.owner === configManager?.getCurrentOwnerId();
                                    var isOfficialConfig =
                                        configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(
                                            e.owner ?? ""
                                        );
                                    switch (configType) {
                                        case "my_configs":
                                            return isMyConfig;
                                        case "other_configs":
                                            return !isMyConfig;
                                        case "recommended_configs":
                                            return !isMyConfig && isOfficialConfig;
                                        default:
                                            return !isMyConfig && !isOfficialConfig;
                                    }
                                })}
                                <AccordionItem key={configType}>
                                    <div slot="header" class="pb-1">
                                        {#if configType === "my_configs"}
                                            <p>My configs ({categoryList.length})</p>
                                        {:else if configType === "other_configs"}
                                            <p>Other configs ({categoryList.length})</p>
                                        {:else if configType === "recommended_configs"}
                                            <p>Recommended configs ({categoryList.length})</p>
                                        {:else if configType === "community_configs"}
                                            <p>Community configs ({categoryList.length})</p>
                                        {/if}
                                    </div>
                                    <svelte:fragment slot="body">
                                        {#each categoryList as config, index (config.id)}
                                            <div class="py-1">
                                                <ConfigCardEditor
                                                    on:click={() => {
                                                        provideSelectedConfigForEditor(config);
                                                        selectedConfigId = config.id;
                                                        selectedConfigIndex =
                                                            filteredConfigs.findIndex(
                                                                (e) => e.id === selectedConfigId
                                                            );
                                                    }}
                                                    data={{
                                                        ...config,
                                                        selectedComponentTypes:
                                                            selectedComponentTypes
                                                    }}
                                                    isSelected={config.id === selectedConfigId}
                                                />
                                            </div>
                                        {/each}
                                    </svelte:fragment>
                                </AccordionItem>
                            {/each}
                        </Accordion>
                    </div></Pane
                >
                <Pane size={40}>
                    <div class="grid grid-rows-[1fr_auto] h-full w-full">
                        <ConfigCardDisplay
                            on:delete-config={async () => {
                                const config = filteredConfigs[selectedConfigIndex];
                                selectedConfigIndex = -1;
                                selectedConfigId = undefined;
                                configManager?.deleteConfig(config);
                                provideSelectedConfigForEditor(undefined);
                                submitAnalytics({
                                    eventName: "Cloud Action",
                                    payload: {
                                        click: "Config delete"
                                    }
                                });
                            }}
                            on:description-change={(e) => {
                                const { newDescription } = e.detail;
                                const config = filteredConfigs[selectedConfigIndex];
                                let oldDescription = config.description;
                                let newConfig = {
                                    ...config,
                                    description: newDescription
                                };
                                configManager?.saveConfig(newConfig, false);
                                submitAnalytics({
                                    eventName: "Cloud Action",
                                    payload: {
                                        click: "Edit config description"
                                    }
                                });
                            }}
                            on:name-change={(e) => {
                                const { newName } = e.detail;
                                const config = filteredConfigs[selectedConfigIndex];
                                let oldConfigName = config.name;
                                let newConfig = {
                                    ...config,
                                    name: newName
                                };
                                configManager?.saveConfig(newConfig, false);
                                submitAnalytics({
                                    eventName: "Cloud Action",
                                    payload: {
                                        click: "Edit config name"
                                    }
                                });
                            }}
                            on:overwrite-profile={() => {
                                const config = filteredConfigs[selectedConfigIndex];
                                overwriteConfigWithEditorConfig(config);
                            }}
                            data={{
                                selectedConfig: filteredConfigs[selectedConfigIndex],
                                selectedComponentTypes: selectedComponentTypes
                            }}
                        >
                            <svelte:fragment slot="link-button">
                                {@const config = filteredConfigs[selectedConfigIndex]}
                                {#if config?.syncStatus != "local"}
                                    <button
                                        class="relative group flex"
                                        on:click|stopPropagation={() => {
                                            createCloudConfigLink(config);
                                            provideSelectedConfigForEditor(undefined);
                                            submitAnalytics({
                                                eventName: "Cloud Action",
                                                payload: {
                                                    click: "Create config link"
                                                }
                                            });
                                        }}
                                        use:tooltip={{
                                            nowrap: true,
                                            placement: "bottom",
                                            duration: 75,
                                            instant: true,
                                            class: "px-2 py-1",
                                            text: "Link"
                                        }}
                                    >
                                        <SvgIcon class="w-4" iconPath="link" />
                                        {#if linkFlag == config?.id}
                                            <div
                                                transition:fade|global={{
                                                    duration: 100
                                                }}
                                                class="block font-medium absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-emerald-700 rounded-lg px-2 py-0.5"
                                            >
                                                Copied to clipboard!
                                            </div>
                                        {/if}
                                    </button>
                                {/if}
                            </svelte:fragment>
                            <svelte:fragment slot="sync-config-button">
                                {@const config = filteredConfigs[selectedConfigIndex]}
                                {#if config?.syncStatus != "synced" || !config?.isEditable}
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
                                            provideSelectedConfigForEditor(undefined);
                                            submitAnalytics({
                                                eventName: "Cloud Action",
                                                payload: {
                                                    click: "Sync config"
                                                }
                                            });
                                        }}
                                        class="flex items-center group relative"
                                        use:tooltip={{
                                            nowrap: true,
                                            placement: "bottom",
                                            duration: 75,
                                            instant: true,
                                            class: "px-2 py-1",
                                            text: !config?.isEditable
                                                ? "Import"
                                                : config.syncStatus === "cloud"
                                                ? "Download"
                                                : "Upload"
                                        }}
                                    >
                                        <SvgIcon
                                            class={!config?.isEditable ? "w-4" : "w-5 -m-0.5"}
                                            iconPath={!config?.isEditable
                                                ? "import"
                                                : config.syncStatus === "cloud"
                                                ? "download_from_cloud"
                                                : "move_to_cloud_02"}
                                        />
                                    </button>
                                {/if}
                            </svelte:fragment>
                            <svelte:fragment slot="split-config-button">
                                {@const config = filteredConfigs[selectedConfigIndex]}
                                {#if config?.configType === "profile"}
                                    <button
                                        on:click|stopPropagation={async () => {
                                            splitConfig(config);
                                            configTypeSelector = "preset";
                                            submitAnalytics({
                                                eventName: "Cloud Action",
                                                payload: {
                                                    click: "Split config"
                                                }
                                            });
                                        }}
                                        class="flex items-center group relative"
                                        use:tooltip={{
                                            nowrap: true,
                                            placement: "bottom",
                                            duration: 75,
                                            instant: true,
                                            class: "px-2 py-1",
                                            text: "Split"
                                        }}
                                    >
                                        <SvgIcon class="w-5 -m-0.5" iconPath="split_config" />
                                    </button>
                                {/if}
                            </svelte:fragment>
                            <span slot="toggle-accessibility">
                                {@const config = filteredConfigs[selectedConfigIndex]}
                                <ToggleSwitch
                                    checkbox={config?.public}
                                    on:toggle={(e) => {
                                        submitAnalytics({
                                            eventName: "Cloud Action",
                                            payload: {
                                                click: "Set config visibility"
                                            }
                                        });
                                        configManager?.changeCloudVisibility(config, e.detail);
                                    }}
                                >
                                    <div
                                        class="relative group"
                                        slot="on"
                                        use:tooltip={{
                                            nowrap: true,
                                            placement: "bottom",
                                            duration: 75,
                                            instant: true,
                                            class: "px-2 py-1",
                                            text: "Public"
                                        }}
                                    >
                                        <SvgIcon display={true} iconPath={"public"} class="mr-1" />
                                    </div>
                                    <div
                                        class="relative group"
                                        slot="off"
                                        use:tooltip={{
                                            nowrap: true,
                                            placement: "bottom",
                                            duration: 75,
                                            instant: true,
                                            class: "px-2 py-1",
                                            text: "Private"
                                        }}
                                    >
                                        <SvgIcon
                                            display={true}
                                            iconPath={"private"}
                                            class="mr-1 text-opacity-70"
                                        />
                                    </div>
                                </ToggleSwitch>
                            </span>
                        </ConfigCardDisplay>

                        <div class="px-4 pb-4">
                            <UserLogin {usernameInput} />
                        </div>
                    </div>
                </Pane>
            </Splitpanes>
            {#if configurationSaveVisible}
                <div
                    class="pointer-events-auto absolute w-full h-full z-[2] bg-black bg-opacity-30"
                />
            {/if}
        </div>
    </div>
</div>
