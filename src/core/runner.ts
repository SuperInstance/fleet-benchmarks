/**
 * fleet-benchmarks: Core Benchmark Runner
 * Orchestrates running benchmarks with warmup, stats collection, and comparison.
 */

import type {
  BenchmarkDef,
  BenchmarkConfig,
  BenchmarkSuiteResult,
  BenchmarkResultEntry,
  BenchmarkSample,
  SuiteComparison,
  BenchmarkComparison,
} from './types';
import { computeStats } from './statistics';
import { writeJsonReport, writeMarkdownReport, writeComparisonJsonReport, writeComparisonMarkdownReport } from './reporter';
import { shortId } from './statistics';

const DEFAULT_CONFIG: Required<BenchmarkConfig> = {
  iterations: 1000,
  warmupIterations: 100,
  regressionThreshold: 10,
  tags: [],
  categories: [],
  outputJson: undefined,
  outputMarkdown: undefined,
  compareWith: undefined,
  verbose: false,
};

export class BenchmarkRunner {
  private benchmarks: BenchmarkDef[] = [];
  private config: Required<BenchmarkConfig>;

  constructor(config?: Partial<BenchmarkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Register a benchmark definition */
  addBenchmark(def: BenchmarkDef): this {
    this.benchmarks.push(def);
    return this;
  }

  /** Register multiple benchmarks */
  addBenchmarks(defs: BenchmarkDef[]): this {
    for (const def of defs) {
      this.benchmarks.push(def);
    }
    return this;
  }

  /** Get all registered benchmark definitions */
  getBenchmarks(): BenchmarkDef[] {
    return [...this.benchmarks];
  }

  /** Filter benchmarks by tags and categories */
  private filterBenchmarks(): BenchmarkDef[] {
    return this.benchmarks.filter(b => {
      if (this.config.tags.length > 0) {
        const benchTags = b.tags ?? [];
        if (!this.config.tags.some(t => benchTags.includes(t))) return false;
      }
      if (this.config.categories.length > 0) {
        if (!this.config.categories.includes(b.category)) return false;
      }
      return true;
    });
  }

  /** Run warmup iterations (discarded from results) */
  private async warmup(def: BenchmarkDef): Promise<void> {
    const warmupCount = this.config.warmupIterations;
    if (warmupCount <= 0) return;
    try {
      await def.run(warmupCount);
    } catch {
      // Warmup failures are OK – we just want to warm caches
    }
  }

  /** Run a single benchmark and collect results */
  async runSingle(def: BenchmarkDef): Promise<BenchmarkResultEntry> {
    if (this.config.verbose) {
      console.log(`  [warmup] ${def.name} (${this.config.warmupIterations} iters)`);
    }
    await this.warmup(def);

    if (this.config.verbose) {
      console.log(`  [run] ${def.name} (${this.config.iterations} iters)`);
    }

    const startTime = performance.now();
    const samples = await def.run(this.config.iterations);
    const endTime = performance.now();

    return {
      name: def.name,
      category: def.category,
      description: def.description,
      stats: computeStats(samples),
      samples,
      durationMs: endTime - startTime,
    };
  }

  /** Run all benchmarks and return suite result */
  async runAll(): Promise<BenchmarkSuiteResult> {
    const filtered = this.filterBenchmarks();
    const results: BenchmarkResultEntry[] = [];

    console.log(`🚀 Running ${filtered.length} benchmarks (${this.config.iterations} iterations each)...`);
    console.log('');

    for (const def of filtered) {
      const entry = await this.runSingle(def);
      results.push(entry);
      if (this.config.verbose) {
        console.log(`  ✓ ${entry.name}: mean=${entry.stats.mean.toFixed(0)}ns throughput=${Math.round(entry.stats.throughput)} ops/s`);
      }
    }

    console.log('');
    const result: BenchmarkSuiteResult = {
      suiteName: 'fleet-benchmarks',
      timestamp: Date.now(),
      runId: shortId(),
      config: this.config,
      benchmarks: results,
    };

    // Write outputs
    if (this.config.outputMarkdown) {
      const md = writeMarkdownReport(result);
      require('fs').writeFileSync(this.config.outputMarkdown, md, 'utf-8');
      console.log(`📝 Markdown report: ${this.config.outputMarkdown}`);
    }
    if (this.config.outputJson) {
      const json = writeJsonReport(result);
      require('fs').writeFileSync(this.config.outputJson, json, 'utf-8');
      console.log(`📝 JSON report: ${this.config.outputJson}`);
    }

    return result;
  }

  /** Compare two suite results */
  static compare(
    before: BenchmarkSuiteResult,
    after: BenchmarkSuiteResult,
    regressionThreshold: number = 10
  ): SuiteComparison {
    const beforeMap = new Map(before.benchmarks.map(b => [b.name, b]));
    const comparisons: BenchmarkComparison[] = [];

    for (const afterBench of after.benchmarks) {
      const beforeBench = beforeMap.get(afterBench.name);
      if (!beforeBench) continue;

      const deltaPercent = (afterVal: number, beforeVal: number) =>
        beforeVal === 0 ? 0 : ((afterVal - beforeVal) / beforeVal) * 100;

      const deltas = {
        mean: { value: afterBench.stats.mean - beforeBench.stats.mean, percent: deltaPercent(afterBench.stats.mean, beforeBench.stats.mean) },
        median: { value: afterBench.stats.median - beforeBench.stats.median, percent: deltaPercent(afterBench.stats.median, beforeBench.stats.median) },
        p95: { value: afterBench.stats.p95 - beforeBench.stats.p95, percent: deltaPercent(afterBench.stats.p95, beforeBench.stats.p95) },
        p99: { value: afterBench.stats.p99 - beforeBench.stats.p99, percent: deltaPercent(afterBench.stats.p99, beforeBench.stats.p99) },
        throughput: { value: afterBench.stats.throughput - beforeBench.stats.throughput, percent: deltaPercent(afterBench.stats.throughput, beforeBench.stats.throughput) },
      };

      const regression = deltas.mean.percent > regressionThreshold;

      comparisons.push({
        before: beforeBench,
        after: afterBench,
        deltas,
        regression,
        regressionThreshold,
      });
    }

    return {
      suiteName: 'fleet-benchmarks',
      beforeRunId: before.runId,
      afterRunId: after.runId,
      beforeTimestamp: before.timestamp,
      afterTimestamp: after.timestamp,
      comparisons,
      summary: {
        total: comparisons.length,
        regressions: comparisons.filter(c => c.regression).length,
        improvements: comparisons.filter(c => !c.regression && c.deltas.mean.percent < 0).length,
        neutral: comparisons.filter(c => !c.regression && c.deltas.mean.percent === 0).length,
      },
    };
  }
}
