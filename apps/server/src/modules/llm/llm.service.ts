import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';
import { VectorService } from '../vector/vector.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

@Injectable()
export class LlmService {

    constructor(
        private readonly configService: ConfigService,
        private readonly vectorService: VectorService
    ) {
        console.log('[LLM Service] Constructor called - VectorService injected');
    }

    // Initialize LangChain text splitter
    private textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ['\n\n', '\n', ' ', ''],
    });

    // Check if Python embedding service is available
    private checkPythonServiceHealth = async () => {
        try {
            const response = await fetch('http://localhost:8000/health');
            return response.ok;
        } catch (error) {
            console.error('Python embedding service not available:', error);
            return false;
        }
    };

    fetchResponsefromLLM = async (userPrompt: string) => {
        const client = new Groq({
            apiKey: this.configService.get('GROQ_API_KEY'),
        });
        const data = await client.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "user", content: userPrompt },
                {
                    role: 'user', content: `
        You are a travel itinerary designer for a web app.
        Your job:
        - Given a destination, number of days, and preferences, create an engaging, well-structured itinerary.
        - RETURN ONLY HTML that can be directly rendered in a browser.
        - DO NOT return JSON, markdown, plain text, <think>, or any reasoning.
        - DO NOT include <html>, <head>, or <body> tags.
        - DO NOT include any <script> tags.

        Design rules:
        - Wrap everything in a single <section> root.
        - Use modern, clean, mobile-friendly layout.
        - Use semantic tags: <section>, <header>, <article>, <ul>, <li>, <time>, <span>.
        - Use classes (not inline styles) so the frontend can style it with Tailwind or CSS.
        - Use small emojis to make it fun (🏖️, 🍽️, 🚌, ✨ etc.), but don't overdo it.
        - Make key parts scannable: headings, tags/chips, dividers.
        - Include:
        - Trip title and destination
        - Short summary
        - Per-day breakdown with morning / afternoon / evening
        - Highlighted “Must-try food”
        - “Local tips & safety” section
        - A small “Trip snapshot” summary (budget level, vibe, best for)

        Example structure (you MUST follow this structure, just change the content and add more similar sections if needed):

        <section class="trip-itinerary">
        <header class="trip-header">
            <h1>...</h1>
            <p class="trip-tagline">...</p>
            <div class="trip-tags">
            <span class="tag">Beach</span>
            <span class="tag">Nightlife</span>
            <span class="tag">Culture</span>
            </div>
        </header>

        <section class="trip-summary">...</section>

        <section class="trip-days">
            <article class="day-card">
            <h2>Day 1 - Title</h2>
            <div class="day-block">
                <h3>🌅 Morning</h3>
                <ul>
                <li>
                    <time>08:00-10:00</time>
                    <div class="activity">
                    <strong>Activity name</strong>
                    <p class="location">Location</p>
                    <p class="details">Short description...</p>
                    </div>
                </li>
                </ul>
            </div>
            <!-- Afternoon / Evening similarly -->
            </article>
            <!-- Day 2 / Day 3 ... -->
        </section>

        <section class="trip-food">...</section>
        <section class="trip-tips">...</section>
        </section>
        `}
            ]
        });
        const content = data.choices[0].message.content;
        if (content) {
            return content;
        }
        throw new Error('No response content received from LLM');
    };


    createVectorEmbeddingsForFiles = async (content: string[]) => {
        try {
            // Check if Python service is available
            const isHealthy = await this.checkPythonServiceHealth();
            if (!isHealthy) {
                throw new Error('Python embedding service is not running on localhost:8000');
            }

            // Call Python embedding service
            const response = await fetch('http://localhost:8000/embed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    texts: content
                })
            });

            if (!response.ok) {
                throw new Error(`Python service error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Embeddings generated:', data.embeddings.length, 'vectors of', data.embeddings[0]?.length, 'dimensions');

            return data.embeddings;
        } catch (error) {
            console.error('Error calling Python embedding service:', error);
            throw new Error('Failed to generate embeddings');
        }
    }

    /**
     * Process PDF content and store embeddings in Supabase
     */
    processAndStoreDocument = async (documentId: string, content: string, metadata?: any) => {
        try {
            console.log(`[LLM Service] Processing document: ${documentId}`);
            console.log(`[LLM Service] Content length: ${content.length} characters`);

            // Use LangChain text splitter for better chunking
            const chunks = await this.textSplitter.splitText(content);
            console.log(`[LLM Service] Split into ${chunks.length} chunks`);

            // Generate embeddings for all chunks
            console.log(`[LLM Service] Generating embeddings for ${chunks.length} chunks...`);
            const embeddings = await this.createVectorEmbeddingsForFiles(chunks);
            console.log(`[LLM Service] Generated ${embeddings.length} embeddings`);
            console.log(`[LLM Service] Embedding dimensions: ${embeddings[0]?.length}`);

            // Prepare document chunks for storage
            const documentChunks = chunks.map((chunk, index) => ({
                id: `${documentId}_chunk_${index}`,
                content: chunk,
                embedding: embeddings[index],
                metadata: {
                    ...metadata,
                    documentId,
                    chunkIndex: index,
                    totalChunks: chunks.length,
                    chunkSize: chunk.length
                }
            }));

            console.log(`[LLM Service] Prepared ${documentChunks.length} chunks for storage`);
            console.log(`[LLM Service] First chunk ID: ${documentChunks[0]?.id}`);

            // Store in Supabase
            console.log(`[LLM Service] Storing chunks in Supabase...`);
            await this.vectorService.storeDocumentChunks(documentChunks);
            console.log(`[LLM Service] Successfully stored chunks in Supabase`);

            return {
                documentId,
                chunksStored: documentChunks.length,
                embeddingDimensions: embeddings[0]?.length,
                averageChunkSize: Math.round(chunks.reduce((acc, chunk) => acc + chunk.length, 0) / chunks.length)
            };
        } catch (error) {
            console.error('[LLM Service] Error processing document:', error);
            console.error('[LLM Service] Full error details:', JSON.stringify(error, null, 2));
            throw error;
        }
    }

    /**
     * Search for similar documents
     */
    searchSimilarDocuments = async (query: string, limit: number = 5) => {
        try {
            console.log(`[LLM Service] Searching for: "${query}"`);

            // Generate embedding for the query
            const queryEmbeddings = await this.createVectorEmbeddingsForFiles([query]);
            const queryEmbedding = queryEmbeddings[0];

            console.log(`[LLM Service] Generated query embedding with ${queryEmbedding.length} dimensions`);
            console.log(`[LLM Service] First 5 values: [${queryEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);

            // Search for similar documents
            const results = await this.vectorService.searchSimilarDocuments(queryEmbedding, limit);

            console.log(`[LLM Service] Search returned ${results?.length || 0} results`);
            if (results && results.length > 0) {
                console.log(`[LLM Service] First result: ${results[0].content?.substring(0, 100)}...`);
            }

            return results;
        } catch (error) {
            console.error('Error searching documents:', error);
            throw error;
        }
    }

    /**
     * Debug method to check stored documents
     */
    debugStoredDocuments = async () => {
        try {
            console.log('[LLM Service] Debug: Checking stored documents...');
            const documents = await this.vectorService.getAllDocuments();
            return documents;
        } catch (error) {
            console.error('Error debugging stored documents:', error);
            throw error;
        }
    }

    /**
     * Debug method to test search with different thresholds
     */
    debugSearch = async (query: string) => {
        try {
            console.log(`[LLM Service] Debug: Testing search for "${query}"`);

            // Generate embedding for the query
            const queryEmbeddings = await this.createVectorEmbeddingsForFiles([query]);
            const queryEmbedding = queryEmbeddings[0];

            // Test with different thresholds
            const results = await this.vectorService.debugSearch(queryEmbedding);
            return results;
        } catch (error) {
            console.error('Error debugging search:', error);
            throw error;
        }
    }
}
