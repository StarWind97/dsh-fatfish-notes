export interface ZipEntry {
    path: string;
    read: () => Promise<Uint8Array>;
}
/** Keep only one input file and one output chunk; response writes provide backpressure. */
export declare function zipEntries(entries: ZipEntry[], signal?: AbortSignal): AsyncGenerator<Uint8Array>;
export declare function zippedFile(filename: string, entries: ZipEntry[], signal?: AbortSignal, streaming?: boolean): Promise<{
    bytes: Buffer<ArrayBuffer>;
    filename: string;
    mediaType: string;
    stream: () => AsyncGenerator<Uint8Array<ArrayBufferLike>, any, any>;
} | {
    bytes: Buffer<ArrayBuffer>;
    filename: string;
    mediaType: string;
    stream?: never;
}>;
export declare function exportZip(filename: string, markdown: string, images: Record<string, Buffer>, attachments?: Record<string, Buffer>): Buffer;
