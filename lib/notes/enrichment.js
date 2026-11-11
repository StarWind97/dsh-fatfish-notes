import { NoteRepository } from './repository.js';
import { canonical, digest, hash, id, object, text, fail, keys, sortedStrings, assetId } from './validation.js';
import { missing, utf8 } from './files.js';
import { createNoteRevision, validateNoteRevision } from './revisions.js';
import { AI_LIMITS, attemptId, planStages, stagePrompt, stageResult } from './enrichment-plan.js';
import { NotebookError } from '../domain/errors.js';
const safeError = (error) => error instanceof NotebookError ? error.code : 'ai_unavailable';
const terminal = new Set(['completed', 'cancelled', 'candidate']);
/** Journal is local scheduling state, deliberately outside the revision sync
 * module. Every transition, including prompt admission identity, precedes I/O. */
export class NoteEnrichment {
    repository;
    model;
    tail = Promise.resolve();
    auxiliaryPending = new Set();
    async drain() { await Promise.allSettled([...this.auxiliaryPending]); }
    async close() { for (const controller of this.dispatches.values())
        controller.abort(); await this.drain(); }
    dispatches = new Map();
    cancelIntents = new Map();
    constructor(repository, model) {
        this.repository = repository;
        this.model = model;
    }
    run(work) { const result = this.tail.catch(() => { }).then(work); this.tail = result; return result; }
    checkCancelled(jobId) { if (this.cancelIntents.has(jobId))
        fail('ai_stale', '整理已请求停止，迟到任务不再采用'); }
    async write(job) { await this.repository.files.write(`jobs/${job.jobId}.json`, canonical({ job, checksum: digest(canonical(job)) }), false); }
    async read(jobId) {
        hash(jobId);
        const wrapped = object(JSON.parse(utf8(await this.repository.files.read(`jobs/${jobId}.json`, 128 * 1024 * 1024))));
        keys(wrapped, ['job', 'checksum']);
        const v = object(wrapped.job);
        if (v.version !== 1)
            fail('note_version');
        if (v.transport !== undefined && v.transport !== 'auxiliary')
            fail('ai_corrupt');
        keys(v, [...(v.transport !== undefined ? ['transport'] : []), 'version', 'jobId', 'captureRequestId', 'sessionId', 'noteId', 'sourceId', 'baseRevision', 'mode', 'autoMetadata', 'status', 'error', 'stages', 'candidate', 'adoption']);
        if (wrapped.checksum !== digest(canonical(v)) || v.jobId !== jobId || digest(text(v.captureRequestId, 512)) !== jobId)
            fail('ai_corrupt');
        id(v.noteId);
        hash(v.sourceId);
        hash(v.baseRevision);
        text(v.sessionId, 512);
        if (!['metadata', 'organize'].includes(String(v.mode)) || typeof v.autoMetadata !== 'boolean' || !['running', 'failed', 'cancelled', 'candidate', 'completed'].includes(String(v.status)) || !(v.error === null || typeof v.error === 'string') || !Array.isArray(v.stages) || v.stages.length > 33)
            fail('ai_corrupt');
        const job = v;
        // A pre-MVP body job must never dispatch, retry or replay an adoption.
        if (v.mode === 'organize' || this.model.auxiliary && job.transport !== 'auxiliary' && job.status !== 'completed')
            return { ...job, mode: 'metadata', status: 'cancelled', stages: [], candidate: null, adoption: null };
        for (const [index, stage] of job.stages.entries()) {
            keys(object(stage), ['kind', 'input', 'assetIds', 'attempt', 'requestId', 'status', 'result', 'error']);
            if (!['chunk', 'final'].includes(stage.kind) || typeof stage.input !== 'string' || stage.input.length > AI_LIMITS.characters || !Number.isSafeInteger(stage.attempt) || stage.attempt < 1 || stage.attempt > AI_LIMITS.attempts || stage.requestId !== attemptId(jobId, index, stage.attempt) || !['ready', 'waiting', 'done', 'failed'].includes(stage.status) || !Array.isArray(stage.assetIds))
                fail('ai_corrupt');
            sortedStrings(stage.assetIds, 128, assetId);
            if (stage.result)
                stageResult(stage.result, stage);
            if ((stage.status === 'done') !== (stage.result !== null))
                fail('ai_corrupt');
        }
        if (job.candidate) {
            const c = job.candidate;
            keys(object(c), ['requestId', 'noteId', 'sourceId', 'baseRevision', 'mode', 'title', 'summary', 'tags']);
            if (c.requestId !== job.stages.at(-1)?.requestId || c.noteId !== job.noteId || c.sourceId !== job.sourceId || c.baseRevision !== job.baseRevision || c.mode !== job.mode)
                fail('ai_corrupt');
            text(c.title, 1200);
            text(c.summary, 12_000);
            sortedStrings(c.tags, 50, tag => text(tag, 200));
        }
        if (job.adoption) {
            const r = validateNoteRevision(job.adoption);
            if (r.noteId !== job.noteId || r.sourceId !== job.sourceId)
                fail('ai_corrupt');
        }
        return job;
    }
    async list() { return (await this.repository.files.scan()).paths.filter(p => /^jobs\/[a-f0-9]{64}\.json$/.test(p)).map(p => p.slice(5, -5)); }
    ensure(request, captured, signal) {
        if (!request.autoMetadata)
            return Promise.resolve(null);
        return this.run(async () => {
            signal.throwIfAborted();
            const jobId = digest(request.requestId);
            const existing = await this.read(jobId).catch(e => { if (missing(e))
                return null; throw e; });
            if (existing) {
                if (existing.sessionId !== request.sessionId || existing.noteId !== captured.note.noteId || existing.sourceId !== captured.sourceId || existing.baseRevision !== captured.note.current.revision || existing.mode !== 'metadata' || existing.autoMetadata !== request.autoMetadata)
                    fail('source_mismatch');
                return existing;
            }
            const source = await this.repository.getSource(captured.sourceId, signal);
            const job = { ...(this.model.auxiliary ? { transport: 'auxiliary' } : {}), version: 1, jobId, captureRequestId: request.requestId, sessionId: request.sessionId, noteId: captured.note.noteId, sourceId: captured.sourceId, baseRevision: captured.note.current.revision, mode: 'metadata', autoMetadata: request.autoMetadata, status: 'running', error: null, stages: [], candidate: null, adoption: null };
            try {
                job.stages = planStages(source, jobId);
            }
            catch (error) {
                job.status = 'failed';
                job.error = safeError(error);
            }
            await this.write(job);
            return job;
        });
    }
    get(jobId) { return this.run(() => this.read(jobId)); }
    drive(jobId, signal) {
        return this.run(async () => {
            signal.throwIfAborted();
            const job = await this.read(jobId);
            if (job.status === 'running')
                this.checkCancelled(jobId);
            if (job.adoption && job.status === 'running') {
                await this.apply(job, signal);
                return job;
            }
            if (job.status !== 'running')
                return job;
            const stage = job.stages.find(s => s.status !== 'done');
            if (!stage) {
                await this.finish(job, signal);
                return job;
            }
            if (stage.status === 'failed')
                return job;
            if (this.model.auxiliary) {
                if (this.dispatches.has(jobId))
                    return job;
                if (stage.status === 'waiting') {
                    stage.status = 'failed';
                    stage.error = 'ai_interrupted';
                    job.status = 'failed';
                    job.error = 'ai_interrupted';
                    await this.write(job);
                    return job;
                }
                if (stage.kind === 'final' && job.stages.length > 1)
                    stage.input = job.stages.slice(0, -1).map((s, i) => `${i + 1}: ${s.result.summary}`).join('\n\n');
                stage.status = 'waiting';
                await this.write(job);
                this.startAuxiliary(job, stage);
                return job;
            }
            const controller = new AbortController(), active = AbortSignal.any([signal, controller.signal]);
            this.dispatches.set(jobId, controller);
            try {
                const inspected = await this.model.inspect(job.sessionId, [stage.requestId], active);
                active.throwIfAborted();
                this.checkCancelled(jobId);
                if (inspected.ended.includes(stage.requestId)) {
                    stage.status = 'failed';
                    stage.error = 'ai_no_candidate';
                    job.status = 'failed';
                    job.error = stage.error;
                    await this.write(job);
                    return job;
                }
                if (inspected.active.includes(stage.requestId))
                    return job;
                if (stage.kind === 'final' && job.stages.length > 1)
                    stage.input = job.stages.slice(0, -1).map((s, i) => `${i + 1}: ${s.result.summary}`).join('\n\n');
                if (stage.status !== 'waiting') {
                    stage.status = 'waiting';
                    await this.write(job);
                }
                // A failed HTTP receipt is UNKNOWN admission: only this exact request ID
                // may be replayed. A known ended model turn requires explicit retry.
                active.throwIfAborted();
                this.checkCancelled(jobId);
                const result = await this.model.dispatch(job, stage, stagePrompt(job, stage), active);
                active.throwIfAborted();
                this.checkCancelled(jobId);
                if (result) {
                    stage.result = stageResult(result, stage, !!this.model.auxiliary);
                    stage.status = 'done';
                    stage.error = null;
                    job.error = null;
                    await this.write(job);
                    if (job.stages.every(s => s.status === 'done'))
                        await this.finish(job, active);
                }
                if (job.error) {
                    job.error = null;
                    await this.write(job);
                }
            }
            catch (error) {
                active.throwIfAborted();
                job.error = safeError(error);
                if (this.model.auxiliary || job.error === 'ai_image_budget' || job.error === 'ai_budget') {
                    job.status = 'failed';
                    stage.status = 'failed';
                    stage.error = job.error;
                }
                await this.write(job);
            }
            finally {
                this.dispatches.delete(jobId);
            }
            return job;
        });
    }
    startAuxiliary(job, stage) {
        const controller = new AbortController(), signal = AbortSignal.any([controller.signal, AbortSignal.timeout(180_000)]);
        this.dispatches.set(job.jobId, controller);
        const task = Promise.resolve().then(() => this.model.dispatch(job, stage, stagePrompt(job, stage), signal)).then(result => this.run(async () => {
            signal.throwIfAborted();
            this.checkCancelled(job.jobId);
            const latest = await this.read(job.jobId), current = latest.stages.find(s => s.requestId === stage.requestId);
            if (latest.status !== 'running' || !current || current.status !== 'waiting')
                return;
            if (!result)
                fail('ai_no_candidate');
            current.result = stageResult(result, current, true);
            current.status = 'done';
            current.error = null;
            latest.error = null;
            await this.write(latest);
            if (latest.stages.every(s => s.status === 'done'))
                await this.finish(latest, signal);
        })).catch(error => this.run(async () => {
            const latest = await this.read(job.jobId), current = latest.stages.find(s => s.requestId === stage.requestId);
            if (latest.status !== 'running' || !current || current.status !== 'waiting')
                return;
            latest.status = 'failed';
            latest.error = signal.aborted ? 'ai_interrupted' : safeError(error);
            current.status = 'failed';
            current.error = latest.error;
            await this.write(latest);
        })).catch(() => { }).finally(() => { this.dispatches.delete(job.jobId); this.auxiliaryPending.delete(task); });
        this.auxiliaryPending.add(task);
    }
    submit(input, sessionId, signal) {
        return this.run(async () => {
            signal.throwIfAborted();
            const v = object(input);
            if (Object.keys(v).some(k => !['jobId', 'requestId', 'sourceId', 'baseRevision', 'title', 'summary', 'tags'].includes(k)))
                fail('note_schema');
            const job = await this.read(hash(v.jobId)), stage = job.stages.find(s => s.requestId === v.requestId);
            this.checkCancelled(job.jobId);
            if (!sessionId || sessionId !== job.sessionId || v.sourceId !== job.sourceId || v.baseRevision !== job.baseRevision || !stage || job.status === 'cancelled' || job.status === 'failed' || stage.status === 'ready' || stage.status === 'failed')
                fail('ai_stale');
            const inspected = await this.model.inspect(sessionId, [stage.requestId], signal);
            if (!inspected.active.includes(stage.requestId))
                fail('ai_session', '候选不属于正在执行的整理请求');
            const current = await this.repository.get(job.noteId, signal);
            this.checkCancelled(job.jobId);
            if (current.current.sourceId !== job.sourceId)
                fail('source_mismatch');
            const result = stageResult({ title: v.title, summary: v.summary, tags: v.tags }, stage);
            if (stage.result) {
                if (canonical(stage.result) !== canonical(result))
                    fail('ai_duplicate');
                return { jobId: job.jobId, status: job.status };
            }
            if (terminal.has(job.status) || job.stages.find(s => s.status !== 'done') !== stage)
                fail('ai_stale');
            stage.result = result;
            stage.status = 'done';
            stage.error = null;
            job.error = null;
            await this.write(job);
            if (job.stages.every(s => s.status === 'done'))
                await this.finish(job, signal);
            return { jobId: job.jobId, status: job.status };
        });
    }
    async finish(job, signal) {
        this.checkCancelled(job.jobId);
        const final = job.stages.at(-1)?.result;
        if (!final)
            fail('ai_corrupt');
        job.candidate = { requestId: job.stages.at(-1).requestId, noteId: job.noteId, sourceId: job.sourceId, baseRevision: job.baseRevision, mode: job.mode, title: final.title, summary: final.summary, tags: final.tags };
        await this.write(job);
        const current = await this.repository.get(job.noteId, signal);
        // Conservatively preserve any intervening human revision, including a field
        // edited then restored. Explicit adoption still checks the latest heads.
        if (current.heads.length !== 1 || current.current.revision !== job.baseRevision || current.current.status !== 'active') {
            job.status = 'candidate';
            await this.write(job);
            return;
        }
        await this.prepareAdoption(job, current.heads, signal);
    }
    async prepareAdoption(job, expectedHeads, signal) {
        const view = await this.repository.get(job.noteId, signal), candidate = job.candidate;
        this.checkCancelled(job.jobId);
        if (!candidate || canonical(view.heads) !== canonical(expectedHeads) || view.heads.length !== 1 || view.current.sourceId !== job.sourceId || view.current.status !== 'active')
            fail('note_conflict');
        const { revision: _revision, ...base } = view.current;
        const proposed = createNoteRevision({ ...base, recordedAt: new Date().toISOString(), parents: view.heads, title: candidate.title, summary: candidate.summary, tags: candidate.tags });
        job.status = 'running';
        await this.apply(job, signal, proposed);
    }
    async apply(job, signal, proposed = job.adoption) {
        try {
            this.checkCancelled(job.jobId);
            await this.repository.adoptRevision(proposed, async (revision) => {
                this.checkCancelled(job.jobId);
                signal.throwIfAborted();
                job.adoption = revision;
                await this.write(job);
                this.checkCancelled(job.jobId);
                signal.throwIfAborted();
            }, signal);
            job.status = 'completed';
            job.error = null;
        }
        catch (error) {
            if (!(error instanceof NotebookError) || error.code !== 'note_conflict')
                throw error;
            job.adoption = null;
            job.status = 'candidate';
            job.error = 'note_conflict';
        }
        await this.write(job);
    }
    adopt(jobId, expected, signal) {
        return this.run(async () => { const job = await this.read(jobId); if (job.status !== 'candidate')
            fail('ai_stale'); await this.prepareAdoption(job, sortedStrings(expected, 100_000, hash), signal); return job; });
    }
    cancel(jobId) { hash(jobId); this.cancelIntents.set(jobId, Symbol()); this.dispatches.get(jobId)?.abort(); return this.run(async () => { const job = await this.read(jobId); if (job.status !== 'completed') {
        job.status = 'cancelled';
        job.error = null;
        await this.write(job);
    } return job; }); }
    retry(jobId, signal) {
        const cancellation = this.cancelIntents.get(jobId);
        return this.run(async () => {
            signal.throwIfAborted();
            const job = await this.read(jobId);
            if (this.cancelIntents.get(jobId) !== cancellation)
                fail('ai_stale');
            if (job.status === 'completed' || job.status === 'candidate' || !job.stages.length)
                fail('ai_stale');
            const stage = job.stages.find(s => s.status !== 'done');
            if (stage && (stage.status === 'failed' || job.status === 'cancelled')) {
                if (stage.attempt >= AI_LIMITS.attempts)
                    fail('ai_budget');
                stage.attempt++;
                stage.requestId = attemptId(jobId, job.stages.indexOf(stage), stage.attempt);
                stage.status = 'ready';
                stage.error = null;
            }
            job.status = 'running';
            job.error = null;
            await this.write(job);
            if (this.cancelIntents.get(jobId) !== cancellation)
                fail('ai_stale');
            this.cancelIntents.delete(jobId);
            return job;
        });
    }
}
