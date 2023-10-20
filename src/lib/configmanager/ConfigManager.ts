import { userAccountService } from "$lib/stores";
import type { Unsubscribe } from "firebase/firestore";
import {
    or,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    deleteDoc,
    setDoc,
    updateDoc
} from "firebase/firestore";
import { configLinksCollection, configsCollection } from "$lib/collections";
import {
    type CloudConfig,
    type Config,
    type LocalConfig,
    type BaseConfig,
    CloudConfigSchema
} from "$lib/schemas";
import { parentIframeCommunication } from "$lib/utils";

export interface ConfigManager {
    cancel(): void;
    deleteConfig(config: Config): Promise<void>;
    saveConfig(config: BaseConfig, createMissingConfigs: boolean): Promise<void>;
    importLinkedConfig(linkId: string): Promise<CloudConfig | null | undefined>;
    changeCloudVisibility(config: Config, visibility: boolean): Promise<void>;
}

let latestLocalConfigs: LocalConfig[] = [];
let localConfigsChangeListeners: Set<() => void> = new Set();
export function updateLocalConfigs(configs: LocalConfig[]) {
    latestLocalConfigs = configs;
    localConfigsChangeListeners.forEach((e) => e());
}

export function createConfigManager(observer: {
    next?: (configs: Config[]) => void;
}): ConfigManager {
    let appConfigIdToConfigMap = new Map<
        string,
        { cloud: CloudConfig | undefined; local: LocalConfig | undefined }
    >();
    let configIdToAppConfigIdMap = new Map<string, string>();

    let cloudConfigs: CloudConfig[] | undefined = undefined;
    let localConfigs: LocalConfig[] = latestLocalConfigs;

    let currentOwnerId: string | null | undefined = undefined;

    //Merge the two config sources into a single object
    function updateConfigIdMaps() {
        let foundConfigIds = new Set<string>();

        localConfigs.forEach((config) => {
            foundConfigIds.add(config.id);
            if (!configIdToAppConfigIdMap.get(config.id)) {
                configIdToAppConfigIdMap.set(config.id, config.cloudId ?? config.id);
            }
            let appConfigId = configIdToAppConfigIdMap.get(config.id)!;
            if (config.cloudId != null) {
                configIdToAppConfigIdMap.set(config.cloudId, appConfigId);
            }

            if (!appConfigIdToConfigMap.get(appConfigId)) {
                appConfigIdToConfigMap.set(appConfigId, { cloud: undefined, local: undefined });
            }
            let appConfigs = appConfigIdToConfigMap.get(appConfigId)!;
            appConfigs.local = config;
        });

        cloudConfigs?.forEach((config) => {
            foundConfigIds.add(config.id);
            if (!configIdToAppConfigIdMap.get(config.id)) {
                configIdToAppConfigIdMap.set(config.id, config.id);
            }
            let appConfigId = configIdToAppConfigIdMap.get(config.id)!;

            if (!appConfigIdToConfigMap.get(appConfigId)) {
                appConfigIdToConfigMap.set(appConfigId, { cloud: undefined, local: undefined });
            }
            let appConfigs = appConfigIdToConfigMap.get(appConfigId)!;
            appConfigs.cloud = config;
        });

        var removedConfigIds = [...configIdToAppConfigIdMap.keys()].filter(
            (id) => !foundConfigIds.has(id)
        );
        removedConfigIds.forEach((id) => {
            let appConfigId = configIdToAppConfigIdMap.get(id)!;
            let appConfigs = appConfigIdToConfigMap.get(appConfigId)!;
            if (appConfigs.local?.id === id) {
                appConfigs.local = undefined;
            }
            if (appConfigs.cloud?.id === id) {
                appConfigs.cloud = undefined;
            }
            configIdToAppConfigIdMap.delete(id);
        });

        //Remove config where cloud and local config does not exist
        appConfigIdToConfigMap.forEach((value, key) => {
            if (!value.cloud && !value.local) {
                appConfigIdToConfigMap.delete(key);
            }
        });
    }

    function configsUpdated() {
        updateConfigIdMaps();
        let mergedConfigs: Config[] = [];
        appConfigIdToConfigMap.forEach((value, key) => {
            let syncStatus: "cloud" | "local" | "synced";
            let latestConfig;
            if (!value.local || (value.cloud?.modifiedAt ?? 0) > value.local!.modifiedAt) {
                syncStatus = "cloud";
                latestConfig = value.cloud!;
            } else if (!value.cloud || (value.local?.modifiedAt ?? 0) > value.cloud!.modifiedAt) {
                syncStatus = "local";
                latestConfig = value.local!;
            } else {
                latestConfig = value.local!;
                syncStatus = "synced";
            }
            mergedConfigs.push({
                ...latestConfig,
                id: key,
                isEditable:
                    (latestConfig as CloudConfig)?.access?.includes(currentOwnerId ?? "") ?? true,
                syncStatus: syncStatus,
                public: value.cloud?.public
            });
        });
        observer.next?.(mergedConfigs);
    }

    let cloudUnsub: Unsubscribe | undefined = undefined;
    function updateCloudSubscription() {
        cloudUnsub?.();
        let q;
        if (currentOwnerId) {
            q = query(
                configsCollection,
                or(
                    where("public", "==", true),
                    where("access", "array-contains", currentOwnerId ?? "")
                )
            );
        } else {
            q = query(configsCollection, where("public", "==", true));
        }

        cloudUnsub = onSnapshot(q, {
            next(snapshot) {
                cloudConfigs = snapshot.docs.map((doc) => CloudConfigSchema.parse(doc.data()));
                configsUpdated();
            }
        });
    }
    let userUnsub = userAccountService.subscribe(({ account }) => {
        currentOwnerId = account?.uid;
        updateCloudSubscription();
    });
    let localConfigsChangeListener = () => {
        localConfigs = latestLocalConfigs;
        configsUpdated();
    };
    localConfigsChangeListeners.add(localConfigsChangeListener);

    function cancel() {
        cloudUnsub?.();
        userUnsub();
        localConfigsChangeListeners.delete(localConfigsChangeListener);
    }

    async function deleteConfig(config: Config) {
        let appConfigs = appConfigIdToConfigMap.get(config.id);
        if (!appConfigs) return;

        let localConfig = appConfigs.local;
        let cloudConfig = appConfigs.cloud;

        if (localConfig) {
            configIdToAppConfigIdMap.delete(localConfig.id);
            await parentIframeCommunication({
                windowPostMessageName: "deleteLocalConfig",
                dataForParent: { config: localConfig }
            });
        }
        if (cloudConfig) {
            configIdToAppConfigIdMap.delete(cloudConfig.id);
            const configRef = doc(configsCollection, cloudConfig.id);
            deleteDoc(configRef);
        }
        appConfigIdToConfigMap.delete(config.id);
    }

    async function saveConfig(config: BaseConfig, createMissingConfigs: boolean) {
        let appConfigs = appConfigIdToConfigMap.get(config.id);
        config.modifiedAt = new Date();

        let cloudId = appConfigs?.cloud?.id;
        if (currentOwnerId != null && (createMissingConfigs || cloudId)) {
            cloudId = cloudId ?? doc(configsCollection).id;
            let configRef = doc(configsCollection, cloudId);

            const configToSave = CloudConfigSchema.parse({
                ...config,
                id: configRef.id,
                public: appConfigs?.cloud?.public ?? false,
                owner: currentOwnerId,
                access: [currentOwnerId]
            });

            //Store cloudId in map to avoid duplicate config flashing
            if (appConfigs?.local) {
                localConfigs.find((e) => e.id === appConfigs!.local!.id)!.cloudId = cloudId;
            }

            setDoc(configRef, configToSave);
            cloudId = configRef.id;
        }

        if (createMissingConfigs || appConfigs?.local) {
            await parentIframeCommunication({
                windowPostMessageName: "configImportCommunication",
                dataForParent: {
                    ...config,
                    id: appConfigs?.local?.id,
                    cloudId: cloudId,
                    fileName: appConfigs?.local?.fileName,
                    owner: currentOwnerId
                }
            });
        }
    }

    async function changeCloudVisibility(config: Config, visibility: boolean) {
        updateDoc(doc(configsCollection, appConfigIdToConfigMap.get(config.id)!.cloud!.id), {
            public: visibility
        });
    }

    async function importLinkedConfig(linkId: string) {
        const docRef = doc(configLinksCollection, linkId);
        let configLink = await getDoc(docRef)
            .then((res) => CloudConfigSchema.parse(res.data()))
            .catch((err) => {
                console.log(err);
                return undefined;
            });

        if (configLink) {
            configLink.name = `Copy of ${configLink.name}`;
            configLink.owner = undefined;
            await saveConfig(configLink, true);
        }
        return configLink;
    }

    return {
        cancel,
        deleteConfig,
        saveConfig,
        importLinkedConfig,
        changeCloudVisibility
    };
}
