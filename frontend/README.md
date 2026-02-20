# DSA Tracker v4 — LeetCode Integration + Python IDE

## 🆕 What's New in v4

### Real LeetCode Problem Descriptions
- Problem descriptions, examples, constraints fetched live from LeetCode's unofficial API
- Topic tags and hints loaded automatically
- Starter code auto-populated per language from LeetCode snippets

### Python 3 Code Execution (In-Browser)
- **No backend required** — runs via [Pyodide](https://pyodide.org/) (Python compiled to WebAssembly)
- Supports full LeetCode-style `class Solution` pattern
- Auto-detects your function and calls it with test cases
- Detailed error tracebacks for debugging

### Auto-Populated Test Cases
- LeetCode examples automatically parsed into test cases on open
- Editable input/output per test case
- Add unlimited custom test cases

### JavaScript Execution
- JS solutions run locally in the browser sandbox
- Automatic function detection

## 🚀 Quick Start

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:3000
```

## 🐳 Docker

```bash
docker compose up -d    # http://localhost:3000
```

## How Python Execution Works
1. Pyodide (~10MB WASM) is loaded from CDN on first Python run
2. Your code is executed in a sandboxed Python environment
3. The runner detects `class Solution:` or bare functions
4. Arguments are parsed from the test case input (one JSON value per line)
5. Results compared and displayed inline

## Writing Python Solutions

```python
# LeetCode style (recommended)
class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, n in enumerate(nums):
            if target - n in seen:
                return [seen[target - n], i]
            seen[n] = i

# Test case input (one arg per line):
# [2, 7, 11, 15]
# 9
# Expected: [0, 1]
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Backend API URL |

## Tech Stack

| | |
|---|---|
| Framework | React 18 + Vite 5 |
| UI | shadcn/ui (Radix UI) + Tailwind CSS 3 |
| Python runtime | Pyodide 0.25 (WASM) — CDN loaded |
| LeetCode data | alfa-leetcode-api (unofficial, no auth) |
| Icons | Lucide React |
