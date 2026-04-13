/**
 * fleet-benchmarks: Opcode Execution Speed
 * Benchmarks timing for each major opcode category:
 * arithmetic, memory, control flow, A2A signals, stack ops, I/O, crypto
 */

import type { BenchmarkDef, BenchmarkSample } from '../core/types';

/** Create a no-op synthetic sample for timing a function */
function timeOp(fn: () => void, iterations: number): BenchmarkSample[] {
  const samples: BenchmarkSample[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    samples.push({
      timestamp: Date.now(),
      durationNs: (end - start) * 1e6,
      success: true,
    });
  }
  return samples;
}

// ── Arithmetic Opcodes ───────────────────────────────────────────

const arithmeticAdd: BenchmarkDef = {
  name: 'opcode_arithmetic_add',
  category: 'Opcode Execution Speed',
  description: 'Integer addition opcode execution',
  tags: ['opcode', 'arithmetic'],
  defaultIterations: 10000,
  run: (iters) => timeOp(() => { let a = 0; for (let i = 0; i < 100; i++) a += i; }, iters),
};

const arithmeticMul: BenchmarkDef = {
  name: 'opcode_arithmetic_mul',
  category: 'Opcode Execution Speed',
  description: 'Integer multiplication opcode execution',
  tags: ['opcode', 'arithmetic'],
  defaultIterations: 10000,
  run: (iters) => timeOp(() => { let a = 1; for (let i = 1; i < 100; i++) a *= i % 97 + 1; }, iters),
};

const arithmeticFloat: BenchmarkDef = {
  name: 'opcode_arithmetic_float',
  category: 'Opcode Execution Speed',
  description: 'Floating point division opcode execution',
  tags: ['opcode', 'arithmetic'],
  defaultIterations: 10000,
  run: (iters) => timeOp(() => { let a = 1.0; for (let i = 1; i < 100; i++) a /= 1.0001; }, iters),
};

const arithmeticBitwise: BenchmarkDef = {
  name: 'opcode_arithmetic_bitwise',
  category: 'Opcode Execution Speed',
  description: 'Bitwise AND/OR/XOR opcode execution',
  tags: ['opcode', 'arithmetic'],
  defaultIterations: 10000,
  run: (iters) => timeOp(() => { let a = 0xFFFFFFFF; for (let i = 0; i < 100; i++) { a ^= i; a &= 0xFFFF; a |= (i << 8); } }, iters),
};

// ── Memory Opcodes ───────────────────────────────────────────────

const memoryAlloc: BenchmarkDef = {
  name: 'opcode_memory_alloc',
  category: 'Opcode Execution Speed',
  description: 'Memory allocation (array creation)',
  tags: ['opcode', 'memory'],
  defaultIterations: 5000,
  run: (iters) => timeOp(() => { const arr = new Array(100); for (let i = 0; i < 100; i++) arr[i] = i * 2; }, iters),
};

const memoryAccess: BenchmarkDef = {
  name: 'opcode_memory_access',
  category: 'Opcode Execution Speed',
  description: 'Sequential and random memory access',
  tags: ['opcode', 'memory'],
  defaultIterations: 10000,
  run: (iters) => {
    const arr = new Float64Array(1000);
    for (let i = 0; i < 1000; i++) arr[i] = i * 1.5;
    return timeOp(() => { let s = 0; for (let i = 0; i < 1000; i++) s += arr[(i * 7) % 1000]; }, iters);
  },
};

const memoryCopy: BenchmarkDef = {
  name: 'opcode_memory_copy',
  category: 'Opcode Execution Speed',
  description: 'Memory copy (TypedArray set)',
  tags: ['opcode', 'memory'],
  defaultIterations: 5000,
  run: (iters) => {
    const src = new Uint8Array(1024).fill(0xAA);
    return timeOp(() => { const dst = new Uint8Array(1024); dst.set(src); }, iters);
  },
};

// ── Control Flow Opcodes ─────────────────────────────────────────

const controlIf: BenchmarkDef = {
  name: 'opcode_control_if',
  category: 'Opcode Execution Speed',
  description: 'Branch prediction / if-else chains',
  tags: ['opcode', 'control_flow'],
  defaultIterations: 10000,
  run: (iters) => timeOp(() => { let x = 0; for (let i = 0; i < 100; i++) { if (i % 3 === 0) x += 1; else if (i % 3 === 1) x += 2; else x += 3; } }, iters),
};

const controlSwitch: BenchmarkDef = {
  name: 'opcode_control_switch',
  category: 'Opcode Execution Speed',
  description: 'Switch-case dispatch',
  tags: ['opcode', 'control_flow'],
  defaultIterations: 10000,
  run: (iters) => timeOp(() => { let x = 0; for (let i = 0; i < 100; i++) { switch (i % 5) { case 0: x++; break; case 1: x += 2; break; case 2: x += 3; break; case 3: x += 4; break; default: x += 5; break; } } }, iters),
};

