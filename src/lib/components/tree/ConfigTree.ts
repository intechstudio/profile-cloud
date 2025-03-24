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

type FilterFunc<T> = (items: T[], filter: FilterValue) => T[];
type SorterFunc<T> = (items: T[], key: Sort.Key) => void;

export class TreeNodeData<T> {
  public title: string;
  public items: T[];
  public children: TreeNodeData<T>[];
  public parent: TreeNodeData<T> | undefined;
  public open: Writable<boolean>;
  public id: string;

  constructor(label: string) {
    this.title = label;
    this.items = [];
    this.children = [];
    this.parent = undefined;
    this.open = writable(false);
    this.id = uuidv4();
  }

  itemCount() {
    let sum = this.items.length;
    for (const child of this.children) {
      sum += child.itemCount();
    }
    return sum;
  }

  addChild(...children: TreeNodeData<T>[]) {
    for (const child of children) {
      child.parent = this;
    }
    this.children.push(...children);
  }

  addItem(...items: T[]) {
    this.items.push(...items);
  }

  filter(filter: FilterValue, filterFunc: FilterFunc<T>) {
    this.items = filterFunc(this.items, filter);
    this.children.forEach((e) => e.filter(filter, filterFunc));
  }

  sort(key: Sort.Key, sorterFunc: SorterFunc<T>) {
    const sortByName = (a: TreeNodeData<T>, b: TreeNodeData<T>) => {
      return a.title
        .toLowerCase()
        .localeCompare(b.title.toLowerCase(), undefined, { numeric: true });
    };
    this.children.sort(sortByName);

    sorterFunc(this.items, key);
    //node.nodes.sort(); TODO: SORT FOLDERS
    this.children.forEach((e) => e.sort(key, sorterFunc));
  }

  toArray() {
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
  showSupportedOnly: boolean
): TreeNodeData<Config> {
  const root = new TreeNodeData<Config>("Root");
  const [
    my_configs,
    recommended_configs,
    community_configs,
    other_configs,
    unsupported_configs,
  ] = [
    new TreeNodeData<Config>("My Configs"),
    new TreeNodeData<Config>("Recommended Configs"),
    new TreeNodeData<Config>("Community Configs"),
    new TreeNodeData<Config>("Other Configs"),
    new TreeNodeData<Config>("Unsupported Configs"),
  ];

  const cm = get(config_manager);

  my_configs.addItem(
    ...configs.filter((e: Config) => {
      const isMyConfig =
        e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
      return isMyConfig;
    })
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
    })
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
    })
  );
  other_configs.addItem(
    ...configs.filter((e: Config) => {
      const isMyConfig =
        e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
      const cct = get(compatible_config_types);
      return !isMyConfig && (!showSupportedOnly || cct.includes(e.type));
    })
  );
  unsupported_configs.addItem(
    ...configs.filter((e: Config) => {
      const isMyConfig =
        e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
      const cct = get(compatible_config_types);

      return !isMyConfig && showSupportedOnly && !cct.includes(e.type);
    })
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
            const newNode = new TreeNodeData<Config>(part);
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
