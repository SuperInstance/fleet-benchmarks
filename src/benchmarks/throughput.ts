/**
 * fleet-benchmarks: Throughput Measurement
 * Instructions per second at various batch sizes.
 */

import type { BenchmarkDef, BenchmarkSample } from '../core/types';

function measureThroughput(
  opFn: () => void,
  batchSize: number,
  iterations: number
): BenchmarkSample[] {
  const samples: BenchmarkSample[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    for (let b = 0; b < batchSize; b++) {
      opFn();
    }
    const end = performance.now();
    samples.push({
      timestamp: Date.now(),
      durationNs: (end - start) * 1e6,
      success: true,
    });
  }
  return samples;
}

// Simple instruction simulation: NOP + register update
const simpleOp = () => { let r = 0; r = (r + 1) & 0xFF; };

// Complex instruction: hash-like operation
const complexOp = () => {
  let h = 0x811c9dc5;
  const s = 'fleet-benchmark';
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
};

// Memory-bound instruction
const memoryOp = () => {
  const buf = new Uint32Array(64);
  for (let i = 0; i < 64; i++) buf[i] = i * 3;
};

const BATCH_SIZES = [1, 10, 100, 1000, 10000];

// ── Simple Op Throughput ─────────────────────────────────────────

const simpleOpThroughputs = BATCH_SIZES.map(bs => ({
  name: `throughput_simple_batch_${bs}`,
  category: 'Throughput',
  description: `Simple NOP throughput at batch size ${bs}`,
  tags: ['throughput', 'simple'],
  defaultIterations: 5000,
  run: (iters) => measureThroughput(simpleOp, bs, iters),
}));

// ── Complex Op Throughput ────────────────────────────────────────

const complexOpThroughputs = BATCH_SIZES.map(bs => ({
  name: `throughput_complex_batch_${bs}`,
  category: 'Throughput',
  description: `Complex (FNV hash) throughput at batch size ${bs}`,
  tags: ['throughput', 'complex'],
  defaultIterations: 3000,
  run: (iters) => measureThroughput(complexOp, bs, iters),
}));

// ── Memory-Bound Throughput ──────────────────────────────────────

const memoryOpThroughputs = BATCH_SIZES.map(bs => ({
  name: `throughput_memory_batch_${bs}`,
  category: 'Throughput',
  description: `Memory-bound throughput at batch size ${bs}`,
  tags: ['throughput', 'memory'],
  defaultIterations: 2000,
  run: (iters) => measureThroughput(memoryOp, bs, iters),
}));

// ── Pipeline Throughput (mixed ops) ──────────────────────────────

const pipelineThroughputs = BATCH_SIZES.map(bs => ({
  name: `throughput_pipeline_batch_${bs}`,
  category: 'Throughput',
  description: `Mixed pipeline throughput at batch size ${bs}`,
  tags: ['throughput', 'pipeline'],
  defaultIterations: 2000,
  run: (iters) => measureThroughput(() => {
    simpleOp();
    complexOp();
    memoryOp();
  }, bs, iters),
}));

// ── Sustained Throughput (long-running) ──────────────────────────

const sustainedThroughput: BenchmarkDef = {
  name: 'throughput_sustained_1M',
  category: 'Throughput',
  description: 'Sustained throughput: 1M operations',
  tags: ['throughput', 'sustained'],
  defaultIterations: 100,
  run: (iters) => {
    const samples: BenchmarkSample[] = [];
    for (let i = 0; i < iters; i++) {
      const start = performance.now();
      for (let j = 0; j < 1_000_000; j++) {
        simpleOp();
      }
      const end = performance.now();
      samples.push({
        timestamp: Date.now(),
        durationNs: (end - start) * 1e6,
        success: true,
      });
    }
    return samples;
  },
};

/** All throughput benchmarks */
export const throughputBenchmarks: BenchmarkDef[] = [
  ...simpleOpThroughputs,
  ...complexOpThroughputs,
  ...memoryOpThroughputs,
  ...pipelineThroughputs,
  sustainedThroughput,
];
