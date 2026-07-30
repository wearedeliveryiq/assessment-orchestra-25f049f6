import type { AuditEventInput } from "./types";

/**
 * AuditEventConsumer
 *
 * Single responsibility: drain a queue of audit events into a sink (normally
 * the AuditRepository), with bounded batching, exponential retry and a
 * dead-letter buffer so a persistence outage never loses more than the
 * configured buffer and never propagates into the Intelligence Runtime.
 */
export interface AuditSink {
  (events: AuditEventInput[]): Promise<unknown>;
}

export interface ConsumerOptions {
  batchSize?: number;
  maxAttempts?: number;
  retryBaseMs?: number;
  deadLetterLimit?: number;
  logger?: Pick<Console, "error" | "warn">;
  /** Injected for deterministic tests. */
  sleep?: (ms: number) => Promise<void>;
}

export interface ConsumerStats {
  queued: number;
  delivered: number;
  retried: number;
  deadLettered: number;
  draining: boolean;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class AuditEventConsumer {
  private readonly queue: AuditEventInput[] = [];
  private readonly deadLetters: AuditEventInput[] = [];
  private draining = false;
  private pending: Promise<void> | null = null;
  private delivered = 0;
  private retried = 0;

  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly deadLetterLimit: number;
  private readonly logger: Pick<Console, "error" | "warn">;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly sink: AuditSink,
    options: ConsumerOptions = {},
  ) {
    this.batchSize = options.batchSize ?? 25;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.retryBaseMs = options.retryBaseMs ?? 25;
    this.deadLetterLimit = options.deadLetterLimit ?? 500;
    this.logger = options.logger ?? console;
    this.sleep = options.sleep ?? defaultSleep;
  }

  enqueue(events: AuditEventInput[]): void {
    this.queue.push(...events);
  }

  get stats(): ConsumerStats {
    return {
      queued: this.queue.length,
      delivered: this.delivered,
      retried: this.retried,
      deadLettered: this.deadLetters.length,
      draining: this.draining,
    };
  }

  /** Events that could not be persisted after every retry attempt. */
  get deadLetterQueue(): readonly AuditEventInput[] {
    return this.deadLetters;
  }

  /** Requeues dead letters for another delivery attempt. */
  replayDeadLetters(): number {
    const count = this.deadLetters.length;
    this.queue.push(...this.deadLetters.splice(0, count));
    return count;
  }

  /** Starts (or joins) a background drain. Never rejects. */
  schedule(): Promise<void> {
    if (this.pending) return this.pending;
    this.pending = this.drain().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  /** Awaits full delivery of everything queued so far. */
  async flush(): Promise<void> {
    await this.schedule();
    if (this.queue.length > 0) await this.schedule();
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batchSize);
        await this.deliver(batch);
      }
    } finally {
      this.draining = false;
    }
  }

  private async deliver(batch: AuditEventInput[]): Promise<void> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        await this.sink(batch);
        this.delivered += batch.length;
        return;
      } catch (error) {
        this.retried += 1;
        this.logger.warn(
          `[audit-consumer] delivery attempt ${attempt}/${this.maxAttempts} failed`,
          error instanceof Error ? error.message : error,
        );
        if (attempt < this.maxAttempts) {
          await this.sleep(this.retryBaseMs * 2 ** (attempt - 1));
        }
      }
    }

    this.logger.error(`[audit-consumer] dead-lettering ${batch.length} audit event(s)`);
    this.deadLetters.push(...batch);
    if (this.deadLetters.length > this.deadLetterLimit) {
      this.deadLetters.splice(0, this.deadLetters.length - this.deadLetterLimit);
    }
  }
}
