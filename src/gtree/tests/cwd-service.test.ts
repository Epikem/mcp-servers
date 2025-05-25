import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CwdService } from '../src/core/services/cwd-service.js';
import * as path from 'node:path';
import * as process from 'node:process';

// Mock modules
vi.mock('node:path');
vi.mock('node:process', () => ({
    cwd: vi.fn(),
    env: {}
}));

describe('CwdService', () => {
    const mockCwd = '/mock/current/directory';
    const mockBasePath = '/mock/base';
    const mockEnvBasePath = '/mock/env/base';

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear environment variable
        delete (process as any).env.GTREE_BASE_PATH;

        vi.mocked(process.cwd).mockReturnValue(mockCwd);
        vi.mocked(path.resolve).mockImplementation((p) => {
            if (p === mockCwd) return mockCwd;
            if (p === mockBasePath) return mockBasePath;
            if (p === mockEnvBasePath) return mockEnvBasePath;
            return `/resolved/${p}`;
        });
        vi.mocked(path.relative).mockImplementation((from, to) => {
            if (from === mockBasePath && to === mockCwd) {
                return 'current/directory';
            }
            if (from === mockBasePath && to === mockEnvBasePath) {
                return '../env/base';
            }
            return 'relative/path';
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        // Clean up environment variable
        delete (process as any).env.GTREE_BASE_PATH;
    });

    describe('getCurrentWorkingDirectory', () => {
        it('should return the current working directory', async () => {
            const result = await CwdService.getCurrentWorkingDirectory();

            expect(process.cwd).toHaveBeenCalled();
            expect(path.resolve).toHaveBeenCalledWith(mockCwd);
            expect(result).toBe(mockCwd);
        });

        it('should return GTREE_BASE_PATH when environment variable is set', async () => {
            (process as any).env.GTREE_BASE_PATH = mockEnvBasePath;

            const result = await CwdService.getCurrentWorkingDirectory();

            expect(process.cwd).not.toHaveBeenCalled();
            expect(path.resolve).toHaveBeenCalledWith(mockEnvBasePath);
            expect(result).toBe(mockEnvBasePath);
        });

        it('should handle process.cwd() error', async () => {
            const error = new Error('Failed to get cwd');
            vi.mocked(process.cwd).mockImplementation(() => {
                throw error;
            });

            await expect(CwdService.getCurrentWorkingDirectory()).rejects.toThrow(
                'Failed to get current working directory: Failed to get cwd'
            );
        });

        it('should handle path.resolve error', async () => {
            const error = new Error('Path resolve error');
            vi.mocked(path.resolve).mockImplementation(() => {
                throw error;
            });

            await expect(CwdService.getCurrentWorkingDirectory()).rejects.toThrow(
                'Failed to get current working directory: Path resolve error'
            );
        });
    });

    describe('getCwdInfo', () => {
        it('should return cwd info without basePath', async () => {
            const result = await CwdService.getCwdInfo();

            expect(process.cwd).toHaveBeenCalled();
            expect(path.resolve).toHaveBeenCalledWith(mockCwd);
            expect(result).toEqual({
                absolute: mockCwd
            });
        });

        it('should use GTREE_BASE_PATH when environment variable is set', async () => {
            (process as any).env.GTREE_BASE_PATH = mockEnvBasePath;

            const result = await CwdService.getCwdInfo();

            expect(process.cwd).not.toHaveBeenCalled();
            expect(path.resolve).toHaveBeenCalledWith(mockEnvBasePath);
            expect(result).toEqual({
                absolute: mockEnvBasePath
            });
        });

        it('should return cwd info with basePath and relative path', async () => {
            const result = await CwdService.getCwdInfo(mockBasePath);

            expect(process.cwd).toHaveBeenCalled();
            expect(path.resolve).toHaveBeenCalledWith(mockCwd);
            expect(path.resolve).toHaveBeenCalledWith(mockBasePath);
            expect(path.relative).toHaveBeenCalledWith(mockBasePath, mockCwd);
            expect(result).toEqual({
                absolute: mockCwd,
                basePath: mockBasePath,
                relative: 'current/directory'
            });
        });

        it('should use GTREE_BASE_PATH with basePath for relative calculation', async () => {
            (process as any).env.GTREE_BASE_PATH = mockEnvBasePath;

            const result = await CwdService.getCwdInfo(mockBasePath);

            expect(process.cwd).not.toHaveBeenCalled();
            expect(path.resolve).toHaveBeenCalledWith(mockEnvBasePath);
            expect(path.resolve).toHaveBeenCalledWith(mockBasePath);
            expect(path.relative).toHaveBeenCalledWith(mockBasePath, mockEnvBasePath);
            expect(result).toEqual({
                absolute: mockEnvBasePath,
                basePath: mockBasePath,
                relative: '../env/base'
            });
        });

        it('should handle process.cwd() error in getCwdInfo', async () => {
            const error = new Error('Failed to get cwd');
            vi.mocked(process.cwd).mockImplementation(() => {
                throw error;
            });

            await expect(CwdService.getCwdInfo()).rejects.toThrow(
                'Failed to get current working directory info: Failed to get cwd'
            );
        });

        it('should handle path operations error in getCwdInfo', async () => {
            const error = new Error('Path error');
            vi.mocked(path.relative).mockImplementation(() => {
                throw error;
            });

            await expect(CwdService.getCwdInfo(mockBasePath)).rejects.toThrow(
                'Failed to get current working directory info: Path error'
            );
        });

        it('should ignore empty basePath string', async () => {
            const result = await CwdService.getCwdInfo('');

            expect(result).toEqual({
                absolute: mockCwd
            });
            // basePath와 relative 속성이 포함되지 않아야 함 (빈 문자열은 무시됨)
        });

        it('should ignore whitespace-only basePath string', async () => {
            const result = await CwdService.getCwdInfo('   ');

            expect(result).toEqual({
                absolute: mockCwd
            });
            // basePath와 relative 속성이 포함되지 않아야 함 (공백만 있는 문자열은 무시됨)
        });
    });
}); 