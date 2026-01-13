import { describe, it, expect } from 'vitest';
import {
  calculateOverBudgetArea,
  findFirstOverspendDay,
  calculateOverspendStats
} from './overBudgetUtils';

describe('calculateOverBudgetArea', () => {
  it('should return empty array for non-array input', () => {
    expect(calculateOverBudgetArea(null)).toEqual([]);
    expect(calculateOverBudgetArea(undefined)).toEqual([]);
    expect(calculateOverBudgetArea('string')).toEqual([]);
  });

  it('should calculate over-budget values correctly', () => {
    const data = [
      { day: '1', budget: 100, spending: 80 },
      { day: '2', budget: 200, spending: 250 },
      { day: '3', budget: 300, spending: 300 },
    ];
    const result = calculateOverBudgetArea(data);
    
    expect(result).toEqual([
      { day: '1', overBudget: 0, budget: 100 },
      { day: '2', overBudget: 50, budget: 200 },
      { day: '3', overBudget: 0, budget: 300 },
    ]);
  });

  it('should handle null spending values', () => {
    const data = [
      { day: '1', budget: 100, spending: null },
      { day: '2', budget: 200, spending: 150 },
    ];
    const result = calculateOverBudgetArea(data);
    
    expect(result).toEqual([
      { day: '1', overBudget: null, budget: 100 },
      { day: '2', overBudget: 0, budget: 200 },
    ]);
  });
});

describe('findFirstOverspendDay', () => {
  it('should return null for non-array input', () => {
    expect(findFirstOverspendDay(null)).toBeNull();
    expect(findFirstOverspendDay(undefined)).toBeNull();
  });

  it('should return null when no overspend exists', () => {
    const data = [
      { day: '1', budget: 100, spending: 80 },
      { day: '2', budget: 200, spending: 200 },
    ];
    expect(findFirstOverspendDay(data)).toBeNull();
  });

  it('should find the first overspend day', () => {
    const data = [
      { day: '1', budget: 100, spending: 80 },
      { day: '2', budget: 200, spending: 250 },
      { day: '3', budget: 300, spending: 400 },
    ];
    expect(findFirstOverspendDay(data)).toEqual({ day: '2', index: 1 });
  });

  it('should handle null spending values', () => {
    const data = [
      { day: '1', budget: 100, spending: null },
      { day: '2', budget: 200, spending: 250 },
    ];
    expect(findFirstOverspendDay(data)).toEqual({ day: '2', index: 1 });
  });
});

describe('calculateOverspendStats', () => {
  it('should return null for non-array input', () => {
    expect(calculateOverspendStats(null, '1')).toBeNull();
    expect(calculateOverspendStats(undefined, '1')).toBeNull();
  });

  it('should return null when currentDay is not provided', () => {
    const data = [{ day: '1', budget: 100, spending: 150 }];
    expect(calculateOverspendStats(data, null)).toBeNull();
    expect(calculateOverspendStats(data, '')).toBeNull();
  });

  it('should return null when not in over-budget state', () => {
    const data = [
      { day: '1', budget: 100, spending: 80 },
      { day: '2', budget: 200, spending: 200 },
    ];
    expect(calculateOverspendStats(data, '1')).toBeNull();
    expect(calculateOverspendStats(data, '2')).toBeNull();
  });

  it('should calculate stats correctly for over-budget state', () => {
    const data = [
      { day: '1', budget: 100, spending: 80 },
      { day: '2', budget: 200, spending: 250 },
      { day: '3', budget: 300, spending: 400 },
    ];
    const stats = calculateOverspendStats(data, '3');
    
    expect(stats).not.toBeNull();
    expect(stats.overspendAmount).toBe(100);
    expect(stats.overspendPercentage).toBeCloseTo(33.33, 1);
    expect(stats.firstOverspendDay).toBe('2');
    expect(stats.avgDailyOverspend).toBe(50); // 100 / 2 days
    expect(stats.budget).toBe(300);
    expect(stats.spending).toBe(400);
  });

  it('should handle budget = 0 edge case', () => {
    const data = [{ day: '1', budget: 0, spending: 50 }];
    const stats = calculateOverspendStats(data, '1');
    
    expect(stats).not.toBeNull();
    expect(stats.overspendAmount).toBe(50);
    expect(stats.overspendPercentage).toBeNull();
  });
});
