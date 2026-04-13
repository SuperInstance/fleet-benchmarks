/**
 * fleet-benchmarks: Core Type Definitions
 * Standardized benchmarking suite for fleet vessel performance
 */

// ── Benchmark Phase ──────────────────────────────────────────────
export type BenchmarkPhase = 'cold_start' | 'warm_start' | 'steady_state';

// ── Runtime Identifier ───────────────────────────────────────────
export type FleetRuntime = 'python' | 'c' | 'js' | 'wasm' | 'rust';

// ── Opcode Categories ────────────────────────────────────────────
export type OpcodeCategory =
  | 'arithmetic'
  | 'memory'
  | 'control_flow'
  | 'a2a_signals'
  | 'stack_ops'
  | 'io_ops'
  | 'crypto';

export interface OpcodeDef {
  name: string;
  category: OpcodeCategory;
  description: string;
  bytecodes: number[];
}

// ── Single Benchmark Sample ──────────────────────────────────────
export interface BenchmarkSample {
  /** High-resolution timestamp (ms) */
  timestamp: number;
  /** Duration of a single iteration in nanoseconds */
  durationNs: number;
  /** Memory delta in bytes (if measurable) */
  memoryDeltaBytes?: number;
  /** Whether the iteration succeeded */
  success: boolean;
  /** Optional error message */
  error?: string;
}

// ── Statistical Summary ──────────────────────────────────────────
export interface StatsSummary {
  /** Number of iterations */
  iterations: number;
  /** Number of successful iterations */
  successes: number;
  /** Number of failed iterations */
  failures: number;
  /** Mean duration (ns) */
  mean: number;
  /** Median duration (ns) */
  median: number;
  /** Standard deviation (ns) */
  stddev: number;
  /** Minimum duration (ns) */
  min: number;
  /** Maximum duration (ns) */
  max: number;
  /** 95th percentile (ns) */
  p95: number;
  /** 99th percentile (ns) */
  p99: number;
  /** Throughput: iterations per second */
  throughput: number;
  /** Relative standard error (%) */
  rse: number;
}

// ── Memory Snapshot ──────────────────────────────────────────────
export interface MemorySnapshot {
  timestamp: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  externalBytes: number;
  arrayBuffersBytes?: number;
  rssBytes?: number;
}

// ── Startup Measurement ──────────────────────────────────────────
export interface StartupResult {
  runtime: FleetRuntime;
  phase: BenchmarkPhase;
  durationMs: number;
  memorySnapshot?: MemorySnapshot;
  timestamp: number;
}

// ── Message Bus Measurement ──────────────────────────────────────
export interface MessageBusResult {
  protocol: 'i2i_v2' | 'a2a_v1' | 'http';
  payloadBytes: number;
  roundTripMs: number;
  success: boolean;
  timestamp: number;
}

// ── Conformance Entry ────────────────────────────────────────────
export interface ConformanceEntry {
  opcode: string;
  runtime: FleetRuntime;
  passed: boolean;
  details?: string;
}

// ── Cross-Runtime Comparison Row ─────────────────────────────────
export interface CrossRuntimeRow {
  opcode: string;
  results: Partial<Record<FleetRuntime, StatsSummary>>;
}

// ── Single Benchmark Definition ──────────────────────────────────
export interface BenchmarkDef {
  /** Unique benchmark name */
  name: string;
  /** Category for grouping */
  category: string;
  /** Description */
  description: string;
  /** The benchmark function – returns samples */
  run: (iterations: number) => Promise<BenchmarkSample[]>;
  /** Default iterations (overridable) */
  defaultIterations?: number;
  /** Tags for filtering */
  tags?: string[];
}

// ── Full Benchmark Suite Result ──────────────────────────────────
export interface BenchmarkSuiteResult {
  suiteName: string;
  timestamp: number;
  gitSha?: string;
  runId: string;
  config: BenchmarkConfig;
  benchmarks: BenchmarkResultEntry[];
}

// ── Per-Benchmark Result ─────────────────────────────────────────
export interface BenchmarkResultEntry {
  name: string;
  category: string;
  description: string;
  stats: StatsSummary;
  samples: BenchmarkSample[];
  durationMs: number;
}

// ── Comparison (before/after) ────────────────────────────────────
export interface BenchmarkComparison {
  before: BenchmarkResultEntry;
  after: BenchmarkResultEntry;
  deltas: {
    mean: { value: number; percent: number };
    median: { value: number; percent: number };
    p95: { value: number; percent: number };
    p99: { value: number; percent: number };
    throughput: { value: number; percent: number };
  };
  regression: boolean;
  regressionThreshold: number;
}

// ── Suite Comparison Report ───────────────────────────────────────
export interface SuiteComparison {
  suiteName: string;
  beforeRunId: string;
  afterRunId: string;
  beforeTimestamp: number;
  afterTimestamp: number;
  comparisons: BenchmarkComparison[];
  summary: {
    total: number;
    regressions: number;
    improvements: number;
    neutral: number;
  };
}

// ── Runner Config ────────────────────────────────────────────────
export interface BenchmarkConfig {
  iterations: number;
  warmupIterations?: number;
  regressionThreshold?: number;
  tags?: string[];
  categories?: string[];
  outputJson?: string;
  outputMarkdown?: string;
  compareWith?: string;
  verbose?: boolean;
}
