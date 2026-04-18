/**
 * fleet-benchmarks: Startup Time
 * Measures cold start vs warm start for each runtime.
 */

import type { BenchmarkDef, BenchmarkSample, StartupResult, FleetRuntime, BenchmarkPhase } from '../core/types';
import { captureMemorySnapshot } from './memory-usage';

/**
 * Simulates runtime startup cost by measuring module initialization,
 * JIT compilation, and first-run overhead.
 */
function measureStartupPhase(
  runtime: FleetRuntime,
  phase: BenchmarkPhase,
  iterations: number
): BenchmarkSample[] {
  const samples: BenchmarkSample[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    if (phase === 'cold_start') {
      // Simulate cold start: create new objects, compile new functions, no caching
      const vm = new Function(`
        'use strict';
        const state = {};
        const handlers = {};
        function init() {
          state.version = '1.0.0';
          state.tick = 0;
          for (let j = 0; j < 100; j++) {
            handlers[\`handler_\${j}\`] = function(x) { return x * 2; };
          }
        }
        init();
        return { state, handlers };
      `);
      vm();
    } else if (phase === 'warm_start') {
      // Simulate warm start: reuse cached structures
      const cachedState = { version: '1.0.0', tick: 0 };
      const cachedHandlers: Record<string, (x: number) => number> = {};
      for (let j = 0; j < 100; j++) {
        cachedHandlers[`handler_${j}`] = (x) => x * 2;
      }
      // Access cached values
      void cachedState.version;
      void Object.keys(cachedHandlers).length;
    } else {
      // Steady state: hot code path
      let acc = 0;
      for (let j = 0; j < 100; j++) acc += j * 2;
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

function makeStartupBenchmark(
  runtime: FleetRuntime,
  phase: BenchmarkPhase
): BenchmarkDef {
  const runtimeLabel = runtime.charAt(0).toUpperCase() + runtime.slice(1);
  const phaseLabel = phase.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    name: `startup_${runtime}_${phase}`,
    category: 'Startup Time',
    description: `${runtimeLabel} ${phaseLabel}`,
    tags: ['startup', runtime, phase],
    defaultIterations: 2000,
    run: (iters) => measureStartupPhase(runtime, phase, iters),
  };
}

/** Perform a full startup measurement across runtimes and phases */
export async function measureFullStartup(): Promise<StartupResult[]> {
  const runtimes: FleetRuntime[] = ['python', 'c', 'js', 'wasm', 'rust'];
  const phases: BenchmarkPhase[] = ['cold_start', 'warm_start', 'steady_state'];
  const results: StartupResult[] = [];

  for (const runtime of runtimes) {
    for (const phase of phases) {
      const start = performance.now();
      // Run the startup simulation once
      const samples = measureStartupPhase(runtime, phase, 1);
      const end = performance.now();
      const mem = captureMemorySnapshot();

      results.push({
        runtime,
        phase,
        durationMs: end - start,
        memorySnapshot: mem,
        timestamp: Date.now(),
        success: samples[0]?.success ?? true,
      } as StartupResult);
    }
  }

  return results;
}

/** All startup time benchmarks */
export const startupBenchmarks: BenchmarkDef[] = [
  // JS runtimes
  makeStartupBenchmark('js', 'cold_start'),
  makeStartupBenchmark('js', 'warm_start'),
  makeStartupBenchmark('js', 'steady_state'),
  // Python (simulated)
  makeStartupBenchmark('python', 'cold_start'),
  makeStartupBenchmark('python', 'warm_start'),
  makeStartupBenchmark('python', 'steady_state'),
  // C (simulated)
  makeStartupBenchmark('c', 'cold_start'),
  makeStartupBenchmark('c', 'warm_start'),
  makeStartupBenchmark('c', 'steady_state'),
  // WASM (simulated)
  makeStartupBenchmark('wasm', 'cold_start'),
  makeStartupBenchmark('wasm', 'warm_start'),
  makeStartupBenchmark('wasm', 'steady_state'),
  // Rust (simulated)
  makeStartupBenchmark('rust', 'cold_start'),
  makeStartupBenchmark('rust', 'warm_start'),
  makeStartupBenchmark('rust', 'steady_state'),
];
