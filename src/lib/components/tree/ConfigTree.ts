import { get } from "svelte/store";
import configuration from "../../../../Configuration.json";
import {
  config_manager,
  compatible_config_types,
} from "./../../../routes/EditorLayout";
import { type Config } from "../../schemas";
import { filter_value, FilterValue, type Term } from "../../../routes/Filter";
import { Sort } from "../../../routes/Sorter";
import { v4 as uuidv4 } from "uuid";
import { ElementType, grid, ModuleType } from "@intechstudio/grid-protocol";
import {
  AbstractTreeNode,
  TreeItemType,
  type AbstractFolderData,
  type AbstractItemData,
} from "./TreeNode.svelte";

export namespace Tree {
  export interface Options {
    showSupportedOnly?: boolean;
    compatibileTypes: string[];
  }

  export type Node = InstanceType<typeof TreeNodeImpl>;

  function getPresetName(preset: any) {
    const initConfig = preset.events.find(
      (e: any) => parseInt(e.event) === 0,
    ).config;
    const regex = /--\[\[@sn\]\] self:gen\(["']([^"']+)["']\)/;

    const value = initConfig.match(regex)?.at(1);
    return value;
  }

  function generateVirtualPresets(data: Config) {
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

    const res: Config[] = [];
    for (const preset of data.configs) {
      const index = preset.controlElementNumber;
      const element = elements.find((e) => e.index === index);

      if (typeof element === "undefined") {
        continue;
      }

      const elementName = getPresetName(preset);
      const presetName =
        typeof elementName !== "undefined"
          ? elementName
          : `Element ${index} (${
              element.type.at(0)?.toUpperCase() + element.type?.slice(1)
            })`;

      const partialData: Config = {
        configs: structuredClone(preset),
        id: `${data.id}#${preset.controlElementNumber}`,
        type: element.type,
        name: presetName,
        configType: "preset",
        isEditable: false,
        syncStatus: "local",
        public: false,
        modifiedAt: new Date(),
        description: "",
        createdAt: new Date(),
        displayName: `${data.name} / ${presetName}`,
      };

      res.push(partialData);
    }
    return res;
  }

  function isCompatible(config: Config, types: string[]) {
    if (config.configType === "snippet") {
      return true;
    } else if (
      config.type === ModuleType.VSN1L ||
      config.type === ModuleType.VSN1R
    ) {
      return (
        types.includes(ModuleType.VSN1L) || types.includes(ModuleType.VSN1R)
      );
    } else {
      return types.includes(config.type);
    }
  }

  function buildVirtualPresets(node: TreeNodeImpl, compatibileTypes: string[]) {
    for (const child of get(node).children as TreeNodeImpl[]) {
      const { type, data } = get(child);
      switch (type) {
        case TreeItemType.ITEM: {
          const { item } = data as ItemData;
          if (item.configType === "profile") {
            const virtualPresets = generateVirtualPresets(item);
            for (const preset of virtualPresets) {
              const node = new TreeNodeImpl(undefined, TreeItemType.ITEM, {
                item: preset,
                compatible: isCompatible(preset, compatibileTypes),
              });
              child.addChild(node);
            }
          }
          break;
        }
        case TreeItemType.FOLDER: {
          buildVirtualPresets(child, compatibileTypes);
          break;
        }
      }
    }
  }

  function buildVirtualFolders(node: TreeNodeImpl) {
    const { children } = get(node);

    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i] as TreeNodeImpl;
      if (get(child).type !== TreeItemType.ITEM) continue;

      const { item } = get(child).data as ItemData;
      const { virtualPath } = item;
      if (!virtualPath) continue;

      const segments = virtualPath.split("/");
      const [folderName, ...restPath] = segments;
      if (!folderName) continue;

      let folder = children.find(
        (e) =>
          get(e).type === TreeItemType.FOLDER &&
          (get(e).data as AbstractFolderData).title === folderName,
      );

      if (!folder) {
        folder = new TreeNodeImpl(undefined, TreeItemType.FOLDER, {
          title: folderName,
        });
        node.addChild(folder);
      }

