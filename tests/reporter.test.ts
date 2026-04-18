/**
 * Tests for fleet-benchmarks: Reporter Module
 */

import { describe, it, expect } from 'vitest';
import {
  writeJsonReport,
  writeMarkdownReport,
  writeComparisonJsonReport,
  writeComparisonMarkdownReport,
  formatStatsTable,
} from '../src/core/reporter';
import type { BenchmarkSuiteResult, SuiteComparison, BenchmarkResultEntry, StatsSummary } from '../src/core/types';

function makeSuite(overrides?: Partial<BenchmarkSuiteResult>): BenchmarkSuiteResult {
  return {
    suiteName: 'fleet-benchmarks',
    timestamp: Date.now(),
    runId: 'test123',
    config: { iterations: 1000, warmupIterations: 100, regressionThreshold: 10, tags: [], categories: [] },
    benchmarks: [
      {
        name: 'test_bench_1',
        category: 'Test Category',
        description: 'A test benchmark',
        stats: {
          iterations: 1000, successes: 1000, failures: 0,
          mean: 150, median: 140, stddev: 30,
          min: 100, max: 500, p95: 300, p99: 400,
          throughput: 6666666, rse: 20,
        },
        samples: [],
        durationMs: 150,
      },
    ],
    ...overrides,
  };
}

function makeStats(overrides?: Partial<StatsSummary>): StatsSummary {
  return {
    iterations: 1000, successes: 1000, failures: 0,
    mean: 150, median: 140, stddev: 30,
    min: 100, max: 500, p95: 300, p99: 400,
    throughput: 6666666, rse: 20,
    ...overrides,
  };
}

describe('Reporter', () => {
  describe('writeJsonReport', () => {
    it('produces valid JSON', () => {
      const suite = makeSuite();
      const json = writeJsonReport(suite);
      const parsed = JSON.parse(json);
      expect(parsed.suiteName).toBe('fleet-benchmarks');
      expect(parsed.runId).toBe('test123');
      expect(parsed.benchmarks).toHaveLength(1);
    });

    it('includes all benchmark fields', () => {
      const suite = makeSuite();
      const json = writeJsonReport(suite);
      const parsed = JSON.parse(json);
      const bench = parsed.benchmarks[0];
      expect(bench.name).toBe('test_bench_1');
      expect(bench.category).toBe('Test Category');
      expect(bench.stats).toBeDefined();
      expect(bench.stats.mean).toBe(150);
      expect(bench.stats.p95).toBe(300);
      expect(bench.stats.p99).toBe(400);
      expect(bench.stats.throughput).toBeGreaterThan(0);
    });
  });

  describe('writeMarkdownReport', () => {
    it('produces non-empty markdown', () => {
      const suite = makeSuite();
      const md = writeMarkdownReport(suite);
      expect(md.length).toBeGreaterThan(0);
    });

    it('includes suite name in header', () => {
      const suite = makeSuite();
      const md = writeMarkdownReport(suite);
      expect(md).toContain('fleet-benchmarks');
    });

    it('includes run ID', () => {
      const suite = makeSuite();
      const md = writeMarkdownReport(suite);
      expect(md).toContain('test123');
    });

    it('includes benchmark category table', () => {
      const suite = makeSuite();
      const md = writeMarkdownReport(suite);
      expect(md).toContain('Test Category');
      expect(md).toContain('test_bench_1');
    });

    it('includes summary section', () => {
      const suite = makeSuite();
      const md = writeMarkdownReport(suite);
      expect(md).toContain('Summary');
      expect(md).toContain('Total benchmarks');
    });

    it('groups benchmarks by category', () => {
      const suite = makeSuite({
        benchmarks: [
          { name: 'b1', category: 'Cat A', description: '', stats: makeStats(), samples: [], durationMs: 10 },
          { name: 'b2', category: 'Cat A', description: '', stats: makeStats(), samples: [], durationMs: 10 },
          { name: 'b3', category: 'Cat B', description: '', stats: makeStats(), samples: [], durationMs: 10 },
        ],
      });
      const md = writeMarkdownReport(suite);
      expect(md).toContain('Cat A');
      expect(md).toContain('Cat B');
    });

    it('includes git SHA if present', () => {
      const suite = makeSuite({ gitSha: 'abc123' });
      const md = writeMarkdownReport(suite);
      expect(md).toContain('abc123');
    });
  });

  describe('writeComparisonJsonReport', () => {
    it('produces valid comparison JSON', () => {
      const comparison: SuiteComparison = {
        suiteName: 'fleet-benchmarks',
        beforeRunId: 'before1',
        afterRunId: 'after1',
        beforeTimestamp: Date.now() - 1000,
        afterTimestamp: Date.now(),
        comparisons: [],
        summary: { total: 0, regressions: 0, improvements: 0, neutral: 0 },
      };
      const json = writeComparisonJsonReport(comparison);
      const parsed = JSON.parse(json);
      expect(parsed.beforeRunId).toBe('before1');
      expect(parsed.afterRunId).toBe('after1');
    });
  });

  describe('writeComparisonMarkdownReport', () => {
    it('produces non-empty markdown', () => {
      const comparison: SuiteComparison = {
        suiteName: 'fleet-benchmarks',
        beforeRunId: 'before1',
        afterRunId: 'after1',
        beforeTimestamp: Date.now() - 1000,
        afterTimestamp: Date.now(),
        comparisons: [],
        summary: { total: 0, regressions: 0, improvements: 0, neutral: 0 },
      };
      const md = writeComparisonMarkdownReport(comparison);
      expect(md.length).toBeGreaterThan(0);
      expect(md).toContain('Comparison Report');
    });

    it('shows regressions section when present', () => {
      const entry: BenchmarkResultEntry = {
        name: 'test', category: 'cat', description: '',
        stats: makeStats(), samples: [], durationMs: 10,
      };
      const comparison: SuiteComparison = {
        suiteName: 'fleet-benchmarks',
        beforeRunId: 'before1', afterRunId: 'after1',
        beforeTimestamp: Date.now() - 1000, afterTimestamp: Date.now(),
        comparisons: [{
          before: entry, after: entry,
          deltas: { mean: { value: 100, percent: 50 }, median: { value: 100, percent: 50 }, p95: { value: 100, percent: 50 }, p99: { value: 100, percent: 50 }, throughput: { value: -1000, percent: -10 } },
          regression: true, regressionThreshold: 10,
        }],
        summary: { total: 1, regressions: 1, improvements: 0, neutral: 0 },
      };
      const md = writeComparisonMarkdownReport(comparison);
      expect(md).toContain('Regressions');
    });
  });

  describe('formatStatsTable', () => {
    it('formats stats as readable text', () => {
      const entry: BenchmarkResultEntry = {
        name: 'my_bench', category: 'Test', description: 'My benchmark',
        stats: makeStats(), samples: [], durationMs: 150,
      };
      const table = formatStatsTable(entry);
      expect(table).toContain('my_bench');
      expect(table).toContain('Test');
      expect(table).toContain('150ns');
      expect(table).toContain('140ns');
      expect(table).toContain('ops/s');
    });
  });
});
