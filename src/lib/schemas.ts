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
      patch: z.string(),
    })
    .optional(),
  isGridProfile: z.boolean(),
  configs: z.any(),
});

export const ProfileLinkSchema = ProfileSchema.extend({
  linked: z.boolean().default(true),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type ProfileLink = z.infer<typeof ProfileLinkSchema>;
