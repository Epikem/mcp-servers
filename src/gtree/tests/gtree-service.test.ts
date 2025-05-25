import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GtreeService } from '../src/core/services/gtree-service.js';
import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock fs module
vi.mock('node:fs');
vi.mock('node:path');
vi.mock('node:child_process');

describe('GtreeService', () => {
    const mockSpawn = vi.fn();
    const mockStdinWrite = vi.fn();
    const mockStdinEnd = vi.fn();

    // Helper to create a mock process object for spawn
    const createMockProcess = (stdoutData = '', stderrData = '', closeCode = 0, spawnError?: Error) => {
        const mockProcessObj: any = {
            on: vi.fn((event, callback) => {
                if (spawnError && event === 'error') {
                    callback(spawnError);
                } else if (!spawnError && event === 'close') {
                    callback(closeCode);
                }
                return mockProcessObj;
            }),
            stdout: {
                on: vi.fn((event, callback) => {
                    if (event === 'data' && stdoutData) {
                        callback(Buffer.from(stdoutData)); // Return Buffer like actual stdout
                    }
                    return mockProcessObj.stdout;
                }),
                setEncoding: vi.fn(),
            },
            stderr: {
                on: vi.fn((event, callback) => {
                    if (event === 'data' && stderrData) {
                        callback(Buffer.from(stderrData)); // Return Buffer
                    }
                    return mockProcessObj.stderr;
                }),
                setEncoding: vi.fn(),
            },
            stdin: {
                write: mockStdinWrite,
                end: mockStdinEnd,
            },
        };
        return mockProcessObj;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Ensure mockSpawn itself is the mock implementation for spawn
        vi.mocked(child_process.spawn).mockImplementation(mockSpawn);

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
        vi.mocked(path.resolve).mockImplementation((p) => `/abs/${p}`);
        vi.mocked(path.isAbsolute).mockImplementation((p) => p.startsWith('/'));
        vi.mocked(path.basename).mockImplementation((p) => p.substring(p.lastIndexOf('/') + 1));
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        // Clear environment variable before each test
        delete process.env.GTREE_BASE_PATH;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        // Clean up environment variable
        delete process.env.GTREE_BASE_PATH;
    });

    describe('generateTree', () => {
        it('should call fd and tree with correct arguments for default path', async () => {
            mockSpawn
                .mockReturnValueOnce(createMockProcess('some/file\n', '', 0)) // fd success
                .mockReturnValueOnce(createMockProcess('mocked_tree_output', '', 0)); // tree success

            const result = await GtreeService.generateTree('.', []);

            expect(mockSpawn).toHaveBeenCalledTimes(2);
            expect(mockSpawn).toHaveBeenNthCalledWith(1, 'fd', ['.', '--type', 'f', '--type', 'd', '--hidden', '--exclude', '.git'], { cwd: '/abs/.', env: expect.anything() });
            expect(mockSpawn).toHaveBeenNthCalledWith(2, 'tree', ['.', '--fromfile', '-F', '--dirsfirst', '-C'], { cwd: '/abs/.' });
            expect(mockStdinWrite).toHaveBeenCalledWith('some/file\n');
            expect(mockStdinEnd).toHaveBeenCalled();
            expect(result).toBe('mocked_tree_output');
        });

        it('should pass custom tree arguments to tree command', async () => {
            mockSpawn
                .mockReturnValueOnce(createMockProcess('some/file\n', '', 0)) // fd success
                .mockReturnValueOnce(createMockProcess('output', '', 0)); // tree success

            await GtreeService.generateTree('custom/path', ['-L', '2', '--noreport']);

            expect(mockSpawn).toHaveBeenCalledTimes(2);
            expect(mockSpawn).toHaveBeenNthCalledWith(1, 'fd', expect.any(Array), { cwd: '/abs/custom/path', env: expect.anything() });
            expect(mockSpawn).toHaveBeenNthCalledWith(2, 'tree', ['.', '--fromfile', '-F', '--dirsfirst', '-C', '-L', '2', '--noreport'], { cwd: '/abs/custom/path' });
        });

        it('should use GTREE_BASE_PATH environment variable when set', async () => {
            process.env.GTREE_BASE_PATH = '/workspace/project';

            // Mock path.resolve to handle the base path resolution
            vi.mocked(path.resolve).mockImplementation((basePath, targetPath?) => {
                if (targetPath !== undefined) {
                    return `${basePath}/${targetPath}`;
                }
                return `/abs/${basePath}`;
            });

            mockSpawn
                .mockReturnValueOnce(createMockProcess('some/file\n', '', 0)) // fd success
                .mockReturnValueOnce(createMockProcess('output', '', 0)); // tree success

            await GtreeService.generateTree('src', []);

            expect(mockSpawn).toHaveBeenCalledTimes(2);
            expect(mockSpawn).toHaveBeenNthCalledWith(1, 'fd', expect.any(Array), { cwd: '/workspace/project/src', env: expect.anything() });
            expect(mockSpawn).toHaveBeenNthCalledWith(2, 'tree', expect.any(Array), { cwd: '/workspace/project/src' });
        });

        it('should handle absolute paths correctly when GTREE_BASE_PATH is set', async () => {
            process.env.GTREE_BASE_PATH = '/workspace/project';

            mockSpawn
                .mockReturnValueOnce(createMockProcess('some/file\n', '', 0)) // fd success
                .mockReturnValueOnce(createMockProcess('output', '', 0)); // tree success

            await GtreeService.generateTree('/absolute/path', []);

            expect(mockSpawn).toHaveBeenCalledTimes(2);
            expect(mockSpawn).toHaveBeenNthCalledWith(1, 'fd', expect.any(Array), { cwd: '/absolute/path', env: expect.anything() });
            expect(mockSpawn).toHaveBeenNthCalledWith(2, 'tree', expect.any(Array), { cwd: '/absolute/path' });
        });

        it('should throw error if path does not exist', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            await expect(GtreeService.generateTree('nonexistent', [])).rejects.toThrow('Path does not exist: nonexistent');
        });

        it('should throw error if path is not a directory', async () => {
            vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
            await expect(GtreeService.generateTree('file.txt', [])).rejects.toThrow('Path is not a directory: file.txt');
        });

        it('should reject if fd command fails with non-zero exit code', async () => {
            mockSpawn.mockReturnValueOnce(createMockProcess('', 'fd error data', 1)); // fd fails
            await expect(GtreeService.generateTree('.', [])).rejects.toThrow('fd command failed with code 1: fd error data');
        });

        it('should reject if tree command fails with non-zero exit code', async () => {
            mockSpawn
                .mockReturnValueOnce(createMockProcess('some/data', '', 0)) // fd success
                .mockReturnValueOnce(createMockProcess('', 'tree error data', 1)); // tree fails
            await expect(GtreeService.generateTree('.', [])).rejects.toThrow('tree command failed with code 1: tree error data');
        });

        it('should reject if fd process emits error', async () => {
            const fdSpawnError = new Error('fd spawn error');
            mockSpawn.mockReturnValueOnce(createMockProcess('', '', 0, fdSpawnError));
            await expect(GtreeService.generateTree('.', [])).rejects.toThrow(`Failed to start fd process: ${fdSpawnError.message}`);
        });

        it('should reject if tree process emits error', async () => {
            const treeSpawnError = new Error('tree spawn error');
            mockSpawn
                .mockReturnValueOnce(createMockProcess('some/data', '', 0))
                .mockReturnValueOnce(createMockProcess('', '', 0, treeSpawnError));
            await expect(GtreeService.generateTree('.', [])).rejects.toThrow(`Failed to start tree process: ${treeSpawnError.message}`);
        });

        it('should call console.warn for non-fatal fd stderr output', async () => {
            mockSpawn
                .mockReturnValueOnce(createMockProcess('some/file\n', 'fd: some warning', 0)) // fd success with stderr
                .mockReturnValueOnce(createMockProcess('final_output', '', 0)); // tree success

            await GtreeService.generateTree('.', []);
            expect(console.warn).toHaveBeenCalledWith('fd command stderr (non-fatal): fd: some warning');
        });
    });
}); 