<script lang="ts">
  import { config_manager, selected_config } from "./EditorLayout";
  import { compatible_config_types } from "./EditorLayout";
  import { createEventDispatcher } from "svelte";
  import type { Config } from "../lib/schemas";
  import { grid, ModuleType, ElementType } from "@intechstudio/grid-protocol";
  import { parentIframeCommunication } from "../lib/utils";
  import { get } from "svelte/store";
  import { dragTarget } from "../lib/actions/drag.action";

  const dispatch = createEventDispatcher();

  export let data: Config & { module: ModuleType };
  export let isSelected: boolean;

  let compatible = false;
  let open = false;

  $: handleCompatibleConfigsChange($compatible_config_types);

  function isElementType(value: string): value is ElementType {
    return Object.values(ElementType).includes(value as ElementType);
  }

  function isModuleType(value: string): value is ModuleType {
    return Object.values(ModuleType).includes(value as ModuleType);
  }

  function handleCompatibleConfigsChange(
    types: Array<ElementType | ModuleType>,
  ) {
    if (data.type === ModuleType.VSN1L || data.type === ModuleType.VSN1R) {
      compatible =
        types.includes(ModuleType.VSN1L) || types.includes(ModuleType.VSN1R);
    } else {
      switch (data.configType) {
        case "profile": {
          const moduleTypes = types.filter((t): t is ModuleType =>
            isModuleType(t),
          );
          compatible = moduleTypes.includes(data.type as ModuleType);
          break;
        }
        case "preset": {
          const elementTypes = types.filter((t): t is ElementType =>
            isElementType(t),
          );
          const leftCompatible = elementTypes.some((e) =>
            grid.is_element_compatible_with(e, data.type as ElementType),
          );
          const rightCompatible = elementTypes.some((e) =>
            grid.is_element_compatible_with(data.type as ElementType, e),
          );
          compatible = leftCompatible || rightCompatible;
          break;
        }
        case "snippet": {
          compatible = true;
          break;
        }
      }
    }
  }

  function handleToggle() {
    open = !open;
  }

  let moduleType = ModuleType[data.type as keyof typeof ModuleType];
  let elements = grid
    .get_module_element_list(moduleType)
    ?.reduce(
      (array: Array<{ index: number; type: ElementType }>, type, index) => {
        if (typeof type !== "undefined") {
          array.push({ index, type });
        }
        return array;
      },
      [],
    );

  function getPresetName(preset: any) {
    const initConfig = preset.events.find(
      (e: any) => parseInt(e.event) === 0,
    ).config;
    const regex = /--\[\[@sn\]\] self:gen\(["']([^"']+)["']\)/;

    const value = initConfig.match(regex)?.at(1);
    return value;
  }

  function handleDragStart(e: DragEvent) {
    parentIframeCommunication({
      windowPostMessageName: "configDragChange",
      dataForParent: {
        drag: "start",
        config: data,
      },
    });

    parentIframeCommunication({
      windowPostMessageName: "showOverlay",
      dataForParent: { value: false },
    });
  }

  function handleDragEnd(e: DragEvent) {
    parentIframeCommunication({
      windowPostMessageName: "configDragChange",
      dataForParent: {
        drag: "end",
        config: data,
        target: get(dragTarget),
      },
    });

    dragTarget.set(undefined);
  }

  function handleConfigurationClicked(configId: string, presetIndex?: string) {
    const index =
      typeof presetIndex !== "undefined" ? parseInt(presetIndex) : -1;
    selected_config.set({ id: configId, presetIndex: index });

    if (index === -1) {
      //No partial profile is selected
      dispatch("config-selected", { config: data });
    } else {
      //Partial profile is selected
      let moduleType = ModuleType[data.module as keyof typeof ModuleType];
      let elements = grid.get_module_element_list(moduleType);
      const type = elements[index];

      const preset = {
        ...data,
        type: type,
        configType: "preset",
      } as Config;

      dispatch("config-selected", { config: preset });
    }
  }
</script>

<button
  id={data.id}
  on:click={() => {
    handleConfigurationClicked(data.id.split("#")[0], data.id.split("#")[1]);
  }}
  on:focusout={(e) => {
    if (e.relatedTarget == null) {
      dispatch("focusout");
    }
  }}
  class="{isSelected
    ? 'border-emerald-500'
    : 'border-white/10'} flex flex-row items-center w-full bg-white border shadow dark:bg-secondary"
  draggable="true"
  on:dragstart={handleDragStart}
  on:dragend={handleDragEnd}
>
  <div class="w-1 h-8 grid grid-rows-2">
    <div
      class="{data.syncStatus === 'cloud' || data.syncStatus === 'synced'
        ? 'bg-emerald-300 '
        : 'bg-emerald-500/10'}  w-full h-full"
    />
    <div
      class="{data.syncStatus === 'local' || data.syncStatus === 'synced'
        ? 'bg-emerald-500 '
        : 'bg-emerald-500/10'}  w-full h-full"
    />
  </div>
  <div
    class="pl-2 py-1 grid grid-cols-[1fr_auto_auto] gap-1 w-full items-center"
  >
    <span class="truncate text-left" class:opacity-75={!compatible}
      >{data.name}</span
    >
    <div
      class="dark:text-white text-black text-opacity-80 py-0.5 px-2 dark:border
                {compatible
        ? 'dark:text-opacity-100 dark:border-white dark:border-opacity-10 dark:bg-white dark:bg-opacity-10'
        : 'dark:text-opacity-75 dark:border-transparent line-through'} truncate"
    >
      {data.type}
    </div>
    {#if data.configType === "profile"}
      <button class="mr-1" on:click={handleToggle}>
        <svg
          width="14"
          height="11"
          class:-rotate-90={!open}
          viewBox="0 0 14 11"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6.99968 11L0.9375 0.5L13.0619 0.500001L6.99968 11Z"
            fill="#D9D9D9"
          />
        </svg>
      </button>
    {/if}
  </div>
</button>

{#if open}
  <div class="flex flex-col ml-4 gap-1 my-1">
    {#each data.configs as preset, index}
      {@const element = elements.find(
        (e) => e.index === preset.controlElementNumber,
      )}
      {@const elementName = getPresetName(preset)}
      {@const partialData = {
        configs: structuredClone(preset),
        id: `${data.id}#${preset.controlElementNumber}`,
        module: data.type,
        type: element?.type,
        name:
          typeof elementName !== "undefined"
            ? elementName
            : `Element ${index} (${
                elements[index].type.at(0)?.toUpperCase() +
                elements[index].type?.slice(1)
              })`,
        configType: "preset",
      }}
      <svelte:self
        isSelected={preset.controlElementNumber ===
          $selected_config?.presetIndex}
        data={partialData}
        on:config-selected={(e) => dispatch("config-selected", e.detail)}
        on:focusout={(e) => {
          if (e.relatedTarget == null) {
            dispatch("focusout");
          }
        }}
      />
    {/each}
  </div>
{/if}
