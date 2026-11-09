export function noteLinkId(url: string): string | null { return /^fatfish-note:([0-7][0-9A-HJKMNP-TV-Z]{25})$/.exec(url)?.[1] ?? null }
export function attachmentLinkId(url: string): string | null { return /^\.\.\/attachments\/([a-f0-9]{64})\.bin$/.exec(url)?.[1] ?? null }
export function markdownLabel(label: string): string { return label.replace(/[\r\n]/g, ' ').replace(/[\\\[\]]/g, '\\$&') }
