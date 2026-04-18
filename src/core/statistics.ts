/**
 * fleet-benchmarks: Statistical Analysis Utilities
 * Provides mean, median, stddev, percentiles, and throughput calculations.
 */

import type { BenchmarkSample, StatsSummary } from './types';

/** Compute arithmetic mean of numeric values */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Compute median of numeric values (handles even/odd lengths) */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Compute population standard deviation */
export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const squaredDiffs = values.map(v => (v - m) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

/** Compute the k-th percentile using linear interpolation */
export function percentile(sortedValues: number[], k: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const idx = (k / 100) * (sortedValues.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (idx - lower) * (sortedValues[upper] - sortedValues[lower]);
}

/** Relative standard error as a percentage */
export function relativeStandardError(values: number[]): number {
  if (values.length === 0) return 0;
  const sd = stddev(values);
  const m = mean(values);
  if (m === 0) return 0;
  return (sd / m) * 100;
}

/** Compute throughput: iterations per second */
export function throughputPerSecond(totalDurationNs: number, count: number): number {
  if (totalDurationNs === 0) return 0;
  return (count / totalDurationNs) * 1e9; // ns → s
}

/** Compute throughput from samples (successful only) */
export function computeThroughput(samples: BenchmarkSample[]): number {
  const successful = samples.filter(s => s.success);
  if (successful.length === 0) return 0;
  const totalNs = successful.reduce((a, s) => a + s.durationNs, 0);
  return throughputPerSecond(totalNs, successful.length);
}

/**
 * Full statistical summary from benchmark samples.
 * Uses only successful samples for timing stats.
 */
export function computeStats(samples: BenchmarkSample[]): StatsSummary {
  const successes = samples.filter(s => s.success);
  const failures = samples.length - successes.length;

  if (successes.length === 0) {
    return {
      iterations: samples.length,
      successes: 0,
      failures,
      mean: 0,
      median: 0,
      stddev: 0,
      min: 0,
      max: 0,
      p95: 0,
      p99: 0,
      throughput: 0,
      rse: 0,
    };
  }

  const durations = successes.map(s => s.durationNs);
  const sorted = [...durations].sort((a, b) => a - b);
  const totalNs = durations.reduce((a, b) => a + b, 0);

  return {
    iterations: samples.length,
    successes: successes.length,
    failures,
    mean: mean(durations),
    median: median(durations),
    stddev: stddev(durations),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    throughput: throughputPerSecond(totalNs, successes.length),
    rse: relativeStandardError(durations),
  };
}

/** Format nanoseconds to a human-readable string */
export function formatNs(ns: number): string {
  if (ns < 1_000) return `${ns.toFixed(0)}ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)}μs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
  return `${(ns / 1_000_000_000).toFixed(3)}s`;
}

/** Format large numbers with commas */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** Generate a short random ID */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}
