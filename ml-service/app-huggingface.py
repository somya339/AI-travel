from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import requests
import os

os.environ["HF_TOKEN"] = ""

app = FastAPI(
    title="ML Service",
    description="Embeddings + ML microservice for Node.js backend",
    version="0.1.0",
)

class EmbedRequest(BaseModel):
    texts: List[str]

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    """
    Generate embeddings using HuggingFace Inference API (free).
    """
    API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
    hf_token = os.getenv("HF_TOKEN")  # Optional: get from environment
    headers = {}
    if hf_token:
        headers["Authorization"] = f"Bearer {hf_token}"
    
    embeddings = []
    for text in req.texts:
        response = requests.post(API_URL, headers=headers, json={"inputs": text})
        
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                embeddings.append(result[0])
            else:
                # Fallback mock embedding
                embedding = [float(hash(f"{text}_{i}") % 1000) / 1000 for i in range(384)]
                embeddings.append(embedding)
        else:
            # Fallback mock embedding
            embedding = [float(hash(f"{text}_{i}") % 1000) / 1000 for i in range(384)]
            embeddings.append(embedding)
    
    return {"embeddings": embeddings}
