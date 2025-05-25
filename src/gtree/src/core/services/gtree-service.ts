import { spawn } from 'child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

export class GtreeService {
    /**
     * Resolve target path considering GTREE_BASE_PATH environment variable
     * @param targetPath The target path to resolve
     * @returns Resolved absolute path
     */
    private static resolveTargetPath(targetPath: string): string {
        const basePath = process.env.GTREE_BASE_PATH;

        if (!basePath) {
            // No base path set, resolve relative to current working directory
            return path.resolve(targetPath);
        }

        if (path.isAbsolute(targetPath)) {
            // Target path is already absolute, use as-is
            return targetPath;
        }

        // Target path is relative, resolve relative to base path
        return path.resolve(basePath, targetPath);
    }

    public static async generateTree(
        targetPath: string = '.',
        treeArgs: string[] = []
    ): Promise<string> {
        const absolutePath = this.resolveTargetPath(targetPath);

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Path does not exist: ${targetPath}`);
        }

        const stat = fs.statSync(absolutePath);
        if (!stat.isDirectory()) {
            throw new Error(`Path is not a directory: ${targetPath}`);
        }

        return new Promise<string>((resolvePromise, rejectPromise) => {
            const fdCommand = 'fd';
            const fdArgs = ['.', '--type', 'f', '--type', 'd', '--hidden', '--exclude', '.git'];

            let fdOutput = '';
            let fdErrorOutput = '';

            // console.debug(`Executing fd in: ${absolutePath} with args: ${fdArgs.join(' ')}`);
            const fdProcess = spawn(fdCommand, fdArgs, { cwd: absolutePath, env: { ...process.env, NO_COLOR: '1' } });

            fdProcess.stdout.on('data', (data) => {
                fdOutput += data.toString();
            });

            fdProcess.stderr.on('data', (data) => {
                fdErrorOutput += data.toString();
            });

            fdProcess.on('error', (err) => {
                rejectPromise(new Error(`Failed to start fd process: ${err.message}`));
            });

            fdProcess.on('close', (code) => {
                // Trim and check fdErrorOutput
                const trimmedFdError = fdErrorOutput.trim();
                if (trimmedFdError && code !== 0) {
                    console.warn(`fd command stderr (code ${code}): ${trimmedFdError}`);
                } else if (trimmedFdError) {
                    console.warn(`fd command stderr (non-fatal): ${trimmedFdError}`);
                }

                if (code !== 0) {
                    rejectPromise(new Error(`fd command failed with code ${code}: ${trimmedFdError}`));
                    return;
                }

                const baseTreeArgs = ['.', '--fromfile', '-F', '--dirsfirst', '-C'];
                const finalTreeArgs = [...baseTreeArgs, ...treeArgs];

                let treeOutput = '';
                let treeErrorOutput = '';

                // console.debug(`Executing tree in: ${absolutePath} with args: ${finalTreeArgs.join(' ')}`);
                const treeProcess = spawn('tree', finalTreeArgs, { cwd: absolutePath });

                treeProcess.stdout.on('data', (data) => {
                    treeOutput += data.toString();
                });

                treeProcess.stderr.on('data', (data) => {
                    treeErrorOutput += data.toString();
                });

                treeProcess.on('error', (err) => {
                    rejectPromise(new Error(`Failed to start tree process: ${err.message}`));
                });

                treeProcess.on('close', (treeCode) => {
                    const trimmedTreeError = treeErrorOutput.trim();
                    if (trimmedTreeError) {
                        console.warn(`tree command stderr (code ${treeCode}): ${trimmedTreeError}`);
                    }
                    if (treeCode !== 0) {
                        rejectPromise(new Error(`tree command failed with code ${treeCode}: ${trimmedTreeError}`));
                        return;
                    }
                    resolvePromise(treeOutput.trim());
                });

                // Write fdOutput to tree stdin only if fdOutput is not empty
                // tree --fromfile with empty input might behave differently or error on some systems
                if (fdOutput.trim() !== '') {
                    treeProcess.stdin.write(fdOutput);
                }
                treeProcess.stdin.end();
            });
        });
    }
} 