/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        typecheck: {
            tsconfig: './tsconfig.dev.json'
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'build/',
                'bin/',
                '**/*.d.ts',
                '**/*.test.ts',
                '**/*.spec.ts'
            ]
        }
    }
}); 