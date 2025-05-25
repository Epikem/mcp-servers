import * as path from 'node:path';
import * as process from 'node:process';

export class CwdService {
    /**
     * Get the current working directory
     * If GTREE_BASE_PATH environment variable is set, returns that path instead
     * @returns The absolute path of the current working directory
     */
    public static async getCurrentWorkingDirectory(): Promise<string> {
        try {
            const basePath = process.env.GTREE_BASE_PATH;

            if (basePath) {
                // Return the base path from environment variable
                return path.resolve(basePath);
            }

            // Fallback to actual current working directory
            const cwd = process.cwd();
            const absolutePath = path.resolve(cwd);
            return absolutePath;
        } catch (error) {
            throw new Error(`Failed to get current working directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get current working directory information including relative path from given base
     * If GTREE_BASE_PATH environment variable is set, uses that as the current directory
     * @param basePath Base path to calculate relative path from (optional)
     * @returns Object containing absolute path and optional relative path
     */
    public static async getCwdInfo(basePath?: string): Promise<{
        absolute: string;
        relative?: string;
        basePath?: string;
    }> {
        try {
            const envBasePath = process.env.GTREE_BASE_PATH;
            const cwd = envBasePath ? envBasePath : process.cwd();
            const absolutePath = path.resolve(cwd);

            const result: { absolute: string; relative?: string; basePath?: string } = {
                absolute: absolutePath
            };

            if (basePath && basePath.trim() !== '') {
                const resolvedBasePath = path.resolve(basePath);
                result.basePath = resolvedBasePath;
                result.relative = path.relative(resolvedBasePath, absolutePath);
            }

            return result;
        } catch (error) {
            throw new Error(`Failed to get current working directory info: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
} 