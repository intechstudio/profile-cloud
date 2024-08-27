<script lang="ts">
    import { selected_config, tree_key } from "./EditorLayout.ts";
    import { get } from "svelte/store";
    import ConfigTree, { type TreeNode } from "../lib/components/tree/ConfigTree.svelte";
    import { tooltip } from "./../lib/actions/tooltip.ts";
    import ConfigurationSave, { ConfigurationSaveType } from "./ConfigurationSave.svelte";
    import { onDestroy, onMount, tick } from "svelte";
    import { userAccountService } from "$lib/stores";
    import SvgIcon from "$lib/icons/SvgIcon.svelte";
    import { type Config, LocalConfigSchema, BaseConfigSchema } from "$lib/schemas";
    import { fade } from "svelte/transition";
    import ToggleSwitch from "$lib/components/atomic/ToggleSwitch.svelte";
    import { parentIframeCommunication } from "$lib/utils";
    import {
        updateLocalConfigs,
        type ConfigManager,
        createConfigManager
    } from "$lib/configmanager/ConfigManager";
    import { submitAnalytics } from "./analytics";
    import UserLogin from "./UserLogin.svelte";

    import { loginToProfileCloud } from "./user_account";
    import Filter from "./Filter.svelte";
    import ConfigCardDisplay from "./ConfigCardDisplay.svelte";
    import { Pane, Splitpanes } from "svelte-splitpanes";
    import configuration from "../../Configuration.json";
    import { MeltCheckbox } from "@intechstudio/grid-uikit";
    import { compatible_config_types } from "./EditorLayout";

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

    let showSupportedOnly = false;

    let isSearchSortingShows = true;
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
                const linkedConfig = await configManager?.importLinkedConfig(
                    event.data.configLinkId
                );

                if (linkedConfig) {
                    submitAnalytics({
                        eventName: "Cloud Action",
                        payload: {
                            click: "Config Link Import"
                        }
                    });
                    configTypeSelector = linkedConfig?.configType;
                }
                break;
            }

            case "selectedComponentTypes": {
                selectedComponentTypes = event.data.selectedComponentTypes;
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
            configManager?.saveConfig(config, true).then(() => {
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

    async function scrollToSelectedConfig() {
        await tick();
        const target = document.getElementById($selected_config as string);
        if (!target) {
            return;
        }
        target.scrollIntoView({
            behavior: "smooth"
        });
    }

    $: if (filteredConfigs) {
        scrollToSelectedConfig();
    }

    let treeData: TreeNode;

    function createTree(configs: any, showSupportedOnly: boolean, isFiltering: boolean) {
        const [
            my_configs,
            recommended_configs,
            community_configs,
            other_configs,
            unsupported_configs
        ]: TreeNode[] = [
            {
                label: "My Configs",
                children: configs.filter((e: Config) => {
                    const isMyConfig =
                        e.syncStatus == "local" || e.owner === configManager?.getCurrentOwnerId();
                    return isMyConfig;
                }),
                open: false
            },
            {
                label: "Recommended Configs",
                children: configs.filter((e: Config) => {
                    const isMyConfig =
                        e.syncStatus == "local" || e.owner === configManager?.getCurrentOwnerId();
                    const isOfficialConfig = configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(
                        e.owner ?? ""
                    );

                    const cct = get(compatible_config_types);

                    return (
                        !isMyConfig &&
                        isOfficialConfig &&
                        (!showSupportedOnly || cct.includes(e.type))
                    );
                }),
                open: false
            },
            {
                label: "Community Configs",
                children: configs.filter((e: Config) => {
                    const isMyConfig =
                        e.syncStatus == "local" || e.owner === configManager?.getCurrentOwnerId();
                    const isOfficialConfig = configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(
                        e.owner ?? ""
                    );
                    const cct = get(compatible_config_types);
                    return (
                        !isMyConfig &&
                        !isOfficialConfig &&
                        (!showSupportedOnly || cct.includes(e.type))
                    );
                }),
                open: false
            },
            {
                label: "Other Configs",
                children: configs.filter((e: Config) => {
                    const isMyConfig =
                        e.syncStatus == "local" || e.owner === configManager?.getCurrentOwnerId();
                    const cct = get(compatible_config_types);
                    return !isMyConfig && (!showSupportedOnly || cct.includes(e.type));
                }),
                open: false
            },
            {
                label: "Unsupported Configs",
                children: configs.filter((e: Config) => {
                    const isMyConfig =
                        e.syncStatus == "local" || e.owner === configManager?.getCurrentOwnerId();
                    const cct = get(compatible_config_types);

                    return !isMyConfig && showSupportedOnly && !cct.includes(e.type);
                }),
                open: false
            }
        ];

        let data: TreeNode = {
            label: "root",
            children: [my_configs],
            open: true
        };

        if (isFiltering) {
            data.children.push(other_configs);
        } else {
            data.children.push(recommended_configs, community_configs);
        }

        if (showSupportedOnly) {
            data.children.push(unsupported_configs);
        }

        data.children.forEach((category) => {
            for (const child of category.children) {
                const path = child.virtualPath;
                if (typeof path !== "undefined") {
                    const parts = path.split("/");
                    let node = category;
                    for (let i = 0; i < parts.length; ++i) {
                        const part = parts[i];
                        const found = node.children.find((e: any) => e.label === part);
                        if (found) {
                            node = found;
                        } else {
                            const newNode = {
                                label: part,
                                children: [],
                                open: false
                            };
                            node.children.push(newNode);
                            node = newNode;
                        }
                    }
                    node.children.push(child);
                }
            }

            category.children = category.children.filter((e: any) => {
                return typeof e.virtualPath === "undefined";
            });
        });

        return data;
    }

    function getTreeKey(node: TreeNode, id: string): string | undefined {
        const findParentLabel = (node: TreeNode): string | undefined => {
            for (let child of node.children) {
                // Check if the child matches the id
                if (child.id === id) {
                    return node.label; // Return the parent's label
                }
                // If the child has children, search recursively
                if (child.children && child.children.length > 0) {
                    const found = findParentLabel(child);
                    if (found) {
                        return found; // Propagate the found label upwards
                    }
                }
            }
            return undefined; // No match found
        };

        return findParentLabel(node);
    }

    function handleFilter(e: any) {
        const { configs } = e.detail;
        filteredConfigs = configs;
        isFiltering = e.detail.isFiltering;

        const selectedConfig = filteredConfigs.find((e) => e.id === $selected_config);
        if (typeof selectedConfig === "undefined" && filteredConfigs.length > 0) {
            selected_config.set(filteredConfigs[0]?.id);
        } else if (filteredConfigs.length === 0) {
            selected_config.set(undefined);
        }
    }

    $: {
        treeData = createTree(filteredConfigs, showSupportedOnly, isFiltering);
        const selected = $selected_config;
        if (typeof selected !== "undefined") {
            const key = getTreeKey(treeData, selected);
            tree_key.set(key);
        }
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

    function handleConfigurationSelected(e: any) {
        const { config } = e.detail;

        provideSelectedConfigForEditor(config);
        selected_config.set(config.id);
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
                <MeltCheckbox bind:target={showSupportedOnly} title="Only show supported" />
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
                        <ConfigTree data={treeData} on:select={handleConfigurationSelected} />
                    </div></Pane
                >
                <Pane size={40}>
                    <div class="grid grid-rows-[1fr_auto] h-full w-full">
                        <ConfigCardDisplay
                            on:delete-config={async () => {
                                const config = filteredConfigs.find(
                                    (e) => e.id === $selected_config
                                );
                                configManager?.deleteConfig(config);

                                const index =
                                    filteredConfigs.length > 0
                                        ? Math.max(
                                              filteredConfigs.findIndex(
                                                  (e) => e.id === $selected_config
                                              ) - 1,
                                              0
                                          )
                                        : -1;
                                $selected_config = filteredConfigs[index]?.id;
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
                                const config = filteredConfigs.find(
                                    (e) => e.id === $selected_config
                                );
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
                                const { value } = e.detail;
                                const config = filteredConfigs.find(
                                    (e) => e.id === $selected_config
                                );
                                let oldConfigName = config.name;
                                let newConfig = {
                                    ...config,
                                    name: value
                                };
                                configManager?.saveConfig(newConfig, false);
                                submitAnalytics({
                                    eventName: "Cloud Action",
                                    payload: {
                                        click: "Edit config name"
                                    }
                                });
                            }}
                            on:path-change={(e) => {
                                const { value } = e.detail;
                                const config = filteredConfigs.find(
                                    (e) => e.id === $selected_config
                                );
                                let newConfig = {
                                    ...config,
                                    virtualPath: value
                                };
                                configManager?.saveConfig(newConfig, false);

                                submitAnalytics({
                                    eventName: "Cloud Action",
                                    payload: {
                                        click: "Edit config path"
                                    }
                                });
                            }}
                            on:overwrite-profile={() => {
                                const config = filteredConfigs.find(
                                    (e) => e.id === $selected_config
                                );
                                overwriteConfigWithEditorConfig(config);
                            }}
                            data={{
                                selectedConfig: filteredConfigs.find(
                                    (e) => e.id === $selected_config
                                ),
                                selectedComponentTypes: selectedComponentTypes
                            }}
                        >
                            <svelte:fragment slot="link-button">
                                {@const config = filteredConfigs.find(
                                    (e) => e.id === $selected_config
                                )}
                                {#if config?.syncStatus != "local"}
                                    <button
                                        class="relative group flex"
                                        on:click|stopPropagation={() => {
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
                                {@const config = filteredConfigs.find(
                                    (e) => e.id === $selected_config
                                )}
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
                                {@const config = filteredConfigs.find(
                                    (e) => e.id === $selected_config
                                )}
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
                                {@const config = filteredConfigs.find(
                                    (e) => e.id === $selected_config
                                )}
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
