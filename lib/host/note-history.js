import { canonical, fail } from '../notes/validation.js';
/** Shared bounded, gap-checked frozen log reader. Capture and AI scheduling
 * project the same events differently; neither may weaken pagination safety. */
export async function readNoteHistory(controller, sessionId, throughSeq, signal) {
    const events = new Map();
    let beforeSeq, bytes = 0;
    for (;;) {
        signal.throwIfAborted();
        const page = await controller.page({ address: { kind: 'session', sessionId: sessionId }, throughSeq, ...(beforeSeq === undefined ? {} : { beforeSeq }), maxMessages: 40 }, signal);
        signal.throwIfAborted();
        let earliest = beforeSeq ?? throughSeq + 1;
        for (const record of page.records) {
            if (record.type !== 'event')
                fail('capture_protocol');
            const event = record.event;
            if (!Number.isSafeInteger(event.seq) || event.seq < 0 || event.seq > throughSeq)
                fail('capture_protocol', '宿主返回了截止点以外的记录');
            const old = events.get(event.seq);
            if (old && canonical(old) !== canonical(event))
                fail('capture_changed', '固定截止点的记录发生变化，请保留原请求核对');
            if (!old) {
                events.set(event.seq, event);
                bytes += Buffer.byteLength(canonical(event));
                if (bytes > 128 * 1024 * 1024 || events.size > 500_000)
                    fail('note_limit', '会话日志超过本次采集上限');
            }
            earliest = Math.min(earliest, event.seq);
        }
        if (!page.hasMore)
            break;
        if (earliest >= (beforeSeq ?? throughSeq + 1))
            fail('capture_no_progress', '历史分页没有前进，可用原请求重试');
        beforeSeq = earliest;
    }
    const ordered = [...events.values()].sort((a, b) => a.seq - b.seq);
    // rc.5 inherited prefixes also start at zero. Exhaustion is not completeness.
    if (ordered.length !== throughSeq + 1 || ordered.some((e, i) => e.seq !== i))
        fail('capture_gap', '会话历史存在缺页，可用原请求重试');
    return ordered;
}
