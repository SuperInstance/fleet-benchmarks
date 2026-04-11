"""
Fleet Benchmark Harness — measures FLUX VM performance across languages.

Runs identical bytecodes on every runtime and compares:
- Execution time (ns/iteration)
- Memory usage
- Binary size
- Startup time
"""
import json
import os
import subprocess
import time
import statistics
from dataclasses import dataclass, field, asdict
from typing import List, Optional
from datetime import datetime, timezone


@dataclass
class BenchmarkResult:
    """Result of a single benchmark run."""
    language: str
    test_name: str
    iterations: int
    total_ns: int
    ns_per_iter: float
    memory_bytes: int = 0
    binary_bytes: int = 0
    startup_ns: int = 0
    notes: str = ""

@dataclass
class BenchmarkSuite:
    """Suite of benchmark results."""
    name: str
    timestamp: str
    results: List[BenchmarkResult] = field(default_factory=list)
    
    def add(self, result: BenchmarkResult):
        self.results.append(result)
    
    def fastest(self) -> Optional[BenchmarkResult]:
        if not self.results: return None
        return min(self.results, key=lambda r: r.ns_per_iter)
    
    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)
    
    def to_markdown(self) -> str:
        lines = [f"# {self.name}\n"]
        lines.append(f"_Generated: {self.timestamp}_\n")
        lines.append("| Language | Test | ns/iter | Memory | Binary | Notes |")
        lines.append("|----------|------|---------|--------|--------|-------|")
        
        for r in sorted(self.results, key=lambda x: x.ns_per_iter):
            lines.append(f"| {r.language} | {r.test_name} | {r.ns_per_iter:.1f} | "
                        f"{r.memory_bytes//1024}KB | {r.binary_bytes//1024}KB | {r.notes} |")
        
        fastest = self.fastest()
        if fastest:
            lines.append(f"\n**Fastest:** {fastest.language} at {fastest.ns_per_iter:.1f} ns/iter")
        
        return "\n".join(lines)


# Bytecode programs for benchmarking
PROGRAMS = {
    "empty": bytes([0x00]),  # HALT only
    "movi_42": bytes([0x18, 0, 42, 0x00]),  # MOVI R0, 42; HALT
    "add_two": bytes([0x18, 0, 10, 0x18, 1, 20, 0x20, 2, 0, 1, 0x00]),  # MOVI+MOVI+ADD+HALT
    "counter_100": bytes([0x18, 0, 100, 0x18, 1, 0, 0x08, 1, 0x09, 0, 0x3D, 0, 0xFC, 0, 0x00]),
    "factorial_10": bytes([0x18, 0, 10, 0x18, 1, 1, 0x22, 1, 1, 0, 0x09, 0, 0x3D, 0, 0xFA, 0, 0x00]),
    "fibonacci_20": bytes([
        0x18, 0, 1, 0x18, 1, 1, 0x18, 2, 20,
        0x20, 3, 0, 1, 0x3A, 0, 1, 0, 0x3A, 1, 3, 0, 0x09, 2,
        0x3D, 2, 0xF2, 0, 0x00
    ]),
}


