<script lang="ts">
  import { grid } from "@intechstudio/grid-protocol";
  import { ModuleType } from "@intechstudio/grid-protocol";
  import { filter_value, FilterValue } from "./Filter";
  import {
    selected_config,
    hide_community_configs,
    show_supported_only,
    config_manager,
    selected_component_types,
  } from "./EditorLayout";
  import { get } from "svelte/store";
  import ConfigTree from "../lib/components/tree/ConfigTree.svelte";
  import ConfigurationSave, {
    ConfigurationSaveType,
  } from "./ConfigurationSave.svelte";
  import { onDestroy, onMount } from "svelte";
  import { userAccountService } from "../lib/stores";
  import { SvgIcon, IconButton, tooltip } from "@intechstudio/grid-uikit";
  import {
    type Config,
    LocalConfigSchema,
    BaseConfigSchema,
  } from "../lib/schemas";
  import { Toggle } from "@intechstudio/grid-uikit";
  import {
    parentIframeCommunication,
    isModuleTypeCompatible,
  } from "../lib/utils";
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
  import { dragTarget } from "../lib/actions/drag.action";
  import {
    BlockRow,
    BlockColumn,
    Block,
    BlockBody,
  } from "@intechstudio/grid-uikit";

  import DisplayOnWeb from "../lib/components/DisplayOnWeb.svelte";
  import { last } from "@melt-ui/svelte/internal/helpers";

  let configs: Config[] = [];
  let scrollToSelectedConfigTrigger = 0;
  let pendingNewConfigScroll = false; // this helps new configs to scroll into view upon creation

  let usernameInput = {
    element: null as HTMLInputElement | null,
    value: null,
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
        const linkedConfigAppId = await cm?.findLinkedConfigAppId(
          event.data.configLinkId,
        );

        if (linkedConfigAppId) {
          // Find the merged config from our configs list that matches the linked config ID
          const matchedConfig = configs.find((c) => c.id === linkedConfigAppId);

          if (matchedConfig) {
            // Unhide groups that may be hiding the linked config
            const currentOwnerId = cm?.getCurrentOwnerId();
            const isMyConfig =
              matchedConfig.syncStatus === "local" ||
              matchedConfig.owner === currentOwnerId;

            if (!isMyConfig) {
              const isOfficialConfig =
                configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(
                  matchedConfig.owner ?? "",
                ) ||
                configuration.WORKFLOW_CONFIG_PROFILE_IDS.includes(
                  matchedConfig.owner ?? "",
                );

              // We can only know if config belongs to the community, if it's not official or the user's!
              if (!isOfficialConfig && get(hide_community_configs)) {
                hide_community_configs.set(false);
              }

              const cct = get(compatible_config_types) as string[];
              if (
                !cct.includes(matchedConfig.type) &&
                get(show_supported_only)
              ) {
                show_supported_only.set(false);
              }
            }

            // Select the config and notify the editor
            selected_config.set(matchedConfig);
            scrollToSelectedConfigTrigger += 1;
            await provideSelectedConfigForEditor(matchedConfig);
          }

          submitAnalytics({
            eventName: "Cloud Action",
            payload: {
              click: "Config Link Navigate",
            },
          });
        } else {
          parentIframeCommunication({
            windowPostMessageName: "sendLogMessage",
            dataForParent: {
              type: "fail",
              message: "Config not found or no longer available.",
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
      dataForParent: { config: config },
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
      pendingNewConfigScroll = true;
      await cm?.saveConfig(config, true);
      filter_value.set(new FilterValue());
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "success",
          message: `Config '${name}' saved`,
        },
      });
    } catch (e: any) {
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "fail",
          message: e?.data ?? e?.message ?? String(e),
        },
      });
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
        files: editorConfig?.files,
      };

      if (
        !isModuleTypeCompatible(
          newConfig.type as ModuleType,
          config.type as ModuleType,
        )
      ) {
        parentIframeCommunication({
          windowPostMessageName: "sendLogMessage",
          dataForParent: {
            type: "fail",
            message: `Config type does not match!`,
          },
        });
        return;
      }
      try {
        await cm?.saveConfig(newConfig, false);
        parentIframeCommunication({
          windowPostMessageName: "sendLogMessage",
          dataForParent: {
            type: "success",
            message: `Config '${newConfig.name}' saved`,
          },
        });
      } catch (e) {
        parentIframeCommunication({
          windowPostMessageName: "sendLogMessage",
          dataForParent: {
            type: "fail",
            message: `Failed to overwrite '${newConfig.name}'. ${e}`,
          },
        });
      }
    }
  }

  function selectLatestConfig() {
    if (configs.length == 0) return;
    configs.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
    selected_config.set(configs[0]);
    scrollToSelectedConfigTrigger += 1; // trigger scrolling into view on ConfigTree
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

          if (pendingNewConfigScroll) {
            pendingNewConfigScroll = false;
            const newEntry = newConfigs
              .filter((c) => !configs.some((e) => e.id === c.id))
              .sort(
                (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime(),
              )[0];
            if (newEntry) {
              selected_config.set(newEntry);
              scrollToSelectedConfigTrigger += 1;
            }
          }

          configs = newConfigs;

          // Keep selected_config in sync with the latest config data.
          // Without this, the store keeps a stale object after login (e.g. public: undefined).
          const currentSelected = get(selected_config);
          if (currentSelected) {
            const refreshed = newConfigs.find(
              (c) => c.id === currentSelected.id,
            );
            if (refreshed) {
              selected_config.set(refreshed);
            }
          }
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
    try {
      await cm?.saveConfig(newConfig, false);
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "success",
          message: `Config '${newConfig.name}' saved`,
        },
      });
    } catch (e) {
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "fail",
          message: `Failed to save '${newConfig.name}'. ${e}`,
        },
      });
    }
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
    try {
      await cm?.saveConfig(newConfig, false);
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "success",
          message: `Config '${newConfig.name}' saved`,
        },
      });
    } catch (e) {
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "fail",
          message: `Failed to save '${newConfig.name}'. ${e}`,
        },
      });
    }
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
    try {
      await cm?.saveConfig(newConfig, false);
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "success",
          message: `Config '${newConfig.name}' saved`,
        },
      });
    } catch (e) {
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "fail",
          message: `Failed to save '${newConfig.name}'. ${e}`,
        },
      });
    }

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
    let config = $selected_config;
    if (typeof config === "undefined") {
      return;
    }
    createCloudConfigLink(config)
      .then((res) => {
        parentIframeCommunication({
          windowPostMessageName: "sendLogMessage",
          dataForParent: {
            type: "success",
            message: `Link for '${config.name}' copied to clipboard!`,
          },
        });
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

  async function handleSyncConfig(config: Config | undefined) {
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
    pendingNewConfigScroll = true;
    const action = !config.isEditable
      ? "Created a copy of"
      : config.syncStatus === "cloud"
        ? "Downloaded"
        : "Uploaded";
    try {
      await cm?.saveConfig(configToSave, true);
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "success",
          message: `${action} '${configToSave.name}'`,
        },
      });
    } catch (e) {
      parentIframeCommunication({
        windowPostMessageName: "sendLogMessage",
        dataForParent: {
          type: "fail",
          message: `Failed to sync '${configToSave.name}'. ${e}`,
        },
      });
    }
    provideSelectedConfigForEditor(undefined);
    submitAnalytics({
      eventName: "Cloud Action",
      payload: {
        click: "Sync config",
      },
    });
  }

  let publicToggleValue = $selected_config?.public;

  let lastid = $selected_config?.id;

  $: handleSelectionChange($selected_config);

  function handleSelectionChange(config: Config | undefined) {
    if (lastid === config?.id) {
      // Same config — only update publicToggleValue if it was undefined before
      // (handles the login case where public goes from undefined to a real value).
      if (publicToggleValue === undefined && config?.public !== undefined) {
        publicToggleValue = config?.public;
      }
      return;
    }

    lastid = config?.id;
    publicToggleValue = config?.public;
  }

  $: {
    updateVisiblility(publicToggleValue);
  }

  function updateVisiblility(value: boolean | undefined) {
    if (typeof value === "undefined") {
      return;
    }

    const config = configs.find((e) => e.id === $selected_config?.id);
    if (typeof config === "undefined") {
      return;
    }

    if (config.public === value) {
      return;
    }

    submitAnalytics({
      eventName: "Cloud Action",
      payload: {
        click: "Set config visibility",
      },
    });
    const cm = get(config_manager);
    cm?.changeCloudVisibility(config, value);
  }
