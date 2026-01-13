"""
Local Text Embedding Generator FastAPI Service
Generates vector embeddings from text using sentence-transformers locally
No API calls or LLM services required
"""

import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Union
import json
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LocalEmbeddingGenerator:
    """
    Generate text embeddings locally using sentence-transformers
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize the embedding generator
        
        Args:
            model_name: Name of the sentence-transformer model
                       Popular options:
                       - 'all-MiniLM-L6-v2' (384 dim, fast, good for general use)
                       - 'all-mpnet-base-v2' (768 dim, slower, more accurate)
                       - 'paraphrase-MiniLM-L6-v2' (384 dim, good for semantic similarity)
        """
        logger.info(f"Loading model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.model_name = model_name
        self.embedding_dimension = self.model.get_sentence_embedding_dimension()
        logger.info(f"Model loaded successfully. Embedding dimension: {self.embedding_dimension}")
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text
        
        Args:
            text: Input text string
            
        Returns:
            numpy array of the embedding vector
        """
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding
    
    def generate_embeddings_batch(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Generate embeddings for multiple texts efficiently
        
        Args:
            texts: List of text strings
            batch_size: Number of texts to process at once
            
        Returns:
            numpy array of shape (n_texts, embedding_dim)
        """
        embeddings = self.model.encode(
            texts, 
            batch_size=batch_size,
            convert_to_numpy=True,
            show_progress_bar=False  # Disable for API use
        )
        return embeddings
    
    def cosine_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score between -1 and 1
        """
        return np.dot(embedding1, embedding2) / (np.linalg.norm(embedding1) * np.linalg.norm(embedding2))
    
    def find_most_similar(self, query: str, texts: List[str], top_k: int = 5) -> List[tuple]:
        """
        Find most similar texts to a query
        
        Args:
            query: Query text
            texts: List of texts to search
            top_k: Number of top results to return
            
        Returns:
            List of tuples (text, similarity_score)
        """
        query_embedding = self.generate_embedding(query)
        text_embeddings = self.generate_embeddings_batch(texts)
        
        similarities = []
        for i, text_emb in enumerate(text_embeddings):
            sim = self.cosine_similarity(query_embedding, text_emb)
            similarities.append((texts[i], float(sim)))
        
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]

# Initialize FastAPI app
app = FastAPI(
    title="Embedding Service",
    description="Local text embedding generation using sentence-transformers",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Initialize the embedding generator
embedding_generator = LocalEmbeddingGenerator(model_name='all-MiniLM-L6-v2')

# Pydantic models for API
class EmbedRequest(BaseModel):
    texts: List[str]
    batch_size: int = 32

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    model_name: str
    embedding_dimension: int
    num_texts: int

class SimilarityRequest(BaseModel):
    query: str
    texts: List[str]
    top_k: int = 5

class SimilarityResponse(BaseModel):
    query: str
    results: List[dict]
    model_name: str

class HealthResponse(BaseModel):
    status: str
    model_name: str
    embedding_dimension: int
    ready: bool

@app.get("/", response_model=dict)
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Embedding Service",
        "version": "1.0.0",
        "model": embedding_generator.model_name,
        "dimensions": embedding_generator.embedding_dimension,
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_name=embedding_generator.model_name,
        embedding_dimension=embedding_generator.embedding_dimension,
        ready=True
    )

@app.post("/embed", response_model=EmbedResponse)
async def generate_embeddings(request: EmbedRequest):
    """
    Generate embeddings for a list of texts
    
    Args:
        request: EmbedRequest containing texts and optional batch_size
        
    Returns:
        EmbedResponse containing embeddings and metadata
    """
    try:
        logger.info(f"Generating embeddings for {len(request.texts)} texts")
        
        if not request.texts:
            raise HTTPException(status_code=400, detail="No texts provided")
        
        if len(request.texts) > 1000:
            raise HTTPException(status_code=400, detail="Too many texts provided (max 1000)")
        
        # Generate embeddings
        embeddings = embedding_generator.generate_embeddings_batch(
            request.texts, 
            batch_size=request.batch_size
        )
        
        # Convert to list for JSON response
        embedding_lists = embeddings.tolist()
        
        logger.info(f"Successfully generated {len(embedding_lists)} embeddings with {len(embedding_lists[0])} dimensions each")
        
        return EmbedResponse(
            embeddings=embedding_lists,
            model_name=embedding_generator.model_name,
            embedding_dimension=embedding_generator.embedding_dimension,
            num_texts=len(request.texts)
        )
        
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {str(e)}")

@app.post("/similarity", response_model=SimilarityResponse)
async def find_similar_texts(request: SimilarityRequest):
    """
    Find most similar texts to a query
    
    Args:
        request: SimilarityRequest containing query, texts, and top_k
        
    Returns:
        SimilarityResponse containing ranked results
    """
    try:
        logger.info(f"Finding similar texts for query: '{request.query}' among {len(request.texts)} texts")
        
        if not request.query:
            raise HTTPException(status_code=400, detail="Query text is required")
        
        if not request.texts:
            raise HTTPException(status_code=400, detail="No texts provided for search")
        
        if len(request.texts) > 1000:
            raise HTTPException(status_code=400, detail="Too many texts provided (max 1000)")
        
        # Find similar texts
        similar_results = embedding_generator.find_most_similar(
            request.query, 
            request.texts, 
            top_k=request.top_k
        )
        
        # Format results
        results = [
            {
                "text": text,
                "similarity_score": score,
                "rank": i + 1
            }
            for i, (text, score) in enumerate(similar_results)
        ]
        
        logger.info(f"Found {len(results)} similar texts")
        
        return SimilarityResponse(
            query=request.query,
            results=results,
            model_name=embedding_generator.model_name
        )
        
    except Exception as e:
        logger.error(f"Error finding similar texts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to find similar texts: {str(e)}")

@app.post("/single-embed")
async def generate_single_embedding(text: str):
    """
    Generate embedding for a single text (simplified endpoint)
    
    Args:
        text: Single text string to embed
        
    Returns:
        Dictionary containing embedding vector
    """
    try:
        logger.info(f"Generating embedding for single text: '{text[:50]}...'")
        
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Generate embedding
        embedding = embedding_generator.generate_embedding(text)
        
        logger.info(f"Successfully generated embedding with {len(embedding)} dimensions")
        
        return {
            "embedding": embedding.tolist(),
            "model_name": embedding_generator.model_name,
            "embedding_dimension": embedding_generator.embedding_dimension,
            "text_length": len(text)
        }
        
    except Exception as e:
        logger.error(f"Error generating single embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
