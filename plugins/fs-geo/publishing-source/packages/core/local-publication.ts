import { z } from "zod";

export const localJobInput = z
  .object({
    articleId: z.uuid(),
    version: z.number().int().positive(),
    accountId: z.uuid(),
    scheduledAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const localClaimInput = z.object({ executorId: z.uuid() }).strict();
const receipt = z.string().trim().min(1).max(500);
const errorCode = z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/);
const toutiaoUrl = z
  .url()
  .max(2000)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ["www.toutiao.com", "toutiao.com"].includes(url.hostname) &&
      /^\/article\/\d+\/?$/.test(url.pathname) &&
      !url.search &&
      !url.hash
    );
  });
export const localResult = z.discriminatedUnion("state", [
  z.object({ state: z.literal("SUBMITTED"), receipt }).strict(),
  z
    .object({
      state: z.literal("PUBLISHED"),
      receipt,
      url: toutiaoUrl,
      confirmedAt: z.iso
        .datetime({ offset: true })
        .refine((v) => Date.parse(v) <= Date.now()),
    })
    .strict(),
  z.object({ state: z.literal("FAILED"), errorCode }).strict(),
  z.object({ state: z.literal("UNKNOWN"), errorCode }).strict(),
]);
export type LocalResult = z.infer<typeof localResult>;
export const localCallbackInput = localClaimInput
  .extend({ leaseToken: z.uuid(), result: localResult })
  .strict();
export interface LocalJob {
  id: string;
  projectId: string;
  articleId: string;
  accountId: string;
  version: number;
  scheduledAt: string;
  state: string;
  title: string;
  body: string;
  result: LocalResult | null;
  provenance: "LOCAL_REPORT" | null;
}
export interface LocalClaim extends LocalJob {
  tenantId: string;
  executorId: string;
  leaseToken: string;
  leaseExpiresAt: string;
}
export const localJobSchema = z
  .object({
    id: z.uuid(),
    projectId: z.uuid(),
    articleId: z.uuid(),
    accountId: z.uuid(),
    version: z.number().int().positive(),
    scheduledAt: z.iso.datetime({ offset: true }),
    state: z.enum([
      "PLANNED",
      "RUNNING",
      "SUBMITTED",
      "PUBLISHED",
      "FAILED",
      "UNKNOWN",
    ]),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(60000),
    result: localResult.nullable(),
    provenance: z.literal("LOCAL_REPORT").nullable(),
  })
  .strict();
export const localClaimSchema = localJobSchema
  .extend({
    tenantId: z.uuid(),
    executorId: z.uuid(),
    leaseToken: z.uuid(),
    leaseExpiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
