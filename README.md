# fleet-benchmarks

Standardized benchmarking suite for fleet vessel performance. Part of the [Cocapn fleet](https://github.com/Lucineer/the-fleet).

## 🚀 Quick Start

```bash
npm install
npm run bench:quick          # Fast smoke test
npm run bench:full           # Full suite with reports
npm test                     # Run 130 tests
```

## 📊 Benchmark Categories

| Category | Description | Benchmarks |
|---|---|---|
| **Opcode Execution Speed** | Per-opcode timing for arithmetic, memory, control flow, A2A signals, stack, I/O, crypto | 17 |
| **Cross-Runtime Comparison** | Same operations across Python, C, JS, WASM, Rust runtimes | 20 |
| **Memory Usage** | Heap allocation patterns: linear, burst, fragmented, typed arrays, objects, strings | 6 |
| **Startup Time** | Cold start vs warm start vs steady state per runtime (5 runtimes × 3 phases) | 15 |
| **Throughput** | Instructions/second at batch sizes 1–10,000 + pipeline + sustained | 21 |
| **Message Bus Latency** | I2I v2, A2A v1, HTTP round-trip times at 6 payload sizes + concurrency + backpressure | 18 |
| **Conformance Test Coverage** | 56 opcode correctness tests per runtime (arithmetic, bitwise, comparison, memory, control flow, stack, I/O, crypto, A2A) | 5 |

**Total: 100+ benchmarks** across **7 categories**

## 🏃 CLI Usage

```bash
npx tsx run-benchmarks.ts [options]

Options:
  --iterations <n>      Iterations per benchmark (default: 1000)
  --warmup <n>          Warmup iterations (default: 100)
  --category <name>     Filter by category (repeatable)
  --tag <tag>           Filter by tag (repeatable)
  --json <file>         Output JSON report
  --markdown <file>     Output Markdown report
  --compare <file>      Compare with previous JSON results
  --verbose             Verbose logging
```

### Examples

```bash
# Run only opcode benchmarks with verbose output
npm run bench:opcode

# Run memory benchmarks
npm run bench:memory

# Run full suite and save reports
npm run bench:full

# Compare with previous results
npx tsx run-benchmarks.ts --compare bench-results.json --markdown comparison.md
```

## 📈 Statistical Analysis

Every benchmark computes:
- **Mean, Median, Standard Deviation** — central tendency and spread
- **Min, Max** — range
- **p95, p99** — tail latency
- **Throughput** — operations per second
- **RSE** — relative standard error (measurement quality)

## 🔬 Test Suite

```bash
npm test                 # 130 tests across 6 test files
```

- **statistics.test.ts** — 42 tests for statistical functions
- **runner.test.ts** — 19 tests for benchmark runner
- **reporter.test.ts** — 13 tests for JSON/Markdown report generation
- **opcode-speed.test.ts** — 12 tests for opcode benchmarks
- **benchmarks.test.ts** — 37 tests for all benchmark categories
- **integration.test.ts** — 7 end-to-end tests

## 📐 Architecture

```
src/
├── core/
│   ├── types.ts          # Type definitions
│   ├── statistics.ts     # Statistical analysis (mean, median, stddev, p95, p99)
│   ├── reporter.ts       # JSON + Markdown report generation
│   ├── runner.ts         # Benchmark runner with warmup, filtering, comparison
│   └── index.ts          # Barrel exports
├── benchmarks/
│   ├── opcode-speed.ts   # Opcode execution timing
│   ├── cross-runtime.ts  # Multi-runtime comparison
│   ├── memory-usage.ts   # Memory allocation patterns
│   ├── startup-time.ts   # Cold/warm/steady start
│   ├── throughput.ts     # Batch throughput measurement
│   ├── message-bus.ts    # I2I v2 / A2A v1 / HTTP latency
│   ├── conformance.ts    # 56 opcode correctness tests
│   └── index.ts          # All benchmarks aggregate
└── worker.ts             # Cloudflare Worker dashboard
```

## 📋 Comparison Mode

Run benchmarks, save results, then compare:

```bash
# Baseline run
npx tsx run-benchmarks.ts --json baseline.json --markdown baseline.md

# After changes
npx tsx run-benchmarks.ts --json after.json --markdown after.md --compare baseline.json
```

The comparison report shows regressions (above threshold), improvements, and neutral changes with percentage deltas for mean, median, p95, p99, and throughput.

---
<i>Built with [Cocapn](https://github.com/Lucineer/cocapn-ai).</i>

Superinstance & Lucineer (DiGennaro et al.)
