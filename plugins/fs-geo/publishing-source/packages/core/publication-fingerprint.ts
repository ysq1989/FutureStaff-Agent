import { createHash } from "node:crypto";
import type { LocalJob } from "./local-publication.js";
export function publicationFingerprint(task: LocalJob & { tenantId: string }) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        task.tenantId,
        task.projectId,
        task.id,
        task.articleId,
        task.accountId,
        task.version,
        new Date(task.scheduledAt).toISOString(),
        task.title,
        task.body,
      ]),
    )
    .digest("hex");
}