</script>

<div
  style="background-color: var(--background-muted);"
  id="main"
  class="main-layout"
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
      <BlockRow
        ><MeltCheckbox
          bind:target={$show_supported_only}
          title="Hide incompatible configs"
        />
        <MeltCheckbox
          bind:target={$hide_community_configs}
          title="Hide community configs"
        /></BlockRow
      >
    </BlockColumn>
  {/if}

  <div class="splitpanes-wrapper">
    <Splitpanes horizontal={true} theme="modern-theme" pushOtherPanes={false}>
      <Pane size={60}>
        <div class="tree-pane">
          <ConfigTree
            {configs}
            scrollToSelectionTrigger={scrollToSelectedConfigTrigger}
          />
        </div></Pane
      >
      <Pane size={40}>
        <div class="detail-pane">
          <ConfigCardDisplay
            on:delete-config={handleDeleteConfig}
            on:description-change={handleDescriptionChange}
            on:name-change={handleNameChange}
            on:path-change={handlePathChange}
            on:overwrite-profile={handleOverwriteProfile}
            data={$selected_config}
          >
            <svelte:fragment slot="link-button">
              {@const config = configs.find(
                (e) => e.id === $selected_config?.id,
              )}
              {#if config?.syncStatus != "local"}
                {#key config?.public}
                  <IconButton
                    iconPath="link"
                    disabled={!config?.public}
                    tooltipText={config?.public
                      ? "Link"
                      : "Only public config can be linked"}
                    tooltipDelay={0}
                    stopPropagation
                    onClick={() => {
                      handleLink();
                    }}
                  />
                {/key}
              {/if}
            </svelte:fragment>
            <svelte:fragment slot="sync-config-button">
              {@const config = configs.find(
                (e) => e.id === $selected_config?.id,
              )}
              {#key config?.id}
                <IconButton
                  iconPath="importIcon"
                  tooltipText="Create a copy"
                  tooltipDelay={0}
                  stopPropagation
                  disabled={!config || config.isEditable}
                  onClick={() => handleSyncConfig(config)}
                />
                <IconButton
                  iconPath="download"
                  tooltipText="Download"
                  tooltipDelay={0}
                  stopPropagation
                  disabled={!config ||
                    !config.isEditable ||
                    config.syncStatus !== "cloud"}
                  onClick={() => handleSyncConfig(config)}
                />
                <IconButton
                  iconPath="move_to_cloud_02"
                  tooltipText="Upload"
                  tooltipDelay={0}
                  stopPropagation
                  disabled={!config ||
                    !config.isEditable ||
                    config.syncStatus !== "local"}
                  onClick={() => handleSyncConfig(config)}
                />
              {/key}
            </svelte:fragment>
            <svelte:fragment slot="import-config-browser-button">
              <DisplayOnWeb>
                {@const config = configs.find(
                  (e) => e.id === $selected_config?.id,
                )}
                <div
                  use:tooltip={{
                    instant: true,
                    text: `Import "${config?.name}" into Grid Editor`,
                  }}
                >
                  <MoltenPushButton
                    text="Import"
                    style="accept"
                    click={() => {
                      const configLinkUrl =
                        `${configuration.DEEPLINK_PROTOCOL_NAME}://?config-link=` +
                        config?.id;
                      window.open(configLinkUrl, "_self");
                    }}
                  />
                </div>
              </DisplayOnWeb>
            </svelte:fragment>

            <span slot="toggle-accessibility">
              {@const config = configs.find(
                (e) => e.id === $selected_config?.id,
              )}
              <div
                style="display: flex;
    align-items: center;
    gap: 0.25rem;"
              >
                {#if config?.public}
                  <div
                    use:tooltip={{
                      instant: true,
                      text: "Public",
                    }}
                  >
                    <SvgIcon
                      fill="var(--foreground-muted)"
                      iconPath={"publicIcon"}
                    />
                  </div>
                {:else}
                  <div
                    use:tooltip={{
                      instant: true,
                      text: "Private",
                    }}
                  >
                    <SvgIcon
                      fill="var(--foreground-muted)"
                      iconPath={"privateIcon"}
                    />
                  </div>
                {/if}
                <div
                  use:tooltip={{
                    instant: true,
                    text: "Change visibility",
                  }}
                >
                  <Toggle bind:value={publicToggleValue} />
                </div>
              </div>
            </span>
          </ConfigCardDisplay>
        </div>
      </Pane>
    </Splitpanes>
  </div>
  <UserLogin {usernameInput} />
</div>

<style>
  .main-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    gap: 0.5rem;
    position: relative;
    z-index: 0;
    overflow: hidden;
  }

  .splitpanes-wrapper {
    flex: 1;
    min-height: 0;
  }

  .tree-pane {
    display: flex;
    height: 100%;
    width: 100%;
    padding-bottom: 0.75rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .detail-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }

</style>
