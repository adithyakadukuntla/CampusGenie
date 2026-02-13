import json
import heapq
import os

def load_graph():
    graph_path = os.path.join(os.path.dirname(__file__), "campus_graph.json")
    with open(graph_path, "r") as f:
        return json.load(f)

def dijkstra(start_node, end_node):
    graph_data = load_graph()
    nodes = {n["id"]: n for n in graph_data["nodes"]}
    adj = {n["id"]: [] for n in graph_data["nodes"]}
    
    for edge in graph_data["edges"]:
        adj[edge["from"]].append((edge["to"], edge["weight"]))
        adj[edge["to"]].append((edge["from"], edge["weight"])) # Assuming undirected paths

    if start_node not in nodes or end_node not in nodes:
        return None, float('inf')

    # Dijkstra's Algorithm
    queue = [(0, start_node, [])]
    seen = set()
    mins = {start_node: 0}

    while queue:
        (cost, v1, path) = heapq.heappop(queue)
        if v1 not in seen:
            seen.add(v1)
            path = path + [v1]
            if v1 == end_node:
                return path, cost

            for v2, weight in adj.get(v1, []):
                if v2 in seen:
                    continue
                prev = mins.get(v2, None)
                next_cost = cost + weight
                if prev is None or next_cost < prev:
                    mins[v2] = next_cost
                    heapq.heappush(queue, (next_cost, v2, path))

    return None, float('inf')

def get_navigation_data(start_label, end_label):
    graph_data = load_graph()
    nodes = graph_data["nodes"]
    
    # Simple fuzzy matching or direct lookup
    def find_node_id(text):
        if not text: return None
        text = text.lower().strip()
        # 1. Try exact match on id
        for n in nodes:
            if n["id"].lower() == text:
                return n["id"]
        # 2. Try contains match on label
        for n in nodes:
            name = n["label"].lower()
            if text in name or name in text:
                return n["id"]
        # 3. Try partial word match
        words = text.split()
        for n in nodes:
            name = n["label"].lower()
            if any(word in name for word in words if len(word) > 3):
                return n["id"]
        return None

    start_id = find_node_id(start_label)
    end_id = find_node_id(end_label)

    # print(f"DEBUG: Mapping '{start_label}' -> {start_id}, '{end_label}' -> {end_id}")

    if not start_id or not end_id:
        return {"error": "Location not found", "start_id": start_id, "end_id": end_id}

    path, total_distance = dijkstra(start_id, end_id)
    
    if not path:
        return {"error": "No path found"}

    # Return full node details for the path
    path_details = [next(n for n in nodes if n["id"] == node_id) for node_id in path]
    
    return {
        "path": path_details,
        "total_distance": total_distance,
        "nodes": nodes,
        "edges": graph_data["edges"]
    }

if __name__ == "__main__":
    # Quick test
    print(get_navigation_data("Gate", "Hostel A"))
