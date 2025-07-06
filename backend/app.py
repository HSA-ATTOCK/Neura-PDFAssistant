from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import io
from dotenv import load_dotenv

import google.generativeai as genai
import PyPDF2
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss

load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=API_KEY)

app = Flask(__name__)
CORS(app, origins=["https://pdfasistant.vercel.app"])

@app.route('/')
def index():
    return "✅ PDF Assistant Backend is running!"


assistant_state = {}

def extract_text_from_pdf(pdf_file):
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"
    return text

def split_text_into_chunks(text, chunk_size=1000):
    words = text.split()
    return [' '.join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]

def create_embeddings(chunks):
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(chunks)
    return embeddings, model

def setup_search_index(embeddings):
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings.astype('float32'))
    return index

def find_relevant_chunks(query, model, index, chunks, top_k=3):
    query_embedding = model.encode([query])
    distances, indices = index.search(query_embedding.astype('float32'), top_k)
    return [chunks[i] for i in indices[0]]

def generate_answer(question, relevant_chunks):
    context = "\n\n".join(relevant_chunks)
    prompt = f"""
    Context:
    {context}

    Question: {question}

    Instructions:
    - Only use info from context
    - If not found, say so
    """
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    return response.text

@app.route('/upload', methods=['POST'])
def upload_pdf():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file provided'}), 400

    pdf_content = extract_text_from_pdf(file)
    chunks = split_text_into_chunks(pdf_content)
    embeddings, model = create_embeddings(chunks)
    index = setup_search_index(embeddings)

    assistant_state['chunks'] = chunks
    assistant_state['model'] = model
    assistant_state['index'] = index

    return jsonify({'message': 'PDF processed successfully!'})

@app.route('/ask', methods=['POST'])
def ask_question():
    question = request.json.get('question')
    chunks = assistant_state.get('chunks')
    model = assistant_state.get('model')
    index = assistant_state.get('index')

    if not all([chunks, model, index]):
        return jsonify({'error': 'PDF not processed yet'}), 400

    relevant_chunks = find_relevant_chunks(question, model, index, chunks)
    answer = generate_answer(question, relevant_chunks)
    return jsonify({'answer': answer})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

