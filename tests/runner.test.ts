/**
 * Tests for fleet-benchmarks: Benchmark Runner
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BenchmarkRunner } from '../src/core/runner';
import type { BenchmarkDef, BenchmarkSample } from '../src/core/types';

function makeSyncBenchmark(overrides?: Partial<BenchmarkDef>): BenchmarkDef {
  return {
    name: 'test_sync_bench',
    category: 'Test',
    description: 'A synchronous test benchmark',
    tags: ['test'],
    defaultIterations: 100,
    run: (iters) => {
      const samples: BenchmarkSample[] = [];
      for (let i = 0; i < iters; i++) {
        const start = performance.now();
        let x = 0;
        for (let j = 0; j < 100; j++) x += j;
        const end = performance.now();
        samples.push({ timestamp: Date.now(), durationNs: (end - start) * 1e6, success: true });
      }
      return Promise.resolve(samples);
    },
    ...overrides,
  };
}

function makeAsyncBenchmark(overrides?: Partial<BenchmarkDef>): BenchmarkDef {
  return {
    name: 'test_async_bench',
    category: 'Test',
    description: 'An async test benchmark',
    tags: ['test', 'async'],
    defaultIterations: 50,
    run: async (iters) => {
      const samples: BenchmarkSample[] = [];
      for (let i = 0; i < iters; i++) {
        const start = performance.now();
        await new Promise(r => setTimeout(r, 1));
        const end = performance.now();
        samples.push({ timestamp: Date.now(), durationNs: (end - start) * 1e6, success: true });
      }
      return samples;
    },
    ...overrides,
  };
}

function makeFailingBenchmark(failureRate = 0.5): BenchmarkDef {
  return {
    name: 'test_failing_bench',
    category: 'Test',
    description: 'A benchmark that sometimes fails',
    tags: ['test'],
    run: (iters) => {
      const samples: BenchmarkSample[] = [];
      for (let i = 0; i < iters; i++) {
        const start = performance.now();
        const success = Math.random() > failureRate;
        const end = performance.now();
        samples.push({
          timestamp: Date.now(),
          durationNs: (end - start) * 1e6,
          success,
          error: success ? undefined : 'simulated failure',
        });
      }
      return Promise.resolve(samples);
    },
  };
}

describe('BenchmarkRunner', () => {
  let runner: BenchmarkRunner;

  beforeEach(() => {
    runner = new BenchmarkRunner({ iterations: 100, warmupIterations: 10, verbose: false });
  });

  describe('construction', () => {
    it('creates a runner with default config', () => {
      const r = new BenchmarkRunner();
      expect(r).toBeDefined();
      expect(r.getBenchmarks()).toHaveLength(0);
    });

    it('creates a runner with custom config', () => {
      const r = new BenchmarkRunner({ iterations: 5000, warmupIterations: 500 });
      expect(r).toBeDefined();
      expect(r.getBenchmarks()).toHaveLength(0);
    });
  });

  describe('addBenchmark', () => {
    it('adds a single benchmark', () => {
      runner.addBenchmark(makeSyncBenchmark());
      expect(runner.getBenchmarks()).toHaveLength(1);
    });

    it('returns this for chaining', () => {
      const result = runner.addBenchmark(makeSyncBenchmark());
      expect(result).toBe(runner);
    });

    it('adds multiple benchmarks individually', () => {
      runner.addBenchmark(makeSyncBenchmark({ name: 'a' }));
      runner.addBenchmark(makeSyncBenchmark({ name: 'b' }));
      runner.addBenchmark(makeSyncBenchmark({ name: 'c' }));
      expect(runner.getBenchmarks()).toHaveLength(3);
    });
  });

  describe('addBenchmarks', () => {
    it('adds multiple benchmarks at once', () => {
      runner.addBenchmarks([
        makeSyncBenchmark({ name: 'a' }),
        makeSyncBenchmark({ name: 'b' }),
      ]);
      expect(runner.getBenchmarks()).toHaveLength(2);
    });
  });

  describe('getBenchmarks', () => {
    it('returns a copy of benchmarks array', () => {
      runner.addBenchmark(makeSyncBenchmark());
      const benchmarks = runner.getBenchmarks();
      benchmarks.push(makeSyncBenchmark({ name: 'injected' }));
      expect(runner.getBenchmarks()).toHaveLength(1);
    });
  });

  describe('runSingle', () => {
    it('runs a synchronous benchmark successfully', async () => {
      const bench = makeSyncBenchmark();
      const result = await runner.runSingle(bench);
      expect(result.name).toBe('test_sync_bench');
      expect(result.category).toBe('Test');
      expect(result.stats.iterations).toBe(100);
      expect(result.stats.successes).toBe(100);
      expect(result.stats.failures).toBe(0);
      expect(result.stats.mean).toBeGreaterThan(0);
      expect(result.stats.median).toBeGreaterThan(0);
      expect(result.stats.throughput).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('runs an async benchmark successfully', async () => {
      const bench = makeAsyncBenchmark();
      const result = await runner.runSingle(bench);
      expect(result.name).toBe('test_async_bench');
      expect(result.stats.successes).toBe(100); // runner config iterations
      expect(result.stats.mean).toBeGreaterThan(1_000_000); // > 1ms in ns
    });

    it('handles partial failures', async () => {
      const bench = makeFailingBenchmark(0.3);
      const result = await runner.runSingle(bench);
      expect(result.stats.iterations).toBe(100);
      expect(result.stats.successes).toBeGreaterThan(0);
      expect(result.stats.failures).toBeGreaterThan(0);
      // successes + failures should equal iterations
      expect(result.stats.successes + result.stats.failures).toBe(100);
    });

    it('includes correct percentiles', async () => {
      const bench = makeSyncBenchmark();
      const result = await runner.runSingle(bench);
      expect(result.stats.p95).toBeGreaterThanOrEqual(result.stats.min);
      expect(result.stats.p99).toBeGreaterThanOrEqual(result.stats.p95);
      expect(result.stats.p99).toBeLessThanOrEqual(result.stats.max);
    });
  });

  describe('runAll', () => {
    it('runs all registered benchmarks', async () => {
      runner.addBenchmark(makeSyncBenchmark({ name: 'bench_a' }));
      runner.addBenchmark(makeSyncBenchmark({ name: 'bench_b' }));
      const result = await runner.runAll();
      expect(result.benchmarks).toHaveLength(2);
      expect(result.suiteName).toBe('fleet-benchmarks');
      expect(result.runId).toBeTruthy();
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('filters by category', async () => {
      runner.addBenchmark(makeSyncBenchmark({ name: 'a', category: 'CatA' }));
      runner.addBenchmark(makeSyncBenchmark({ name: 'b', category: 'CatB' }));
      const filteredRunner = new BenchmarkRunner({
        iterations: 100, warmupIterations: 10,
        categories: ['CatA'],
      });
      filteredRunner.addBenchmarks(runner.getBenchmarks());
      const result = await filteredRunner.runAll();
      expect(result.benchmarks).toHaveLength(1);
      expect(result.benchmarks[0].name).toBe('a');
    });

    it('filters by tag', async () => {
      runner.addBenchmark(makeSyncBenchmark({ name: 'a', tags: ['foo', 'bar'] }));
      runner.addBenchmark(makeSyncBenchmark({ name: 'b', tags: ['baz'] }));
      const filteredRunner = new BenchmarkRunner({
        iterations: 100, warmupIterations: 10,
        tags: ['foo'],
      });
      filteredRunner.addBenchmarks(runner.getBenchmarks());
      const result = await filteredRunner.runAll();
      expect(result.benchmarks).toHaveLength(1);
      expect(result.benchmarks[0].name).toBe('a');
    });

    it('filters by multiple tags (OR logic)', async () => {
      runner.addBenchmark(makeSyncBenchmark({ name: 'a', tags: ['foo'] }));
      runner.addBenchmark(makeSyncBenchmark({ name: 'b', tags: ['bar'] }));
      runner.addBenchmark(makeSyncBenchmark({ name: 'c', tags: ['baz'] }));
      const filteredRunner = new BenchmarkRunner({
        iterations: 100, warmupIterations: 10,
        tags: ['foo', 'bar'],
      });
      filteredRunner.addBenchmarks(runner.getBenchmarks());
      const result = await filteredRunner.runAll();
      expect(result.benchmarks).toHaveLength(2);
    });
  });

  describe('BenchmarkRunner.compare', () => {
    it('compares two suite results', () => {
      const before: BenchmarkSuiteResult = {
        suiteName: 'fleet-benchmarks',
        timestamp: Date.now() - 1000,
        runId: 'before1',
        config: { iterations: 100, warmupIterations: 10, regressionThreshold: 10, tags: [], categories: [] },
        benchmarks: [
          {
            name: 'bench1', category: 'Test', description: '',
            stats: { iterations: 100, successes: 100, failures: 0, mean: 100, median: 100, stddev: 10, min: 80, max: 120, p95: 115, p99: 118, throughput: 10000000, rse: 10 },
            samples: [], durationMs: 10,
          },
        ],
      };
      const after: BenchmarkSuiteResult = {
        suiteName: 'fleet-benchmarks',
        timestamp: Date.now(),
        runId: 'after1',
        config: { iterations: 100, warmupIterations: 10, regressionThreshold: 10, tags: [], categories: [] },
        benchmarks: [
          {
            name: 'bench1', category: 'Test', description: '',
            stats: { iterations: 100, successes: 100, failures: 0, mean: 80, median: 80, stddev: 8, min: 60, max: 100, p95: 95, p99: 98, throughput: 12500000, rse: 10 },
            samples: [], durationMs: 8,
          },
        ],
      };

      const comparison = BenchmarkRunner.compare(before, after);
      expect(comparison.comparisons).toHaveLength(1);
      expect(comparison.summary.total).toBe(1);
      expect(comparison.summary.regressions).toBe(0); // mean decreased = improvement
      expect(comparison.summary.improvements).toBe(1);
      expect(comparison.comparisons[0].deltas.mean.percent).toBe(-20);
    });

    it('detects regressions above threshold', () => {
      const makeSuite = (mean: number): BenchmarkSuiteResult => ({
        suiteName: 'fleet-benchmarks',
        timestamp: Date.now(),
        runId: 'r',
        config: { iterations: 100, warmupIterations: 10, regressionThreshold: 10, tags: [], categories: [] },
        benchmarks: [{
          name: 'bench1', category: 'Test', description: '',
          stats: { iterations: 100, successes: 100, failures: 0, mean, median: mean, stddev: 10, min: mean - 20, max: mean + 20, p95: mean + 15, p99: mean + 18, throughput: 10000000, rse: 10 },
          samples: [], durationMs: 10,
        }],
      });

      const comparison = BenchmarkRunner.compare(makeSuite(100), makeSuite(120));
      expect(comparison.comparisons[0].regression).toBe(true);
      expect(comparison.summary.regressions).toBe(1);
    });

    it('uses custom regression threshold', () => {
      const makeSuite = (mean: number): BenchmarkSuiteResult => ({
        suiteName: 'fleet-benchmarks',
        timestamp: Date.now(),
        runId: 'r',
        config: { iterations: 100, warmupIterations: 10, regressionThreshold: 10, tags: [], categories: [] },
        benchmarks: [{
          name: 'bench1', category: 'Test', description: '',
          stats: { iterations: 100, successes: 100, failures: 0, mean, median: mean, stddev: 10, min: mean - 20, max: mean + 20, p95: mean + 15, p99: mean + 18, throughput: 10000000, rse: 10 },
          samples: [], durationMs: 10,
        }],
      });

      // 10% increase should not regress with 15% threshold
      const comparison = BenchmarkRunner.compare(makeSuite(100), makeSuite(110), 15);
      expect(comparison.comparisons[0].regression).toBe(false);
    });

    it('ignores benchmarks only in after result', () => {
      const before: BenchmarkSuiteResult = {
        suiteName: 'fleet-benchmarks',
        timestamp: Date.now(),
        runId: 'b',
        config: { iterations: 100, warmupIterations: 10, regressionThreshold: 10, tags: [], categories: [] },
        benchmarks: [],
      };
      const after: BenchmarkSuiteResult = {
        suiteName: 'fleet-benchmarks',
        timestamp: Date.now(),
        runId: 'a',
        config: { iterations: 100, warmupIterations: 10, regressionThreshold: 10, tags: [], categories: [] },
        benchmarks: [{
          name: 'new_bench', category: 'Test', description: '',
          stats: { iterations: 100, successes: 100, failures: 0, mean: 50, median: 50, stddev: 5, min: 40, max: 60, p95: 58, p99: 59, throughput: 20000000, rse: 10 },
          samples: [], durationMs: 5,
        }],
      };

      const comparison = BenchmarkRunner.compare(before, after);
      expect(comparison.comparisons).toHaveLength(0);
    });
  });
});
