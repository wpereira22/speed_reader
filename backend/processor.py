import fitz  # PyMuPDF
import re
import tempfile
import os
from typing import List, Dict, Any, Optional
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup

# --- ORP logic ---

def calculate_orp_core(core: str) -> int:
    """
    Compute ORP index on the *core word* (0-based).
    Common RSVP/Spritz-style buckets:
      len 1 -> 0
      len 2-5 -> 1
      len 6-9 -> 2
      len 10-13 -> 3
      len 14+ -> 4
    """
    core = core.strip()
    if not core:
        return 0

    L = len(core)
    if L <= 1:
        idx = 0
    elif L <= 5:
        idx = 1
    elif L <= 9:
        idx = 2
    elif L <= 13:
        idx = 3
    else:
        idx = 4

    # Clamp
    return max(0, min(idx, L - 1))


_WORD_CORE_RE = re.compile(
    r"^([^A-Za-z0-9]*)([A-Za-z0-9]+(?:[’'\-][A-Za-z0-9]+)*)([^A-Za-z0-9]*)$"
)

def split_leading_core_trailing(token: str) -> Dict[str, str]:
    """
    Split a whitespace token into leading punctuation, core word, trailing punctuation.
    Keeps things like: '"hello,"' -> leading='"', core='hello', trailing=',"'
    Supports apostrophes and hyphens inside the core: "don't", "state-of-the-art"
    """
    m = _WORD_CORE_RE.match(token)
    if not m:
        # No obvious core word: treat whole token as "core" so it still renders
        return {"leading": "", "core": token, "trailing": ""}

    return {"leading": m.group(1), "core": m.group(2), "trailing": m.group(3)}


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace but keep punctuation intact."""
    return re.sub(r"\s+", " ", text).strip()


def normalize_preserve_paragraphs(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def normalize_for_words(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def tokens_from_text(text: str) -> List[str]:
    """Split on whitespace; keep punctuation attached to tokens for RSVP display."""
    return re.findall(r"\S+", text)


def process_tokens(tokens: List[str]) -> List[Dict[str, Any]]:
    """
    For each token, compute ORP on the core and return fields that make UI rendering easy.
    """
    out: List[Dict[str, Any]] = []

    for raw in tokens:
        parts = split_leading_core_trailing(raw)
        leading, core, trailing = parts["leading"], parts["core"], parts["trailing"]

        orp_core = calculate_orp_core(core)
        display = f"{leading}{core}{trailing}"
        orp_display = len(leading) + orp_core

        # Clamp again for safety (in weird tokens)
        if not display:
            orp_display = 0
        else:
            orp_display = max(0, min(orp_display, len(display) - 1))

        out.append({
            "word": display,
            "orpIndex": orp_display
        })
    return out

def process_text(text: str) -> Dict[str, Any]:
    formatted = normalize_preserve_paragraphs(text)
    word_text = normalize_for_words(text)
    tokens = tokens_from_text(word_text)
    words = process_tokens(tokens)
    return {
        "words": words,
        "fullText": formatted,
        "meta": {"type": "txt"}
    }

def process_pdf(contents: bytes) -> Dict[str, Any]:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
    
    try:
        doc = fitz.open(tmp_path)
        pages = []
        formatted_pages = []
        for page_index, page in enumerate(doc, start=1):
            page_text = page.get_text("text")
            page_text = page_text.replace("\r\n", "\n").replace("\r", "\n")
            page_text = re.sub(r"(?<!\n)\n(?!\n)", " ", page_text)
            pages.append(page_text)
            formatted_pages.append(f"— — —\n\n{page_text}")
        doc.close()
        
        formatted = normalize_preserve_paragraphs("\n\n".join(formatted_pages))
        word_text = normalize_for_words("\n\n".join(pages))
        tokens = tokens_from_text(word_text)
        words = process_tokens(tokens)
        
        return {
            "words": words,
            "fullText": formatted,
            "meta": {"type": "pdf"}
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def process_epub(contents: bytes) -> Dict[str, Any]:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".epub") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
    
    try:
        book = epub.read_epub(tmp_path)
        blocks = []
        raw_text = []
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            soup = BeautifulSoup(item.get_content(), 'html.parser')
            for elem in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'blockquote']):
                content = elem.get_text("\n", strip=True)
                if not content:
                    continue
                lines = [line.strip() for line in content.split("\n") if line.strip()]
                for line in lines:
                    if elem.name == 'li':
                        line = f"• {line}"
                    blocks.append(line)
            raw_text.append(soup.get_text(" ", strip=True))
        
        formatted = normalize_preserve_paragraphs("\n\n".join(blocks))
        word_text = normalize_for_words(" ".join(raw_text))
        tokens = tokens_from_text(word_text)
        words = process_tokens(tokens)
        
        meta = {"type": "epub"}
        
        # Safely extract title and creator
        title_meta = book.get_metadata('DC', 'title')
        if title_meta:
            meta["title"] = title_meta[0][0]
        
        creator_meta = book.get_metadata('DC', 'creator')
        if creator_meta:
            meta["creator"] = creator_meta[0][0]
            
        return {
            "words": words,
            "fullText": formatted,
            "meta": meta
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


