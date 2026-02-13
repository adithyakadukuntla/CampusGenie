import PyPDF2
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter

def extract_pdf_text(pdf_path):
    text = ""
    # 1. Try PyPDF2 first
    try:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                content = page.extract_text()
                if content:
                    text += content + "\n"
    except Exception as e:
        print(f"⚠️ PyPDF2 failed: {e}")

    # 2. Fallback to PyMuPDF (fitz) if no text found
    if not text.strip():
        try:
            doc = fitz.open(pdf_path)
            for page in doc:
                content = page.get_text()
                if content:
                    text += content + "\n"
            doc.close()
        except Exception as e:
            print(f"⚠️ PyMuPDF failed: {e}")

    return text

def chunk_text(text, chunk_size=1000, chunk_overlap=100):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )
    return text_splitter.split_text(text)
