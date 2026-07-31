import { PersistenceErrors } from "./errors";

/**
 * Unit of Work.
 *
 * The Data API exposes no multi-statement transaction, so atomicity across
 * aggregates is provided here: each step registers a compensating action and
 * a failure unwinds them in reverse order, leaving no partial writes behind.
 * Single-aggregate atomicity is still guaranteed by PostgreSQL itself.
 *
 * Flows that require *strict* ACID across tables (financial postings, quota
 * counters) should be expressed as a database function and invoked as one
 * step from here — see docs/persistence.md.
 */

export interface UnitOfWorkStep<T> {
  name: string;
  run: () => Promise<T>;
  compensate?: (result: T) => Promise<void>;
}

export interface TransactionResult<T> {
  value: T;
  steps: string[];
}

export class UnitOfWork {
  private readonly completed: { name: string; undo: () => Promise<void> }[] = [];
  private readonly executed: string[] = [];

  async step<T>(step: UnitOfWorkStep<T>): Promise<T> {
    const result = await step.run();
    this.executed.push(step.name);
    if (step.compensate) {
      this.completed.push({ name: step.name, undo: () => step.compensate!(result) });
    }
    return result;
  }

  get stepNames(): string[] {
    return [...this.executed];
  }

  async rollback(): Promise<void> {
    for (const entry of [...this.completed].reverse()) {
      try {
        await entry.undo();
      } catch (error) {
        // A failed compensation must never mask the original failure.
        console.error(`[persistence] rollback failed for step "${entry.name}"`, error);
      }
    }
    this.completed.length = 0;
  }
}

/**
 * Runs `work` transactionally. Any throw unwinds every compensating action
 * registered so far and surfaces a stable transaction error.
 */
export async function withTransaction<T>(
  label: string,
  work: (uow: UnitOfWork) => Promise<T>,
): Promise<TransactionResult<T>> {
  const uow = new UnitOfWork();
  try {
    const value = await work(uow);
    return { value, steps: uow.stepNames };
  } catch (error) {
    await uow.rollback();
    if (error && typeof error === "object" && "code" in error) throw error;
    console.error(`[persistence] transaction "${label}" failed`, error);
    throw PersistenceErrors.transaction(error);
  }
}
