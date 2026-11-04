/** Bounded header inspection before asking a decoder to allocate a full raster. */
export declare function imageDimensions(bytes: Uint8Array): {
    width: number;
    height: number;
};
