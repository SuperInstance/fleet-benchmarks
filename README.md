# Fleet Benchmarks

Cross-language FLUX VM performance comparison. Identical bytecodes, different runtimes.

## Test Programs

| Program | Description | Bytecodes |
|---------|-------------|-----------|
| empty | HALT only | 1 |
| movi_42 | Load constant | 4 |
| add_two | Add two registers | 11 |
| counter_100 | Count to 100 with loop | 15 |
| factorial_10 | 10! = 3628800 | 17 |
| fibonacci_20 | Fib(20) = 6765 | 24 |

## Previous Results (flux-benchmarks, 2026-04-10)

| Language | ns/iter | Binary |
|----------|---------|--------|
| Zig | 210 | 40KB |
| C | 340 | 50KB |
| C++ | 350 | 80KB |
| Rust | 380 | 300KB |
| Go | 520 | 9MB |
| JS (Node) | 2800 | - |

## Usage

```python
from benchmark import BenchmarkRunner
runner = BenchmarkRunner(iterations=10000)
suite = runner.run_all()
print(suite.to_markdown())
```

9 tests passing.
