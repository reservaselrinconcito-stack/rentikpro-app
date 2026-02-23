import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './tests/setup.ts',
        include: [
            'tests/**/*.test.{ts,tsx}',
            'services/**/*.test.{ts,tsx}'
        ],
        exclude: [
            'tests/smoke.spec.ts',
            '**/*.spec.{ts,tsx}'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '**/*.spec.ts',
                '**/*.test.ts',
                'vite.config.ts',
                'vitest.config.ts'
            ]
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        }
    }
});
