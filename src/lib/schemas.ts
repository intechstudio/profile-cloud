import { Timestamp } from "firebase/firestore";
import { z } from "zod";

export const BaseConfigSchema = z.object({
    id: z.string(),
    modifiedAt: z.coerce.date().default(new Date()),
    createdAt: z.coerce.date().optional(),
    name: z.string(),
    description: z.string(),
    type: z.string(),
    version: z
        .object({
            major: z.string(),
            minor: z.string(),
            patch: z.string()
        })
        .optional(),
    configType: z.enum(["profile", "preset", "snippet"]),
    configs: z.any(),
    owner: z.string().optional(),
    virtualPath: z.string().optional()
});

export type BaseConfig = z.infer<typeof BaseConfigSchema>;

export const ConfigSchema = BaseConfigSchema.extend({
    isEditable: z.boolean(),
    syncStatus: z.enum(["synced", "cloud", "local"]),
    public: z.boolean().optional()
});

export type Config = z.infer<typeof ConfigSchema>;

export const LocalConfigSchema = BaseConfigSchema.extend({
    cloudId: z.string().optional(),
    fileName: z.string()
});

export type LocalConfig = z.infer<typeof LocalConfigSchema>;

export const CloudConfigSchema = BaseConfigSchema.extend({
    access: z.array(z.string()),
    modifiedAt: z.preprocess((val) => {
        if (!val) return new Date();
        if (val instanceof String) return new Date(val as string);
        if (val instanceof Timestamp) return val.toDate();
        return val;
    }, z.date().default(new Date())),
    createdAt: z.preprocess((val) => {
        if (!val) return new Date();
        if (val instanceof String) return new Date(val as string);
        if (val instanceof Timestamp) return val.toDate();
        return val;
    }, z.date().optional()),
    public: z.boolean().default(false)
});

export type CloudConfig = z.infer<typeof CloudConfigSchema>;
