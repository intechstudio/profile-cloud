<script lang="ts">
    import { grid } from "@intechstudio/grid-protocol";
    import { ModuleType } from "@intechstudio/grid-protocol";
    import { filter_value, FilterValue } from "./Filter";
    import {
        selected_config,
        show_supported_only,
        config_manager,
        selected_component_types,
        type ConfigSelection
    } from "./EditorLayout";
    import { get } from "svelte/store";
    import ConfigTree from "../lib/components/tree/ConfigTree.svelte";
    import { tooltip } from "./../lib/actions/tooltip";
    import ConfigurationSave, { ConfigurationSaveType } from "./ConfigurationSave.svelte";
    import { onDestroy, onMount, tick } from "svelte";
    import { userAccountService } from "$lib/stores";
    import SvgIcon from "$lib/icons/SvgIcon.svelte";
    import { type Config, LocalConfigSchema, BaseConfigSchema } from "$lib/schemas";
    import { fade } from "svelte/transition";
    import ToggleSwitch from "$lib/components/atomic/ToggleSwitch.svelte";
    import { parentIframeCommunication } from "$lib/utils";
    import { createConfigManager, updateLocalConfigs } from "$lib/configmanager/ConfigManager";
    import { submitAnalytics } from "./analytics";
    import UserLogin from "./UserLogin.svelte";

    import { loginToProfileCloud } from "./user_account";
    import Filter from "./Filter.svelte";
    import ConfigCardDisplay from "./ConfigCardDisplay.svelte";
    import { Pane, Splitpanes } from "svelte-splitpanes";
    import configuration from "../../Configuration.json";
    import { MeltCheckbox } from "@intechstudio/grid-uikit";
    import { compatible_config_types } from "./EditorLayout";
    import Sorter from "./Sorter.svelte";

    let configs: Config[] = [];

    let linkFlag: string | undefined = undefined;

    let usernameInput = {
        element: null as HTMLInputElement | null,
        exists: false,
        valid: false,
        active: false
    };

    let configurationSaveVisible = false;

    function updateFontSize(size: string) {
        const main = document.querySelector("#main") as HTMLElement;
        if (!main) {
            console.error("Element with id 'main' not found.");
            return;
        }

        main.style.fontSize = size;
    }

    async function editorMessageListener(event: MessageEvent) {
        switch (event.data.messageType) {
            case "updateFontSize": {
                updateFontSize(event.data.fontSize);
                break;
            }
            case "localConfigs": {
                const localConfigs = (event.data.configs as any[]).map((config) =>
                    LocalConfigSchema.parse(config)
                );
                updateLocalConfigs(localConfigs);
                break;
            }

            case "userAuthentication": {
                userAccountService.authenticateUser(event.data.authEvent);
                break;
            }

            case "configLink": {
                const cm = get(config_manager);
                const linkedConfig = await cm?.importLinkedConfig(event.data.configLinkId);

                if (linkedConfig) {
                    submitAnalytics({
                        eventName: "Cloud Action",
                        payload: {
                            click: "Config Link Import"
                        }
                    });
                }
                break;
            }

            case "selectedComponentTypes": {
                selected_component_types.set(event.data.selectedComponentTypes);
                break;
            }

            case "compatibleTypes": {
                compatible_config_types.set(event.data.compatibleTypes);
                break;
            }
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
            const config = BaseConfigSchema.parse(configResponse.data);
            config.createdAt = new Date();
            const cm = get(config_manager);
            cm?.saveConfig(config, true).then((e) => {
                filter_value.set(new FilterValue());
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

            const cm = get(config_manager);
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
            cm?.saveConfig(BaseConfigSchema.parse(preset), true);
        }
    }

    async function createCloudConfigLink(config: Config) {
        const cm = get(config_manager);
        const configCloudId = cm?.getConfigCloudId(config);
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

        return await parentIframeCommunication({
            windowPostMessageName: "createCloudConfigLink",
            dataForParent: { configLinkUrl }
        });
    }

    async function overwriteConfigWithEditorConfig(config: Config) {
        const configResponse = await parentIframeCommunication({
            windowPostMessageName: "getCurrenConfigurationFromEditor",
            dataForParent: { configType: config.configType }
        });
        if (configResponse.ok) {
            const cm = get(config_manager);
            let editorConfig = BaseConfigSchema.parse(configResponse.data);
            let newConfig = {
                ...config,
                configs: editorConfig.configs,
                type: editorConfig.type,
                version: editorConfig.version,
                configType: editorConfig.configType
            };
            cm?.saveConfig(newConfig, false);
        }
    }

    onMount(async () => {
        config_manager.set(
            createConfigManager({
                next: (newConfigs) => {
                    newConfigs.sort((a, b) => {
                        let ai = configs.findIndex((e) => e.id === a.id);
                        let bi = configs.findIndex((e) => e.id === b.id);
                        return ai - bi;
                    });
                    configs = newConfigs;
                    configs.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
                    selected_config.set({ id: configs[0].id, presetIndex: -1 });
                }
            })
        );
        window.addEventListener("message", editorMessageListener);
    });

    onDestroy(() => {
        const cm = get(config_manager);
        window.removeEventListener("message", editorMessageListener);
        cm?.cancel();
        config_manager.set(undefined);
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

    $: if ($selected_config) {
        handleSelectedConfigurationChange($selected_config);
    }

    function handleSelectedConfigurationChange(value: ConfigSelection) {
        if (value.presetIndex === -1) {
            const config = configs.find((e) => e.id === value.id);
            provideSelectedConfigForEditor(config);
        } else {
            let config = configs.find((e: any) => e.id === value.id);
            let moduleType = ModuleType[config?.type as keyof typeof ModuleType];
            let elements = grid.get_module_element_list(moduleType);

            if (typeof config === "undefined") {
                return;
            }

            const type = elements[value.presetIndex];
            const events: any = config.configs.find(
                (e: any) => e.controlElementNumber === value.presetIndex
            )?.events;

            const preset = {
                ...config,
                type: type,
                configs: events,
                configType: "preset"
            } as Config;

            provideSelectedConfigForEditor(preset);
        }
    }

    async function handleDeleteConfig() {
        const config = configs.find((e) => e.id === $selected_config?.id);

        if (typeof config === "undefined") {
            return;
        }

        const cm = get(config_manager);
        cm?.deleteConfig(config);
        provideSelectedConfigForEditor(undefined);
        submitAnalytics({
            eventName: "Cloud Action",
            payload: {
                click: "Config delete"
            }
        });
    }

    async function handleDescriptionChange(e: any) {
        const { newDescription } = e.detail;
        const config = configs.find((e) => e.id === $selected_config?.id);

        if (typeof config === "undefined") {
            return;
        }

        let oldDescription = config.description;
        let newConfig = {
            ...config,
            description: newDescription
        };
        const cm = get(config_manager);
        cm?.saveConfig(newConfig, false);
        submitAnalytics({
            eventName: "Cloud Action",
            payload: {
                click: "Edit config description"
            }
        });
    }

    async function handleNameChange(e: any) {
        const { value } = e.detail;
        const config = configs.find((e) => e.id === $selected_config?.id);

        if (typeof config === "undefined") {
            return;
        }

        let oldConfigName = config.name;
        let newConfig = {
            ...config,
            name: value
        };
        const cm = get(config_manager);
        cm?.saveConfig(newConfig, false);
        submitAnalytics({
            eventName: "Cloud Action",
            payload: {
                click: "Edit config name"
            }
        });
    }

    async function handlePathChange(e: any) {
        const { value } = e.detail;
        const config = configs.find((e) => e.id === $selected_config?.id);

        if (typeof config === "undefined") {
            return;
        }

        let newConfig = {
            ...config,
            virtualPath: value
        };
        const cm = get(config_manager);
        cm?.saveConfig(newConfig, false);

        submitAnalytics({
            eventName: "Cloud Action",
            payload: {
                click: "Edit config path"
            }
        });
    }

    function handleOverwriteProfile() {
        const config = configs.find((e) => e.id === $selected_config?.id);

        if (typeof config === "undefined") {
            return;
        }

        overwriteConfigWithEditorConfig(config);
    }
</script>

<div id="main" class="flex flex-grow h-screen relative z-0 overflow-hidden">
    <div class="flex flex-col gap-2 h-full w-full">
        <div class="px-4 pt-4">
            {#if configurationSaveVisible}
                <div class="pb-[7px]">
                    <ConfigurationSave
                        data={$selected_component_types}
                        on:close={handleConfigurationSaverCloseClicked}
                        on:save={handleConfigurationSaverSaveClicked}
                    />
                </div>
            {:else}
                <div class="w-full grid grid-cols-1 gap-x-2 gap-y-2 items-center">
                    <div class="flex flex-row w-full gap-2">
                        <Filter />
                        <button
                            class="text-2xl px-8 dark:bg-primary-700 dark:hover:bg-secondary"
                            on:click={handleOpenconfigurationSave}
                        >
                            <span>+</span>
                        </button>
                    </div>
                    <div class="flex flex-grow">
                        <Sorter />
                    </div>
                </div>
                <MeltCheckbox bind:target={$show_supported_only} title="Only show supported" />
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
                    <div class="flex h-full w-full pb-3 px-4">
                        <ConfigTree {configs} />
                    </div></Pane
                >
                <Pane size={40}>
                    <div class="grid grid-rows-[1fr_auto] h-full w-full">
                        <ConfigCardDisplay
                            on:delete-config={handleDeleteConfig}
                            on:description-change={handleDescriptionChange}
                            on:name-change={handleNameChange}
                            on:path-change={handlePathChange}
                            on:overwrite-profile={handleOverwriteProfile}
                            data={configs.find((e) => e.id === $selected_config?.id)}
                        >
                            <svelte:fragment slot="link-button">
                                {@const config = configs.find((e) => e.id === $selected_config?.id)}
                                {#if config?.syncStatus != "local"}
                                    <button
                                        class="relative group flex"
                                        on:click|stopPropagation={() => {
                                            if (typeof config === "undefined") {
                                                return;
                                            }
                                            createCloudConfigLink(config)
                                                .then((res) => {
                                                    linkFlag = config.id;
                                                    setTimeout(() => {
                                                        linkFlag = undefined;
                                                    }, 1750);
                                                    provideSelectedConfigForEditor(undefined);
                                                })
                                                .catch((e) => {
                                                    console.warn(e.data);
                                                    parentIframeCommunication({
                                                        windowPostMessageName: "sendLogMessage",
                                                        dataForParent: {
                                                            type: "fail",
                                                            message: `Import link failed. ${e.data}`
                                                        }
                                                    });
                                                });

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
                                {@const config = configs.find((e) => e.id === $selected_config?.id)}
                                {#if config?.syncStatus != "synced" || !config?.isEditable}
                                    <button
                                        on:click|stopPropagation={async () => {
                                            if (typeof config === "undefined") {
                                                return;
                                            }

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
                                            }
                                            const cm = get(config_manager);
                                            cm?.saveConfig(configToSave, true);
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
                                {@const config = configs.find((e) => e.id === $selected_config?.id)}
                                {#if config?.configType === "profile"}
                                    <button
                                        on:click|stopPropagation={async () => {
                                            splitConfig(config);
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
                                {@const config = configs.find((e) => e.id === $selected_config?.id)}
                                <ToggleSwitch
                                    checkbox={config?.public}
                                    on:toggle={(e) => {
                                        if (typeof config === "undefined") {
                                            return;
                                        }

                                        submitAnalytics({
                                            eventName: "Cloud Action",
                                            payload: {
                                                click: "Set config visibility"
                                            }
                                        });
                                        const cm = get(config_manager);
                                        cm?.changeCloudVisibility(config, e.detail);
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
