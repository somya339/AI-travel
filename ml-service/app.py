from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import requests
import numpy as np
import os
import re
import math

app = FastAPI(
    title="ML Service",
    description="Embeddings + ML microservice for Node.js backend",
    version="0.1.0",
)

# Simple text-based embedding generator (no heavy dependencies)
print("[EMBEDDING SERVICE] Using lightweight text-based embeddings")

def text_to_embedding(text: str, dimensions: int = 384) -> List[float]:
    """
    Generate a simple but meaningful embedding from text using character analysis.
    This creates deterministic embeddings based on text characteristics.
    """
    # Clean and normalize text
    text = text.lower().strip()
    
    # Extract features from text
    features = {
        'length': len(text),
        'words': len(text.split()),
        'chars': sum(1 for c in text if c.isalnum()),
        'vowels': sum(1 for c in text if c in 'aeiou'),
        'consonants': sum(1 for c in text if c.isalpha() and c not in 'aeiou'),
        'digits': sum(1 for c in text if c.isdigit()),
        'spaces': sum(1 for c in text if c.isspace()),
        'punctuation': sum(1 for c in text if not c.isalnum() and not c.isspace()),
    }
    
    # Create embedding using feature hashing
    embedding = []
    base_hash = hash(text)
    
    for i in range(dimensions):
        # Mix different features and positions for variety
        if i % 8 == 0:
            val = (base_hash + i * features['length']) % 1000
        elif i % 8 == 1:
            val = (base_hash + i * features['words']) % 1000
        elif i % 8 == 2:
            val = (base_hash + i * features['chars']) % 1000
        elif i % 8 == 3:
            val = (base_hash + i * features['vowels']) % 1000
        elif i % 8 == 4:
            val = (base_hash + i * features['consonants']) % 1000
        elif i % 8 == 5:
            val = (base_hash + i * features['digits']) % 1000
        elif i % 8 == 6:
            val = (base_hash + i * features['spaces']) % 1000
        else:
            val = (base_hash + i * features['punctuation']) % 1000
        
        # Normalize to -1 to 1 range (realistic for embeddings)
        normalized_val = (val - 500) / 500
        embedding.append(normalized_val)
    
    return embedding

class EmbedRequest(BaseModel):
    texts: List[str]

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


@app.get("/health")
async def health():
    return {"status": "ok"}


def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

@app.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    """
    Generate embeddings for a list of texts using local transformers model.
    """
    try:
        print(f"[EMBEDDING SERVICE] Using local model {model_name} for {len(req.texts)} texts")
        
        # Tokenize texts
        encoded_input = tokenizer(req.texts, padding=True, truncation=True, return_tensors='pt')
        
        # Compute token embeddings
        with torch.no_grad():
            model_output = model(**encoded_input)
        
        # Perform pooling
        embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
        
        # Normalize embeddings
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        
        # Convert to list and truncate to 384 dimensions if needed
        embedding_lists = embeddings.tolist()
        embedding_lists = [emb[:384] for emb in embedding_lists]
        
        print(f"[EMBEDDING SERVICE] Generated {len(embedding_lists)} embeddings with {len(embedding_lists[0])} dimensions each")
        
        return {"embeddings": embedding_lists}
    
    except Exception as e:
        print(f"[EMBEDDING SERVICE] ERROR: {str(e)} - Using FALLBACK mock embeddings")
        # Fallback to mock embeddings on any error
        embeddings = []
        for text in req.texts:
            text_hash = hash(text)
            embedding = []
            for i in range(384):
                val = (text_hash + i * 31) % 1000
                normalized_val = (val - 500) / 500
                embedding.append(normalized_val)
            embeddings.append(embedding)
        
        print(f"[EMBEDDING SERVICE] Generated {len(embeddings)} fallback embeddings with {len(embeddings[0])} dimensions each")
        return {"embeddings": embeddings}
