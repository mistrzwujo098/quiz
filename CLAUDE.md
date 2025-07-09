# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuizMaster is a React-based educational web application for creating and conducting online exams for Polish schools. It supports 8th grade exams and high school finals (matura).

## Key Commands

### Running the Application
```bash
# Method 1: Python HTTP server (recommended)
python3 -m http.server 8000

# Method 2: Node.js server with API proxy
npm start

# Method 3: Development mode with nodemon
npm run dev

# Method 4: Direct file access
# Open index.html directly in browser (works offline, no API features)
```

### Testing
```bash
# Run tests locally (no Docker required)
./run-tests-local.sh

# Quick smoke tests only
./run-tests-local.sh --quick

# Run tests in Docker environment
./tests/run-tests.sh

# Run specific test suites
node tests/smoke-test.js
node tests/comprehensive-test-suite.js
```

### Server Management
```bash
# Install all dependencies (main + server)
npm run install-all

# Start API proxy server only
cd server && node server.js

# Health check
curl http://localhost:3001/health
```

## Architecture

### Technology Stack
- **React 18** - Loaded via CDN, no build process required
- **Tailwind CSS** - For styling with custom glassmorphism effects
- **LocalStorage** - All data persistence (no database backend)
- **Libraries via CDN**: PDF.js, Chart.js, XLSX, CryptoJS, JSZip
- **Express.js** - Optional API proxy for Gemini AI integration

### Key Architecture Points
1. **No Build Process** - The application runs directly from HTML files with React loaded via CDN
2. **Client-Side Only** - All data is stored in browser's localStorage
3. **Multi-Page Structure** - Main app in index.html with utility pages for specific features
4. **User System** - Simple role-based access (teachers/students) with localStorage-based authentication
5. **Optional API Server** - Express proxy at port 3001 for Gemini AI features (variant generation)

### Core JavaScript Modules
- `js/init.js` - Initializes localStorage with default users and data
- `js/zadania-db.js` - Question database management
- `js/advanced-pdf-parser.js` - PDF parsing for exam import
- `js/task-variant-generator.js` - AI-powered question variant generation
- `js/achievements-system.js` - Student achievement tracking
- `js/exam-scheduler.js` - Exam scheduling and timing
- `js/recommendation-system.js` - Learning recommendations
- `js/competition-system.js` - Competitive features between students

### Data Structure
Questions are stored as JSON with this structure:
```javascript
{
  id: string,
  przedmiot: string,      // "egzamin ósmoklasisty" | "matura podstawowa" | "matura rozszerzona"
  temat: string,
  tresc: string,
  typ: "zamkniete" | "otwarte",
  odpowiedzi: string[],   // for multiple choice
  poprawna: string,
  punkty: number,
  poziom: string,
  obrazek?: string,       // optional SVG diagram
  warianty?: object[]     // AI-generated variants
}
```

### Important Files
- `index.html` - Main application with teacher and student panels
- `quiz_data.json` - Base exam questions database (50 questions)
- `complete-exam-database.json` - Full exam database
- `.env` - Environment configuration (Gemini API key)
- `server/server.js` - Express API proxy for AI features

### Test Credentials
Teachers: `nauczyciel` / `haslo123`, `admin` / `admin123`
Students: `anna.nowak` / `uczen123` (all students use `uczen123`)

### Utility Pages
- `test-practice.html` - Standalone practice mode
- `integrity-check.html` - Database integrity verification
- `import-complete-database.html` - Database import tool
- `test-svg-display.html` - SVG diagram testing
- `test-variant-generation.html` - AI variant generation testing

### Environment Variables
Create a `.env` file in the root directory:
```bash
GEMINI_API_KEY=your_api_key_here
PORT=3001
ALLOWED_ORIGINS=http://localhost:8000,http://localhost:3000
```