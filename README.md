# Speed Reader

A web application for speed reading using Rapid Serial Visual Presentation (RSVP) with Optimal Recognition Point (ORP) highlighting. Upload PDFs or text files and read them word-by-word at adjustable speeds.

## Features

- **Multiple File Format Support**: Upload PDFs, EPUBs, or plain text files for processing
- **RSVP Reading**: Word-by-word display optimized for speed reading
- **ORP Highlighting**: Central letter highlighting (Optimal Recognition Point) for better focus
- **Adjustable WPM**: Control reading speed from 100 to 2000 words per minute
- **Keyboard Shortcuts**: Full keyboard control for seamless reading experience
- **Dark Theme**: Clean, distraction-free interface

## Keyboard Shortcuts

- `Space`: Toggle play/pause
- `↑` / `↓`: Increase/decrease WPM (50 WPM increments)
- `←` / `→`: Step backward/forward one word
- `R`: Reset to beginning

## Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
python main.py
```

The backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

1. Start both the backend and frontend servers
2. Open your browser to `http://localhost:5173`
3. Click "Choose File" and select a PDF, EPUB, or text file
4. Once processed, the reading interface will appear
5. Use keyboard shortcuts or on-screen controls to navigate and adjust speed

## Deployment

Want to host this application for free? Check out the [Deployment Guide](./DEPLOYMENT.md) for step-by-step instructions on deploying to:
- **Frontend**: Vercel (free tier)
- **Backend**: Render (free tier)

## Technology Stack

- **Backend**: FastAPI, PyMuPDF (fitz), ebooklib, BeautifulSoup4
- **Frontend**: React, TypeScript, Vite, Tailwind CSS

## Project Structure

```
speed_reader/
├── backend/
│   ├── main.py          # FastAPI application
│   ├── processor.py     # PDF/text processing and ORP calculation
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.tsx  # File upload interface
│   │   │   └── Reader.tsx      # RSVP reader component
│   │   ├── hooks/
│   │   │   └── useShortcuts.ts # Keyboard shortcut handler
│   │   ├── App.tsx             # Main app component
│   │   └── types.ts            # TypeScript type definitions
│   └── package.json
└── README.md
```

