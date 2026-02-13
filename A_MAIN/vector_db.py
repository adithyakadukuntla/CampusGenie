import chromadb
from sentence_transformers import SentenceTransformer

PERSIST_PATH = "./college_dbs"

client = chromadb.PersistentClient(path=PERSIST_PATH)

embed_model = SentenceTransformer("all-MiniLM-L6-v2")

collections = {
    "fees": client.get_or_create_collection("fees"),
    "placements": client.get_or_create_collection("placements"),
    "campus_navigation": client.get_or_create_collection("campus_navigation"),
    "departments": client.get_or_create_collection("departments"),
    "admissions": client.get_or_create_collection("admissions"),
    "rankings": client.get_or_create_collection("rankings"),
    "faculty": client.get_or_create_collection("faculty"),
    "general": client.get_or_create_collection("general"),
    "syllabus": client.get_or_create_collection("syllabus"),
    "hostel": client.get_or_create_collection("hostel")
}

def get_collection(name):
    return collections.get(name)
