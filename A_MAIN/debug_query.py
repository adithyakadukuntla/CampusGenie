from query_db import query_syllabus
from vector_db import get_collection

# Test direct retrieval
print("--- Testing Direct Retrieval ---")
docs = query_syllabus("syllabus for BTech CSE", degree="BTech", department="CSE")
print(f"BTech CSE Docs found: {len(docs)}")

# Test with variations
docs = query_syllabus("syllabus for B.Tech CSE", degree="B.Tech", department="CSE")
print(f"B.Tech Docs found: {len(docs)}")

docs = query_syllabus("syllabus for B-Tech CSE", degree="B-Tech", department="CSE")
print(f"B-Tech Docs found: {len(docs)}")

docs = query_syllabus("syllabus for AI&DS", degree="BTech", department="AI&DS")
print(f"AI&DS Docs found: {len(docs)}")

docs = query_syllabus("syllabus for AI and DS", degree="BTech", department="AI and DS")
print(f"AI and DS Docs found: {len(docs)}")
