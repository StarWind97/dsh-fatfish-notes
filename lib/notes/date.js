/** Minute-precision local time for reading and exporting the same saved revision. */
export function noteDateTime(iso) {
    const d = new Date(iso), pad = (value) => String(value).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
