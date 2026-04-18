/**
 * Tests for fleet-benchmarks: Statistics Module
 */

import { describe, it, expect } from 'vitest';
import {
  mean,
  median,
  stddev,
  percentile,
  relativeStandardError,
  throughputPerSecond,
  computeStats,
  computeThroughput,
  formatNs,
  formatNumber,
  shortId,
} from '../src/core/statistics';
import type { BenchmarkSample } from '../src/core/types';

describe('Statistics', () => {
  describe('mean', () => {
    it('computes mean of empty array', () => {
      expect(mean([])).toBe(0);
    });

    it('computes mean of single element', () => {
      expect(mean([42])).toBe(42);
    });

    it('computes mean of multiple elements', () => {
      expect(mean([10, 20, 30])).toBe(20);
    });

    it('computes mean of negative numbers', () => {
      expect(mean([-10, -20, -30])).toBe(-20);
    });
  });

  describe('median', () => {
    it('computes median of empty array', () => {
      expect(median([])).toBe(0);
    });

    it('computes median of single element', () => {
      expect(median([42])).toBe(42);
    });

    it('computes median of odd-length array', () => {
      expect(median([1, 3, 5])).toBe(3);
    });

    it('computes median of even-length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });

    it('computes median regardless of input order', () => {
      expect(median([5, 1, 3])).toBe(3);
    });
  });

  describe('stddev', () => {
    it('computes stddev of empty array', () => {
      expect(stddev([])).toBe(0);
    });

    it('computes stddev of single element', () => {
      expect(stddev([42])).toBe(0);
    });

    it('computes stddev of constant values', () => {
      expect(stddev([5, 5, 5, 5])).toBe(0);
    });

    it('computes stddev of varied values', () => {
      // Population stddev approximation
      const sd = stddev([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(sd).toBeGreaterThan(0);
      expect(sd).toBeLessThan(5);
    });
  });

  describe('percentile', () => {
    it('returns 0 for empty array', () => {
      expect(percentile([], 95)).toBe(0);
    });

    it('returns single element for array of one', () => {
      expect(percentile([42], 50)).toBe(42);
    });

    it('computes 50th percentile (median)', () => {
      expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    });

    it('computes 95th percentile', () => {
      const p95 = percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95);
      expect(p95).toBeGreaterThan(9);
    });

    it('computes 99th percentile', () => {
      const p99 = percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 99);
      expect(p99).toBeGreaterThan(9);
    });

    it('interpolates correctly for non-exact index', () => {
      // [0, 1, 2, 3]: 75th percentile should be 2.25
      expect(percentile([0, 1, 2, 3], 75)).toBe(2.25);
    });
  });

  describe('relativeStandardError', () => {
    it('returns 0 for empty array', () => {
      expect(relativeStandardError([])).toBe(0);
    });

    it('returns 0 for single element', () => {
      expect(relativeStandardError([42])).toBe(0);
    });

    it('returns 0 for constant values', () => {
      expect(relativeStandardError([5, 5, 5])).toBe(0);
    });

    it('returns 0 for mean of 0', () => {
      expect(relativeStandardError([0, 0, 0])).toBe(0);
    });

    it('computes RSE for varied values', () => {
      const rse = relativeStandardError([10, 20, 30, 40, 50]);
      expect(rse).toBeGreaterThan(0);
    });
  });

  describe('throughputPerSecond', () => {
    it('returns 0 for zero duration', () => {
      expect(throughputPerSecond(0, 100)).toBe(0);
    });

    it('computes throughput correctly', () => {
      // 100 ops in 1 second = 100 ops/s
      expect(throughputPerSecond(1e9, 100)).toBe(100);
    });

    it('computes throughput for sub-second', () => {
      // 10 ops in 100ms = 100 ops/s
      expect(throughputPerSecond(100_000_000, 10)).toBe(100);
    });
  });

  describe('computeThroughput', () => {
    it('returns 0 for empty samples', () => {
      expect(computeThroughput([])).toBe(0);
    });

    it('returns 0 when all samples failed', () => {
      const samples: BenchmarkSample[] = [
        { timestamp: 0, durationNs: 1000, success: false },
      ];
      expect(computeThroughput(samples)).toBe(0);
    });

    it('computes throughput from successful samples', () => {
      const samples: BenchmarkSample[] = [
        { timestamp: 0, durationNs: 500_000_000, success: true },  // 0.5s
        { timestamp: 1, durationNs: 500_000_000, success: true },  // 0.5s
      ];
      expect(computeThroughput(samples)).toBe(2); // 2 ops in 1s
    });
  });

  describe('computeStats', () => {
    it('returns zeros for empty samples', () => {
      const stats = computeStats([]);
      expect(stats.iterations).toBe(0);
      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.throughput).toBe(0);
    });

    it('handles all-failed samples', () => {
      const samples: BenchmarkSample[] = [
        { timestamp: 0, durationNs: 1000, success: false },
        { timestamp: 1, durationNs: 2000, success: false, error: 'oops' },
      ];
      const stats = computeStats(samples);
      expect(stats.iterations).toBe(2);
      expect(stats.successes).toBe(0);
      expect(stats.failures).toBe(2);
    });

    it('computes correct stats from valid samples', () => {
      const samples: BenchmarkSample[] = [
        { timestamp: 0, durationNs: 100, success: true },
        { timestamp: 1, durationNs: 200, success: true },
        { timestamp: 2, durationNs: 300, success: true },
        { timestamp: 3, durationNs: 400, success: true },
        { timestamp: 4, durationNs: 500, success: true },
      ];
      const stats = computeStats(samples);
      expect(stats.iterations).toBe(5);
      expect(stats.successes).toBe(5);
      expect(stats.failures).toBe(0);
      expect(stats.mean).toBe(300);
      expect(stats.median).toBe(300);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(500);
      expect(stats.p95).toBeGreaterThanOrEqual(400);
      expect(stats.p99).toBeGreaterThanOrEqual(400);
      expect(stats.throughput).toBeGreaterThan(0);
    });

    it('filters out failed samples from timing stats', () => {
      const samples: BenchmarkSample[] = [
        { timestamp: 0, durationNs: 100, success: true },
        { timestamp: 1, durationNs: 999999, success: false }, // Should be excluded
        { timestamp: 2, durationNs: 300, success: true },
      ];
      const stats = computeStats(samples);
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(1);
      expect(stats.mean).toBe(200); // Only 100 and 300
    });
  });

  describe('formatNs', () => {
    it('formats nanoseconds', () => {
      expect(formatNs(500)).toContain('ns');
    });

    it('formats microseconds', () => {
      expect(formatNs(5000)).toContain('μs');
    });

    it('formats milliseconds', () => {
      expect(formatNs(5_000_000)).toContain('ms');
    });

    it('formats seconds', () => {
      expect(formatNs(5_000_000_000)).toContain('s');
    });
  });

  describe('formatNumber', () => {
    it('formats small numbers', () => {
      expect(formatNumber(42)).toBe('42');
    });

    it('formats large numbers with commas', () => {
      expect(formatNumber(1234567)).toContain('1,234,567');
    });
  });

  describe('shortId', () => {
    it('generates a non-empty string', () => {
      const id = shortId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => shortId()));
      expect(ids.size).toBe(100);
    });
  });
});
