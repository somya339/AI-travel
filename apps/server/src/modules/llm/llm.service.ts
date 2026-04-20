import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';
import { VectorService } from '../vector/vector.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import OpenAI from 'openai';

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

    private getOpenAIClient = () => {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set');
        }
        return new OpenAI({ apiKey });
    };

    private normalizeItineraryMarkdown = (raw: string) => {
        let text = (raw ?? '').trim();

        text = text.replace(/^```(?:md|markdown)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        text = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').trim();
        text = text.replace(/<\/?(?:html|head|body)[^>]*>/gi, '').trim();

        return text;
    };

    fetchResponsefromLLM = async (userPrompt: string) => {
        const client = new Groq({
            apiKey: this.configService.get('GROQ_API_KEY'),
        });
        const data = await client.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: 'system',
                    content: `You are a travel itinerary designer for a web app.

                    Output requirements (STRICT):
                    - Return ONLY Markdown (.md).
                    - Do NOT return HTML, JSON, or any explanations.
                    - Do NOT wrap the answer in code fences.
                    - Do NOT include any <script> tags.

                    Design rules:
                    - Use modern, clean, mobile-friendly layout.
                    - Use clear headings, short paragraphs, and bullet lists.
                    - Use small emojis (🏖️ 🍽️ 🚌 ✨) but do not overuse.
                    - Make key parts scannable: headings, tags/chips, dividers.

                    Must include:
                    - Trip title and destination
                    - Short summary
                    - Per-day breakdown (morning / afternoon / evening)
                    - Highlighted “Must-try food”
                    - “Local tips & safety”
                    - “Trip snapshot” (budget level, vibe, best for)

                    You MUST follow this Markdown structure (expand content as needed but keep the same structure):

                    # Trip title — Destination
                    _Short tagline_

                    Tags: 'Beach', 'Nightlife', 'Culture'

                    ## Trip summary
                    - ...

                    ## Day-by-day plan
                    ### Day 1 — Title
                    #### 🌅 Morning
                    - **08:00-10:00** — **Activity name** (Location)
                    - Short description...

                    #### ☀️ Afternoon
                    - ...

                    #### 🌙 Evening
                    - ...

                    ## 🍽️ Must-try food
                    - ...

                    ## 🧭 Local tips & safety
                    - ...

                    ## 📌 Trip snapshot
                    - **Budget level:** ...
                    - **Vibe:** ...
                    - **Best for:** ...`
                },
                { role: 'user', content: userPrompt },
            ]
        });
        const content = data.choices[0].message.content;
        if (content) {
            return this.normalizeItineraryMarkdown(content);
        }
        throw new Error('No response content received from LLM');
    };


    createVectorEmbeddingsForFiles = async (content: string[]) => {
        try {
            const client = this.getOpenAIClient();
            const model = this.configService.get<string>('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';

            const response = await client.embeddings.create({
                model,
                input: content,
            });

            const embeddings = response.data.map((d) => d.embedding);
            console.log('Embeddings generated:', embeddings.length, 'vectors of', embeddings[0]?.length, 'dimensions');
            return embeddings;
        } catch (error) {
            console.error('Error generating embeddings via OpenAI:', error);
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
