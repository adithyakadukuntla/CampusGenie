import os
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("CollegeBOT")
API_URL = "https://router.huggingface.co/v1/chat/completions"
# Using a faster/better model for routing if available, or keep Qwen
MODEL = "Qwen/Qwen2.5-7B-Instruct" 

HEADERS = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type": "application/json"
}

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

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def query_hf_api(payload):
    async with aiohttp.ClientSession() as session:
        async with session.post(API_URL, headers=HEADERS, json=payload) as response:
            if response.status != 200:
                text = await response.text()
                raise Exception(f"API Error {response.status}: {text}")
            return await response.json()

async def get_collection_name(user_query: str) -> str:
    prompt = f"""
You are a precise query router for VNR VJIET college chatbot.

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

Rules:
- Return ONLY ONE word from: {', '.join(ALLOWED_COLLECTIONS)}
- No explanations, no punctuation, no extra text
- If the question is ambiguous or doesn't fit clearly, choose 'general'

Question: {user_query}

Category:"""

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a precise classification engine. Return only the category name, nothing else."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 15,
        "temperature": 0.0
    }

    try:
        data = await query_hf_api(payload)
        output = data["choices"][0]["message"]["content"].strip().lower()

        # Safety: force valid output
        for col in ALLOWED_COLLECTIONS:
            if col in output:
                return col
        return "general"
    except Exception as e:
        print(f"Router Error: {e}")
        return "general"

async def get_more_details(user_query: str):
    prompt = f"""
You are an assistant that extracts degree and department information from user queries about college syllabus.
From the question below, extract the degree and department if mentioned.

Valid Degrees:
- BTech
- MTech
- BTech_Minor

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

Question: {user_query}
Provide the response in the format:
Degree: <strictly one of the valid degrees or 'None'>
Department: <strictly one of the valid departments or 'None'>
"""

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful and precise assistant. Map the user's input to the closest valid degree and department from the list."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 100,
        "temperature": 0.1
    }
    
    try:
        data = await query_hf_api(payload)
        answer = data["choices"][0]["message"]["content"].strip()
        degree = None
        department = None
        for line in answer.splitlines():
            if line.lower().startswith("degree:"):
                degree = line.split(":", 1)[1].strip()
                if degree.lower() == "none":
                    degree = None
            elif line.lower().startswith("department:"):
                department = line.split(":", 1)[1].strip()
                if department.lower() == "none":
                    department = None
        return degree, department
    except Exception as e:
        print(f"Details Extractor Error: {e}")
        return None, None


async def get_final_answer(user_query: str, context: str) -> str:
    prompt = f"""
You are a helpful assistant for VNR VJIET (Valluripalli Nageshwar Rao Vignana Jyothi Institute of Engineering and Technology).

Your role:
- Answer student questions accurately and professionally
- Use the provided context as your primary source
- Be conversational and natural (don't mention "AI" or "based on context")
- Format answers clearly with bullet points or paragraphs as appropriate
- If information is missing from context, provide general knowledge about VNR VJIET

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

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a knowledgeable VNR VJIET college assistant. Provide accurate, well-formatted, and helpful responses."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 500,
        "temperature": 0.2
    }
    
    try:
        data = await query_hf_api(payload)
        answer = data["choices"][0]["message"]["content"].strip()
        return answer
    except Exception as e:
        return f"I'm sorry, I encountered an error while processing your request. Please try again later. (Error: {str(e)})"