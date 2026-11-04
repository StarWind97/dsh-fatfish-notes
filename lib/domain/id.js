import { randomBytes } from 'node:crypto';
import { NotebookError } from './errors.js';
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function ulid(now = Date.now(), random = randomBytes) {
    if (!Number.isSafeInteger(now) || now < 0 || now > 281474976710655)
        throw new NotebookError('invalid_time', 'ULID 时间超出范围');
    let time = '', value = now;
    for (let i = 0; i < 10; i++) {
        time = CROCKFORD.charAt(value % 32) + time;
        value = Math.floor(value / 32);
    }
    const bytes = random(16);
    if (bytes.length < 16)
        throw new NotebookError('invalid_random', '随机源未提供足够字节');
    return time + [...bytes.subarray(0, 16)].map(byte => CROCKFORD.charAt(byte % 32)).join('');
}
