import { createHash } from "node:crypto";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  localResult,
  type LocalClaim,
  type LocalResult,
} from "../core/local-publication.js";

export type JournalEntry =
  { state: "RESERVED" } | { state: "RESULT"; result: LocalResult };
export interface PublicationJournal {
  read(task: LocalClaim): Promise<JournalEntry | null>;
  reserve(task: LocalClaim): Promise<boolean>;
  save(task: LocalClaim, result: LocalResult): Promise<LocalResult>;
}
const missing = (error: unknown) =>
  (error as NodeJS.ErrnoException).code === "ENOENT";
const exists = (error: unknown) =>
  (error as NodeJS.ErrnoException).code === "EEXIST";

// Caller must supply a private, device-local directory, outside cloud-synced folders.
// No article, authentication token, cookie or lease is written here.
export class FilePublicationJournal implements PublicationJournal {
  constructor(private directory: string) {}
  private path(task: LocalClaim, suffix: string) {
    const key = createHash("sha256")
      .update(
        JSON.stringify([
          task.tenantId,
          task.projectId,
          task.accountId,
          task.id,
        ]),
      )
      .digest("hex");
    return join(this.directory, key + suffix);
  }
  private accountPath(task: LocalClaim) {
    const key = createHash("sha256")
      .update(JSON.stringify([task.tenantId, task.accountId]))
      .digest("hex");
    return join(this.directory, key + ".account-lock");
  }
  private async writeNew(path: string, data: unknown) {
    const file = await open(path, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(data), "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
  }
  async read(task: LocalClaim): Promise<JournalEntry | null> {
    try {
      return {
        state: "RESULT",
        result: localResult.parse(
          JSON.parse(await readFile(this.path(task, ".result.json"), "utf8")),
        ),
      };
    } catch (error) {
      if (!missing(error)) throw error;
    }
    try {
      await readFile(this.path(task, ".reserved.json"), "utf8");
      return { state: "RESERVED" };
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }
  async reserve(task: LocalClaim) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    if (await this.read(task)) return false;
    try {
      await this.writeNew(this.accountPath(task), { jobId: task.id });
    } catch (error) {
      if (exists(error))
        throw Error("当前账号已有执行或未知任务，请先核查头条记录");
      throw error;
    }
    // Failure leaves account blocked: execution must never proceed without a durable marker.
    await this.writeNew(this.path(task, ".reserved.json"), {
      jobId: task.id,
      version: task.version,
    });
    return true;
  }
  async save(task: LocalClaim, value: LocalResult) {
    const result = localResult.parse(value);
    try {
      await this.writeNew(this.path(task, ".result.json"), result);
    } catch (error) {
      if (!exists(error)) throw error;
    }
    const stored = await this.read(task);
    if (stored?.state !== "RESULT")
      throw Error("发布结果未安全保存，请核查头条记录");
    if (stored.result.state !== "UNKNOWN") {
      // Release only the lock belonging to this exact task.
      try {
        const owner = JSON.parse(
          await readFile(this.accountPath(task), "utf8"),
        );
        if (owner.jobId === task.id) await unlink(this.accountPath(task));
      } catch (error) {
        if (!missing(error)) throw error;
      }
    }
    return stored.result;
  }
}
