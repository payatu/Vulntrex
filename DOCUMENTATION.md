# Vulntrex Dashboard - Complete Documentation

## Table of Contents
- [Overview](#overview)
- [Architecture & Technology Stack](#architecture--technology-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [File-by-File Documentation](#file-by-file-documentation)
- [Data Storage](#data-storage)
- [Garak Integration](#garak-integration)
- [Deployment & Production](#deployment--production)
- [Development Workflow](#development-workflow)
- [Data Flow](#data-flow)
## Overview

Vulntrex Dashboard is a modern, professional web application built with Next.js 15 and TypeScript that provides comprehensive visualization and analysis of Garak LLM vulnerability scanner results. The application offers two primary workflows:

1. **Upload & Analyze**: Upload existing Garak JSONL reports for analysis
2. **Run & Monitor**: Execute Garak scans directly from the UI with real-time log streaming

## Architecture & Technology Stack

### Core Technologies
- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript 5
- **Runtime**: Node.js 20+
- **Styling**: Tailwind CSS 4
- **Build Tool**: Turbopack (Next.js built-in)

### Key Dependencies
- **uuid** (v13.0.0): Unique run ID generation
- **React** (v19.1.0): UI components
- **Built-in Node.js APIs**: `fs`, `path`, `child_process` for file operations and Garak execution

## Features

### 1. Upload & Parse Reports
- **Upload Interface** (`/upload`): Drag-and-drop or click-to-upload interface
- **File Support**: JSONL report files and hitlog files 
- **Parsing**: Streaming JSONL parser for memory-efficient processing
- **Storage**: Normalized data stored in `/data/runs/[runId]/`

### 2. Run Garak Scans
- **Scan Interface** (`/run`): Execute Garak scans directly from the UI
- **Provider Support**: Hugging Face (local & API), OpenAI, Replicate, Cohere, Groq, NVIDIA NIM, GGML, Test
- **Real-time Logs**: Live log streaming with auto-scroll
- **Status Monitoring**: Running, completed, failed, cancelled states
- **Dynamic Scanner Discovery**: Fetch available probes and detectors from Garak CLI
- **Configurable Parameters**: Generations, seed, custom command paths

### 3. Results Visualization
- **Runs List** (`/runs`): Grid view of all scans with advanced filtering
- **Run Detail** (`/runs/[runId]`): Comprehensive analysis with:
  - Probe performance charts with risk-based coloring
  - Interactive heatmap (probes × detectors)
  - **Server-side Pagination**: Efficiently handles large datasets
  - **Collapsible Attempt Details**: View prompts, outputs, and vulnerability triggers
  - **Hitlog Display**: Show hits 
  - CSV export of filtered data

### 4. Run Comparison
- **Compare Tool** (`/compare`): Side-by-side comparison of two runs
- **Delta Analysis**: Score differences and improvement/regression indicators
- **Visual Comparison**: Color-coded changes

### 5. Additional Features
- **Advanced Filtering**: Multi-dimensional filtering by probe, detector, model, date, score
- **Export**: CSV export with proper formatting

## Project Structure

```
Vulntrex-dashboard/
├── data/                          # Runtime data storage
│   ├── runs/                      # Processed scan results
│   │   └── [runId]/              # Individual scan run data
│   │       ├── normalized.json   # Parsed and normalized data
│   │       ├── report.jsonl      # Original report (moved after parsing)
│   │       └── hitlog.jsonl      # Vulnerability hits (optional)
│   ├── uploads/                   # Temporary upload storage
│   ├── logs/                      # Garak execution logs
│   │   └── [runId].log           # Per-scan log files
│   └── active_runs.json          # Active Garak scan tracking
├── src/
│   ├── app/                       # Next.js App Router pages
│   │   ├── api/                   # API routes
│   │   │   ├── garak/            # Garak execution APIs
│   │   │   │   ├── run/route.ts      # POST: Start Garak scan
│   │   │   │   ├── status/route.ts   # GET: Poll scan status
│   │   │   │   ├── cancel/route.ts   # POST: Cancel running scan
│   │   │   │   └── list/route.ts     # GET: List available probes/detectors
│   │   │   ├── runs/[runId]/     # Individual run data API
│   │   │   │   ├── route.ts      # GET: Retrieve run data
│   │   │   │   └── attempts/     # Attempts pagination API
│   │   │   │       └── route.ts  # GET: Paginated attempts
│   │   │   └── upload/           # File upload API
│   │   │       └── route.ts      # POST: Upload reports
│   │   ├── run/                  # Garak execution page
│   │   │   └── page.tsx          # UI for running Garak scans
│   │   ├── runs/                 # Scan results pages
│   │   │   ├── [runId]/          # Individual run detail
│   │   │   │   ├── page.tsx            # Server component loader
│   │   │   │   ├── RunDetailClient.tsx # Interactive run detail UI
│   │   │   │   ├── HeatmapChart.tsx    # Heatmap visualization
│   │   │   │   └── ExportCsvButton.tsx # CSV export
│   │   │   ├── page.tsx          # Runs list page
│   │   │   └── RunsClient.tsx    # Interactive runs list
│   │   ├── compare/              # Run comparison
│   │   │   ├── page.tsx          # Server component loader
│   │   │   └── CompareClient.tsx # Comparison UI
│   │   ├── upload/               # File upload page
│   │   │   └── page.tsx          # Upload interface
│   │   ├── page.tsx              # Home dashboard
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   └── lib/                      # Utility libraries
│       └── garak/                # Garak-specific utilities
│           ├── parse.ts          # JSONL parsing logic
│           └── types.ts          # TypeScript type definitions
├── public/                       # Static assets
├── node_modules/                 # Dependencies
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.ts                # Next.js config
├── tailwind.config.js            # Tailwind CSS config
├── postcss.config.mjs            # PostCSS config
└── eslint.config.mjs             # ESLint config
```

## File-by-File Documentation

### API Routes

#### `/api/garak/run/route.ts`
**Endpoint**: `POST /api/garak/run`

**Purpose**: Execute Garak scans from the UI

**Functionality**:
- Accepts scan configuration (provider, model, probes, detectors, etc.)
- Spawns Garak process using Node.js `child_process.spawn()`
- Configures environment variables for API keys
- Streams stdout/stderr to log files in `/data/logs/[runId].log`
- Tracks active runs in `/data/active_runs.json`
- Returns unique run ID for status polling

**Request Body**:
```json
{
  "provider": "huggingface|openai|replicate|...",
  "model_name": "gpt2|gpt-3.5-turbo|...",
  "api_key": "optional API key",
  "probes": "comma,separated,probe,names",
  "detectors": "comma,separated,detector,names",
  "generations": 3,
  "seed": 42,
  "garakCommand": "python3 -m garak"
}
```

**Response**:
```json
{
  "success": true,
  "runId": "uuid-v4"
}
```

**Used Technologies**:
- `child_process.spawn()`: Process spawning
- `fs.createWriteStream()`: Log file streaming
- `uuid.v4()`: Run ID generation

---

#### `/api/garak/status/route.ts`
**Endpoint**: `GET /api/garak/status`

**Purpose**: Poll scan status and retrieve logs

**Functionality**:
- Reads active runs from `/data/active_runs.json`
- Checks if process is still running using `process.kill(pid, 0)`
- Reads log files from `/data/logs/[runId].log`
- When scan completes:
  - Looks for report files (in CWD or `~/.local/share/garak/garak_runs/`)
  - Parses JSONL reports using `parseGarakReport()`
  - Saves normalized data to `/data/runs/[runId]/normalized.json`
  - Moves original JSONL files to run directory
  - Updates run status to completed/failed

**Query Parameters**:
- `runId`: Run identifier

**Response**:
```json
{
  "runId": "uuid",
  "status": "running|completed|failed|cancelled",
  "logs": "log content",
  "startTime": 1234567890,
  "endTime": 1234567890,
  "resultPath": "/runs/uuid"
}
```

**Used Technologies**:
- `process.kill(pid, 0)`: Process existence check
- `fs.readFileSync()`: Log and data file reading
- `parseGarakReport()`: JSONL report parsing

---

#### `/api/garak/cancel/route.ts`
**Endpoint**: `POST /api/garak/cancel`

**Purpose**: Cancel running Garak scans

**Functionality**:
- Validates run ID exists and is running
- Kills process using `process.kill(pid)`
- Updates run status to "cancelled"
- Saves updated state to active_runs.json

**Request Body**:
```json
{
  "runId": "uuid"
}
```

**Used Technologies**:
- `process.kill()`: Process termination

---

#### `/api/garak/list/route.ts`
**Endpoint**: `GET /api/garak/list`

**Purpose**: Fetch available probes and detectors from Garak CLI

**Functionality**:
- Executes Garak with `--list_probes` or `--list_detectors` flags
- Captures stdout and parses output
- Strips ANSI escape codes using regex
- Filters and extracts module.Class names
- Returns array of available scanners

**Query Parameters**:
- `type`: "probes" or "detectors"
- `command`: Garak command (default: "python3 -m garak")

**Response**:
```json
{
  "items": ["lmrc.Profanity", "lmrc.SlurUsage", "..."]
}
```

**Used Technologies**:
- `child_process.spawn()`: CLI execution
- Regex: ANSI code stripping

---

#### `/api/upload/route.ts`
**Endpoint**: `POST /api/upload`

**Purpose**: Upload and parse existing Garak reports

**Functionality**:
- Accepts multipart form data with `report` and optional `hitlog`
- Parses JSONL files using `parseGarakReport()` and `parseGarakHitlog()`
- Normalizes data structure
- Saves to `/data/runs/[runId]/normalized.json`
- Returns run ID for navigation

**Form Data**:
- `report`: File (required) - Garak report JSONL
- `hitlog`: File (optional) - Garak hitlog JSONL

**Used Technologies**:
- `req.formData()`: Multipart form parsing
- `parseGarakReport()`, `parseGarakHitlog()`: JSONL parsing

---

#### `/api/runs/[runId]/route.ts`
**Endpoint**: `GET /api/runs/[runId]`

**Purpose**: Retrieve normalized run data

**Functionality**:
- Reads normalized.json from filesystem
- Returns structured data for frontend

**Used Technologies**:
- `fs.readFileSync()`: File reading

---

#### `/api/runs/[runId]/attempts/route.ts`
**Endpoint**: `GET /api/runs/[runId]/attempts`

**Purpose**: Retrieve paginated attempt data with filtering

**Functionality**:
- Reads normalized data and hitlogs
- Merges hitlog data with attempts (triggers, scores, detectors)
- Applies filters (probe, detector, score, hits only)
- Implements server-side pagination
- Returns paginated subset of attempts

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `probe`: Filter by probe name
- `score`: Minimum score threshold
- `detector`: Filter by detector name
- `hitsOnly`: "true" to show only vulnerabilities

**Response**:
```json
{
  "attempts": [
    {
      "uuid": "...",
      "prompt": "...",
      "hitlogData": {
        "triggers": ["..."],
        "score": 0.8
      }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

---

### Pages

#### `/run/page.tsx` (Client Component)
**Purpose**: UI for executing Garak scans

**Key Features**:
- **Provider Selection**: Dropdown with 9+ providers
- **Model Configuration**: Provider-specific model names
- **API Key Management**: Conditional input based on provider
- **Scanner Selection**: 
  - Categorized probe checkboxes (LLM-Rubric, Jailbreak, Prompt Injection, etc.)
  - Detector checkboxes
  - "Fetch Available" button to dynamically load from Garak CLI
  - Custom probe/detector text inputs
- **Configuration**: Generations, seed, custom Garak command
- **Real-time Execution**:
  - Live log streaming with auto-scroll
  - Status indicators (running, completed, failed, cancelled)
  - Start/Stop controls
  - View Report button on completion

**State Management**:
- Polls `/api/garak/status?runId=X` every 1 second while running
- Auto-scrolls to bottom of logs using `useRef` and `useEffect`

**Used Technologies**:
- React hooks: `useState`, `useEffect`, `useRef`
- `setInterval`: Status polling
- `fetch()`: API calls

---

#### `/runs/page.tsx` + `RunsClient.tsx`
**Purpose**: List all scan results with filtering

**Key Features**:
- Advanced filtering: search, model, probe, date range, hits-only toggle
- Card-based grid layout
- Result counts and active filter chips
- Empty state handling

**Used Technologies**:
- Server component: File system reading
- Client component: Interactive filtering with React state

---

#### `/runs/[runId]/page.tsx` + `RunDetailClient.tsx` + `HeatmapChart.tsx` + `ExportCsvButton.tsx`
**Purpose**: Detailed run analysis

**Key Features**:
- Probe score visualization with risk-based colors
- Interactive heatmap (probes × detectors)
- Expandable attempt cards with copy buttons
- **Vulnerability Context**: Displays triggers, goals, and scores for hits
- Advanced filtering by probe, detector, score threshold
- Server-side pagination for performance
- CSV export functionality

**Used Technologies**:
- Dynamic routing: `[runId]`
- CSS Grid: Heatmap layout
- Clipboard API: Copy functionality
- Blob API + URL.createObjectURL(): CSV download

---

#### `/compare/page.tsx` + `CompareClient.tsx`
**Purpose**: Side-by-side run comparison

**Key Features**:
- Dropdown selection of two runs
- Delta calculations
- Color-coded improvements/regressions

---

#### `/upload/page.tsx`
**Purpose**: Upload existing Garak reports

**Key Features**:
- Drag-and-drop upload UI
- Form validation
- Progress indicators
- File format help documentation

**Used Technologies**:
- `FormData`: File upload
- Drag-and-drop events: `onDragOver`, `onDrop`

---

### Libraries

#### `/lib/garak/parse.ts`
**Purpose**: JSONL parsing and data normalization

**Key Functions**:
- `parseJsonlFile<T>(filePath)`: Generic JSONL streaming parser
- `parseGarakReport(filePath)`: Transforms raw Garak data into `NormalizedRunData`
- `parseGarakHitlog(filePath)`: Processes vulnerability hits

**Parsing Strategy**:
1. Streams JSONL files line by line for memory efficiency
2. Validates and transforms each entry type (init, attempt, eval, digest)
3. Normalizes nested structures into flat, queryable format
4. Handles missing fields with fallbacks

**Used Technologies**:
- `fs.createReadStream()`: File streaming
- `readline.createInterface()`: Line-by-line parsing
- TypeScript generics: Type-safe parsing

---

#### `/lib/garak/types.ts`
**Purpose**: TypeScript type definitions

**Key Types**:
- `GarakReportEntry`: Union type for all JSONL entry types
- `GarakAttemptEntry`, `GarakEvalEntry`, `GarakDigestEntry`: Raw data types
- `NormalizedRunData`: Frontend-optimized structure
- `NormalizedAttempt`, `NormalizedProbeSummary`: Display-ready types
- `RunInfo`: Active scan tracking metadata

---

## Data Storage

### `/data/runs/[runId]/`
**Purpose**: Persistent storage for processed scans

**Files**:
- `normalized.json`: Frontend-optimized data structure
- `report.jsonl`: Original Garak report (moved after parsing)
- `hitlog.jsonl`: Vulnerability hits (if provided)

**Structure of normalized.json**:
```typescript
{
  "meta": {
    "runId": "uuid",
    "garakVersion": "0.13.0",
    "startTime": "2025-09-26T13:16:31.909955",
    "modelType": "huggingface",
    "modelName": "gpt2",
    "probeSpec": "lmrc"
  },
  "attempts": [
    {
      "uuid": "attempt-uuid",
      "seq": 1,
      "status": 2,
      "probe": "lmrc.Profanity",
      "goal": "Test profanity detection",
      "prompt": "User message text",
      "outputs": ["Model response 1", "Model response 2"],
      "detectorResults": {
        "unsafe_content.SurgeProfanitySexual": [1, 0, 1]
      }
    }
  ],
  "evals": [
    {
      "probe": "lmrc.Profanity",
      "detector": "unsafe_content.SurgeProfanitySexual",
      "passed": 9,
      "total": 10
    }
  ],
  "probes": [
    {
      "probeName": "lmrc.Profanity",
      "probeScore": 0.9,
      "detectors": [
        {
          "detectorName": "unsafe_content.SurgeProfanitySexual",
          "absoluteScore": 0.9,
          "relativeScore": 0.9
        }
      ]
    }
  ]
}
```

### `/data/logs/[runId].log`
**Purpose**: Garak execution logs

**Content**: Stdout and stderr from Garak process

### `/data/active_runs.json`
**Purpose**: Active scan tracking

**Structure**:
```json
{
  "uuid-1": {
    "runId": "uuid-1",
    "pid": 12345,
    "status": "running",
    "startTime": 1234567890,
    "model": "gpt2",
    "probes": "lmrc.Profanity",
    "detectors": "",
    "reportPrefix": "garak_uuid-1",
    "logFile": "/path/to/logs/uuid-1.log"
  }
}
```

**Used Technologies**:
- JSON file storage
- File system operations

---

## Garak Integration

### Supported File Formats
- **Report JSONL**: Contains `init`, `attempt`, `eval`, `completion`, `digest` entries
- **Hitlog JSONL**: Contains vulnerability hits with attempt references

### Garak CLI Integration

**Command Execution** (used in `/api/garak/run/route.ts`):
```bash
python3 -m garak \
  --model_type huggingface \
  --model_name gpt2 \
  --probes lmrc.Profanity,lmrc.SlurUsage \
  --detectors unsafe_content.SurgeProfanitySexual \
  --generations 3 \
  --seed 42 \
  --report_prefix garak_uuid
```

**Environment Variables**:
- `OPENAI_API_KEY`, `HF_INFERENCE_TOKEN`, `REPLICATE_API_TOKEN`, etc.: API authentication
- `PYTHONUNBUFFERED=1`: Real-time log streaming

**Report Discovery**:
1. Check project CWD for `garak_uuid*.report.jsonl`
2. Check `~/.local/share/garak/garak_runs/` for files

### Data Interpretation
- **Probes**: Security testing categories (e.g., "lmrc.Profanity")
- **Detectors**: Specific vulnerability detection algorithms
- **Scores**: Pass rates indicating security posture (0.0-1.0)
- **Attempts**: Individual test executions with prompts and outputs
- **Hits**: Confirmed vulnerabilities with detailed context

### Risk Assessment
- **90%+**: Low Risk (Green)
- **70-89%**: Medium Risk (Yellow)
- **50-69%**: High Risk (Orange)
- **<50%**: Critical Risk (Red)

---

## Deployment & Production

### Environment Requirements
- **Node.js**: 20+
- **Python**: 3.8+ (for Garak execution)
- **Garak**: Installed and accessible via CLI
- **Browser**: Modern browser with JavaScript enabled
- **Disk Space**: Sufficient for scan data storage

### Platform Compatibility

**Supported Operating Systems**: Tested only on Windows, should work on others as well.

#### Cross-Platform Components
- **Next.js Application**: Fully cross-platform, tested on Windows should work on others as well.
- **Node.js Runtime**: Works identically across all platforms
- **React UI**: Browser-based, OS-agnostic
- **Garak**: Python package, installable on all major operating systems

#### Platform-Specific Considerations

**Garak Command**:
- **Windows**: `python -m garak` or `py -m garak`
- Configurable via UI in `/run` page

**Garak Report Discovery**:
- **Windows**: os.path.join(os.path.expanduser("~"), ".local", "share", "garak", "garak_runs")
- **Linux**: os.path.join(os.path.expanduser("~"), ".local", "share", "garak", "garak_runs") not tested
- **macOS**: os.path.join(os.path.expanduser("~"), ".local", "share", "garak", "garak_runs") not tested

**Process Spawning**:
- Uses `shell: true` to adapt to platform-specific shells
- Windows: `cmd.exe`
- Linux/macOS: `/bin/sh`

**File Paths**:
- All file operations use `path.join()` for cross-platform compatibility
- Handles Windows backslashes and Unix forward slashes automatically

#### Installation Notes

**Windows**:
```bash
# Install Node.js from nodejs.org
# Install Python from python.org
pip install garak
npm install
npm run dev
```

**macOS**:
```bash
brew install node python3
pip3 install garak
npm install
npm run dev
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt install nodejs npm python3 python3-pip
pip3 install garak
npm install
npm run dev
```

### Installation
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Production server
npm start
```

### Configuration
- **Port**: Default 3000, configurable via `npm run dev -- --port [port]`
- **Data Directory**: `data/` auto-created in project root
- **Garak Command**: Configurable in UI (default: "python3 -m garak")

### Performance Considerations
- **Streaming Parsing**: Handles large JSONL files efficiently
- **Client-side Filtering**: Fast real-time filtering without server calls
- **Lazy Loading**: Components load data as needed
- **Caching**: Normalized data cached in filesystem
- **Process Management**: Garak processes run independently from Next.js server

### Security Considerations
- **Local Storage**: All data stored locally on server filesystem
- **No External APIs**: Self-contained (except LLM providers)
- **File Validation**: Basic file type and content validation
- **Error Handling**: Graceful degradation on malformed data
- **API Key Security**: Passed as environment variables, not stored

---

## Development Workflow

### Build Process
1. **Development**: `npm run dev` - Turbopack hot reloading
2. **Production**: `npm run build` - Optimized build
3. **Deployment**: `npm run start` - Production server

### Code Quality
- **Linting**: ESLint with Next.js recommended rules `npm run lint`
- **Type Checking**: Full TypeScript strict mode `npm run type-check`
- **Formatting**: Consistent code style `npm run format`

### Data Flow

#### Upload Workflow:
1. User uploads JSONL file via `/upload`
2. `POST /api/upload` parses and normalizes data
3. Saved to `/data/runs/[runId]/normalized.json`
4. Frontend loads and visualizes data at `/runs/[runId]`

#### Run Workflow:
1. User configures scan via `/run`
2. `POST /api/garak/run` spawns Garak process
3. Logs streamed to `/data/logs/[runId].log`
4. Client polls `GET /api/garak/status?runId=X` every 1s
5. On completion, status API parses report and saves to `/data/runs/[runId]/`
6. User navigates to `/runs/[runId]` for analysis

---

## Technology Usage Summary

### Where We Use What

**React Client Components** (`use client`):
- `/run/page.tsx` - Interactive scan configuration
- `/runs/RunsClient.tsx` - Filtering and display
- `/runs/[runId]/RunDetailClient.tsx` - Interactive analysis
- `/compare/CompareClient.tsx` - Comparison logic
- All interactive UI elements (buttons, forms, filters)

**React Server Components** (default):
- `/page.tsx` - Home dashboard
- `/runs/page.tsx` - Data loading
- `/runs/[runId]/page.tsx` - Data loading
- `/compare/page.tsx` - Data loading

**Next.js API Routes** (Server-side):
- All `/api/**/*.ts` files
- File system operations
- Process spawning
- JSONL parsing

**Node.js Built-in APIs**:
- `fs`: File operations (read, write, createReadStream, createWriteStream)
- `path`: Path manipulation
- `child_process`: Garak process spawning
- `os`: Home directory detection
- `readline`: Line-by-line JSONL parsing

**External Libraries**:
- `uuid`: Unique ID generation
- `next`, `react`, `react-dom`: Framework
- `tailwindcss`: Styling
- `typescript`: Type safety
- `eslint`: Linting

**Browser APIs**:
- `fetch()`: API calls
- `FormData`: File uploads
- `Blob`, `URL.createObjectURL()`: CSV downloads
- `navigator.clipboard`: Copy to clipboard
- Drag-and-drop events: File uploads

---

This documentation provides a comprehensive overview of the Vulntrex Dashboard architecture, functionality, and implementation details. 