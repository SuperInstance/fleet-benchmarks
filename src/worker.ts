export interface Env {
  BENCHMARK_RESULTS: KVNamespace;
}

interface BenchmarkRequest {
  name: string;
  duration: number;
  concurrency: number;
  endpoint: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface BenchmarkResult {
  id: string;
  name: string;
  timestamp: number;
  coldStartTime: number;
  memoryUsage: number;
  latency: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  requests: number;
  errors: number;
  duration: number;
  concurrency: number;
}

interface ComparisonResult {
  baseline: BenchmarkResult;
  current: BenchmarkResult;
  differences: {
    coldStartTime: number;
    memoryUsage: number;
    latencyAvg: number;
    throughput: number;
    errors: number;
  };
  regression: boolean;
}

class BenchmarkRunner {
  private results: BenchmarkResult[] = [];
  private errors: number = 0;
  private startTime: number = 0;
  private coldStartTime: number = 0;

  constructor(
    private name: string,
    private duration: number,
    private concurrency: number,
    private endpoint: string,
    private method: string = "GET",
    private headers: Record<string, string> = {},
    private body?: string
  ) {
    this.coldStartTime = performance.now();
  }

  async run(): Promise<BenchmarkResult> {
    this.startTime = Date.now();
    const workers = Array.from({ length: this.concurrency }, () =>
      this.worker()
    );

    await Promise.all(workers);

    const endTime = Date.now();
    const totalTime = endTime - this.startTime;
    const latencies = this.results.map(r => r.latency.avg).sort((a, b) => a - b);

    return {
      id: crypto.randomUUID(),
      name: this.name,
      timestamp: Date.now(),
      coldStartTime: this.coldStartTime,
      memoryUsage: performance.memory?.usedJSHeapSize || 0,
      latency: {
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p95: latencies[Math.floor(latencies.length * 0.95)],
        p99: latencies[Math.floor(latencies.length * 0.99)]
      },
      throughput: this.results.length / (totalTime / 1000),
      requests: this.results.length,
      errors: this.errors,
      duration: totalTime,
      concurrency: this.concurrency
    };
  }

  private async worker(): Promise<void> {
    const endTime = this.startTime + this.duration * 1000;

    while (Date.now() < endTime) {
      const start = performance.now();
      try {
        const response = await fetch(this.endpoint, {
          method: this.method,
          headers: this.headers,
          body: this.body
        });

        if (!response.ok) {
          this.errors++;
        } else {
          const latency = performance.now() - start;
          this.results.push({
            id: crypto.randomUUID(),
            name: this.name,
            timestamp: Date.now(),
            coldStartTime: 0,
            memoryUsage: 0,
            latency: {
              min: latency,
              max: latency,
              avg: latency,
              p95: latency,
              p99: latency
            },
            throughput: 0,
            requests: 1,
            errors: 0,
            duration: 0,
            concurrency: 1
          });
        }
      } catch {
        this.errors++;
      }
    }
  }
}
const sh = {"Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-ancestors 'none'","X-Frame-Options":"DENY"};
export default { async fetch(r: Request) { const u = new URL(r.url); if (u.pathname==='/health') return new Response(JSON.stringify({status:'ok'}),{headers:{'Content-Type':'application/json',...sh}}); return new Response(html,{headers:{'Content-Type':'text/html;charset=UTF-8',...sh}}); }};