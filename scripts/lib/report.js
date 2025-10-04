import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
export class Reporter {
    static printTable(fixes) {
        const table = new Table({
            head: [
                chalk.cyan('File'),
                chalk.cyan('Old Import'),
                chalk.cyan('→'),
                chalk.cyan('New Import'),
                chalk.cyan('Heuristic'),
                chalk.cyan('Score'),
                chalk.cyan('Applied?')
            ],
            style: {
                head: [],
                border: []
            }
        });
        for (const fix of fixes) {
            const file = path.relative(process.cwd(), fix.file);
            const applied = fix.applied ? chalk.green('✓') : chalk.yellow('○');
            const score = fix.score.toFixed(2);
            table.push([
                chalk.blue(file),
                chalk.red(fix.oldImport),
                '→',
                chalk.green(fix.newImport),
                chalk.gray(fix.heuristic),
                chalk.yellow(score),
                applied
            ]);
        }
        console.log('\n' + table.toString());
    }
    static printSummary(fixes, unresolvedCount) {
        const applied = fixes.filter(f => f.applied).length;
        const total = fixes.length;
        console.log('\n' + chalk.bold('Summary:'));
        console.log(chalk.green(`  ✓ Fixed: ${applied}/${total} imports`));
        if (unresolvedCount > 0) {
            console.log(chalk.red(`  ✗ Unresolved: ${unresolvedCount} imports`));
        }
        // Group by heuristic
        const byHeuristic = new Map();
        for (const fix of fixes) {
            byHeuristic.set(fix.heuristic, (byHeuristic.get(fix.heuristic) || 0) + 1);
        }
        console.log('\n' + chalk.bold('Fixes by heuristic:'));
        for (const [heuristic, count] of byHeuristic) {
            console.log(`  ${chalk.gray(heuristic)}: ${count}`);
        }
    }
    static async writeJsonReport(fixes, errors, options, duration) {
        const timestamp = new Date().toISOString();
        const reportDir = path.join(process.cwd(), '.om', 'fix-imports');
        // Create directory if it doesn't exist
        await fs.promises.mkdir(reportDir, { recursive: true });
        const report = {
            timestamp,
            options,
            fixes,
            errors,
            unresolvedCount: errors.length - fixes.length,
            fixedCount: fixes.filter(f => f.applied).length,
            duration
        };
        const reportPath = path.join(reportDir, `report-${timestamp.replace(/:/g, '-')}.json`);
        await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
        console.log(chalk.gray(`\nReport written to: ${path.relative(process.cwd(), reportPath)}`));
        return reportPath;
    }
    static printErrors(errors) {
        if (errors.length === 0)
            return;
        console.log('\n' + chalk.bold.red('Errors:'));
        for (const error of errors.slice(0, 10)) {
            const file = path.relative(process.cwd(), error.file);
            console.log(chalk.red(`  ${file}: Cannot resolve "${error.specifier}"`));
        }
        if (errors.length > 10) {
            console.log(chalk.gray(`  ... and ${errors.length - 10} more`));
        }
    }
}
//# sourceMappingURL=report.js.map