export declare const createLinearIssue: (title: string, description: string) => Promise<{
    success: boolean;
    url: string;
    title: string;
    error?: never;
} | {
    success: boolean;
    error: unknown;
    url?: never;
    title?: never;
}>;
export declare const createLinearProject: (name: string, description: string) => Promise<{
    success: boolean;
    url: string;
    title: string;
    error?: never;
} | {
    success: boolean;
    error: unknown;
    url?: never;
    title?: never;
}>;
//# sourceMappingURL=linear.d.ts.map