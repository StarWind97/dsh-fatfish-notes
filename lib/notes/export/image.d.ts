/** Bounded header inspection before asking a decoder to allocate a full raster. */
export declare function imageDimensions(bytes: Uint8Array, limits?: {
    side: number;
    imagePixels: number;
}): {
    width: number;
    height: number;
};
