import { checkRateLimit } from '../rate-limit';

describe('checkRateLimit', () => {
    it('should allow requests under the limit', () => {
        const key = `test-allow-${Date.now()}`;

        const r1 = checkRateLimit(key, 3, 60_000);
        expect(r1.success).toBe(true);
        expect(r1.remaining).toBe(2);

        const r2 = checkRateLimit(key, 3, 60_000);
        expect(r2.success).toBe(true);
        expect(r2.remaining).toBe(1);

        const r3 = checkRateLimit(key, 3, 60_000);
        expect(r3.success).toBe(true);
        expect(r3.remaining).toBe(0);
    });

    it('should reject requests over the limit', () => {
        const key = `test-reject-${Date.now()}`;

        checkRateLimit(key, 2, 60_000);
        checkRateLimit(key, 2, 60_000);

        const result = checkRateLimit(key, 2, 60_000);
        expect(result.success).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.resetInSeconds).toBeGreaterThan(0);
    });

    it('should track different keys independently', () => {
        const keyA = `test-indep-A-${Date.now()}`;
        const keyB = `test-indep-B-${Date.now()}`;

        checkRateLimit(keyA, 1, 60_000);
        expect(checkRateLimit(keyA, 1, 60_000).success).toBe(false);
        expect(checkRateLimit(keyB, 1, 60_000).success).toBe(true);
    });

    it('should reset after the window expires', async () => {
        const key = `test-reset-${Date.now()}`;

        checkRateLimit(key, 1, 100);
        expect(checkRateLimit(key, 1, 100).success).toBe(false);

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(checkRateLimit(key, 1, 100).success).toBe(true);
    });

    it('should return correct resetInSeconds', () => {
        const key = `test-reset-seconds-${Date.now()}`;

        checkRateLimit(key, 1, 30_000);
        const result = checkRateLimit(key, 1, 30_000);

        expect(result.success).toBe(false);
        expect(result.resetInSeconds).toBeGreaterThan(0);
        expect(result.resetInSeconds).toBeLessThanOrEqual(30);
    });
});
