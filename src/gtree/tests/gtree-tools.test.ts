import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastMCP } from 'fastmcp';
import { registerTools } from '../src/core/tools.js';
import { GtreeService } from '../src/core/services/gtree-service.js'; // Import the actual service
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const TEST_DIR_ROOT = path.join(__dirname, 'test-gtree-e2e');

// Helper function to create a test directory structure
const setupTestDirectory = (structure: any, basePath = TEST_DIR_ROOT) => {
    for (const name in structure) {
        const currentPath = path.join(basePath, name);
        if (typeof structure[name] === 'object' && structure[name] !== null) {
            fs.mkdirSync(currentPath, { recursive: true });
            setupTestDirectory(structure[name], currentPath);
        } else {
            fs.writeFileSync(currentPath, structure[name] || '');
        }
    }
};

// Helper to check if fd and tree are available
const checkCommandsAvailable = () => {
    try {
        execSync('fd --version', { stdio: 'ignore' });
        execSync('tree --version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        console.warn('Skipping E2E tests for gtree: fd or tree command not found.');
        return false;
    }
};

const commandsAvailable = checkCommandsAvailable();


describe('Gtree MCP Tools (E2E and Unit)', () => {
    let server: FastMCP;
    let toolExecute: Function;

    beforeEach(() => {
        const mockFastMCP = { addTool: vi.fn() };
        server = mockFastMCP as any;
        registerTools(server); // This now uses the real GtreeService
        toolExecute = mockFastMCP.addTool.mock.calls[0][0].execute;

        // Setup test directory for E2E tests
        if (commandsAvailable) {
            if (fs.existsSync(TEST_DIR_ROOT)) {
                fs.rmSync(TEST_DIR_ROOT, { recursive: true, force: true });
            }
            fs.mkdirSync(TEST_DIR_ROOT, { recursive: true });
        }
    });

    afterEach(() => {
        // Cleanup test directory for E2E tests
        if (commandsAvailable && fs.existsSync(TEST_DIR_ROOT)) {
            fs.rmSync(TEST_DIR_ROOT, { recursive: true, force: true });
        }
        vi.clearAllMocks();
    });

    describe('Tool Registration (Unit Test)', () => {
        it('should register gtree tool with correct configuration', () => {
            // registerTools is called in beforeEach, so we just check the mock
            expect(server.addTool).toHaveBeenCalledTimes(1);
            const toolCall = (server.addTool as any).mock.calls[0][0];
            expect(toolCall.name).toBe('gtree');
            expect(toolCall.description).toContain('Generate a tree view of directory structure');
            expect(toolCall.parameters).toBeDefined();
            expect(toolCall.execute).toBeDefined();
            expect(typeof toolCall.execute).toBe('function');
        });
    });

    describe('gtree tool execution (E2E Tests)', () => {
        // Skip E2E tests if commands are not available
        const it_e2e = commandsAvailable ? it : it.skip;

        it_e2e('should generate tree for a simple directory', async () => {
            setupTestDirectory({
                'file1.txt': 'content1',
                'file2.txt': 'content2',
                'subdir': {
                    'file3.txt': 'content3'
                }
            });
            const result = await toolExecute({ path: TEST_DIR_ROOT, args: ['-C'] });
            // Tree output now starts with '.' because cwd is TEST_DIR_ROOT and tree operates on '.'
            expect(result).toContain('.'); // Check for current directory marker
            expect(result).not.toContain(path.basename(TEST_DIR_ROOT)); // Should not contain the parent dir name if tree shows '.'
            expect(result).toContain('file1.txt');
            expect(result).toContain('file2.txt');
            expect(result).toContain('subdir');
            expect(result).toContain('file3.txt');
        });

        it_e2e('should respect .gitignore file', async () => {
            setupTestDirectory({
                '.gitignore': 'ignored_file.txt\nignored_dir/',
                'visible_file.txt': 'content',
                'ignored_file.txt': 'should be ignored',
                'ignored_dir': {
                    'another_ignored.txt': 'secret'
                },
                'visible_subdir': {
                    'file_in_subdir.txt': 'text'
                }
            });

            const result = await toolExecute({ path: TEST_DIR_ROOT, args: ['-C'] });
            expect(result).toContain('visible_file.txt');
            expect(result).toContain('visible_subdir');
            expect(result).toContain('file_in_subdir.txt');
            expect(result).not.toContain('ignored_file.txt');
            expect(result).not.toContain('ignored_dir');
            expect(result).not.toContain('another_ignored.txt');
        });

        it_e2e('should handle -L depth argument', async () => {
            setupTestDirectory({
                'level1_file.txt': '',
                'level1_dir': {
                    'level2_file.txt': '',
                    'level2_dir': {
                        'level3_file.txt': ''
                    }
                }
            });
            // tree on macOS might not show dir name with -L 0 or 1, so use -L 2 to see level1_dir
            const result = await toolExecute({ path: TEST_DIR_ROOT, args: ['-L', '2', '-C'] });
            expect(result).toContain('level1_file.txt');
            expect(result).toContain('level1_dir');
            expect(result).toContain('level2_file.txt');
            expect(result).toContain('level2_dir'); // The directory itself should be listed
            expect(result).not.toContain('level3_file.txt');
        });

        it_e2e('should show hidden files if fd passes them and tree is not explicitly told to hide', async () => {
            // fd by default (with --hidden) passes hidden files. Tree by default shows them.
            setupTestDirectory({
                '.hidden_file.txt': 'secret',
                'visible_file.txt': ''
            });
            const result = await toolExecute({ path: TEST_DIR_ROOT, args: ['-C'] }); // fd will pass .hidden_file.txt
            expect(result).toContain('.hidden_file.txt');
            expect(result).toContain('visible_file.txt');
        });

        it_e2e('should respect tree args like --dirsfirst', async () => {
            setupTestDirectory({
                'b_file.txt': '',
                'a_dir': {
                    'c_file.txt': ''
                }
            });

            const resultDefault = await toolExecute({ path: TEST_DIR_ROOT, args: ['-C'] });
            const resultDirsFirst = await toolExecute({ path: TEST_DIR_ROOT, args: ['-C', '--dirsfirst'] });

            // Check if a_dir appears before b_file.txt with --dirsfirst
            const linesDirsFirst = resultDirsFirst.split('\n');
            const indexOfADir = linesDirsFirst.findIndex((line: string) => line.includes('a_dir'));
            const indexOfBFile = linesDirsFirst.findIndex((line: string) => line.includes('b_file.txt'));

            expect(indexOfADir).not.toBe(-1);
            expect(indexOfBFile).not.toBe(-1);
            if (indexOfADir !== -1 && indexOfBFile !== -1) {
                expect(indexOfADir < indexOfBFile).toBe(true);
            }

            // For default, order might vary or be alphabetical for items at the same level
            // This part is harder to assert without knowing exact tree behavior
            // So we focus on the dirsfirst behavior.
        });

        it_e2e('should handle non-existent path error from service', async () => {
            const result = await toolExecute({ path: path.join(TEST_DIR_ROOT, 'non_existent_path') });
            expect(result).toMatch(/Error: Path does not exist/i);
        });

        it_e2e('should handle path being a file error from service', async () => {
            const filePath = path.join(TEST_DIR_ROOT, 'iam_a_file.txt');
            fs.writeFileSync(filePath, 'hello');
            const result = await toolExecute({ path: filePath });
            expect(result).toMatch(/Error: Path is not a directory/i);
        });
    });

    describe('gtree tool execution (Unit Tests for error handling)', () => {
        beforeEach(() => {
            // For these unit tests, we mock GtreeService again to simulate specific errors
            // that are hard to trigger reliably in E2E with external commands.
            vi.spyOn(GtreeService, 'generateTree');
        });

        it('should handle errors from generateTree (unit)', async () => {
            const errorMessage = 'Simulated GtreeService Error';
            vi.mocked(GtreeService.generateTree).mockRejectedValueOnce(new Error(errorMessage));

            const result = await toolExecute({
                path: 'test-dir'
            });
            expect(GtreeService.generateTree).toHaveBeenCalledWith('test-dir', []);
            expect(result).toBe(`Error: ${errorMessage}`);
        });

        it('should handle unknown errors from generateTree (unit)', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.spyOn(GtreeService, 'generateTree').mockRejectedValue(new Error('Unknown error'));

            const result = await toolExecute({ path: 'test-dir', args: ['-L', '1'] });
            expect(GtreeService.generateTree).toHaveBeenCalledWith('test-dir', ['-L', '1']);
            expect(result).toBe('Error: Unknown error');
            consoleErrorSpy.mockRestore();
        });
    });
}); 