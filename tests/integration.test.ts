/**
 * Tests for fleet-benchmarks: Integration Tests
 * Tests the full pipeline from benchmark registration to report generation.
 */

import { describe, it, expect } from 'vitest';
import { BenchmarkRunner } from '../src/core/runner';
import { writeJsonReport, writeMarkdownReport, formatStatsTable } from '../src/core/reporter';
import { allBenchmarks } from '../src/benchmarks';
import type { BenchmarkSuiteResult, BenchmarkSample } from '../src/core/types';

function makeQuickBench(name: string, category: string): { def: import('../src/core/types').BenchmarkDef; expectedTimeNs: number } {
  return {
    def: {
      name,
      category,
      description: `Quick test: ${name}`,
      tags: ['quick', category],
      run: (iters) => {
        const samples: BenchmarkSample[] = [];
        for (let i = 0; i < iters; i++) {
          const start = performance.now();
          let x = 0;
          for (let j = 0; j < 50; j++) x += j;
          const end = performance.now();
          samples.push({ timestamp: Date.now(), durationNs: (end - start) * 1e6, success: true });
        }
        return Promise.resolve(samples);
      },
    },
    expectedTimeNs: 0,
  };
}

describe('Integration Tests', () => {
  it('all registered benchmarks have unique names', () => {
    const names = allBenchmarks.map(b => b.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('all registered benchmarks cover 7 categories', () => {
    const categories = new Set(allBenchmarks.map(b => b.category));
    expect(categories.size).toBeGreaterThanOrEqual(7);
    expect(categories.has('Opcode Execution Speed')).toBe(true);
    expect(categories.has('Cross-Runtime Comparison')).toBe(true);
    expect(categories.has('Memory Usage')).toBe(true);
    expect(categories.has('Startup Time')).toBe(true);
    expect(categories.has('Throughput')).toBe(true);
    expect(categories.has('Message Bus Latency')).toBe(true);
    expect(categories.has('Conformance Test Coverage')).toBe(true);
  });

  it('total benchmark count exceeds 100', () => {
    expect(allBenchmarks.length).toBeGreaterThanOrEqual(100);
  });

  it('end-to-end: run subset and generate reports', async () => {
    const runner = new BenchmarkRunner({
      iterations: 50,
      warmupIterations: 5,
      tags: ['quick'],
      verbose: false,
    });

    const { a, b, c } = {
      a: makeQuickBench('integ_a', 'Integration'),
      b: makeQuickBench('integ_b', 'Integration'),
      c: makeQuickBench('integ_c', 'Integration'),
    };
    runner.addBenchmarks([a.def, b.def, c.def]);

    const result = await runner.runAll();

    // Validate suite result
    expect(result.benchmarks).toHaveLength(3);
    expect(result.suiteName).toBe('fleet-benchmarks');
    expect(result.runId).toBeTruthy();

    // Validate each benchmark
    for (const bench of result.benchmarks) {
      expect(bench.stats.successes).toBe(50);
      expect(bench.stats.mean).toBeGreaterThan(0);
      expect(bench.stats.median).toBeGreaterThan(0);
    }

    // Generate JSON report
    const json = writeJsonReport(result);
    const parsed = JSON.parse(json);
    expect(parsed.benchmarks).toHaveLength(3);

    // Generate Markdown report
    const md = writeMarkdownReport(result);
    expect(md).toContain('Integration');
    expect(md).toContain('integ_a');
    expect(md).toContain('Summary');
  });

  it('end-to-end: comparison mode', async () => {
    const makeSuite = (runId: string, meanVal: number): BenchmarkSuiteResult => ({
      suiteName: 'fleet-benchmarks',
      timestamp: Date.now(),
      runId,
      config: { iterations: 50, warmupIterations: 5, regressionThreshold: 10, tags: [], categories: [] },
      benchmarks: [
        {
          name: 'comp_bench', category: 'E2E', description: '',
          stats: { iterations: 50, successes: 50, failures: 0, mean: meanVal, median: meanVal, stddev: 5, min: meanVal - 10, max: meanVal + 10, p95: meanVal + 8, p99: meanVal + 9, throughput: 5000000, rse: 5 },
          samples: [], durationMs: meanVal / 1000,
        },
      ],
    });

    const before = makeSuite('before_e2e', 200);
    const after = makeSuite('after_e2e', 150);

    const comparison = BenchmarkRunner.compare(before, after);
    expect(comparison.comparisons).toHaveLength(1);
    expect(comparison.summary.total).toBe(1);
    expect(comparison.summary.improvements).toBe(1);
    expect(comparison.summary.regressions).toBe(0);

    // Generate comparison reports
    const compJson = JSON.parse(JSON.stringify(comparison));
    expect(compJson.beforeRunId).toBe('before_e2e');
    expect(compJson.afterRunId).toBe('after_e2e');
  });

  it('formatStatsTable produces readable output', () => {
    const entry = {
      name: 'table_test',
      category: 'TableCat',
      description: 'A test for the table formatter',
      stats: {
        iterations: 100, successes: 95, failures: 5,
        mean: 250, median: 240, stddev: 50,
        min: 100, max: 800, p95: 600, p99: 700,
        throughput: 4000000, rse: 20,
      },
      samples: [],
      durationMs: 25,
    };
    const table = formatStatsTable(entry);
    expect(table).toContain('table_test');
    expect(table).toContain('TableCat');
    expect(table).toContain('250ns');
    expect(table).toContain('ops/s');
  });

  it('runner handles empty benchmark list gracefully', async () => {
    const runner = new BenchmarkRunner({ iterations: 100 });
    const result = await runner.runAll();
    expect(result.benchmarks).toHaveLength(0);
  });
});
