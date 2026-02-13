from vector_db import get_collection

syllabus = get_collection("syllabus")
if not syllabus:
    print("CRITICAL: Syllabus collection not found!")
else:
    count = syllabus.count()
    print(f"Total documents in syllabus: {count}")
    
    # Get all metadata
    # Chroma get limit is usually small by default, let's try to get enough
    results = syllabus.get(include=["metadatas"])
    metadatas = results["metadatas"]
    
    degrees = set()
    departments = set()
    
    for m in metadatas:
        if m:
            if "degree" in m: degrees.add(m["degree"])
            if "department" in m: departments.add(m["department"])
            
    print("\n=== STORED DEGREES ===")
    for d in sorted(degrees):
        print(f"'{d}'")
        
    print("\n=== STORED DEPARTMENTS ===")
    for d in sorted(departments):
        print(f"'{d}'")
