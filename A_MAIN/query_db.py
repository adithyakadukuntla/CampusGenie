from vector_db import embed_model, get_collection


def query_collection(collection_name, user_query, n_results=6):
    collection = get_collection(collection_name)
    if not collection:
        return []

    q_emb = embed_model.encode([user_query], convert_to_numpy=True)

    results = collection.query(
        query_embeddings=q_emb.tolist(),
        n_results=n_results
    )

    return results["documents"][0] if results["documents"] else []

def normalize(text):
    if not text:
        return None
    # Consistent normalization with ingestion logic
    text = text.lower()
    text = text.replace("&", "and")
    text = text.replace(" and ", "and") # handle "AI and DS" -> "aiandds"
    text = text.replace(" ", "")
    text = text.replace("-", "")
    text = text.replace(".", "")
    return text

def query_syllabus(user_query, degree=None, department=None, n_results=6):
    q_emb = embed_model.encode([user_query], convert_to_numpy=True)

    # 🔥 Normalize metadata
    syllabus = get_collection("syllabus")
    degree_n = normalize(degree)
    department_n = normalize(department)

    where = None

    if degree_n and department_n:
        where = {
            "$and": [
                {"degree": degree_n},
                {"department": department_n}
            ]
        }
    elif degree_n:
        where = {"degree": degree_n}
    elif department_n:
        where = {"department": department_n}

    print(f"Querying Syllabus - Degree: {degree_n}, Dept: {department_n}")
    print("Chroma filter:", where)

    results = syllabus.query(
        query_embeddings=q_emb.tolist(),
        where=where,
        n_results=n_results
    )

    print(f"Found {len(results['documents'][0]) if results['documents'] else 0} results")

    return results["documents"][0] if results["documents"] else []

