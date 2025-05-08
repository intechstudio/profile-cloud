import { get, type Writable, writable } from "svelte/store";
import configuration from "../../../../Configuration.json";
import {
  config_manager,
  compatible_config_types,
} from "./../../../routes/EditorLayout";
import { type Config } from "../../schemas";
import { filter_value, FilterValue } from "../../../routes/Filter";
import { Sort } from "../../../routes/Sorter";
import { v4 as uuidv4 } from "uuid";
import { TreeNodeData } from "@intechstudio/grid-uikit";

type FilterFunc<T> = (items: T[], filter: FilterValue) => T[];
type SorterFunc<T> = (items: T[], key: Sort.Key) => void;

export class ConfigNode<T> implements TreeNodeData<T> {
  public title: string;
  public items: T[];
  public children: ConfigNode<T>[];
  public parent: ConfigNode<T> | undefined;
  public expanded: boolean;
  public id: string;

  constructor(label: string) {
    this.title = label;
    this.items = [];
    this.children = [];
    this.parent = undefined;
    this.id = uuidv4();
    this.expanded = false;
  }

  public itemCount() {
    let sum = this.items.length;
    for (const child of this.children) {
      sum += child.itemCount();
    }
    return sum;
  }

  public addChild(...children: ConfigNode<T>[]) {
    for (const child of children) {
      child.parent = this;
    }
    this.children.push(...children);
  }

  public addItem(...items: T[]) {
    this.items.push(...items);
  }

  public filter(filter: FilterValue, filterFunc: FilterFunc<T>) {
    this.items = filterFunc(this.items, filter);
    this.children.forEach((e) => e.filter(filter, filterFunc));
  }

  public sort(key: Sort.Key, sorterFunc: SorterFunc<T>) {
    const sortByName = (a: ConfigNode<T>, b: ConfigNode<T>) => {
      return a.title
        .toLowerCase()
        .localeCompare(b.title.toLowerCase(), undefined, { numeric: true });
    };
    this.children.sort(sortByName);

    sorterFunc(this.items, key);
    //node.nodes.sort(); TODO: SORT FOLDERS
    this.children.forEach((e) => e.sort(key, sorterFunc));
  }

  public toArray() {
    const res: T[] = [];
    res.push(...this.items);
    for (const node of this.children) {
      res.push(...node.toArray());
    }
    return res;
  }
}

export type TreeOptions = {
  showSupportedOnly: boolean;
};

export function createTree(
  configs: any,
  showSupportedOnly: boolean,
): ConfigNode<Config> {
  const root = new ConfigNode<Config>("Root");
  const [
    my_configs,
    recommended_configs,
    community_configs,
    other_configs,
    unsupported_configs,
  ] = [
    new ConfigNode<Config>("My Configs"),
    new ConfigNode<Config>("Recommended Configs"),
    new ConfigNode<Config>("Community Configs"),
    new ConfigNode<Config>("Other Configs"),
    new ConfigNode<Config>("Unsupported Configs"),
  ];

  const cm = get(config_manager);

  my_configs.addItem(
    ...configs.filter((e: Config) => {
      const isMyConfig =
        e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
      return isMyConfig;
    }),
  );
  recommended_configs.addItem(
    ...configs.filter((e: Config) => {
      const isMyConfig =
        e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
      const isOfficialConfig =
        configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(e.owner ?? "");

      const cct = get(compatible_config_types);

      return (
        !isMyConfig &&
        isOfficialConfig &&
        (!showSupportedOnly || cct.includes(e.type))
      );
    }),
  );
  community_configs.addItem(
    ...configs.filter((e: Config) => {
      const isMyConfig =
        e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
      const isOfficialConfig =
        configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(e.owner ?? "");
      const cct = get(compatible_config_types);
      return (
        !isMyConfig &&
        !isOfficialConfig &&
        (!showSupportedOnly || cct.includes(e.type))
      );
    }),
  );
  other_configs.addItem(
    ...configs.filter((e: Config) => {
      const isMyConfig =
        e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
      const cct = get(compatible_config_types);
      return !isMyConfig && (!showSupportedOnly || cct.includes(e.type));
    }),
  );
  unsupported_configs.addItem(
    ...configs.filter((e: Config) => {
      const isMyConfig =
        e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
      const cct = get(compatible_config_types);

      return !isMyConfig && showSupportedOnly && !cct.includes(e.type);
    }),
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

  root.children.forEach((category) => {
    for (const item of category.items) {
      const path = item.virtualPath;
      if (typeof path !== "undefined") {
        const parts = path.split("/");
        let node = category;
        for (let i = 0; i < parts.length; ++i) {
          const part = parts[i];
          const found = node.children.find((e) => e.title === part);
          if (found) {
            node = found;
          } else {
            const newNode = new ConfigNode<Config>(part);
            node.addChild(newNode);
            node = newNode;
          }
        }
        node.addItem(item);
      }
    }

    category.items = category.items.filter((e: any) => {
      return typeof e.virtualPath === "undefined";
    });
  });

  return root;
}
