/**
 * fleet-benchmarks: Message Bus Latency
 * Measures I2I v2 message round-trip times across various payload sizes.
 */

import type { BenchmarkDef, BenchmarkSample, MessageBusResult } from '../core/types';

/**
 * Simulates an I2I v2 message round-trip by:
 * 1. Serializing a payload (simulating outbound message)
 * 2. Deserializing (simulating inbound processing)
 * 3. Computing response (simulating handler execution)
 * 4. Serializing response (simulating return message)
 *
 * In a real fleet, this would go through the actual message bus.
 */
function simulateMessageRoundTrip(
  payloadBytes: number,
  protocol: 'i2i_v2' | 'a2a_v1' | 'http'
): BenchmarkSample[] {
  const samples: BenchmarkSample[] = [];

  // Create payload of target size
  const payloadObj = {
    protocol,
    version: '2.0',
    sender: 'vessel-001',
    target: 'vessel-002',
    seq: 0,
    payload: 'x'.repeat(Math.max(0, payloadBytes - 200)), // offset for envelope overhead
    timestamp: Date.now(),
  };
  const serialized = JSON.stringify(payloadObj);

  // Simulate 100 round trips per sample
  const rounds = 100;

  for (let i = 0; i < rounds; i++) {
    const start = performance.now();

    // Serialize outbound
    const outbound = JSON.stringify({ ...payloadObj, seq: i });

    // Simulate wire transfer (copy overhead)
    const wire = new TextEncoder().encode(outbound);

    // Deserialize inbound
    const inbound = JSON.parse(new TextDecoder().decode(wire));

    // Process (compute response)
    const response = {
      protocol,
      version: '2.0',
      sender: inbound.target,
      target: inbound.sender,
      seq: inbound.seq,
      status: 'ok',
      result: inbound.seq * 2,
    };

    // Serialize response
    const responseWire = JSON.stringify(response);

    const end = performance.now();

    samples.push({
      timestamp: Date.now(),
      durationNs: (end - start) * 1e6,
      memoryDeltaBytes: outbound.length + responseWire.length,
      success: true,
    });
  }

  return samples;
}

// ── I2I v2 Protocol ──────────────────────────────────────────────

const PAYLOAD_SIZES = [64, 256, 1024, 4096, 16384, 65536];

const i2iV2Benchmarks = PAYLOAD_SIZES.map(size => ({
  name: `msgbus_i2i_v2_${size}B`,
  category: 'Message Bus Latency',
  description: `I2I v2 round-trip with ${size} byte payload`,
  tags: ['message-bus', 'i2i_v2'],
  defaultIterations: 500,
  run: () => simulateMessageRoundTrip(size, 'i2i_v2'),
}));

// ── A2A v1 Protocol ──────────────────────────────────────────────

const a2aV1Benchmarks = PAYLOAD_SIZES.map(size => ({
  name: `msgbus_a2a_v1_${size}B`,
  category: 'Message Bus Latency',
  description: `A2A v1 round-trip with ${size} byte payload`,
  tags: ['message-bus', 'a2a_v1'],
  defaultIterations: 500,
  run: () => simulateMessageRoundTrip(size, 'a2a_v1'),
}));

// ── HTTP Protocol (baseline) ─────────────────────────────────────

const httpBenchmarks = [256, 4096, 65536].map(size => ({
  name: `msgbus_http_${size}B`,
  category: 'Message Bus Latency',
  description: `HTTP round-trip simulation with ${size} byte payload`,
  tags: ['message-bus', 'http'],
  defaultIterations: 500,
  run: () => simulateMessageRoundTrip(size, 'http'),
}));

// ── High-Concurrency Message Bus ─────────────────────────────────

const concurrentMessages: BenchmarkDef = {
  name: 'msgbus_concurrent_100',
  category: 'Message Bus Latency',
  description: '100 concurrent I2I v2 messages',
  tags: ['message-bus', 'concurrent'],
  defaultIterations: 500,
  run: () => {
    const samples: BenchmarkSample[] = [];
    for (let round = 0; round < 50; round++) {
      const start = performance.now();
      // Simulate 100 messages in parallel
      const messages = Array.from({ length: 100 }, (_, i) => ({
        seq: i,
        payload: 'concurrent-msg-data',
        timestamp: Date.now(),
      }));
      const serialized = messages.map(m => JSON.stringify(m));
      const deserialized = serialized.map(s => JSON.parse(s));
      void deserialized;
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

// ── Message Bus Backpressure ─────────────────────────────────────

const backpressureBenchmarks = [10, 50, 100, 500].map(queueSize => ({
  name: `msgbus_backpressure_q${queueSize}`,
  category: 'Message Bus Latency',
  description: `Message bus backpressure with queue size ${queueSize}`,
  tags: ['message-bus', 'backpressure'],
  defaultIterations: 500,
  run: () => {
    const samples: BenchmarkSample[] = [];
    for (let round = 0; round < 50; round++) {
      const start = performance.now();
      // Simulate queue processing
      const queue: string[] = [];
      for (let i = 0; i < queueSize; i++) {
        queue.push(JSON.stringify({ seq: i, data: `msg-${i}` }));
      }
      while (queue.length > 0) {
        const msg = queue.shift()!;
        JSON.parse(msg);
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
}));

/** All message bus benchmarks */
export const messageBusBenchmarks: BenchmarkDef[] = [
  ...i2iV2Benchmarks,
  ...a2aV1Benchmarks,
  ...httpBenchmarks,
  concurrentMessages,
  ...backpressureBenchmarks,
];
