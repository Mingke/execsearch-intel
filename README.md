
# Executive Search Intelligence Tool

**Copyright © 2025 MRS.ai. All rights reserved.**

## 1. Project Overview

The **Executive Search Intelligence Tool** is a specialized AI-powered application designed for Executive Search Professionals (Headhunters). It automates the analysis of unstructured web content (news, press releases, LinkedIn posts) to identify high-value recruitment signals.

Unlike generic summarizers, this tool filters specifically for **VP-level and above** insights, categorizing them into "Urgent Triggers" and "Strategic Opportunities," and synthesizing a ready-to-use **Sales Pitch Angle**.

### Core Value Proposition
*   **Noise Reduction**: Filters out non-executive news.
*   **Structured Intelligence**: Converts raw text into structured JSON data (Tier 1 vs. Tier 2 signals).
*   **Actionable Output**: Generates a specific reason *why* a company needs to hire now.

---

## 2. Key Features

### Intelligence Extraction
*   **Tier 1 Signals (Urgent/High-Priority)**: Detects C-Suite departures, M&A, IPOs, and restructuring events within the last 12 months.
*   **Tier 2 Signals (Future Opportunity)**: Detects digital transformations, new market entries, and "Head of" level hiring patterns.
*   **Pitch Angle Synthesis**: Generates a concise, fact-based paragraph explaining the hiring need.

### User Experience (UX)
*   **Collapsible Workspace**:
    *   **Refine Mode**: Updates the current analysis session without losing context.
    *   **New Analysis Mode**: One-click reset (via the "+" button) that clears context and starts a fresh session ID.
*   **Responsive Dashboard**: Mobile-first design using Shadcn/UI principles.
*   **History Management**: LocalStorage-based sidebar to track past analyses, restore sessions, and manage workflow.
*   **Dark Mode**: Professional "Zinc" aesthetic optimized for data density.

---

## 3. Product Logic & Specifications

### Session Management (Crucial)
The application uses a **Session ID** mechanism to distinguish between iterating on a current task and starting a new one.

| Action | Logic | Data Persistence |
| :--- | :--- | :--- |
| **Initial Analyze** | Generates new `UUID`. | Creates new record in History. |
| **Refine Analysis** | Keeps existing `UUID`. | **Updates** the existing record in History (Overwrite). |
| **New Analysis (+)** | Clears `UUID` & State. | Ready to create a **new** record on next submit. |
| **Load History** | Restores saved `UUID`. | Future refinements will update this restored record. |

### Storage
*   **Persistence**: Browser `localStorage`.
*   **Key**: `exec_search_history`
*   **Limit**: Last 50 items (FIFO).

---

## 4. API Key Management & Security

**⚠️ IMPORTANT:** This is a client-side (SPA) application. The API Key is exposed in the browser's network requests. To prevent quota theft, you must configure **Application Restrictions**.

### Development Setup
1.  Create a `.env` file in the root directory.
2.  Add your key: `API_KEY=AIzaSy...`
3.  The app uses a safe check logic to read `process.env.API_KEY`.

### Production Security (Vercel/Netlify)
1.  **Environment Variable**: Set `API_KEY` in your deployment platform's settings.
2.  **Google Cloud Restrictions (Mandatory)**:
    *   Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).
    *   Select your API Key.
    *   Set **Application restrictions** to **Websites**.
    *   Add your production domains:
        *   `https://your-project.vercel.app/*`
        *   `http://localhost:5173/*` (for local dev)

---

## 5. The "Brain" (AI Logic)

The core intelligence is driven by **Google Gemini 2.5 Flash**. Below is the configuration used to enforce the business logic.

### System Prompt
```text
You are an Executive Search Intelligence Analyst. Your task is to analyze the provided merged web content related to a target lead. Only focus on **executive-level** insights (VP and above).

Adhere strictly to these rules for extraction:

1. **Immediate Executive Search Triggers (Tier 1 Signals):**
   - News in last 12 months: C-Suite appointments/departures, succession planning.
   - News in last 12 months: Major M&A, Funding, IPOs, Activist investor pressure.
   - News in last 12 months: Major restructuring, reorganization, layoffs affecting leadership.
   - Logic: If found, status is "Urgent/High-Priority".

2. **Strategic Growth & Future Roles (Tier 2 Signals):**
   - News in last 12 months: New market entries, Digital/ESG transformation, New regional HQ.
   - News in last 12 months: Hiring for "Head of", "Global", "President", "GM".
   - Logic: If found, status is "Future Opportunity".

3. **Actionable Executive Search Insight:**
   - Synthesize a concise, single-paragraph pitch angle based on the above.
   - State WHAT role is needed and WHY based on facts.
```

### JSON Schema (Strict Mode)
We use Gemini's `responseSchema` to guarantee the UI never breaks.
*   **Root**: `tier1`, `tier2`, `insight`
*   **Tier Object**: `status` (Enum-like string), `items` (Array of strings), `hasSignals` (Boolean).

---

## 6. Tech Stack

*   **Framework**: React 19
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS (configured with Shadcn/UI tokens).
*   **AI SDK**: `@google/genai`
*   **Icons**: Lucide React (via SVG)

---

## 7. Roadmap

### Phase 1 (Current)
- [x] Core Analysis Engine
- [x] Responsive UI (Mobile/Desktop)
- [x] History & Session Management
- [x] Dark Mode

### Phase 2 (Next Up)
- [ ] **Export to PDF/Clipboard**: Button to copy the "Pitch Angle" or save report as PDF.
- [ ] **Multi-Language Support**: Allow analyzing non-English news.

### Phase 3 (Mid-Term)
- [ ] **Auth System**: User accounts to sync history across devices.
- [ ] **URL Scraping**: Input a URL instead of raw text (requires backend proxy).

---

## 8. Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
