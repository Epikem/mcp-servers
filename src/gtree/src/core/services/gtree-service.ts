import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, resolve, relative, basename } from 'path';

export interface GtreeOptions {
    maxDepth?: number;
    showHidden?: boolean;
    excludeGit?: boolean;
    baseDirectory?: string;
}

export interface FileNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
    level: number;
}

export class GtreeService {
    private static createIgnoreInstance(baseDir: string): any {
        // Simple gitignore pattern matching without external library
        const defaultIgnores = ['.git', '.DS_Store', 'node_modules'];
        let gitignorePatterns: string[] = [];

        // Try to read .gitignore
        const gitignorePath = join(baseDir, '.gitignore');
        try {
            if (existsSync(gitignorePath)) {
                const gitignoreContent = readFileSync(gitignorePath, 'utf8');
                gitignorePatterns = gitignoreContent
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'));
            }
        } catch (error) {
            // Ignore errors reading .gitignore
        }

        const allIgnores = [...defaultIgnores, ...gitignorePatterns];

        return {
            ignores: (filePath: string) => {
                const normalizedPath = filePath.replace(/\\/g, '/');
                return allIgnores.some(pattern => {
                    if (pattern.endsWith('/**')) {
                        const dir = pattern.slice(0, -3);
                        return normalizedPath.startsWith(dir + '/') || normalizedPath === dir;
                    }
                    if (pattern.includes('/')) {
                        return normalizedPath.includes(pattern);
                    }
                    return normalizedPath.split('/').includes(pattern);
                });
            }
        };
    }

    private static async scanDirectory(
        dirPath: string,
        options: GtreeOptions,
        ig: any,
        currentLevel: number = 0
    ): Promise<FileNode[]> {
        if (options.maxDepth !== undefined && currentLevel >= options.maxDepth) {
            return [];
        }

        const items: FileNode[] = [];

        try {
            const entries = readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = join(dirPath, entry.name);
                const relativePath = relative(options.baseDirectory || '.', fullPath);

                // Skip hidden files unless explicitly requested
                if (!options.showHidden && entry.name.startsWith('.')) {
                    continue;
                }

                // Check if file should be ignored
                if (ig.ignores(relativePath)) {
                    continue;
                }

                const node: FileNode = {
                    name: entry.name,
                    path: relativePath,
                    isDirectory: entry.isDirectory(),
                    level: currentLevel
                };

                if (entry.isDirectory()) {
                    // Recursively scan subdirectories
                    node.children = await this.scanDirectory(
                        fullPath,
                        options,
                        ig,
                        currentLevel + 1
                    );
                }

                items.push(node);
            }
        } catch (error) {
            // Skip directories we can't read
        }

        // Sort: directories first, then files, both alphabetically
        return items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    private static formatTree(nodes: FileNode[], isLast: boolean[] = []): string {
        let result = '';

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const isLastNode = i === nodes.length - 1;

            // Build prefix
            let prefix = '';
            for (let j = 0; j < isLast.length; j++) {
                prefix += isLast[j] ? '    ' : '│   ';
            }
            prefix += isLastNode ? '└── ' : '├── ';

            result += prefix + node.name + '\n';

            // Process children if any
            if (node.children && node.children.length > 0) {
                const newIsLast = [...isLast, isLastNode];
                result += this.formatTree(node.children, newIsLast);
            }
        }

        return result;
    }

    public static async generateTree(
        targetPath: string = '.',
        options: GtreeOptions = {}
    ): Promise<string> {
        // Resolve absolute path
        const absolutePath = resolve(targetPath);

        // Check if path exists and is a directory
        if (!existsSync(absolutePath)) {
            throw new Error(`Path does not exist: ${targetPath}`);
        }

        const stat = statSync(absolutePath);
        if (!stat.isDirectory()) {
            throw new Error(`Path is not a directory: ${targetPath}`);
        }

        // Set base directory for relative path calculations
        options.baseDirectory = absolutePath;

        // Create ignore instance
        const ig = this.createIgnoreInstance(absolutePath);

        // Scan directory
        const nodes = await this.scanDirectory(absolutePath, options, ig);

        // Format as tree
        let result = basename(absolutePath) + '\n';
        if (nodes.length > 0) {
            result += this.formatTree(nodes);
        }

        return result;
    }

    public static parseTreeArgs(args: string[]): { path: string; options: GtreeOptions } {
        const options: GtreeOptions = {
            showHidden: false,
            excludeGit: true
        };

        let targetPath = '.';

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (arg === '-L' && i + 1 < args.length) {
                // Depth limit
                const depth = parseInt(args[i + 1]);
                if (!isNaN(depth)) {
                    options.maxDepth = depth;
                    i++; // Skip next argument
                }
            } else if (arg === '-a' || arg === '--all') {
                // Show hidden files
                options.showHidden = true;
            } else if (arg.startsWith('-L')) {
                // Handle -L2 format
                const depth = parseInt(arg.substring(2));
                if (!isNaN(depth)) {
                    options.maxDepth = depth;
                }
            } else if (!arg.startsWith('-')) {
                // Assume it's the target path
                targetPath = arg;
            }
        }

        return { path: targetPath, options };
    }
} 