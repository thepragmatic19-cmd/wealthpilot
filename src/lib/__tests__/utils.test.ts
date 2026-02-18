import { formatCurrency, cn, RISK_PROFILES, GOAL_ICONS } from '../utils';

describe('formatCurrency', () => {
    it('should format positive numbers', () => {
        expect(formatCurrency(1000)).toBe('1\u202f000,00\u00a0$');
    });

    it('should format zero', () => {
        expect(formatCurrency(0)).toContain('0');
    });

    it('should format large numbers', () => {
        const result = formatCurrency(1_000_000);
        expect(result).toContain('000');
        expect(result).toContain('$');
    });

    it('should handle negative numbers', () => {
        const result = formatCurrency(-500);
        expect(result).toContain('500');
    });
});

describe('cn', () => {
    it('should merge class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
        expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should handle tailwind conflicts', () => {
        const result = cn('p-4', 'p-2');
        expect(result).toBe('p-2');
    });
});

describe('RISK_PROFILES', () => {
    it('should have all 5 risk profiles', () => {
        expect(Object.keys(RISK_PROFILES).length).toBeGreaterThanOrEqual(3);
    });

    it('should have labels and colors', () => {
        const firstKey = Object.keys(RISK_PROFILES)[0];
        const profile = RISK_PROFILES[firstKey];
        expect(profile).toHaveProperty('label');
        expect(profile).toHaveProperty('color');
    });
});

describe('GOAL_ICONS', () => {
    it('should have goal icon mappings', () => {
        expect(typeof GOAL_ICONS).toBe('object');
        expect(Object.keys(GOAL_ICONS).length).toBeGreaterThan(0);
    });
});
