import os
from vector_add import add_pdf_to_collection

# BASE = r"D:\CampusGenie\A_MAIN\ALL_PDFs"
BASE = os.path.join(os.getcwd(), "ALL_PDFs")


for folder in os.listdir(BASE):
    folder_path = os.path.join(BASE, folder)

    if not os.path.isdir(folder_path):
        continue

    print(f"\n📂 Processing {folder}")

    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        if file.endswith(".pdf"):
            add_pdf_to_collection(folder, file_path)
        elif file.endswith(".json"):
            from vector_add import add_json_to_collection
            add_json_to_collection(folder, file_path)
