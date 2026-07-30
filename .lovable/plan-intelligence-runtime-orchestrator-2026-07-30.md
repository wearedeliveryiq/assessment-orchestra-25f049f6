# Intelligence Runtime Orchestrator

Promote today's inline pipeline in `runtime.server.ts` into a dedicated, configuration-driven orchestration layer that becomes the only way any UI or API can execute the intelligence engines.

## What gets built

**Execution model (database)**
- New `runtime_executions` table: id, assessment_session_id, knowledge_pack_id/version, status (queued, starting, running, paused, completed, failed, cancelled), current_stage, started_at, completed_at, duration_ms, progress, error_message, retry_count, execution_mode, correlation_id, owner_key.
- New `runtime_execution_stages` table: per-stage status, attempt, timings, error, retry history — the source of truth for progress and stage timings.
- Row-level security scoped by owner key; history rows are insert/update-only from the server, never deleted by clients.

**Services (one responsibility each)**
- `RuntimeOrchestrator` — public entry point: execute, cancel, retry, status.
- `PipelineValidator` — pack validity, assessment completeness, engine availability, no in-flight execution, required config.
- `PipelineExecutor` — walks the pipeline definition, calls engine adapters, records stage results.
- `ExecutionManager` / `ExecutionStateManager` — legal state transitions only.
- `ExecutionRepository` — all persistence.
- `RetryManager` — failure classification (transient vs permanent), configurable attempts, exponential backoff.
- `ExecutionEventPublisher` / `ExecutionEventConsumer` — lifecycle events into the existing Audit service.
- `ExecutionScheduler` — thin queue abstraction; manual trigger now, scheduled/batch later.

**Pipeline as configuration**
- A pipeline descriptor (stage id, engine key, dependsOn, retry policy, optional flag) lives beside the Knowledge Pack runtime, so a pack can extend or reorder stages without touching orchestration code.
- `dependsOn` is honoured as a dependency graph today executed sequentially in topological order — parallel fan-out later needs no rewrite.

**REST APIs** (only surface the frontend uses)
- `POST /assessment/{id}/execute`, `GET /execution/{id}`, `GET /execution/{id}/status`, `POST /execution/{id}/cancel`, `POST /execution/{id}/retry`, `GET /execution/history`.
- Existing assessment submit/retry routes delegate to the orchestrator rather than running engines themselves.

**UI**
- Processing screen switches to the execution status API: current stage, per-stage ticks, percentage, estimated completion, retry state, errors.
- New internal Runtime Monitor at `/internal/runtime`: active/completed/failed executions, queue, average duration, stage timings, retry history, pipeline health, with filters for organisation, knowledge pack, date and status.
- Dashboard invalidates and refreshes on execution completion.

**Tests**
- Unit: state transitions, retry/backoff and classification, progress maths, validation rejections, event publishing, cancellation.
- Integration: one full assessment through orchestrator → all seven engines → audit → dashboard, asserting stage order and consistent execution history.

## Technical notes

- Execution is asynchronous: the execute endpoint persists a queued execution and returns immediately; the pipeline runs off the request path and survives a restart because state lives in the database (a stale `running` execution is reclaimed and resumable/retryable).
- Retry resumes at the first non-completed stage, reusing persisted outputs of earlier stages so responses and prior engine results are never recomputed or lost.
- Cancellation is cooperative: a cancel flag is checked between stages, leaving data consistent.
- Engines are wrapped in adapters with a uniform `run(context)` signature, so no orchestration code imports engine internals and any engine can be swapped.