const controlLoop: BenchmarkDef = {
  name: 'opcode_control_loop',
  category: 'Opcode Execution Speed',
  description: 'Loop overhead (for/while)',
  tags: ['opcode', 'control_flow'],
  defaultIterations: 10000,
  run: (iters) => timeOp(() => { let x = 0; for (let i = 0; i < 1000; i++) x = (x + i) & 0xFF; }, iters),
};

const controlRecursion: BenchmarkDef = {
  name: 'opcode_control_recursion',
  category: 'Opcode Execution Speed',
  description: 'Function call / recursion overhead',
  tags: ['opcode', 'control_flow'],
  defaultIterations: 5000,
  run: (iters) => {
    const fib = (n: number): number => n <= 1 ? n : fib(n - 1) + fib(n - 2);
    return timeOp(() => fib(20), iters);
  },
};

// ── A2A Signal Opcodes ───────────────────────────────────────────

const a2aEmit: BenchmarkDef = {
  name: 'opcode_a2a_emit',
  category: 'Opcode Execution Speed',
  description: 'A2A signal emission (event dispatch)',
  tags: ['opcode', 'a2a_signals'],
  defaultIterations: 10000,
  run: (iters) => {
    const listeners: (() => void)[] = [];
    for (let i = 0; i < 10; i++) listeners.push(() => {});
    return timeOp(() => { for (const l of listeners) l(); }, iters);
  },
};

const a2aEncode: BenchmarkDef = {
  name: 'opcode_a2a_encode',
  category: 'Opcode Execution Speed',
  description: 'A2A signal serialization (JSON encode)',
  tags: ['opcode', 'a2a_signals'],
  defaultIterations: 5000,
  run: (iters) => {
    const signal = { type: 'PING', sender: 'vessel-001', target: 'vessel-002', payload: { seq: 42, data: 'hello fleet' }, timestamp: Date.now() };
    return timeOp(() => JSON.stringify(signal), iters);
  },
};

// ── Stack Operations ─────────────────────────────────────────────

const stackPushPop: BenchmarkDef = {
  name: 'opcode_stack_push_pop',
  category: 'Opcode Execution Speed',
  description: 'Stack push and pop operations',
  tags: ['opcode', 'stack_ops'],
  defaultIterations: 10000,
  run: (iters) => timeOp(() => { const s: number[] = []; for (let i = 0; i < 100; i++) s.push(i); for (let i = 0; i < 100; i++) s.pop(); }, iters),
};

// ── I/O Opcodes ──────────────────────────────────────────────────

const ioStringOps: BenchmarkDef = {
  name: 'opcode_io_string_concat',
  category: 'Opcode Execution Speed',
  description: 'String concatenation (I/O buffer simulation)',
  tags: ['opcode', 'io_ops'],
  defaultIterations: 5000,
  run: (iters) => timeOp(() => { let s = ''; for (let i = 0; i < 50; i++) s += `chunk-${i}-`; }, iters),
};

// ── Crypto Opcodes ───────────────────────────────────────────────

const cryptoHash: BenchmarkDef = {
  name: 'opcode_crypto_hash',
  category: 'Opcode Execution Speed',
  description: 'SHA-256 hash computation',
  tags: ['opcode', 'crypto'],
  defaultIterations: 2000,
  run: async (iters) => {
    const samples: BenchmarkSample[] = [];
    const data = new TextEncoder().encode('fleet-benchmark-payload-data');
    for (let i = 0; i < iters; i++) {
      const start = performance.now();
      await crypto.subtle.digest('SHA-256', data);
      const end = performance.now();
      samples.push({ timestamp: Date.now(), durationNs: (end - start) * 1e6, success: true });
    }
    return samples;
  },
};

const cryptoHmac: BenchmarkDef = {
  name: 'opcode_crypto_hmac',
  category: 'Opcode Execution Speed',
  description: 'HMAC-SHA256 computation',
  tags: ['opcode', 'crypto'],
  defaultIterations: 2000,
  run: async (iters) => {
    const samples: BenchmarkSample[] = [];
    const key = await crypto.subtle.generateKey(
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const data = new TextEncoder().encode('fleet-benchmark-payload');
    for (let i = 0; i < iters; i++) {
      const start = performance.now();
      await crypto.subtle.sign('HMAC', key, data);
      const end = performance.now();
      samples.push({ timestamp: Date.now(), durationNs: (end - start) * 1e6, success: true });
    }
    return samples;
  },
};

/** All opcode execution speed benchmarks */
export const opcodeBenchmarks: BenchmarkDef[] = [
  // Arithmetic
  arithmeticAdd,
  arithmeticMul,
  arithmeticFloat,
  arithmeticBitwise,
  // Memory
  memoryAlloc,
  memoryAccess,
  memoryCopy,
  // Control flow
  controlIf,
  controlSwitch,
  controlLoop,
  controlRecursion,
  // A2A signals
  a2aEmit,
  a2aEncode,
  // Stack
  stackPushPop,
  // I/O
  ioStringOps,
  // Crypto
  cryptoHash,
  cryptoHmac,
];
