from flask import Flask, request, jsonify, send_from_directory
from api_client_ollama import get_collection_name, get_final_answer, extract_navigation_details, get_more_details
import os
from query_db import query_collection, query_syllabus
from navigation_utils import get_navigation_data, load_graph
from flask_cors import CORS
from dotenv import load_dotenv
import asyncio

load_dotenv()

# Handle absolute path for static folder
template_dir = os.path.abspath(os.path.join(os.getcwd(), '..', 'Chat_AI', 'build'))
app = Flask(__name__, static_folder=template_dir, static_url_path='/')

# Enable CORS for all origins and routes
CORS(app, resources={r"/*": {"origins": "*"}})

# Serve the React Build
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    # Check if the file exists in the static_folder
    file_path = os.path.join(app.static_folder, path)
    if path != "" and os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        # Fallback to index.html for React routing
        return send_from_directory(app.static_folder, "index.html")

@app.route('/home',methods=['GET']) # Renamed to /home to avoid conflict with / serve
def home():
    return "CampusGenie API is running."

@app.route('/graph', methods=['GET'])
def get_graph():
    return jsonify(load_graph())

# @app.route('/get',methods=['GET'])
# def home():
#     return "CampusGenie API is running."

@app.route('/query', methods=['POST'])
async def handle_query():
    data = request.json
    user_query = data.get("query") 
    
    if not user_query:
        return jsonify({"error": "No query provided"}), 400

    # Check cache first
    from cache import query_cache
    cached_result = query_cache.get(user_query)
    if cached_result:
        return jsonify(cached_result)

    # 1. Identify which collection to use (Async)
    collection_name = await get_collection_name(user_query)
    print(f"Detected Collection: {collection_name}")

    # 2. Retrieve documents
    if collection_name == "campus_navigation":
        source, destination = await extract_navigation_details(user_query)
        print(source, destination)

        # Special Case: User wants to see the whole map
        if any(word in user_query.lower() for word in ["show me the map", "show map", "full map", "explore campus"]):
            nav_data = {
                "nodes": load_graph()["nodes"],
                "edges": load_graph()["edges"],
                "path": []
            }
            result = {
                "answer": "Here is the full campus map for you to explore!",
                "collection": "campus_navigation",
                "navigation": nav_data
            }
            query_cache.set(user_query, result)
            return jsonify(result)

        if source and destination:
            nav_data = get_navigation_data(source, destination)
            # print(nav_data)
            if "error" not in nav_data:
                # Format the path string and mention the accurate block first
                path_nodes = nav_data["path"]
                dest_node = path_nodes[-1]
                
                block_info = ""
                if "(" in dest_node["label"]:
                    block_info = dest_node["label"].split("(")[1].split(")")[0]
                    answer_start = f"To reach **{dest_node['label']}**, you should head to **{block_info}**. "
                else:
                    answer_start = f"Route to **{dest_node['label']}**: "

                path_str = " -> ".join([n["label"] for n in path_nodes])
                answer = f"{answer_start}The shortest path from {source} is: \n\n**{path_str}**.\n\nTotal distance is approximately {nav_data['total_distance']} units."
                
                result = {
                    "answer": answer,
                    "collection": collection_name,
                    "navigation": nav_data 
                }
                query_cache.set(user_query, result)
                return jsonify(result)
            else:
                docs = query_collection(collection_name, user_query) # Fallback to RAG
        else:
            docs = query_collection(collection_name, user_query) # Fallback to RAG
    
    elif collection_name == "syllabus":
        degree, department = await get_more_details(user_query)
        # print(f"Extracted Degree: {degree}, Department: {department}")
        docs = query_syllabus(user_query, degree, department)
    else:
        docs = query_collection(collection_name, user_query)

    if not docs:
        result = {"answer": "No relevant info found.", "collection": collection_name}
        query_cache.set(user_query, result)
        return jsonify(result)

    # 3. Get final answer (Async)
    context = "\n".join(docs)
    answer = await get_final_answer(user_query, context)

    result = {
        "answer": answer,
        "collection": collection_name
    }
    
    # Store in cache
    query_cache.set(user_query, result)
    
    return jsonify(result)

@app.route('/cache/stats', methods=['GET'])
def cache_stats():
    """Get cache statistics"""
    from cache import query_cache
    return jsonify(query_cache.get_stats())

@app.route('/cache/clear', methods=['POST'])
def clear_cache():
    """Clear the cache"""
    from cache import query_cache
    query_cache.clear()
    return jsonify({"message": "Cache cleared successfully"})

if __name__ == "__main__":
    # Run the Flask app
    app.run(host="0.0.0.0", port=6230, debug=False)