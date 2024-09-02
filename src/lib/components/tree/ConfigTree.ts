import { writable, type Writable } from "svelte/store";
import { get } from "svelte/store";
import configuration from "../../../../Configuration.json";
import { config_manager, compatible_config_types } from "./../../../routes/EditorLayout";
import { type Config } from "$lib/schemas";
import { filter_value, FilterValue } from "../../../routes/Filter";
import { Sort } from "../../../routes/Sorter";

type FilterFunc<T> = (items: T[], filter: FilterValue) => T[];
type SorterFunc<T> = (items: T[], key: Sort.Key) => void;

export class TreeNodeData<T> {
    private _label: string;
    private _children: T[];
    private _nodes: TreeNodeData<T>[];
    private _parent: TreeNodeData<T> | undefined;

    constructor(label: string) {
        this._label = label;
        this._children = [];
        this._nodes = [];
        this._parent = undefined;
    }

    get label() {
        return this._label;
    }

    get children() {
        return this._children;
    }

    set children(value: T[]) {
        this._children = value;
    }

    get nodes() {
        return this._nodes;
    }

    get parent() {
        return this._parent;
    }

    addNode(...nodes: TreeNodeData<T>[]) {
        for (const node of nodes) {
            node._parent = this;
        }
        this._nodes.push(...nodes);
    }

    addChild(...children: T[]) {
        this._children.push(...children);
    }

    filter(filter: FilterValue, filterFunc: FilterFunc<T>) {
        this._children = filterFunc(this._children, filter);
        this._nodes.forEach((e) => e.filter(filter, filterFunc));
    }

    sort(key: Sort.Key, sorterFunc: SorterFunc<T>) {
        const sortByName = (a: TreeNodeData<T>, b: TreeNodeData<T>) => {
            return a._label
                .toLowerCase()
                .localeCompare(b._label.toLowerCase(), undefined, { numeric: true });
        };
        this._nodes.sort(sortByName);

        sorterFunc(this._children, key);
        //node.nodes.sort(); TODO: SORT FOLDERS
        this._nodes.forEach((e) => e.sort(key, sorterFunc));
    }

    toArray() {
        const res: T[] = [];
        res.push(...this.children);
        for (const node of this.nodes) {
            res.push(...node.toArray());
        }
        return res;
    }
}

export type TreeOptions = {
    showSupportedOnly: boolean;
};

export type TreeKey = { label: string } | undefined;
export const tree_key: Writable<TreeKey> = writable({ label: "My Configs" });

export function createTree(configs: any, showSupportedOnly: boolean): TreeNodeData<Config>[] {
    const [my_configs, recommended_configs, community_configs, other_configs, unsupported_configs] =
        [
            new TreeNodeData<Config>("My Configs"),
            new TreeNodeData<Config>("Recommended Configs"),
            new TreeNodeData<Config>("Community Configs"),
            new TreeNodeData<Config>("Other Configs"),
            new TreeNodeData<Config>("Unsupported Configs")
        ];

    const cm = get(config_manager);

    my_configs.addChild(
        ...configs.filter((e: Config) => {
            const isMyConfig = e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
            return isMyConfig;
        })
    );
    recommended_configs.addChild(
        ...configs.filter((e: Config) => {
            const isMyConfig = e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
            const isOfficialConfig = configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(
                e.owner ?? ""
            );

            const cct = get(compatible_config_types);

            return !isMyConfig && isOfficialConfig && (!showSupportedOnly || cct.includes(e.type));
        })
    );
    community_configs.addChild(
        ...configs.filter((e: Config) => {
            const isMyConfig = e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
            const isOfficialConfig = configuration.RECOMMENDED_CONFIG_PROFILE_IDS.includes(
                e.owner ?? ""
            );
            const cct = get(compatible_config_types);
            return !isMyConfig && !isOfficialConfig && (!showSupportedOnly || cct.includes(e.type));
        })
    );
    other_configs.addChild(
        ...configs.filter((e: Config) => {
            const isMyConfig = e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
            const cct = get(compatible_config_types);
            return !isMyConfig && (!showSupportedOnly || cct.includes(e.type));
        })
    );
    unsupported_configs.addChild(
        ...configs.filter((e: Config) => {
            const isMyConfig = e.syncStatus == "local" || e.owner === cm?.getCurrentOwnerId();
            const cct = get(compatible_config_types);

            return !isMyConfig && showSupportedOnly && !cct.includes(e.type);
        })
    );

    const data: TreeNodeData<Config>[] = [];
    data.push(my_configs);

    const fv = get(filter_value);
    const isFiltering = fv.length > 0;
    if (isFiltering) {
        data.push(other_configs);
    } else {
        data.push(recommended_configs, community_configs);
    }

    if (showSupportedOnly) {
        data.push(unsupported_configs);
    }

    data.forEach((category) => {
        for (const child of category.children) {
            const path = child.virtualPath;
            if (typeof path !== "undefined") {
                const parts = path.split("/");
                let node = category;
                for (let i = 0; i < parts.length; ++i) {
                    const part = parts[i];
                    const found = node.nodes.find((e: any) => e.label === part);
                    if (found) {
                        node = found;
                    } else {
                        const newNode = new TreeNodeData<Config>(part);
                        node.addNode(newNode);
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
