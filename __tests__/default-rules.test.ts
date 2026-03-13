import { describe, it, expect } from 'vitest';
import { defaultRules } from '@/lib/default-rules';

describe('defaultRules', () => {
  it('has 10 built-in rules', () => {
    expect(defaultRules).toHaveLength(10);
  });

  it('all rules have required fields', () => {
    for (const rule of defaultRules) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(rule.type).toBeTruthy();
      expect(typeof rule.enabled).toBe('boolean');
      expect(['error', 'warning']).toContain(rule.severity);
      expect(typeof rule.params).toBe('object');
      expect(rule.builtIn).toBe(true);
    }
  });

  it('all rules are enabled by default', () => {
    for (const rule of defaultRules) {
      expect(rule.enabled).toBe(true);
    }
  });

  it('all rules are marked as built-in', () => {
    for (const rule of defaultRules) {
      expect(rule.builtIn).toBe(true);
    }
  });

  it('has unique IDs', () => {
    const ids = defaultRules.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique types', () => {
    const types = defaultRules.map(r => r.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('max_weekly_hours has hours param', () => {
    const rule = defaultRules.find(r => r.type === 'max_weekly_hours');
    expect(rule).toBeDefined();
    expect(rule!.params.hours).toBe(55.5);
    expect(rule!.severity).toBe('error');
  });

  it('min_rest_days has days param', () => {
    const rule = defaultRules.find(r => r.type === 'min_rest_days');
    expect(rule).toBeDefined();
    expect(rule!.params.days).toBe(2);
    expect(rule!.severity).toBe('error');
  });

  it('balance_distribution has threshold param and is warning', () => {
    const rule = defaultRules.find(r => r.type === 'balance_distribution');
    expect(rule).toBeDefined();
    expect(rule!.params.threshold).toBe(1.5);
    expect(rule!.severity).toBe('warning');
  });

  it('dept_only_priority is warning severity', () => {
    const rule = defaultRules.find(r => r.type === 'dept_only_priority');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('warning');
  });

  it('hard constraint rules are severity error', () => {
    const hardRules = ['max_weekly_hours', 'min_rest_days', 'no_polyclinic_same_day',
      'no_polyclinic_prev_day', 'require_both_slots', 'respect_unavailable',
      'respect_slot_types', 'respect_monthly_limits'];
    for (const type of hardRules) {
      const rule = defaultRules.find(r => r.type === type);
      expect(rule?.severity).toBe('error');
    }
  });
});
