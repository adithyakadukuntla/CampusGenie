import chromadb

client = chromadb.PersistentClient(path="./college_dbs")

# collections = client.list_collections()

for c in client.list_collections():
    col = client.get_collection(c.name)
    print(f"{c.name} → {col.count()} chunks")

