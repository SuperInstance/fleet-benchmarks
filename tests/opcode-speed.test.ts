/**
 * Tests for fleet-benchmarks: Opcode Speed Benchmarks
 */

import { describe, it, expect } from 'vitest';
import { opcodeBenchmarks } from '../src/benchmarks/opcode-speed';
import type { BenchmarkSample } from '../src/core/types';

describe('Opcode Speed Benchmarks', () => {
  it('has at least 17 benchmark definitions', () => {
    expect(opcodeBenchmarks.length).toBeGreaterThanOrEqual(17);
  });

  it('all have required fields', () => {
    for (const bench of opcodeBenchmarks) {
      expect(bench.name).toBeTruthy();
      expect(bench.category).toBe('Opcode Execution Speed');
      expect(bench.description).toBeTruthy();
      expect(typeof bench.run).toBe('function');
    }
  });

  it('covers arithmetic category', () => {
    const arithmetic = opcodeBenchmarks.filter(b => b.tags?.includes('arithmetic'));
    expect(arithmetic.length).toBeGreaterThanOrEqual(4);
  });

  it('covers memory category', () => {
    const memory = opcodeBenchmarks.filter(b => b.tags?.includes('memory'));
    expect(memory.length).toBeGreaterThanOrEqual(3);
  });

  it('covers control flow category', () => {
    const cf = opcodeBenchmarks.filter(b => b.tags?.includes('control_flow'));
    expect(cf.length).toBeGreaterThanOrEqual(4);
  });

  it('covers A2A signals category', () => {
    const a2a = opcodeBenchmarks.filter(b => b.tags?.includes('a2a_signals'));
    expect(a2a.length).toBeGreaterThanOrEqual(2);
  });

  it('covers stack ops', () => {
    const stack = opcodeBenchmarks.filter(b => b.tags?.includes('stack_ops'));
    expect(stack.length).toBeGreaterThanOrEqual(1);
  });

  it('covers crypto category', () => {
    const crypto = opcodeBenchmarks.filter(b => b.tags?.includes('crypto'));
    expect(crypto.length).toBeGreaterThanOrEqual(2);
  });

  it('arithmetic benchmarks produce valid samples', async () => {
    const bench = opcodeBenchmarks.find(b => b.name === 'opcode_arithmetic_add')!;
    const samples = await bench.run(10);
    expect(samples).toHaveLength(10);
    for (const s of samples) {
      expect(s.success).toBe(true);
      expect(s.durationNs).toBeGreaterThan(0);
    }
  });

  it('control flow benchmarks produce valid samples', async () => {
    const bench = opcodeBenchmarks.find(b => b.name === 'opcode_control_loop')!;
    const samples = await bench.run(10);
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) {
      expect(s.success).toBe(true);
    }
  });

  it('has unique names', () => {
    const names = opcodeBenchmarks.map(b => b.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('crypto hash benchmark is async', async () => {
    const bench = opcodeBenchmarks.find(b => b.name === 'opcode_crypto_hash')!;
    const samples = await bench.run(5);
    expect(samples).toHaveLength(5);
    for (const s of samples) {
      expect(s.success).toBe(true);
      expect(s.durationNs).toBeGreaterThan(0);
    }
  });
});
