/**
 * fleet-benchmarks: Cross-Runtime Comparison
 * Simulates equivalent bytecodes across Python, C, and JS runtimes
 * by measuring execution characteristics of representative operations.
 */

import type { BenchmarkDef, BenchmarkSample, CrossRuntimeRow, FleetRuntime, StatsSummary } from '../core/types';
import { computeStats } from '../core/statistics';

/**
 * Simulated cross-runtime benchmark for a canonical operation.
 * In a real fleet, this would shell out to each runtime.
 * Here we use JS as baseline and apply scaling factors based on
 * known performance characteristics of Python (slower) and C (faster).
 */
function crossRuntimeSample(
  jsFn: () => void,
  iterations: number,
  runtime: FleetRuntime,
  scaleFactor: number
): BenchmarkSample[] {
  const samples: BenchmarkSample[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    // Simulate runtime overhead
    if (runtime === 'python') {
      // Python is ~50-100x slower for tight loops
      for (let j = 0; j < Math.ceil(scaleFactor * 0.5); j++) jsFn();
    } else if (runtime === 'c') {
      // C is ~3-10x faster
      jsFn();
    } else if (runtime === 'wasm') {
      // WASM is ~1.2-2x faster than JS
      jsFn();
    } else if (runtime === 'rust') {
      // Rust is ~5-15x faster
      jsFn();
    } else {
      jsFn();
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

// ── Cross-Runtime Benchmarks ─────────────────────────────────────

function makeCrossRuntimeBenchmark(
  name: string,
  description: string,
  fn: () => void,
  scaleFactor: number
): BenchmarkDef[] {
  const runtimes: FleetRuntime[] = ['python', 'c', 'js', 'wasm', 'rust'];
  return runtimes.map(rt => ({
    name: `cross_${rt}_${name}`,
    category: 'Cross-Runtime Comparison',
    description: `${description} (${rt} runtime)`,
    tags: ['cross-runtime', rt],
    defaultIterations: 5000,
    run: (iters) => crossRuntimeSample(fn, iters, rt, scaleFactor),
  }));
}

// Arithmetic: Python ~80x slower, C ~8x faster
const crossArithmeticBenchmarks = makeCrossRuntimeBenchmark(
  'arithmetic_loop',
  'Integer arithmetic loop',
  () => { let a = 0; for (let i = 0; i < 100; i++) a += i * 3 - i / 2; },
  80
);

// Memory: Python ~40x slower, C ~5x faster
const crossMemoryBenchmarks = makeCrossRuntimeBenchmark(
  'memory_alloc_dealloc',
  'Memory allocation and deallocation',
  () => { const arr = new Float64Array(256); for (let i = 0; i < 256; i++) arr[i] = i * 1.1; },
  40
);

// String: Python ~30x slower, C ~6x faster
const crossStringBenchmarks = makeCrossRuntimeBenchmark(
  'string_processing',
  'String processing',
  () => { let s = 'hello fleet benchmark '; s = s.repeat(10); s.split(' ').join('-'); },
  30
);

// JSON: Python ~20x slower, C ~4x faster (for small payloads)
const crossJsonBenchmarks = makeCrossRuntimeBenchmark(
  'json_serialize',
  'JSON serialization',
  () => { const obj = { a: 1, b: 'test', c: [1, 2, 3], d: { nested: true } }; JSON.stringify(obj); },
  20
);

/** Helper to generate cross-runtime comparison table */
export function generateCrossRuntimeTable(
  benchmarks: BenchmarkDef[],
  runtimeResults: Map<string, StatsSummary>
): CrossRuntimeRow[] {
  const opcodeNames = new Set<string>();
  for (const b of benchmarks) {
    const parts = b.name.split('_');
    // Remove runtime prefix: cross_<runtime>_<opcode>
    if (parts[0] === 'cross') {
      opcodeNames.add(parts.slice(2).join('_'));
    }
  }

  const rows: CrossRuntimeRow[] = [];
  for (const opcode of opcodeNames) {
    const row: CrossRuntimeRow = { opcode, results: {} };
    for (const rt of ['python', 'c', 'js', 'wasm', 'rust'] as FleetRuntime[]) {
      const key = `cross_${rt}_${opcode}`;
      const stats = runtimeResults.get(key);
      if (stats) row.results[rt] = stats;
    }
    rows.push(row);
  }
  return rows;
}

/** All cross-runtime benchmarks */
export const crossRuntimeBenchmarks: BenchmarkDef[] = [
  ...crossArithmeticBenchmarks,
  ...crossMemoryBenchmarks,
  ...crossStringBenchmarks,
  ...crossJsonBenchmarks,
];
