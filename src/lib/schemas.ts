import { z } from "zod";

export const ProfileSchema = z.object({
    id: z.string().optional(),
    owner: z.string().nullable(),
    access: z.array(z.string()),
    createdAt: z.date().nullable().optional(),
    public: z.boolean().default(false),
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
    isGridProfile: z.boolean(),
    configs: z.any()
});

export const ProfileLinkSchema = ProfileSchema.extend({
    linked: z.boolean().default(true)
});

export type Profile = z.infer<typeof ProfileSchema>;
export type ProfileLink = z.infer<typeof ProfileLinkSchema>;

export const ConfigSchema = z.object({
    id: z.string().optional(),
    localId: z.string().optional(),
    cloudId: z.string().optional(),
    owner: z.string().nullable(),
    access: z.array(z.string()),
    createdAt: z.date().nullable().optional(),
    public: z.boolean().default(false),
    name: z.string(),
    fileName: z.string().optional(),
    description: z.string(),
    type: z.string(),
    version: z
        .object({
            major: z.string(),
            minor: z.string(),
            patch: z.string()
        })
        .optional(),
    configType: z.enum(["profile", "preset"]),
    configs: z.any()
});

export const ConfigLinkSchema = ConfigSchema.extend({
    linked: z.boolean().default(true)
});

export type Config = z.infer<typeof ConfigSchema>;
export type ConfigLink = z.infer<typeof ConfigLinkSchema>;
