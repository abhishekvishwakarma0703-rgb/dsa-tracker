# DSA Problem Tracker v2.0 — Full Stack

A production-grade DSA Problem Tracker with LeetCode integration, Monaco IDE, Whiteboard, and Algorithm Visualizations.

## ✨ New Features (v2.0)

| Feature | Description |
|---------|-------------|
| 🔍 LeetCode Master List | 2500+ problems searchable dropdown to add to tracker |
| 📝 Add from Master | One-click add with auto-populated tags, difficulty, slug |
| ⚡ Code Execution | Python code judge — run against test cases in-browser |
| 🎨 Whiteboard | Full canvas drawing board per problem (Excalidraw + fallback) |
| 📊 Visualization | Animated step-by-step algorithm visualization (0 cost) |

## 🏗️ Project Structure

```
.
├── backend-input/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── problems.py          # Problem CRUD
│   │   │   │   ├── problems_from_master.py # POST /problems/from-master/{slug}
│   │   │   │   ├── tags.py              # Tag CRUD
│   │   │   │   ├── insights.py          # Notes/Insights CRUD
│   │   │   │   ├── solutions.py         # Solutions + /execute
│   │   │   │   ├── leetcode_master.py   # GET/POST master list
│   │   │   │   ├── whiteboard.py        # Whiteboard save/load
│   │   │   │   └── visualize.py         # Deterministic viz steps
│   │   │   └── router.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── logging_config.py
│   │   ├── db/
│   │   │   ├── database.py
│   │   │   └── models.py                # Problem, Tag, Note, Solution, Whiteboard, LeetCodeMaster
│   │   ├── middleware/error_handler.py
│   │   └── schemas/problem.py
│   ├── main.py
│   ├── init_db.py                       # Seeds problems + ingests master list
│   ├── leetcode_problems.json           # 2500+ LeetCode master data
│   └── requirements.txt
│
└── frontend-input/
    └── src/
        ├── components/
        │   ├── Whiteboard.jsx           # NEW: Excalidraw + fallback canvas
        │   ├── Visualization.jsx        # NEW: Animated algorithm viz
        │   ├── AddFromMasterModal.jsx   # NEW: Searchable dropdown
        │   ├── ProblemDetailModal.jsx   # UPDATED: +Whiteboard +Visualization tabs
        │   ├── CodeEditor.jsx           # Existing (untouched)
        │   ├── ProblemCard.jsx          # Existing (untouched)
        │   └── ...
        ├── pages/
        │   └── ProblemsPage.jsx         # UPDATED: +Add Problem button
        ├── context/ProblemsContext.jsx  # UPDATED: exposes refetchProblems
        └── services/apiClient.js        # UPDATED: new API methods
```

## 🚀 Quick Start

### Backend

```bash
cd backend-input

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run (auto-seeds DB + ingests LeetCode master list on first start)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/api/docs

### Frontend

```bash
cd frontend-input

# Install
npm install

# Run dev server
npm run dev
```

App: http://localhost:5173

### Docker (both at once)

```bash
docker-compose up --build
```

## 📡 New API Endpoints

### LeetCode Master
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/leetcode-master?search=two+sum&page=1&page_size=20` | Search master list |
| POST | `/api/v1/leetcode-master/ingest` | Re-ingest from JSON file |
| GET | `/api/v1/leetcode-master/slug/{slug}` | Get by slug |

### Problems
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/problems/from-master/{slug}?section_id=arrays-ii` | Add from master |

### Code Execution
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/execute` | Execute Python code |

Body:
```json
{
  "code": "print(1+1)",
  "language": "python3",
  "test_cases": [{"input": "", "expected": "2"}]
}
```

### Whiteboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/whiteboard/{problem_id}` | Load canvas |
| POST | `/api/v1/whiteboard/{problem_id}` | Save canvas |

### Visualization
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/visualize` | Get animation steps |
| GET | `/api/v1/visualize/types` | List algorithm types |

Body:
```json
{
  "problem_slug": "two-sum",
  "algorithm_type": "sliding_window",
  "input_data": {"array": [1,4,2,9,5], "k": 3}
}
```

Supported types: `array`, `sliding_window`, `binary_search`, `bubble_sort`, `linked_list`, `binary_tree`

## 🗄️ Database Models

### New in v2.0
- **LeetCodeMaster** — 2500+ problems from official list (question_id, title, title_slug, difficulty, topic_tags)
- **Whiteboard** — per-problem canvas JSON (one per problem)

### Updated in v2.0
- **Problem** — added `leetcode_slug` (normalized slug from master)

## 🎨 Frontend Features

### Whiteboard Tab
- Loads in every problem's detail modal under "Whiteboard" tab
- Uses Excalidraw (loaded from CDN) — full arrows, shapes, text, export
- Falls back to custom HTML Canvas if CDN unavailable
- Fallback supports: pen, eraser, line, arrow, rect, circle, text, undo, export PNG

### Visualization Tab
- Pick from 6 algorithm types
- Step-by-step animation with play/pause/speed controls
- Array bars, sliding window highlighting, BST node coloring, linked list traversal
- Pure frontend — no backend call needed (runs locally)

### Add Problem Button
- "Add Problem" button in sidebar footer
- Opens searchable dropdown with full master list
- Select target section, click Add — problem auto-created with LeetCode data

## 🔒 Constraints Honored
- ✅ All existing endpoints unchanged
- ✅ Existing frontend features untouched
- ✅ No breaking changes to DB (additive only)
- ✅ Zero LLM cost for visualization
- ✅ Python-only code execution (safe subprocess sandbox, 10s timeout)
