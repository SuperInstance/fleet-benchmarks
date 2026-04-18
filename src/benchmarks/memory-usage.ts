/**
 * fleet-benchmarks: Memory Usage Tracking
 * Tracks heap/memory allocation patterns across operations.
 */

import type { BenchmarkDef, BenchmarkSample, MemorySnapshot } from '../core/types';

function timeWithMemory(
  fn: () => void,
  iterations: number
): BenchmarkSample[] {
  const samples: BenchmarkSample[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    // Force GC-like behavior by tracking array sizes
    const arrays: number[][] = [];
    fn(arrays);

    const end = performance.now();

    let totalBytes = 0;
    for (const arr of arrays) {
      totalBytes += arr.length * 8; // 8 bytes per number
    }

    samples.push({
      timestamp: Date.now(),
      durationNs: (end - start) * 1e6,
      memoryDeltaBytes: totalBytes,
      success: true,
    });
  }
  return samples;
}

// ── Memory Allocation Patterns ───────────────────────────────────

const linearAlloc: BenchmarkDef = {
  name: 'memory_linear_alloc',
  category: 'Memory Usage',
  description: 'Linear memory allocation growth pattern',
  tags: ['memory'],
  defaultIterations: 2000,
  run: (iters) => timeWithMemory((arrays: number[][]) => {
    for (let i = 0; i < 10; i++) {
      const arr = new Array(100);
      for (let j = 0; j < 100; j++) arr[j] = i * 100 + j;
      arrays.push(arr);
    }
  }, iters),
};

const burstAlloc: BenchmarkDef = {
  name: 'memory_burst_alloc',
  category: 'Memory Usage',
  description: 'Burst allocation pattern (large arrays)',
  tags: ['memory'],
  defaultIterations: 1000,
  run: (iters) => timeWithMemory((arrays: number[][]) => {
    const arr = new Array(10000);
    for (let j = 0; j < 10000; j++) arr[j] = j;
    arrays.push(arr);
  }, iters),
};

const fragmentedAlloc: BenchmarkDef = {
  name: 'memory_fragmented_alloc',
  category: 'Memory Usage',
  description: 'Fragmented allocation pattern (many small arrays)',
  tags: ['memory'],
  defaultIterations: 2000,
  run: (iters) => timeWithMemory((arrays: number[][]) => {
    for (let i = 0; i < 100; i++) {
      const arr = new Array(Math.floor(Math.random() * 50) + 1);
      for (let j = 0; j < arr.length; j++) arr[j] = Math.random();
      arrays.push(arr);
    }
  }, iters),
};

const typedArrayAlloc: BenchmarkDef = {
  name: 'memory_typed_array',
  category: 'Memory Usage',
  description: 'TypedArray allocation (Float64Array, Uint8Array)',
  tags: ['memory', 'typed'],
  defaultIterations: 2000,
  run: (iters) => timeWithMemory((arrays: number[][]) => {
    const f64 = new Float64Array(1000);
    const u8 = new Uint8Array(8000);
    for (let j = 0; j < 1000; j++) f64[j] = j * 1.5;
    for (let j = 0; j < 8000; j++) u8[j] = j & 0xFF;
    arrays.push(Array.from(f64));
  }, iters),
};

const objectAlloc: BenchmarkDef = {
  name: 'memory_object_alloc',
  category: 'Memory Usage',
  description: 'Object allocation pattern (many small objects)',
  tags: ['memory', 'objects'],
  defaultIterations: 2000,
  run: (iters) => timeWithMemory((arrays: number[][]) => {
    const objs: { a: number; b: string; c: number[] }[] = [];
    for (let i = 0; i < 50; i++) {
      objs.push({ a: i, b: `obj-${i}`, c: [i, i + 1, i + 2] });
    }
    arrays.push(objs.map(o => o.a));
  }, iters),
};

const stringAlloc: BenchmarkDef = {
  name: 'memory_string_alloc',
  category: 'Memory Usage',
  description: 'String allocation and concatenation',
  tags: ['memory', 'strings'],
  defaultIterations: 2000,
  run: (iters) => timeWithMemory((arrays: number[][]) => {
    let s = '';
    for (let i = 0; i < 20; i++) {
      s += `fleet-message-${i}-payload-`;
    }
    arrays.push([s.length]);
  }, iters),
};

/** Capture a memory snapshot */
export function captureMemorySnapshot(): MemorySnapshot {
  const perf = performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };
  const mem = perf.memory;
  return {
    timestamp: Date.now(),
    heapUsedBytes: mem?.usedJSHeapSize ?? 0,
    heapTotalBytes: mem?.totalJSHeapSize ?? 0,
    externalBytes: 0,
  };
}

/** All memory benchmarks */
export const memoryBenchmarks: BenchmarkDef[] = [
  linearAlloc,
  burstAlloc,
  fragmentedAlloc,
  typedArrayAlloc,
  objectAlloc,
  stringAlloc,
];
