import { AuditEventConsumer, type AuditSink, type ConsumerOptions } from "./consumer.server";
import type { AuditEventInput } from "./types";

/**
 * AuditEventPublisher
 *
 * Single responsibility: accept execution events from any engine and hand them
 * to the consumer without blocking the caller. `publish` is synchronous and
 * never throws — audit failures must never interrupt assessment execution.
 */
export interface PublisherContext {
  assessmentSessionId?: string | null;
  organisationId?: string;
  knowledgePackId?: string;
  knowledgePackVersion?: string;
  userId?: string;
  correlationId?: string;
  executionId?: string;
}

export class AuditEventPublisher {
  private readonly consumer: AuditEventConsumer;

  constructor(sink: AuditSink, options?: ConsumerOptions) {
    this.consumer = new AuditEventConsumer(sink, options);
  }

  /** Fire-and-forget. Returns immediately; delivery happens in the background. */
  publish(event: AuditEventInput): void {
    this.publishAll([event]);
  }

  publishAll(events: AuditEventInput[]): void {
    if (events.length === 0) return;
    const stamped = events.map((event) => ({
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    }));
    try {
      this.consumer.enqueue(stamped);
      void this.consumer.schedule().catch((error) => {
        console.error("[audit-publisher] drain failed", error);
      });
    } catch (error) {
      console.error("[audit-publisher] enqueue failed", error);
    }
  }

  /** Binds a shared execution context onto every event a caller publishes. */
  withContext(context: PublisherContext) {
    return {
      publish: (event: AuditEventInput) => this.publish({ ...context, ...event }),
      publishAll: (batch: AuditEventInput[]) =>
        this.publishAll(batch.map((event) => ({ ...context, ...event }))),
    };
  }

  flush(): Promise<void> {
    return this.consumer.flush();
  }

  get stats() {
    return this.consumer.stats;
  }

  get deadLetterQueue() {
    return this.consumer.deadLetterQueue;
  }

  replayDeadLetters(): number {
    const replayed = this.consumer.replayDeadLetters();
    if (replayed > 0) void this.consumer.schedule();
    return replayed;
  }
}
