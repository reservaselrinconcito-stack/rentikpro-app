import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../services/logger';

// Mock console methods
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

describe('Logger Service', () => {
    beforeEach(() => {
        consoleLogSpy.mockClear();
        consoleErrorSpy.mockClear();
    });

    describe('log method', () => {
        it('should log in development mode', () => {
            // Simulate dev mode by checking if logger.log calls console.log
            logger.log('test message');

            // In dev mode, console.log should be called
            // Note: This test assumes DEV mode. In production, it won't call console.log
            expect(consoleLogSpy).toHaveBeenCalledWith('test message');
        });

        it('should handle multiple arguments', () => {
            logger.log('message', 123, { key: 'value' });
            expect(consoleLogSpy).toHaveBeenCalledWith('message', 123, { key: 'value' });
        });
    });

    describe('error method', () => {
        it('should always log errors', () => {
            logger.error('error message');
            expect(consoleErrorSpy).toHaveBeenCalledWith('error message');
        });

        it('should handle error objects', () => {
            const error = new Error('test error');
            logger.error('Error occurred:', error);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred:', error);
        });
    });

    describe('warn method', () => {
        it('should handle warnings', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            logger.warn('warning message');
            expect(consoleWarnSpy).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });
    });
});
