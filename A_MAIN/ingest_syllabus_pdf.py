import os
from vector_add import add_pdfs_to_collection

BASE = os.path.join(os.getcwd(), "ALL_PDFs", "syllabus")

for degree in os.listdir(BASE):
    degree_path = os.path.join(BASE, degree)
    if not os.path.isdir(degree_path):
        continue

    for department in os.listdir(degree_path):
        dept_path = os.path.join(degree_path, department)
        if not os.path.isdir(dept_path):
            continue

        print(f"\n📂 Processing {degree} → {department}")

        for file in os.listdir(dept_path):
            if file.lower().endswith(".pdf"):
                file_path = os.path.join(dept_path, file)
                metadata = {
                    "degree": degree.lower().replace(" ", ""),
                    "department": department.lower().replace("&", "and").replace(" ", ""),
                    "source": file
                }
                add_pdfs_to_collection("syllabus", file_path, metadata)
