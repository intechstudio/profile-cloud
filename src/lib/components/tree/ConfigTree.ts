import { get } from "svelte/store";
import configuration from "../../../../Configuration.json";
import {
  config_manager,
  compatible_config_types,
} from "./../../../routes/EditorLayout";
import { type Config } from "../../schemas";
import { filter_value, FilterValue, type Term } from "../../../routes/Filter";
import { Sort } from "../../../routes/Sorter";
import {
  TreeItemType,
  AbstractTreeNode,
  type AbstractFolderData,
  type AbstractItemData,
} from "@intechstudio/grid-uikit";
import { v4 as uuidv4 } from "uuid";
import { ElementType, grid, ModuleType } from "@intechstudio/grid-protocol";

export namespace Tree {
  export interface Options {
    showSupportedOnly?: boolean;
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
      };

      res.push(partialData);
    }
    return res;
  }

  function buildVirtualPresets(node: TreeNodeImpl) {
    for (const child of get(node).children as TreeNodeImpl[]) {
      const { type, data } = get(child);
      switch (type) {
        case TreeItemType.ITEM: {
          const { item } = data as AbstractItemData<Config>;
          if (item.configType === "profile") {
            const virtualPresets = generateVirtualPresets(item);
            for (const preset of virtualPresets) {
              const node = new TreeNodeImpl(undefined, TreeItemType.ITEM, {
                item: preset,
              });
              child.addChild(node);
            }
          }
          break;
        }
        case TreeItemType.FOLDER: {
          buildVirtualPresets(child);
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

      const { item } = get(child).data as AbstractItemData<Config>;
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
        (s.data as AbstractItemData<Config>).item = newItem;
        return s;
      });

      folder.addChild(child);

      // Remove the child from its original position
      node.update((s) => {
        s.children.splice(i, 1);
        return s;
      });
    }

    // Recurse into folders
    for (const child of get(node).children as TreeNodeImpl[]) {
      if (get(child).type === TreeItemType.FOLDER) {
        buildVirtualFolders(child);
      }
    }
  }

  export function create(configs: Config[], options: Options = {}) {
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
          (e) => new TreeNodeImpl(undefined, TreeItemType.ITEM, { item: e }),
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
          (e) => new TreeNodeImpl(undefined, TreeItemType.ITEM, { item: e }),
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
          (e) => new TreeNodeImpl(undefined, TreeItemType.ITEM, { item: e }),
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
          (e) => new TreeNodeImpl(undefined, TreeItemType.ITEM, { item: e }),
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
          (e) => new TreeNodeImpl(undefined, TreeItemType.ITEM, { item: e }),
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
    buildVirtualPresets(root);
    return root;
  }

  export function createNode(configs: Config[]) {
    const node = new TreeNodeImpl(undefined, TreeItemType.FOLDER, {
      title: "Root",
    });
    node.addChild(
      ...configs.map(
        (e) => new TreeNodeImpl(undefined, TreeItemType.ITEM, { item: e }),
      ),
    );
    return node;
  }

  class TreeNodeImpl extends AbstractTreeNode<Config> {
    public constructor(
      parent: TreeNodeImpl | undefined,
      type: TreeItemType,
      data: AbstractFolderData | AbstractItemData<Config>,
    ) {
      switch (type) {
        case TreeItemType.FOLDER: {
          super(parent, uuidv4(), type, data);
          break;
        }
        case TreeItemType.ITEM: {
          const itemData = data as AbstractItemData<Config>;
          super(parent, itemData.item.id, type, data);
          break;
        }
      }
    }

    public sort(key: Sort.Key) {
      const getName = (node: Node) => {
        const { type, data } = get(node);
        switch (type) {
          case TreeItemType.FOLDER:
            return (data as AbstractFolderData).title;
          case TreeItemType.ITEM:
            return (data as AbstractItemData<Config>).item.name;
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
              (get(a).data as AbstractItemData<Config>).item.type,
              (get(b).data as AbstractItemData<Config>).item.type,
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
              (get(a).data as AbstractItemData<Config>).item.modifiedAt,
              (get(b).data as AbstractItemData<Config>).item.modifiedAt,
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

    public filter(filter: FilterValue) {
      // Helper function to check if a value matches the term
      const matchesTerm = (value: string | undefined, term: Term): boolean => {
        if (value === undefined) return false;

        const searchValue = term.caseMatch ? value : value.toLowerCase();
        const termValue = term.caseMatch
          ? term.value
          : term.value.toLowerCase();

        return term.wholeMatch
          ? searchValue === termValue
          : searchValue.includes(termValue);
      };

      if (filter.length === 0) {
        return;
      }

      for (const child of get(this.internal).children as TreeNodeImpl[]) {
        switch (get(child).type) {
          case TreeItemType.FOLDER: {
            if (get(child).type === TreeItemType.FOLDER) {
              child.filter(filter);
            }
            break;
          }
          case TreeItemType.ITEM: {
            const { item } = get(child).data as AbstractItemData<Config>;
            // Get scripts from Presets/Profiles
            let scripts: string[] = [];
            switch (item.configType) {
              case "preset": {
                scripts = item.configs.events.map((e: any) => e.config);
                break;
              }
              case "profile": {
                for (const element of item.configs) {
                  scripts.push(...element.events.map((e: any) => e.config));
                }
                break;
              }
            }

            // Regular expression to match --[[@<any string>]]
            const regex = /--\[\[@(.*?)\]\]/g;

            // Extract all unique shorts from scripts
            const shorts = Array.from(
              new Set(
                scripts.flatMap((str) => {
                  const matches = str.matchAll(regex); // Get all matches
                  return Array.from(matches, (match) => match[1]); // Extract matched strings
                }),
              ),
            );

            const searchables = [
              item.name,
              item.type,
              item.configType,
              item.virtualPath,
            ].filter((field): field is string => field !== undefined);

            // Check if any term matches any searchable field
            const match = filter.every((term) => {
              if (term.value.startsWith("$")) {
                const blockNames = shorts.map((e) =>
                  grid.ActionBlock.shortToDisplayName(e)
                    ?.replaceAll(" ", "")
                    .replaceAll("&", "And"),
                );
                return blockNames.some((e) =>
                  matchesTerm(e, {
                    value: term.value.slice(1, term.value.length),
                    caseMatch: false,
                    wholeMatch: false,
                  }),
                );
              } else {
                return searchables.some((searchable) =>
                  matchesTerm(searchable, term),
                );
              }
            });
            child.update((s) => Object({ ...s, hidden: !match }));
            break;
          }
        }
      }
    }
  }
}