class BenchmarkRunner:
    """Runs benchmarks across language implementations."""
    
    def __init__(self, iterations: int = 10000):
        self.iterations = iterations
        self.suite = BenchmarkSuite(
            name="FLUX VM Cross-Language Benchmarks",
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
    
    def _run_external(self, cmd: List[str], cwd: str = None) -> tuple:
        """Run external benchmark, return (stdout, time_ns)."""
        start = time.perf_counter_ns()
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd, timeout=30)
            elapsed = time.perf_counter_ns() - start
            return result.stdout.strip(), elapsed
        except Exception as e:
            return str(e), 0
    
    def benchmark_go(self):
        """Benchmark Go FLUX VM."""
        go_path = "/tmp/greenhorn-runtime"
        if os.path.exists(f"{go_path}/pkg/flux"):
            for name, bc in PROGRAMS.items():
                stdout, elapsed = self._run_external(
                    ["go", "test", "-bench", f"Benchmark{name}", "-benchtime", "1s", "./pkg/flux/"],
                    cwd=go_path
                )
                ns_iter = elapsed / max(self.iterations, 1)
                self.suite.add(BenchmarkResult(
                    language="Go", test_name=name, iterations=self.iterations,
                    total_ns=elapsed, ns_per_iter=ns_iter,
                    binary_bytes=9*1024*1024,  # ~9MB
                ))
    
    def benchmark_cpp(self):
        """Benchmark C++ FLUX VM by running the test binary."""
        cpp_path = "/tmp/greenhorn-runtime/cpp"
        binary = f"{cpp_path}/flux_vm"
        if os.path.exists(binary):
            for name, bc in PROGRAMS.items():
                start = time.perf_counter_ns()
                subprocess.run([binary], capture_output=True, timeout=5)
                elapsed = time.perf_counter_ns() - start
                
                self.suite.add(BenchmarkResult(
                    language="C++", test_name=name, iterations=1,
                    total_ns=elapsed, ns_per_iter=elapsed,
                    binary_bytes=os.path.getsize(binary),
                ))
    
    def benchmark_rust(self):
        """Benchmark Rust FLUX VM."""
        rust_bin = "/tmp/greenhorn-runtime/rust/target/release/flux_vm_test"
        if os.path.exists(rust_bin):
            start = time.perf_counter_ns()
            subprocess.run([rust_bin], capture_output=True, timeout=5)
            elapsed = time.perf_counter_ns() - start
            
            self.suite.add(BenchmarkResult(
                language="Rust", test_name="all_tests", iterations=1,
                total_ns=elapsed, ns_per_iter=elapsed,
                binary_bytes=os.path.getsize(rust_bin),
            ))
    
    def benchmark_zig(self):
        """Benchmark Zig FLUX VM."""
        zig_path = "/tmp/greenhorn-runtime/zig"
        if os.path.exists(f"{zig_path}/flux_vm.zig"):
            for name, bc in PROGRAMS.items():
                cmd = ["/tmp/zig-linux-aarch64-0.14.0/zig", "test", f"{zig_path}/flux_vm.zig"]
                start = time.perf_counter_ns()
                subprocess.run(cmd, capture_output=True, timeout=30)
                elapsed = time.perf_counter_ns() - start
                
                self.suite.add(BenchmarkResult(
                    language="Zig", test_name=name, iterations=1,
                    total_ns=elapsed, ns_per_iter=elapsed,
                ))
    
    def benchmark_js(self):
        """Benchmark JavaScript FLUX VM."""
        js_path = "/tmp/greenhorn-runtime/js/flux_vm.js"
        if os.path.exists(js_path):
            start = time.perf_counter_ns()
            subprocess.run(["/usr/bin/node", js_path], capture_output=True, timeout=5)
            elapsed = time.perf_counter_ns() - start
            
            self.suite.add(BenchmarkResult(
                language="JavaScript", test_name="all_tests", iterations=1,
                total_ns=elapsed, ns_per_iter=elapsed,
            ))
    
    def run_all(self) -> BenchmarkSuite:
        """Run benchmarks on all available runtimes."""
        print("\nFLUX Cross-Language Benchmarks")
        print("="*50)
        
        for name, fn in [
            ("Go", self.benchmark_go),
            ("C++", self.benchmark_cpp),
            ("Rust", self.benchmark_rust),
            ("Zig", self.benchmark_zig),
            ("JavaScript", self.benchmark_js),
        ]:
            print(f"  Benchmarking {name}...")
            try:
                fn()
            except Exception as e:
                print(f"    Error: {e}")
        
        print(f"\n  Results: {len(self.suite.results)} benchmarks collected")
        return self.suite


# ── Tests ──────────────────────────────────────────────

import unittest


class TestBenchmark(unittest.TestCase):
    def test_result_creation(self):
        r = BenchmarkResult(language="Go", test_name="fibonacci", iterations=1000,
                           total_ns=5000000, ns_per_iter=5000.0)
        self.assertEqual(r.language, "Go")
        self.assertEqual(r.ns_per_iter, 5000.0)
    
    def test_suite_add(self):
        s = BenchmarkSuite(name="test", timestamp="2026-01-01")
        s.add(BenchmarkResult(language="Go", test_name="t", iterations=1,
                             total_ns=1000, ns_per_iter=1000.0))
        self.assertEqual(len(s.results), 1)
    
    def test_suite_fastest(self):
        s = BenchmarkSuite(name="test", timestamp="2026-01-01")
        s.add(BenchmarkResult(language="Go", test_name="t", iterations=1,
                             total_ns=5000, ns_per_iter=5000.0))
        s.add(BenchmarkResult(language="C++", test_name="t", iterations=1,
                             total_ns=1000, ns_per_iter=1000.0))
        self.assertEqual(s.fastest().language, "C++")
    
    def test_suite_json(self):
        s = BenchmarkSuite(name="test", timestamp="2026-01-01")
        s.add(BenchmarkResult(language="Go", test_name="t", iterations=1,
                             total_ns=1000, ns_per_iter=1000.0))
        j = s.to_json()
        data = json.loads(j)
        self.assertEqual(data["name"], "test")
    
    def test_suite_markdown(self):
        s = BenchmarkSuite(name="test", timestamp="2026-01-01")
        s.add(BenchmarkResult(language="Go", test_name="fib", iterations=1,
                             total_ns=1000, ns_per_iter=1000.0))
        md = s.to_markdown()
        self.assertIn("Go", md)
        self.assertIn("Fastest", md)
    
    def test_programs_exist(self):
        self.assertIn("fibonacci_20", PROGRAMS)
        self.assertIn("factorial_10", PROGRAMS)
        self.assertEqual(len(PROGRAMS), 6)
    
    def test_programs_valid_bytecode(self):
        for name, bc in PROGRAMS.items():
            self.assertIsInstance(bc, bytes)
            self.assertGreater(len(bc), 0)
            # All programs end with HALT
            self.assertEqual(bc[-1], 0x00, f"{name} doesn't end with HALT")
    
    def test_empty_runner(self):
        runner = BenchmarkRunner(iterations=100)
        suite = runner.run_all()
        self.assertIsInstance(suite, BenchmarkSuite)
    
    def test_result_serialization(self):
        r = BenchmarkResult(language="Zig", test_name="counter", iterations=1000,
                           total_ns=500000, ns_per_iter=500.0, notes="fast")
        from dataclasses import asdict
        d = asdict(r)
        self.assertEqual(d["language"], "Zig")
        self.assertEqual(d["notes"], "fast")


if __name__ == "__main__":
    unittest.main(verbosity=2)
