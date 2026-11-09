import type { RootContent, PhrasingContent } from 'mdast';
export interface PortableReference {
    url: string;
    image: boolean;
    start: number;
    end: number;
    node: RootContent | PhrasingContent;
}
export declare function references(body: string): PortableReference[];
export declare function changeReferences(body: string, change: (ref: PortableReference) => string | undefined): string;
