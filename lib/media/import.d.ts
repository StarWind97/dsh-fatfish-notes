import { type ImageAsset } from '../media/images.js';
type Address = {
    address: string;
    family: number;
};
type Lookup = (hostname: string) => Promise<Address[]>;
/** Conservative global-unicast policy; reject transition and special-use ranges. */
export declare function isPublicAddress(address: string): boolean;
export declare function publicImageTarget(input: string, resolve?: Lookup): Promise<{
    url: URL;
    address: Address;
}>;
interface ImageResponse {
    status: number;
    location?: string;
    mediaType: string;
    bytes: Buffer;
}
type ImageRequest = (target: {
    url: URL;
    address: Address;
}, signal: AbortSignal) => Promise<ImageResponse>;
export declare function importImage(input: string, signal?: AbortSignal, dependencies?: {
    lookup?: Lookup;
    request?: ImageRequest;
}): Promise<ImageAsset>;
export {};
