/** Additive immutable sidecar: older readers keep these files without interpreting them. */
export type OrganizationEvent = {
    version: 1;
    clock: number;
    recordedAt: string;
    revision: string;
} & ({
    kind: 'pin';
    noteId: string;
    pinned: boolean;
} | {
    kind: 'book-order';
    ids: string[];
});
export declare const organizationPath: (event: OrganizationEvent) => string;
export declare function createOrganization(input: Omit<Extract<OrganizationEvent, {
    kind: 'pin';
}>, 'revision'> | Omit<Extract<OrganizationEvent, {
    kind: 'book-order';
}>, 'revision'>): OrganizationEvent;
export declare function validateOrganization(raw: unknown): OrganizationEvent;
export declare function mergeOrganization(...inputs: Array<OrganizationEvent[] | undefined>): OrganizationEvent[];
export declare function organizationState(events?: OrganizationEvent[]): {
    pins: Map<string, boolean>;
    order: string[];
};
export declare function organizationManifest(events: OrganizationEvent[]): string;
export declare function validateOrganizationManifest(raw: unknown, events: OrganizationEvent[], exact: boolean): void;
