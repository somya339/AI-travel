from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import requests
import os

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
    Generate embeddings using OpenAI API.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"error": "OPENAI_API_KEY not set"}
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "input": req.texts,
        "model": "text-embedding-3-small"  # 1536 dimensions, cheaper
    }
    
    response = requests.post(EMBEDDING_API_URL, headers=headers, json=data)
    
    if response.status_code == 200:
        result = response.json()
        embeddings = [item["embedding"] for item in result["data"]]
        return {"embeddings": embeddings}
    else:
        return {"error": response.text}
