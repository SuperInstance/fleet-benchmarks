#!/usr/bin/env npx tsx
/**
 * fleet-benchmarks: CLI Benchmark Runner
 *
 * Usage:
 *   npx tsx run-benchmarks.ts [options]
 *
 * Options:
 *   --iterations <n>      Number of iterations per benchmark (default: 1000)
 *   --warmup <n>          Warmup iterations (default: 100)
 *   --category <name>     Only run benchmarks in this category (repeatable)
 *   --tag <tag>           Only run benchmarks with this tag (repeatable)
 *   --json <file>         Output JSON report to file
 *   --markdown <file>     Output Markdown report to file
 *   --compare <file>      Compare with previous JSON results file
 *   --verbose             Verbose output
 *   --help                Show this help
 */

import { BenchmarkRunner } from './src/core/runner';
import { allBenchmarks } from './src/benchmarks';

const args = process.argv.slice(2);

function parseArgs(): Record<string, string | boolean | string[]> {
  const parsed: Record<string, string | boolean | string[]> = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      i++;
    } else if (arg === '--verbose' || arg === '-v') {
      parsed.verbose = true;
      i++;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = args[i + 1];
      if (!val || val.startsWith('--')) {
        parsed[key] = true;
        i++;
      } else {
        // Support repeatable flags
        if (parsed[key] && Array.isArray(parsed[key])) {
          (parsed[key] as string[]).push(val);
        } else if (parsed[key]) {
          parsed[key] = [parsed[key] as string, val];
        } else {
          parsed[key] = val;
        }
        i += 2;
      }
    } else {
      i++;
    }
  }
  return parsed;
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════╗
║       🚀 Fleet Benchmarks Runner             ║
║       Standardized benchmarking suite         ║
║       for fleet vessel performance            ║
╚══════════════════════════════════════════════╝

Usage:
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
  --help                Show this help

Categories:
  Opcode Execution Speed, Cross-Runtime Comparison,
  Memory Usage, Startup Time, Throughput,
  Message Bus Latency, Conformance Test Coverage

Examples:
  npx tsx run-benchmarks.ts --iterations 5000 --json results.json
  npx tsx run-benchmarks.ts --category "Opcode Execution Speed" --verbose
  npx tsx run-benchmarks.ts --compare results.json --markdown comparison.md
`);
}

async function main(): Promise<void> {
  const parsed = parseArgs();

  if (parsed.help) {
    showHelp();
    process.exit(0);
  }

  const iterations = typeof parsed.iterations === 'string' ? parseInt(parsed.iterations, 10) : 1000;
  const warmup = typeof parsed.warmup === 'string' ? parseInt(parsed.warmup, 10) : 100;
  const categories = Array.isArray(parsed.category) ? parsed.category as string[] : parsed.category ? [parsed.category as string] : [];
  const tags = Array.isArray(parsed.tag) ? parsed.tag as string[] : parsed.tag ? [parsed.tag as string] : [];
  const verbose = !!parsed.verbose;
  const outputJson = typeof parsed.json === 'string' ? parsed.json : undefined;
  const outputMarkdown = typeof parsed.markdown === 'string' ? parsed.markdown : undefined;
  const compareFile = typeof parsed.compare === 'string' ? parsed.compare : undefined;

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║       🚀 Fleet Benchmarks Suite              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`Config: iterations=${iterations}, warmup=${warmup}`);
  if (categories.length > 0) console.log(`  categories: ${categories.join(', ')}`);
  if (tags.length > 0) console.log(`  tags: ${tags.join(', ')}`);
  console.log('');

  const runner = new BenchmarkRunner({
    iterations,
    warmupIterations: warmup,
    categories,
    tags,
    outputJson,
    outputMarkdown,
    verbose,
  });

  runner.addBenchmarks(allBenchmarks);

  if (compareFile) {
    // Comparison mode
    const fs = require('fs');
    if (!fs.existsSync(compareFile)) {
      console.error(`❌ Compare file not found: ${compareFile}`);
      process.exit(1);
    }
    const beforeData = JSON.parse(fs.readFileSync(compareFile, 'utf-8'));
    console.log(`📊 Comparison mode: comparing with ${compareFile}`);
    console.log('');

    const afterResult = await runner.runAll();

    const { BenchmarkRunner: BR } = require('./src/core/runner');
    const comparison = BR.compare(beforeData, afterResult);

    if (outputMarkdown) {
      const { writeComparisonMarkdownReport } = require('./src/core/reporter');
      const md = writeComparisonMarkdownReport(comparison);
      fs.writeFileSync(outputMarkdown, md, 'utf-8');
      console.log(`📝 Comparison report: ${outputMarkdown}`);
    }
    if (outputJson) {
      const { writeComparisonJsonReport } = require('./src/core/reporter');
      const json = writeComparisonJsonReport(comparison);
      fs.writeFileSync(outputJson, json, 'utf-8');
      console.log(`📝 Comparison JSON: ${outputJson}`);
    }

    // Print summary
    console.log('');
    console.log('═══ Comparison Summary ═══');
    console.log(`  Total:      ${comparison.summary.total}`);
    console.log(`  Improved:   ${comparison.summary.improvements} ✅`);
    console.log(`  Regressed:  ${comparison.summary.regressions} ⚠️`);
    console.log(`  Neutral:    ${comparison.summary.neutral} ➖`);
    console.log('');
  } else {
    await runner.runAll();
    console.log('');
    console.log('✅ Benchmarks complete!');
    console.log('');
  }
}

main().catch(err => {
  console.error('❌ Benchmark runner failed:', err);
  process.exit(1);
});
