import { ImportFix, FixerOptions } from '../types.js';
export declare class Reporter {
    static printTable(fixes: ImportFix[]): void;
    static printSummary(fixes: ImportFix[], unresolvedCount: number): void;
    static writeJsonReport(fixes: ImportFix[], errors: any[], options: FixerOptions, duration: number): Promise<string>;
    static printErrors(errors: any[]): void;
}
//# sourceMappingURL=report.d.ts.map