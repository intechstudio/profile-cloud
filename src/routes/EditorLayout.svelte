<script lang="ts">
  import { grid } from "@intechstudio/grid-protocol";
  import { ModuleType } from "@intechstudio/grid-protocol";
  import { filter_value, FilterValue } from "./Filter";
  import {
    selected_config,
    show_supported_only,
    config_manager,
    selected_component_types,
  } from "./EditorLayout";
  import { get } from "svelte/store";
  import ConfigTree from "../lib/components/tree/ConfigTree.svelte";
  import { tooltip } from "./../lib/actions/tooltip";
  import ConfigurationSave, {
    ConfigurationSaveType,
  } from "./ConfigurationSave.svelte";
  import { onDestroy, onMount } from "svelte";
  import { userAccountService } from "../lib/stores";
  import { SvgIcon } from "@intechstudio/grid-uikit";
  import {
    type Config,
    LocalConfigSchema,
    BaseConfigSchema,
  } from "../lib/schemas";
  import { fade } from "svelte/transition";
  import ToggleSwitch from "../lib/components/atomic/ToggleSwitch.svelte";
  import { parentIframeCommunication } from "../lib/utils";
  import {
    createConfigManager,
    updateLocalConfigs,
  } from "../lib/configmanager/ConfigManager";
  import { submitAnalytics } from "./analytics";
  import UserLogin from "./UserLogin.svelte";

  import { loginToProfileCloud } from "./user_account";
  import Filter from "./Filter.svelte";
  import ConfigCardDisplay from "./ConfigCardDisplay.svelte";
  import { Pane, Splitpanes } from "svelte-splitpanes";
  import configuration from "../../Configuration.json";
  import { MeltCheckbox, MoltenPushButton } from "@intechstudio/grid-uikit";
  import { compatible_config_types } from "./EditorLayout";
  import Sorter from "./Sorter.svelte";
  import { dragTarget } from "../lib/actions/drag.action";
  import {
    BlockRow,
    BlockColumn,
    Block,
    BlockBody,
  } from "@intechstudio/grid-uikit";

  import DisplayOnWeb from "../lib/components/DisplayOnWeb.svelte";

  let configs: Config[] = [];

  let linkFlag: string | undefined = undefined;

  let usernameInput = {
    element: null as HTMLInputElement | null,
    exists: false,
    valid: false,
    active: false,
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
          LocalConfigSchema.parse(config),
        );
        updateLocalConfigs(localConfigs);
        selectLatestConfig();
        break;
      }

      case "userAuthentication": {
        userAccountService.authenticateUser(event.data.authEvent);
        break;
      }

      case "configLink": {
        const cm = get(config_manager);
        const linkedConfig = await cm?.importLinkedConfig(
          event.data.configLinkId,
        );

        if (linkedConfig) {
          submitAnalytics({
            eventName: "Cloud Action",
            payload: {
              click: "Config Link Import",
            },
          });
        }
        break;
      }

      case "selectedComponentTypes": {
        selected_component_types.set(event.data.selectedComponentTypes);
        break;
      }

      case "compatibleTypes": {
        const current = new Set(get(compatible_config_types) as string[]);
        const next = new Set(event.data.compatibleTypes as string[]);

        const different =
          current.size !== next.size || [...current].some((v) => !next.has(v));

        if (different) {
          compatible_config_types.set(event.data.compatibleTypes);
        }
        break;
      }

      case "configDragTargetChange": {
        dragTarget.set(event.data.target);
        break;
      }
    }
  }

  async function provideSelectedConfigForEditor(config?: Config | undefined) {
    await parentIframeCommunication({
      windowPostMessageName: "provideSelectedConfigForEditor",
      dataForParent: { config: config ?? undefined },
    });
  }

  async function createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor(
    type: "profile" | "preset" | "snippet",
    name: string,
  ) {
    try {
      const configResponse = await parentIframeCommunication({
        windowPostMessageName: "getCurrenConfigurationFromEditor",
        dataForParent: { configType: type },
      });
      configResponse.data.name = name;

      const config = BaseConfigSchema.parse(configResponse.data);
      config.createdAt = new Date();
      const cm = get(config_manager);
      cm?.saveConfig(config, true).then((e) => {
        filter_value.set(new FilterValue());
      });
    } catch (e: any) {
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "fail",
          message: e.data,
        },
      });
    }
  }

  function splitConfig(config: Config) {
    if (config.configType !== "profile") return;

    const type = ModuleType[config.type as keyof typeof ModuleType];
    const elements = grid.get_module_element_list(type);

    for (let configElement of config.configs) {
      const name = `${config.name} - Element ${configElement.controlElementNumber}`;
      const description = "";
      const type = elements[configElement.controlElementNumber];

      if (!type) {
        parentIframeCommunication({
          windowPostMessageName: "sendLogMessage",
          dataForParent: {
            type: "fail",
            message: `Couldn't identify element number ${configElement.controlElementNumber} for type ${config.type}`,
          },
        });
        continue;
      }

      const cm = get(config_manager);
      let preset = {
        name: name,
        description: description,
        type: type,
        configType: "preset",
        version: config.version,
        configs: {
          ...configElement,
        },
        id: "", //ID will be generated on save
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
          message: `Upload config before linking!`,
        },
      });
      return;
    }
    const configLinkUrl =
      `${configuration.DEEPLINK_PROTOCOL_NAME}://?config-link=` + configCloudId;

    return await parentIframeCommunication({
      windowPostMessageName: "createCloudConfigLink",
      dataForParent: { configLinkUrl },
    });
  }

  async function overwriteConfigWithEditorConfig(config: Config) {
    const configResponse = await parentIframeCommunication({
      windowPostMessageName: "getCurrenConfigurationFromEditor",
      dataForParent: { configType: config.configType },
    });
    if (configResponse.ok) {
      const cm = get(config_manager);
      let editorConfig = BaseConfigSchema.parse(configResponse.data);
      let newConfig = {
        ...config,
        configs: editorConfig.configs,
        type: editorConfig.type,
        version: editorConfig.version,
        configType: editorConfig.configType,
      };
      cm?.saveConfig(newConfig, false);
    }
  }

  function selectLatestConfig() {
    if (configs.length == 0) return;

    configs.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
    selected_config.set(configs[0]);
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
        },
      }),
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
        createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor(
          "preset",
          name,
        );
        break;
      }
      case ConfigurationSaveType.MODULE: {
        createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor(
          "profile",
          name,
        );
        break;
      }
      case ConfigurationSaveType.SNIPPET: {
        createNewLocalConfigWithTheSelectedModulesConfigurationFromEditor(
          "snippet",
          name,
        );
        break;
      }
    }

    provideSelectedConfigForEditor(undefined);
    submitAnalytics({
      eventName: "Local Config",
      payload: {
        task: "Save config",
      },
    });
  }

  function handleOpenconfigurationSave() {
    provideSelectedConfigForEditor(undefined);
    configurationSaveVisible = true;
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
        click: "Config delete",
      },
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
      description: newDescription,
    };
    const cm = get(config_manager);
    cm?.saveConfig(newConfig, false);
    provideSelectedConfigForEditor(newConfig);
    submitAnalytics({
      eventName: "Cloud Action",
      payload: {
        click: "Edit config description",
      },
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
      name: value,
    };
    const cm = get(config_manager);
    cm?.saveConfig(newConfig, false);
    submitAnalytics({
      eventName: "Cloud Action",
      payload: {
        click: "Edit config name",
      },
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
      virtualPath: value,
    };
    const cm = get(config_manager);
    cm?.saveConfig(newConfig, false);

    submitAnalytics({
      eventName: "Cloud Action",
      payload: {
        click: "Edit config path",
      },
    });
  }

  function handleOverwriteProfile() {
    const config = configs.find((e) => e.id === $selected_config?.id);

    if (typeof config === "undefined") {
      return;
    }

    overwriteConfigWithEditorConfig(config);
  }

  function handleLink() {
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
            message: `Import link failed. ${e.data}`,
          },
        });
      });

    submitAnalytics({
      eventName: "Cloud Action",
      payload: {
        click: "Create config link",
      },
    });
  }
