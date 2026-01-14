from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from processor import process_pdf, process_text, process_epub
import uvicorn
import os

app = FastAPI(title="Speed Reader API")

# Enable CORS for frontend
# Allow all origins in production, or specific ones from env
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Accepts a PDF, EPUB, or text file and returns processed words with ORP indices.
    """
    try:
        # Read file content
        contents = await file.read()
        
        # Process based on file type
        filename_lower = file.filename.lower()
        if filename_lower.endswith('.pdf'):
            result = process_pdf(contents)
        elif filename_lower.endswith('.epub'):
            result = process_epub(contents)
        elif filename_lower.endswith('.txt'):
            result = process_text(contents.decode('utf-8'))
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload a PDF, EPUB, or TXT file."
            )
        
        # Always include filename for UX
        result["fileName"] = file.filename
        return JSONResponse(content=result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

