export function noteLinkId(url) { return /^fatfish-note:([0-7][0-9A-HJKMNP-TV-Z]{25})$/.exec(url)?.[1] ?? null; }
export function attachmentLinkId(url) { return /^\.\.\/attachments\/([a-f0-9]{64})\.bin$/.exec(url)?.[1] ?? null; }
export function markdownLabel(label) { return label.replace(/[\r\n]/g, ' ').replace(/[\\\[\]]/g, '\\$&'); }
