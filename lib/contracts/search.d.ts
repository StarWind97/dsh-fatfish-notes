/** Shared literal terms; never interpret a user's search as a regular expression. */
export declare function searchTerms(query?: string): string[];
export declare function matchRanges(value: string, query: string): Array<[number, number]>;