      // Clone the item with a reduced virtual path for recursion
      const newItem = {
        ...item,
        virtualPath: restPath.join("/"),
      };

      // Replace the item's data on the child node without mutating the original
      child.update((s) => {
        (s.data as ItemData).item = newItem;
        return s;
      });

      folder.addChild(child);

      // Remove the child from its original position
      node.update((s) => {
        s.children.splice(i, 1);
        return s;
      });
    }

    //Remove empty folders
    node.update((s) => {
      s.children = s.children.filter((child) => {
        const value = get(child);
        return value.type !== TreeItemType.FOLDER || value.children.length > 0;
      });
      return s;
    });

    // Recurse into folders
    for (const child of get(node).children as TreeNodeImpl[]) {
      if (get(child).type === TreeItemType.FOLDER) {
        buildVirtualFolders(child);
      }
    }
  }

  export function create(
    configs: Config[],
    options: Options = { compatibileTypes: [] },
  ) {
    const { showSupportedOnly } = options;
    let root = new TreeNodeImpl(undefined, TreeItemType.FOLDER, {
      title: "Root",
    });
    const [
      my_configs,
      recommended_configs,
      community_configs,
      other_configs,
      unsupported_configs,
    ] = [
      new TreeNodeImpl(root, TreeItemType.FOLDER, { title: "My Configs" }),
      new TreeNodeImpl(root, TreeItemType.FOLDER, {
        title: "Recommended Configs",
      }),
      new TreeNodeImpl(root, TreeItemType.FOLDER, {
        title: "Community Configs",
      }),
      new TreeNodeImpl(root, TreeItemType.FOLDER, { title: "Other Configs" }),
      new TreeNodeImpl(root, TreeItemType.FOLDER, {
        title: "Unsupported Configs",
      }),
    ];

    const cm = get(config_manager);

    my_configs.addChild(
      ...configs
        .filter((e: Config) => {
          const isMyConfig =
            e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
          return isMyConfig;
        })
        .map(
          (e) =>
            new TreeNodeImpl(undefined, TreeItemType.ITEM, {
              item: e,
              compatible: isCompatible(e, options.compatibileTypes),
            }),
        ),
    );
    recommended_configs.addChild(
      ...configs
        .filter((e: Config) => {
          const isMyConfig =
            e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
          const isOfficialConfig =
            configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(
              e.owner ?? "",
            );

          const cct = get(compatible_config_types);

          return (
            !isMyConfig &&
            isOfficialConfig &&
            (!(showSupportedOnly ?? false) || cct.includes(e.type))
          );
        })
        .map(
          (e) =>
            new TreeNodeImpl(undefined, TreeItemType.ITEM, {
              item: e,
              compatible: isCompatible(e, options.compatibileTypes),
            }),
        ),
    );
    community_configs.addChild(
      ...configs
        .filter((e: Config) => {
          const isMyConfig =
            e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
          const isOfficialConfig =
            configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(
              e.owner ?? "",
            );
          const cct = get(compatible_config_types);
          return (
            !isMyConfig &&
            !isOfficialConfig &&
            (!showSupportedOnly || cct.includes(e.type))
          );
        })
        .map(
          (e) =>
            new TreeNodeImpl(undefined, TreeItemType.ITEM, {
              item: e,
              compatible: isCompatible(e, options.compatibileTypes),
            }),
        ),
    );
    other_configs.addChild(
      ...configs
        .filter((e: Config) => {
          const isMyConfig =
            e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
          const cct = get(compatible_config_types);
          return !isMyConfig && (!showSupportedOnly || cct.includes(e.type));
        })
        .map(
          (e) =>
            new TreeNodeImpl(undefined, TreeItemType.ITEM, {
              item: e,
              compatible: isCompatible(e, options.compatibileTypes),
            }),
        ),
    );
    unsupported_configs.addChild(
      ...configs
        .filter((e: Config) => {
          const isMyConfig =
            e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
          const cct = get(compatible_config_types);

          return !isMyConfig && showSupportedOnly && !cct.includes(e.type);
        })
        .map(
          (e) =>
            new TreeNodeImpl(undefined, TreeItemType.ITEM, {
              item: e,
              compatible: isCompatible(e, options.compatibileTypes),
            }),
        ),
    );

    root.addChild(my_configs);

    const fv = get(filter_value);
    const isFiltering = fv.length > 0;
    if (isFiltering) {
      root.addChild(other_configs);
    } else {
      root.addChild(recommended_configs, community_configs);
    }

    if (showSupportedOnly) {
      root.addChild(unsupported_configs);
    }

    buildVirtualFolders(root);
    buildVirtualPresets(root, options.compatibileTypes);
    return root;
  }

  interface ItemData extends AbstractItemData<Config> {
    compatible: boolean;
  }

  class TreeNodeImpl extends AbstractTreeNode<Config> {
    public constructor(
      parent: TreeNodeImpl | undefined,
      type: TreeItemType,
      data: AbstractFolderData | ItemData,
    ) {
      switch (type) {
        case TreeItemType.FOLDER: {
          super(parent, uuidv4(), type, data);
          break;
        }
        case TreeItemType.ITEM: {
          const itemData = data as ItemData;
          super(parent, itemData.item.id, type, data);
          break;
        }
      }
    }

    public getIncludingNodes(id: string | undefined): string[] {
      if (typeof id === "undefined") {
        return [];
      }

      const found = typeof this.findChild(id) !== "undefined";
      let res: string[] = [];
      if (found) {
        res.push(get(this.internal).id);

        for (const child of get(this.internal).children) {
          res = [...res, ...(child as TreeNodeImpl).getIncludingNodes(id)];
        }
      }
      return res;
    }

    public sort(key: Sort.Key) {
      const getName = (node: Node) => {
        const { type, data } = get(node);
        switch (type) {
          case TreeItemType.FOLDER:
            return (data as AbstractFolderData).title;
          case TreeItemType.ITEM:
            return (data as ItemData).item.name;
          default:
            return "";
        }
      };

      const folders = (get(this.internal).children as TreeNodeImpl[])
        .filter((e) => get(e).type === TreeItemType.FOLDER)
        .sort((a: TreeNodeImpl, b: TreeNodeImpl) => {
          const [nameA, nameB] = [getName(a), getName(b)];
          return nameA.localeCompare(nameB, undefined, {
            numeric: true,
          });
        });

      const items: TreeNodeImpl[] = (
        get(this.internal).children as TreeNodeImpl[]
      ).filter((e) => get(e).type === TreeItemType.ITEM);

      switch (key.type) {
        case Sort.Type.NAME: {
          items.sort((a: TreeNodeImpl, b: TreeNodeImpl) => {
            const [nameA, nameB] = [getName(a), getName(b)];
            return nameA.localeCompare(nameB, undefined, {
              numeric: true,
            });
          });
          break;
        }
        case Sort.Type.DATE: {
          items.sort((a: TreeNodeImpl, b: TreeNodeImpl) => {
            const [typeA, typeB] = [
              (get(a).data as ItemData).item.type,
              (get(b).data as ItemData).item.type,
            ];
            return typeA.localeCompare(typeB, undefined, {
              numeric: true,
            });
          });
          break;
        }
        case Sort.Type.TYPE: {
          items.sort((a: TreeNodeImpl, b: TreeNodeImpl) => {
            const [dateA, dateB] = [
              (get(a).data as ItemData).item.modifiedAt,
              (get(b).data as ItemData).item.modifiedAt,
            ];
            return dateA.getTime() - dateB.getTime();
          });
          break;
        }
      }

      this.update((s) => {
        switch (key.direction) {
          case Sort.Direction.ASC: {
            s.children = [...folders, ...items];
            break;
          }
          case Sort.Direction.DESC: {
            s.children = [...folders, ...items.reverse()];
            break;
          }
        }
        return s;
      });

      get(this.internal).children.forEach((e) => (e as TreeNodeImpl).sort(key));
      return this;
    }
  }
}
