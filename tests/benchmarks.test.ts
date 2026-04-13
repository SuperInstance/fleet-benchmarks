/**
 * Tests for fleet-benchmarks: Cross-Runtime, Memory, Startup, Throughput, Message Bus, Conformance
 */

import { describe, it, expect } from 'vitest';
import { crossRuntimeBenchmarks } from '../src/benchmarks/cross-runtime';
import { memoryBenchmarks, captureMemorySnapshot } from '../src/benchmarks/memory-usage';
import { startupBenchmarks } from '../src/benchmarks/startup-time';
import { throughputBenchmarks } from '../src/benchmarks/throughput';
import { messageBusBenchmarks } from '../src/benchmarks/message-bus';
import { conformanceBenchmarks, getConformanceCoverage, runConformanceTests, OPCODE_TESTS } from '../src/benchmarks/conformance';

// ── Cross-Runtime ────────────────────────────────────────────────

describe('Cross-Runtime Benchmarks', () => {
  it('has benchmarks for all 5 runtimes', () => {
    const runtimes = new Set(crossRuntimeBenchmarks.map(b => b.tags?.[1]));
    expect(runtimes.size).toBeGreaterThanOrEqual(5);
  });

  it('all have correct category', () => {
    for (const b of crossRuntimeBenchmarks) {
      expect(b.category).toBe('Cross-Runtime Comparison');
    }
  });

  it('produces valid samples', async () => {
    const bench = crossRuntimeBenchmarks[0];
    const samples = await bench.run(10);
    expect(samples).toHaveLength(10);
    for (const s of samples) expect(s.success).toBe(true);
  });

  it('has at least 20 benchmarks (4 ops × 5 runtimes)', () => {
    expect(crossRuntimeBenchmarks.length).toBeGreaterThanOrEqual(20);
  });
});

// ── Memory Usage ─────────────────────────────────────────────────

describe('Memory Benchmarks', () => {
  it('has at least 6 benchmarks', () => {
    expect(memoryBenchmarks.length).toBeGreaterThanOrEqual(6);
  });

  it('all have correct category', () => {
    for (const b of memoryBenchmarks) {
      expect(b.category).toBe('Memory Usage');
    }
  });

  it('produces valid samples', async () => {
    const bench = memoryBenchmarks[0];
    const samples = await bench.run(10);
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) {
      expect(s.success).toBe(true);
      expect(s.durationNs).toBeGreaterThan(0);
    }
  });

  it('includes memory delta bytes', async () => {
    const bench = memoryBenchmarks.find(b => b.name === 'memory_linear_alloc')!;
    const samples = await bench.run(5);
    for (const s of samples) {
      expect(s.memoryDeltaBytes).toBeGreaterThan(0);
    }
  });

  it('captureMemorySnapshot returns valid snapshot', () => {
    const snapshot = captureMemorySnapshot();
    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.heapTotalBytes).toBeGreaterThanOrEqual(0);
  });
});

// ── Startup Time ─────────────────────────────────────────────────

describe('Startup Benchmarks', () => {
  it('has benchmarks for all 5 runtimes × 3 phases', () => {
    expect(startupBenchmarks.length).toBeGreaterThanOrEqual(15); // 5 × 3
  });

  it('all have correct category', () => {
    for (const b of startupBenchmarks) {
      expect(b.category).toBe('Startup Time');
    }
  });

  it('covers cold_start phase', () => {
    const cold = startupBenchmarks.filter(b => b.tags?.includes('cold_start'));
    expect(cold.length).toBeGreaterThanOrEqual(5);
  });

  it('covers warm_start phase', () => {
    const warm = startupBenchmarks.filter(b => b.tags?.includes('warm_start'));
    expect(warm.length).toBeGreaterThanOrEqual(5);
  });

  it('covers steady_state phase', () => {
    const steady = startupBenchmarks.filter(b => b.tags?.includes('steady_state'));
    expect(steady.length).toBeGreaterThanOrEqual(5);
  });

  it('produces valid samples', async () => {
    const bench = startupBenchmarks[0];
    const samples = await bench.run(5);
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) expect(s.success).toBe(true);
  });
});

// ── Throughput ───────────────────────────────────────────────────

