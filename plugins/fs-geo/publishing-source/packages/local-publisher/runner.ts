import {
  PublicationExecutor,
  type PublisherAdapter,
} from "../adapters/publication-executor.js";
import {
  localClaimSchema,
  localResult,
  type LocalClaim,
  type LocalResult,
} from "../core/local-publication.js";
import type { PublicationJournal } from "./journal.js";
import { publicationFingerprint } from "../core/publication-fingerprint.js";

export interface LocalPublisherApi {
  // Implement in the authenticated GEO same-origin view; never extract its session cookie.
  authorize(
    claim: LocalClaim,
  ): Promise<{
    canExecute: boolean;
    leaseExpiresAt: string;
    contentHash: string;
  }>;
  report(claim: LocalClaim, result: LocalResult): Promise<void>;
}
export interface PublicationConfirmation {
  jobId: string;
  accountId: string;
  version: number;
}
export class LocalPublicationRunner {
  constructor(
    private api: LocalPublisherApi,
    private adapter: PublisherAdapter,
    private journal: PublicationJournal,
  ) {}
  async run(
    claim: LocalClaim,
    confirmation: PublicationConfirmation,
  ): Promise<LocalResult> {
    claim = localClaimSchema.parse(claim);
    if (
      confirmation.jobId !== claim.id ||
      confirmation.accountId !== claim.accountId ||
      confirmation.version !== claim.version
    )
      throw Error("发布确认与文章版本或账号不匹配");
    const previous = await this.journal.read(claim);
    if (previous) {
      const result =
        previous.state === "RESULT"
          ? previous.result
          : await this.journal.save(claim, {
              state: "UNKNOWN",
              errorCode: "LOCAL_EXECUTION_INTERRUPTED",
            });
      await this.api.report(claim, result);
      return result;
    }
    if (!this.adapter.verified) throw Error("本地发布驱动尚未核验");
    const authority = await this.api.authorize(claim);
    if (
      !authority.canExecute ||
      !Number.isFinite(Date.parse(authority.leaseExpiresAt)) ||
      Date.parse(authority.leaseExpiresAt) <= Date.now() + 150000 ||
      Date.parse(claim.leaseExpiresAt) !== Date.parse(authority.leaseExpiresAt)
    )
      throw Error("发布权限或租约已失效，请重新核查");
    if (authority.contentHash !== publicationFingerprint(claim))
      throw Error("发布内容与云端已审核版本不一致");
    if (
      claim.state !== "RUNNING" ||
      Date.parse(claim.scheduledAt) > Date.now() ||
      !claim.title.trim() ||
      !claim.body.trim()
    )
      throw Error("发布任务状态或内容不符合要求");
    if (!(await this.journal.reserve(claim)))
      throw Error("任务已被其他执行端占用，请核查头条记录");
    const executor = new PublicationExecutor(this.adapter, async () => {
      const current = await this.api.authorize(claim);
      return (
        current.canExecute &&
        current.contentHash === publicationFingerprint(claim) &&
        Date.parse(current.leaseExpiresAt) > Date.now() + 135000
      );
    });
    const raw = await executor.execute(claim);
    const parsed = localResult.safeParse(raw);
    const result = await this.journal.save(
      claim,
      parsed.success
        ? parsed.data
        : { state: "UNKNOWN", errorCode: "LOCAL_PUBLICATION_RESULT_INVALID" },
    );
    // A callback failure leaves the persisted result for retransmission, not re-execution.
    await this.api.report(claim, result);
    return result;
  }
}
