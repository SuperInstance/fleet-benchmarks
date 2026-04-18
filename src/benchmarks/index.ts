/**
 * fleet-benchmarks: All benchmarks aggregate
 */

export { opcodeBenchmarks } from './opcode-speed';
export { crossRuntimeBenchmarks, generateCrossRuntimeTable } from './cross-runtime';
export { memoryBenchmarks, captureMemorySnapshot } from './memory-usage';
export { startupBenchmarks, measureFullStartup } from './startup-time';
export { throughputBenchmarks } from './throughput';
export { messageBusBenchmarks } from './message-bus';
export { conformanceBenchmarks, runConformanceTests, getConformanceCoverage, OPCODE_TESTS } from './conformance';

import type { BenchmarkDef } from '../core/types';
import { opcodeBenchmarks } from './opcode-speed';
import { crossRuntimeBenchmarks } from './cross-runtime';
import { memoryBenchmarks } from './memory-usage';
import { startupBenchmarks } from './startup-time';
import { throughputBenchmarks } from './throughput';
import { messageBusBenchmarks } from './message-bus';
import { conformanceBenchmarks } from './conformance';

/** All registered benchmarks */
export const allBenchmarks: BenchmarkDef[] = [
  ...opcodeBenchmarks,
  ...crossRuntimeBenchmarks,
  ...memoryBenchmarks,
  ...startupBenchmarks,
  ...throughputBenchmarks,
  ...messageBusBenchmarks,
  ...conformanceBenchmarks,
];
