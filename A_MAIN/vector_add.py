import os
import hashlib
import json
from vector_db import embed_model, get_collection
from pdf_utils import extract_pdf_text, chunk_text
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import shutil

def find_tesseract_path():
    """Attempts to find the tesseract binary in common locations."""
    # 1. Check if it's already in the system PATH
    system_path = shutil.which("tesseract")
    if system_path:
        return system_path
    
    # 2. Check common Windows installation paths
    windows_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.join(os.environ.get("LOCALAPPDATA", ""), r"Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for p in windows_paths:
        if os.path.exists(p):
            return p
            
    # 3. Check common Linux paths (though shutil.which usually covers this)
    linux_paths = ["/usr/bin/tesseract", "/usr/local/bin/tesseract"]
    for p in linux_paths:
        if os.path.exists(p):
            return p
            
    return None

# Auto-configure tesseract path
t_path = find_tesseract_path()
if t_path:
    pytesseract.pytesseract.tesseract_cmd = t_path
elif os.name == 'nt':
    print("💡 Tip: If OCR fails, install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki")
else:
    print("💡 Tip: If OCR fails, install Tesseract using 'sudo apt install tesseract-ocr'")

# ⚠️ If Tesseract is not in your PATH, uncomment and set the correct path here:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def get_file_hash(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()

def add_pdf_to_collection(collection_name, pdf_path):
    collection = get_collection(collection_name)
    if collection is None:
        print(f"❌ Invalid collection: {collection_name}")
        return

    pdf_hash = get_file_hash(pdf_path)

    # 🔍 Skip if already ingested
    existing = collection.get(where={"pdf_hash": pdf_hash}, limit=1)
    if existing["ids"]:
        print(f"⏭️ Skipping already ingested: {os.path.basename(pdf_path)}")
        return

    text = extract_pdf_text(pdf_path)
    
    # Fallback to OCR if text is empty
    if not text.strip():
        print(f"⚠️ No text found in {os.path.basename(pdf_path)}. Attempting OCR...")
        try:
            doc = fitz.open(pdf_path)
            ocr_text = ""
            for page in doc:
                pix = page.get_pixmap()
                img_data = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_data))
                ocr_text += pytesseract.image_to_string(image) + "\n"
            
            text = ocr_text
            if text.strip():
                print(f"✅ OCR Successful for {os.path.basename(pdf_path)}")
            else:
                print(f"❌ OCR also failed (empty) for {pdf_path}")
                return
        except Exception as e:
            print(f"❌ OCR Failed: {e}")
            return

    chunks = chunk_text(text)
    embeddings = embed_model.encode(chunks, convert_to_numpy=True)

    base = os.path.basename(pdf_path)

    ids = [f"{pdf_hash}_{i}" for i in range(len(chunks))]
    metadatas = [{
        "pdf_hash": pdf_hash,
        "file_name": base
    } for _ in chunks]

    collection.add(
        documents=chunks,
        embeddings=embeddings.tolist(),
        ids=ids,
        metadatas=metadatas
    )

    print(f"✅ Ingested {base} → {len(chunks)} chunks")


def add_pdfs_to_collection(collection_name, pdf_path, metadata):
    collection = get_collection(collection_name)
    if collection is None:
        print(f"❌ Invalid collection: {collection_name}")
        return

    pdf_hash = get_file_hash(pdf_path)

    # 🔍 Deduplication
    existing = collection.get(where={"pdf_hash": pdf_hash}, limit=1)
    if existing["ids"]:
        print(f"⏭️ Skipping already ingested: {os.path.basename(pdf_path)}")
        return

    text = extract_pdf_text(pdf_path)
    
    # Fallback to OCR if text is empty
    if not text.strip():
        print(f"⚠️ No text found in {os.path.basename(pdf_path)}. Attempting OCR...")
        try:
            doc = fitz.open(pdf_path)
            ocr_text = ""
            for page in doc:
                pix = page.get_pixmap()
                img_data = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_data))
                ocr_text += pytesseract.image_to_string(image) + "\n"
            
            text = ocr_text
            if text.strip():
                print(f"✅ OCR Successful for {os.path.basename(pdf_path)}")
            else:
                print(f"❌ OCR also failed (empty) for {pdf_path}")
                return
        except Exception as e:
            print(f"❌ OCR Failed: {e}")
            print("Make sure Tesseract-OCR is installed and in your PATH.")
            return

    chunks = chunk_text(text)
    embeddings = embed_model.encode(chunks, convert_to_numpy=True)

    base = os.path.basename(pdf_path)

    ids = [f"{pdf_hash}_{i}" for i in range(len(chunks))]
    metadatas = []

    for _ in chunks:
        m = metadata.copy()
        m["pdf_hash"] = pdf_hash
        m["file_name"] = base
        metadatas.append(m)

    collection.add(
        documents=chunks,
        embeddings=embeddings.tolist(),
        ids=ids,
        metadatas=metadatas
    )

    print(f"✅ Ingested {base} → {len(chunks)} chunks")

def add_json_to_collection(collection_name, json_path):
    collection = get_collection(collection_name)
    if collection is None:
        print(f"❌ Invalid collection: {collection_name}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not isinstance(data, list):
        print(f"⚠️ JSON at {json_path} must be a list of objects. Skipping.")
        return

    json_hash = get_file_hash(json_path)
    
    # 🔍 Skip if already ingested
    existing = collection.get(where={"json_hash": json_hash}, limit=1)
    if existing["ids"]:
        print(f"⏭️ Skipping already ingested JSON: {os.path.basename(json_path)}")
        return

    documents = []
    metadatas = []
    ids = []

    for i, item in enumerate(data):
        # Convert object to a readable string format
        doc_content = " ".join([f"{key.replace('_', ' ').title()}: {val}" for key, val in item.items() if val])
        documents.append(doc_content)
        
        # Metadata for each record
        m = {
            "json_hash": json_hash,
            "file_name": os.path.basename(json_path),
            "record_index": i
        }
        # Add all fields to metadata if they are simple types
        for key, val in item.items():
            if isinstance(val, (str, int, float, bool)):
                m[key] = val
        
        metadatas.append(m)
        ids.append(f"{json_hash}_{i}")

    if documents:
        embeddings = embed_model.encode(documents, convert_to_numpy=True)
        collection.add(
            documents=documents,
            embeddings=embeddings.tolist(),
            ids=ids,
            metadatas=metadatas
        )
        print(f"✅ Ingested {os.path.basename(json_path)} → {len(documents)} records")
