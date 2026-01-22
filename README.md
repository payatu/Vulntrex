# Vulntrex Documentation

A comprehensive web dashboard for [Garak](https://github.com/NVIDIA/garak) - the LLM vulnerability scanner.

---

## Table of Contents

1. [Garak Installation](#1-garak-installation)
2. [Garak Concepts](#2-garak-concepts)
3. [Vulntrex Installation](#3-Vulntrex-installation)
4. [Running Vulntrex](#4-running-Vulntrex)
5. [Vulntrex Walkthrough](#5-Vulntrex-walkthrough)
6. [REST API Scanning Guide](#6-rest-api-scanning-guide)

---

## 1. Garak Installation

### Prerequisites
- Python 3.10 or higher
- pip (Python package manager)

### Install via pip

```bash
pip install garak
```

### Verify Installation

```bash
python -m garak --version
```

### Official Documentation

| Resource | Link |
|----------|------|
| GitHub Repository | [github.com/NVIDIA/garak](https://github.com/NVIDIA/garak) |
| Official Docs | [docs.garak.ai](https://docs.garak.ai/) |
| PyPI Package | [pypi.org/project/garak](https://pypi.org/project/garak/) |

---

## 2. Garak Concepts

### Probes
**What they are:** Attack payloads designed to test specific vulnerabilities in LLMs.

**Examples:**
- `lmrc.SlurUsage` - Tests if the model uses slurs
- `dan.Dan` - DAN (Do Anything Now) jailbreak attempts
- `promptinject.Hijack` - Prompt injection attacks
- `encoding.InjectBase64` - Base64 encoded injection attacks

**Example Usage:**
```bash
python -m garak -m huggingface -n gpt2 -p lmrc.SlurUsage
```

---

### Detectors
**What they are:** Analyzers that examine model outputs to determine if an attack succeeded.

**Examples:**
- `mitigation.MitigationBypass` - Detects if safety mitigations were bypassed
- `unsafe_content.SurgeProfanitySexual` - Detects profanity and sexual content
- `base.TriggerListDetector` - Matches against known trigger words

**How they work:**
1. Probe sends malicious prompt → Model responds → Detector analyzes response
2. If detector finds vulnerability indicators → Attack marked as successful (hit)

**Default Behavior:**
If you do not explicitly select detectors, Garak will automatically run the **default detectors** recommended for the selected probe(s). For example, `lmrc.SlurUsage` automatically runs detectors that look for slurs.

---

### Generators
**What they are:** Interfaces that connect Garak to different LLM providers.

| Generator | Description |
|-----------|-------------|
| `huggingface` | Local HuggingFace models |
| `huggingface.InferenceAPI` | HuggingFace Inference API |
| `openai` | OpenAI API (GPT-3.5, GPT-4) |
| `rest` | Generic REST API endpoint |
| `replicate` | Replicate hosted models |
| `cohere` | Cohere API |

---

### Generations
**What it is:** Number of times each probe is sent to the model.

Higher generations = more thorough testing but takes longer.
Default: 5, Recommended for quick tests: 3

---

## 3. Vulntrex Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- Garak installed (see section 1)

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/payatu/Vulntrex.git
cd Vulntrex

# Install dependencies
npm install
```

---

## 4. Running Vulntrex

### Development Mode

```bash
npm run dev
```

Access at: **http://localhost:3000**

### Production Build

```bash
npm run build
npm start
```

---

## 5. Vulntrex Walkthrough

### Dashboard (`/`)
The main landing page showing:
- Overview of all scan runs
- Quick statistics
- Navigation to other sections

### Learn Garak (`/learngarak`)
Step-by-step installation guide for Garak:
- Prerequisites check (Python 3.10+, pip)
- Virtual environment setup
- Garak installation via pip
- Verification steps
- Interactive progress tracking

### Run Scan (`/run`)
Execute new Garak scans with:
- **Provider selection** - Choose LLM provider (HuggingFace, OpenAI, REST, etc.)
- **Model configuration** - Specify model name and API keys
- **Probe selection** - Pick which attacks to run
- **Detector selection** - Choose how to analyze responses
- **Real-time logs** - Watch scan progress live

### View Runs (`/runs`)
Browse all completed scans:
- Filter by model, probe, or date
- See pass/fail statistics
- Click to view detailed results

### Run Details (`/runs/[runId]`)
Detailed view of a specific scan:
- **Heatmap** - Visual matrix of probe vs detector results
- **Probe cards** - Expandable details for each probe tested
- **Attempt details** - View exact prompts and responses
- **Vulnerability hits** - Highlighted failed tests

### Upload (`/upload`)
Import existing Garak reports:
- Upload `report.jsonl` file
- Upload `hitlog.jsonl` file (for vulnerability detection)
- Automatically parsed and added to dashboard

---

## 6. REST API Scanning Guide

This is the most important feature for testing custom chatbots and APIs.

### When to Use REST Mode
- Testing a custom chatbot API
- Scanning internal/private LLM deployments
- Testing any HTTP-based AI endpoint

### Step-by-Step Configuration

#### Step 1: Capture Your Request
Use Burp Suite, browser DevTools, or any HTTP interceptor to capture a request to your chatbot.

**Example raw request:**
```http
POST /sessions/abc-123/messages HTTP/1.1
Host: localhost:8000
Content-Type: application/json
Cookie: session=xyz789

{"message":"Hello, how are you?"}
```
**Example raw response:**
```json
{
    "response": "Hello! I'm doing well, thank you for asking!",
    "session_id": "abc-123",
    "intermediate_steps": [...]
}
```
#### Step 2: Configure Vulntrex Fields

| Field | Value | Explanation |
|-------|-------|-------------|
| **URI** | `http://localhost:8000/sessions/abc-123/messages` | Full URL to your API |
| **Method** | `POST` | HTTP method |
| **Headers** | `{"Content-Type": "application/json"}` | Required headers as JSON |
| **Request Body is JSON** | ✅ Checked | Check this for JSON APIs (most common) |
| **Request Body JSON** | `{"message": "$INPUT"}` | Template with `$INPUT` placeholder |
| **Response Format** | JSON | Select JSON for standard APIs |
| **Response JSON Field** | `response` | Path to extract bot's reply (Required) |
| **Verify SSL** | ❌ Unchecked | Disable for localhost/self-signed certs |

#### Step 3: Configuring the Request Body

**If "Request Body is JSON" is CHECKED (Recommended):**
- Use this for APIs that expect JSON (e.g., `{"message": "Hello"}`).
- Enter a JSON template: `{"text": "$INPUT"}`
- Garak will automatically insert the probe text into `$INPUT`.

**If "Request Body is JSON" is UNCHECKED:**
- Use this ONLY for APIs that expect raw plain text.
- Enter just `$INPUT` or your text template.

#### Step 4: Finding the Response JSON Field

**Response Format:**
- **JSON (Recommended):** Select this if your API returns a JSON object. You **MUST** specify the **Response JSON Field**.
- **Plain Text:** Select this only if the API returns raw text.

**Identifying the Field Path:**
Your API returns a response like:
```json
{
    "response": "Hello! I'm doing well, thank you for asking!",
    "session_id": "abc-123",
    "intermediate_steps": [...]
}
```

The **Response JSON Field** should be: `response`

**Common patterns:**
| API Response | Field Value |
|--------------|-------------|
| `{"response": "Hi"}` | `response` |
| `{"data": {"text": "Hi"}}` | `data.text` |
| `{"choices": [{"message": {"content": "Hi"}}]}` | `choices.0.message.content` |
| `{"output": "Hi"}` | `output` |

💡 **Pro Tip:** Use the **"Response Parser: Paste Sample Response"** helper in Vulntrex to auto-detect this field!

#### Step 5: Run the Scan

1. Select probes (e.g., `lmrc.SlurUsage`, `dan.Dan`)
2. Optionally select specific detectors
3. Set generations (3 is good for quick tests)
4. Click **Start Scan**
5. Monitor real-time logs
6. View results when complete

### Troubleshooting REST Scans

| Issue | Solution |
|-------|----------|
| Connection refused | Check URI, ensure server is running |
| SSL errors | Uncheck "Verify SSL" for self-signed certs |
| Empty responses | Check Response JSON Field path |
| 401/403 errors | Verify headers (auth tokens, cookies) |
| Timeout errors | Increase timeout value |

---

## Quick Reference

### Common Garak Commands

```bash
# List all probes
python -m garak --list_probes

# List all detectors  
python -m garak --list_detectors

# Run specific probe on HuggingFace model
python -m garak -m huggingface -n gpt2 -p lmrc.SlurUsage

# Run with REST generator
python -m garak -m rest -n "http://api.example.com" -p dan.Dan
```
---

## Maintainers

### Project Lead
- **Suraj Kumar** - 
- [Linkedin](https://www.linkedin.com/in/surajkum4r)
- [X](https://x.com/surajkum4r)

### Developer
- **Akshay Vollala** - 
- [Linkedin](https://www.linkedin.com/in/akshayvollala)
- [GitHub](https://github.com/banditAkshayV)

## Support

For issues with:
- **Garak:** [github.com/NVIDIA/garak/issues](https://github.com/NVIDIA/garak/issues)
- **Vulntrex:** Check the project's GitHub repository