</script>

<div
  style="background-color: var(--background-muted);"
  id="main"
  class="flex flex-col h-full w-full gap-2 relative z-0 overflow-hidden"
>
  {#if configurationSaveVisible}
    <ConfigurationSave
      data={$selected_component_types}
      on:close={handleConfigurationSaverCloseClicked}
      on:save={handleConfigurationSaverSaveClicked}
    />
  {:else}
    <BlockColumn>
      <BlockRow>
        <Filter />
        <MoltenPushButton
          click={() => {
            handleOpenconfigurationSave();
          }}
          text={"+"}
          style={"normal"}
        />
      </BlockRow>
      <Sorter />
      <MeltCheckbox
        bind:target={$show_supported_only}
        title="Only show supported"
      />
    </BlockColumn>
  {/if}

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
          data={$selected_config}
        >
          <svelte:fragment slot="link-button">
            {@const config = $selected_config}
            {#if config?.syncStatus != "local"}
              <button
                class="relative group flex"
                on:click|stopPropagation={() => {
                  handleLink();
                }}
                use:tooltip={{
                  nowrap: true,
                  placement: "bottom",
                  duration: 75,
                  instant: true,
                  class: "px-2 py-1",
                  text: "Link",
                }}
              >
                <SvgIcon iconPath="link" fill="var(--foreground-muted)" />
                {#if linkFlag == config?.id}
                  <div
                    transition:fade|global={{
                      duration: 100,
                    }}
                    class="block font-medium absolute mt-7 top-0 right-0 border border-white border-opacity-10 bg-emerald-700 rounded-lg px-2 py-0.5"
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
                      id: "",
                    };
                  }
                  const cm = get(config_manager);
                  cm?.saveConfig(configToSave, true);
                  provideSelectedConfigForEditor(undefined);
                  submitAnalytics({
                    eventName: "Cloud Action",
                    payload: {
                      click: "Sync config",
                    },
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
                      : "Upload",
                }}
              >
                <SvgIcon
                  fill="var(--foreground-muted)"
                  iconPath={!config?.isEditable
                    ? "importIcon"
                    : config.syncStatus === "cloud"
                      ? "download"
                      : "move_to_cloud_02"}
                />
              </button>
            {/if}
          </svelte:fragment>
          <svelte:fragment slot="import-config-browser-button">
            <DisplayOnWeb>
              {@const config = configs.find(
                (e) => e.id === $selected_config?.id,
              )}
              <button
                on:click={() => {
                  const configLinkUrl =
                    `${configuration.DEEPLINK_PROTOCOL_NAME}://?config-link=` +
                    config?.id;
                  window.open(configLinkUrl, "_self");
                }}
                class="rounded px-4 py-1 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-medium"
              >
                Import {config?.id}
              </button>
            </DisplayOnWeb>
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
                      click: "Split config",
                    },
                  });
                }}
                class="flex items-center group relative"
                use:tooltip={{
                  nowrap: true,
                  placement: "bottom",
                  duration: 75,
                  instant: true,
                  class: "px-2 py-1",
                  text: "Split",
                }}
              >
                <SvgIcon
                  fill="var(--foreground-muted)"
                  iconPath="split_config"
                />
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
                    click: "Set config visibility",
                  },
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
                  text: "Public",
                }}
              >
                <SvgIcon
                  fill="var(--foreground-muted)"
                  iconPath={"publicIcon"}
                />
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
                  text: "Private",
                }}
              >
                <SvgIcon
                  fill="var(--foreground-muted)"
                  iconPath={"privateIcon"}
                />
              </div>
            </ToggleSwitch>
          </span>
        </ConfigCardDisplay>

        <UserLogin {usernameInput} />
      </div>
    </Pane>
  </Splitpanes>
</div>
