import aiohttp
import json
from typing import Optional

# Ollama API endpoint (local)
OLLAMA_API_URL = "http://10.100.0.15:11434/api/chat"
MODEL = "qwen2.5:7b"

ALLOWED_COLLECTIONS = [
    "placements",
    "rankings",
    "admissions",
    "fees",
    "departments",
    "syllabus",
    "faculty",
    "campus_navigation",
    "general"
]

async def query_ollama(messages: list, max_tokens: int = 500, temperature: float = 0.1) -> str:
    """
    Query the local Ollama API with the given messages.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature
    
    Returns:
        The generated response text
    """
    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens
        }
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(OLLAMA_API_URL, json=payload) as response:
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"Ollama API Error {response.status}: {text}")
                
                data = await response.json()
                return data.get("message", {}).get("content", "").strip()
    except Exception as e:
        print(f"Ollama API Error: {e}")
        raise

async def get_collection_name(user_query: str) -> str:
    """
    Determine which collection to query based on the user's question.
    
    Args:
        user_query: The user's question
    
    Returns:
        Collection name (one of ALLOWED_COLLECTIONS)
    """
    prompt = f"""You are a precise query router for VNR VJIET college chatbot.

Analyze the user's question and classify it into ONE category.

Categories and their scope:
• placements → job placements, recruiting companies, salary packages, placement statistics, internships
• rankings → NIRF rankings, national/state rankings, year-wise rank changes
• admissions → eligibility criteria, entrance exams (EAMCET, JEE), application process, counseling, cutoffs
• fees → tuition fees, hostel fees, scholarships, fee structure, payment details
• departments → department information, branches (CSE, ECE, EIE, CSE-CyS, CSE-DS, AI&DS, IT, CSE-AIML, IoT, MECH, Civil), intake capacity, specializations
• syllabus → curriculum, subjects, courses, semester-wise topics, exam patterns, question papers, notes, labs, assignments, academic structure
• faculty → professors, teachers, staff, HODs, faculty profiles
• campus_navigation → campus locations, building directions, facilities, infrastructure
• general → college history, campus overview, location, general information
• hostel → hostel information, hostel facilities, hostel rules, hostel life


Rules:
- Return ONLY ONE word from: {', '.join(ALLOWED_COLLECTIONS)}
- No explanations, no punctuation, no extra text
- If the question is ambiguous or doesn't fit clearly, choose 'general'

Question: {user_query}

Category:"""

    messages = [
        {"role": "system", "content": "You are a precise classification engine. Return only the category name, nothing else."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        output = await query_ollama(messages, max_tokens=15, temperature=0.0)
        output = output.strip().lower()
        
        # Safety: force valid output
        for col in ALLOWED_COLLECTIONS:
            if col in output:
                return col
        return "general"
    except Exception as e:
        print(f"Router Error: {e}")
        return "general"

async def get_more_details(user_query: str) -> tuple[Optional[str], Optional[str]]:
    """
    Extract degree and department information from syllabus-related queries.
    
    Args:
        user_query: The user's question
    
    Returns:
        Tuple of (degree, department) or (None, None) if not found
    """
    prompt = f"""You are an assistant that extracts degree and department information from user queries about college syllabus.
From the question below, extract the degree and department if mentioned.

Valid Degrees:
- BTech
- MTech

Valid Departments:
- AI&DS (or AI and DS)
- AI&ML (or AI and ML)
- CSE
- ECE
- EEE
- EIE
- IT
- Mechanical
- Civil
- CSBS
- IoT
- DataScience
- CyS
- Biotechnology
- Automobile
- R&AI (Robotics and AI)
- VLSI
- Embedded Systems
1-1 represents 1st year 1st sem
1-2 represents 1st year 2nd sem
2-1 represents 2nd year 1st sem
2-2 represents 2nd year 2nd sem
3-1 represents 3rd year 1st sem
3-2 represents 3rd year 2nd sem
4-1 represents 4th year 1st sem
4-2 represents 4th year 2nd sem
Question: {user_query}
Provide the response in the format:
Degree: <strictly one of the valid degrees or 'None'>
Department: <strictly one of the valid departments or 'None'>"""

    messages = [
        {"role": "system", "content": "You are a helpful and precise assistant. Map the user's input to the closest valid degree and department from the list."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        answer = await query_ollama(messages, max_tokens=100, temperature=0.1)
        degree = None
        department = None
        
        for line in answer.splitlines():
            if line.lower().startswith("degree:"):
                degree = line.split(":", 1)[1].strip()
                if degree.lower() == "none":
                    degree = "BTech"
            elif line.lower().startswith("department:"):
                department = line.split(":", 1)[1].strip()
                if department.lower() == "none":
                    department = "CSE"
        print("degree",degree)
        print("department",department)
        return degree, department
    except Exception as e:
        print(f"Details Extractor Error: {e}")
        return None, None

async def extract_navigation_details(user_query: str) -> tuple[Optional[str], Optional[str]]:
    """
    Extract source and destination from navigation queries.
    """
    prompt = f"""You are an assistant that extracts 'source' and 'destination' from campus navigation queries.
From the question below, extract the starting point and the ending point.
the places are 
- gate , main gate , entrance 
- hanuman, god statue, 
- circle ,main circle 
- vinayaka, god statue, 
- road_mid , main road 
- jsk_greens , jsk greens 
- greenery , greenery and tables 
- car_parking , bus and car parking 
- new_block , new block (cse, aiml) 
- d_block , admission block (d block, exam cell) 
- mba , mba block 
- canteen , canteen (mba) 
- peb 
- b_parking 
- s_b_parking 
- ground 
- coca_cola 
- tea_stall 
- annapurna 
- c_block 
- b_block 
- a_block 
- pg_block 

Example:
Query: 'How to get from Library to Canteen?'
Source: Library
Destination: Canteen

Query: 'shortest path to Main Gate from Hostel A'
Source: Hostel A
Destination: Main Gate

Question: {user_query}
Provide the response in the format:
Source: <extracted source or 'None'>
Destination: <extracted destination or 'None'>"""

    messages = [
        {"role": "system", "content": "You are a precise extraction assistant. Extract source and destination from the query."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        answer = await query_ollama(messages, max_tokens=100, temperature=0.1)
        source = None
        destination = None
        
        for line in answer.splitlines():
            if line.lower().startswith("source:"):
                source = line.split(":", 1)[1].strip()
                if source.lower() == "none":
                    source = "gate"
            elif line.lower().startswith("destination:"):
                destination = line.split(":", 1)[1].strip()
                if destination.lower() == "none":
                    destination = "pg_block"
        
        return source, destination
    except Exception as e:
        print(f"Navigation Extractor Error: {e}")
        return None, None

async def get_final_answer(user_query: str, context: str) -> str:
    """
    Generate the final answer using the retrieved context.
    
    Args:
        user_query: The user's question
        context: Retrieved context from the vector database
    
    Returns:
        The final answer
    """
    prompt = f"""You are a helpful assistant for VNR VJIET (Valluripalli Nageshwar Rao Vignana Jyothi Institute of Engineering and Technology).

Your role:
- Answer student questions accurately and professionally.
- Use the provided context as your primary source.
- NEVER mention "based on the context", "according to the context", or "the context says". Be conversational and natural.
- If any links (URLs) are found in the context related to the query, include them in your response. Ensure they are clearly visible.
- If information is missing from the context or you cannot find a specific answer:
    - Respond with exactly: "I'm sorry, I couldn't find specific information about that. Please use the **Report Form** at the top of the chat UI to submit your question. We are working hard to enhance the bot and it will be ready with more details in a few days. Thank you for your patience!"
- Do not make up facts. If you can provide a very brief general outline (not deep answers) from your general knowledge about VNR VJIET when context is missing, you may do so BEFORE providing the "Sorry" message above.

Departments at VNR VJIET:
• CSE - Computer Science and Engineering
• ECE - Electronics and Communication Engineering
• EIE - Electronics and Instrumentation Engineering
• CSE (CyS, DS) - CSE with Cyber Security and Data Science
• CSBS - Computer Science and Business Systems
• CSDS - Data Science
• AI&DS - Artificial Intelligence and Data Science
• IT - Information Technology
• CSE-AIML - CSE with AI and Machine Learning
• IoT - Internet of Things
• MECH - Mechanical Engineering
• Civil - Civil Engineering
• M-Tech: Embedded Systems, VLSI Design, and other specializations

Degrees: B.Tech, M.Tech

Context:
{context}

Question: {user_query}

Answer (be clear, accurate, and helpful):"""

    messages = [
        {"role": "system", "content": "You are a knowledgeable VNR VJIET college assistant. Provide accurate, well-formatted, and helpful responses."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        # Increased tokens for longer, more detailed responses
        answer = await query_ollama(messages, max_tokens=1000, temperature=0.2)
        return answer
    except Exception as e:
        return f"I'm sorry, I encountered an error while processing your request. Please try again later. (Error: {str(e)})"