describe('Throughput Benchmarks', () => {
  it('has at least 20 benchmarks', () => {
    expect(throughputBenchmarks.length).toBeGreaterThanOrEqual(20);
  });

  it('all have correct category', () => {
    for (const b of throughputBenchmarks) {
      expect(b.category).toBe('Throughput');
    }
  });

  it('covers multiple batch sizes', () => {
    const names = throughputBenchmarks.map(b => b.name);
    // Should have batch sizes 1, 10, 100, 1000, 10000
    expect(names.some(n => n.includes('batch_1'))).toBe(true);
    expect(names.some(n => n.includes('batch_10000'))).toBe(true);
  });

  it('covers pipeline throughput', () => {
    const pipeline = throughputBenchmarks.filter(b => b.tags?.includes('pipeline'));
    expect(pipeline.length).toBeGreaterThanOrEqual(5);
  });

  it('includes sustained throughput', () => {
    const sustained = throughputBenchmarks.find(b => b.tags?.includes('sustained'));
    expect(sustained).toBeDefined();
  });

  it('produces valid samples', async () => {
    const bench = throughputBenchmarks[0];
    const samples = await bench.run(10);
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) expect(s.success).toBe(true);
  });
});

// ── Message Bus ──────────────────────────────────────────────────

describe('Message Bus Benchmarks', () => {
  it('has at least 15 benchmarks', () => {
    expect(messageBusBenchmarks.length).toBeGreaterThanOrEqual(15);
  });

  it('all have correct category', () => {
    for (const b of messageBusBenchmarks) {
      expect(b.category).toBe('Message Bus Latency');
    }
  });

  it('covers I2I v2 protocol', () => {
    const i2i = messageBusBenchmarks.filter(b => b.tags?.includes('i2i_v2'));
    expect(i2i.length).toBeGreaterThanOrEqual(6);
  });

  it('covers A2A v1 protocol', () => {
    const a2a = messageBusBenchmarks.filter(b => b.tags?.includes('a2a_v1'));
    expect(a2a.length).toBeGreaterThanOrEqual(6);
  });

  it('covers HTTP protocol', () => {
    const http = messageBusBenchmarks.filter(b => b.tags?.includes('http'));
    expect(http.length).toBeGreaterThanOrEqual(3);
  });

  it('covers concurrent messaging', () => {
    const concurrent = messageBusBenchmarks.find(b => b.tags?.includes('concurrent'));
    expect(concurrent).toBeDefined();
  });

  it('covers backpressure scenarios', () => {
    const bp = messageBusBenchmarks.filter(b => b.tags?.includes('backpressure'));
    expect(bp.length).toBeGreaterThanOrEqual(4);
  });

  it('produces valid samples', async () => {
    const bench = messageBusBenchmarks[0];
    const samples = await bench.run(5);
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) expect(s.success).toBe(true);
  });
});

// ── Conformance ──────────────────────────────────────────────────

describe('Conformance Benchmarks', () => {
  it('has benchmarks for all 5 runtimes', () => {
    expect(conformanceBenchmarks.length).toBeGreaterThanOrEqual(5);
  });

  it('all have correct category', () => {
    for (const b of conformanceBenchmarks) {
      expect(b.category).toBe('Conformance Test Coverage');
    }
  });

  it('produces valid samples', async () => {
    const bench = conformanceBenchmarks[0];
    const samples = await bench.run(1);
    expect(samples).toHaveLength(1);
  });

  it('JS runtime passes all conformance tests', () => {
    const coverage = getConformanceCoverage('js');
    expect(coverage.passed).toBe(coverage.total);
    expect(coverage.coverage).toBe(100);
  });

  it('OPCODE_TESTS has at least 55 tests', () => {
    expect(OPCODE_TESTS.length).toBeGreaterThanOrEqual(55);
  });

  it('covers all major categories', () => {
    const categories = new Set(OPCODE_TESTS.map(t => t.category));
    expect(categories.has('arithmetic')).toBe(true);
    expect(categories.has('bitwise')).toBe(true);
    expect(categories.has('comparison')).toBe(true);
    expect(categories.has('memory')).toBe(true);
    expect(categories.has('control_flow')).toBe(true);
    expect(categories.has('stack')).toBe(true);
    expect(categories.has('io')).toBe(true);
    expect(categories.has('crypto')).toBe(true);
    expect(categories.has('a2a')).toBe(true);
  });

  it('runConformanceTests returns entries for all opcodes', () => {
    const entries = runConformanceTests('js');
    expect(entries.length).toBe(OPCODE_TESTS.length);
    for (const entry of entries) {
      expect(entry.opcode).toBeTruthy();
      expect(entry.runtime).toBe('js');
      expect(typeof entry.passed).toBe('boolean');
    }
  });

  it('getConformanceCoverage returns correct structure', () => {
    const coverage = getConformanceCoverage('js');
    expect(coverage.total).toBeGreaterThan(0);
    expect(coverage.passed).toBeGreaterThan(0);
    expect(coverage.coverage).toBeGreaterThan(0);
    expect(coverage.coverage).toBeLessThanOrEqual(100);
    expect(coverage.entries.length).toBe(coverage.total);
  });
});
