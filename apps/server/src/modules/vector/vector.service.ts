import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class VectorService {
    private supabase: SupabaseClient;
    private readonly logger = new Logger(VectorService.name);

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase credentials not found in environment variables');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Store document chunks with their embeddings
     */
    async storeDocumentChunks(chunks: Array<{
        id: string;
        content: string;
        embedding: number[];
        metadata?: any;
    }>) {
        try {
            console.log(`[VectorService] Starting to store ${chunks.length} document chunks`);
            
            const documents = chunks.map(chunk => ({
                id: chunk.id,
                content: chunk.content,
                embedding: chunk.embedding,
                metadata: chunk.metadata || {},
                created_at: new Date().toISOString()
            }));

            console.log(`[VectorService] Prepared documents for storage, first doc ID: ${documents[0]?.id}`);
            console.log(`[VectorService] Supabase URL: ${process.env.SUPABASE_URL}`);
            console.log(`[VectorService] Embedding dimensions: ${documents[0]?.embedding?.length}`);

            const { data, error } = await this.supabase
                .from('document_embeddings')
                .upsert(documents, { onConflict: 'id' })
                .select();

            if (error) {
                console.error('[VectorService] Supabase error storing embeddings:', error);
                console.error('[VectorService] Error details:', JSON.stringify(error, null, 2));
                throw error;
            }

            console.log(`[VectorService] Successfully stored ${chunks.length} document chunks with embeddings`);
            console.log(`[VectorService] Returned data count: ${data?.length || 0}`);
            return data;
        } catch (error) {
            console.error('[VectorService] Vector storage error:', error);
            console.error('[VectorService] Full error:', JSON.stringify(error, null, 2));
            throw error;
        }
    }

    /**
     * Search for similar documents using vector similarity
     */
    async searchSimilarDocuments(queryEmbedding: number[], limit: number = 5) {
        try {
            // First try the RPC function
            const { data, error } = await this.supabase
                .rpc('search_documents', {
                    query_embedding: queryEmbedding,
                    similarity_threshold: 0.7,
                    match_count: limit
                });

            if (error) {
                console.error('[VectorService] RPC function error:', error);
                console.log('[VectorService] Falling back to manual similarity search...');
                
                // Fallback: Get all documents and calculate similarity manually
                return this.manualSimilaritySearch(queryEmbedding, limit);
            }

            return data;
        } catch (error) {
            console.error('[VectorService] Search error:', error);
            console.log('[VectorService] Falling back to manual similarity search...');
            
            // Fallback: Get all documents and calculate similarity manually
            return this.manualSimilaritySearch(queryEmbedding, limit);
        }
    }

    /**
     * Manual similarity search fallback (doesn't require RPC function)
     */
    private async manualSimilaritySearch(queryEmbedding: number[], limit: number = 5) {
        try {
            console.log('[VectorService] Performing manual similarity search...');
            
            // Get all documents with embeddings
            const { data: documents, error } = await this.supabase
                .from('document_embeddings')
                .select('id, content, embedding, metadata');

            if (error) {
                console.error('[VectorService] Error fetching documents:', error);
                throw error;
            }

            if (!documents || documents.length === 0) {
                console.log('[VectorService] No documents found in database');
                return [];
            }

            console.log(`[VectorService] Found ${documents.length} documents, calculating similarities...`);

            // Calculate cosine similarity for each document
            const similarities = documents.map(doc => {
                const similarity = this.calculateCosineSimilarity(queryEmbedding, doc.embedding);
                return {
                    id: doc.id,
                    content: doc.content,
                    metadata: doc.metadata,
                    similarity: similarity
                };
            });

            // Sort by similarity and return top results
            const results = similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit)
                .filter(item => item.similarity > 0.3); // Lower threshold for manual search

            console.log(`[VectorService] Manual search found ${results.length} results with similarity > 0.3`);
            
            return results;

        } catch (error) {
            this.logger.error('Manual similarity search error:', error);
            throw error;
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            throw new Error('Vector dimensions must match');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Delete document embeddings by IDs
     */
    async deleteDocumentChunks(ids: string[]) {
        try {
            const { data, error } = await this.supabase
                .from('document_embeddings')
                .delete()
                .in('id', ids);

            if (error) {
                this.logger.error('Error deleting embeddings:', error);
                throw error;
            }

            this.logger.log(`Deleted ${ids.length} document chunks`);
            return data;
        } catch (error) {
            this.logger.error('Vector deletion error:', error);
            throw error;
        }
    }

    /**
     * Get document by ID
     */
    async getDocument(id: string) {
        try {
            const { data, error } = await this.supabase
                .from('document_embeddings')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                this.logger.error('Error getting document:', error);
                throw error;
            }

            return data;
        } catch (error) {
            this.logger.error('Document retrieval error:', error);
            throw error;
        }
    }

    /**
     * Debug method to check all stored documents
     */
    async getAllDocuments() {
        try {
            const { data, error } = await this.supabase
                .from('document_embeddings')
                .select('id, content, metadata, created_at')
                .limit(10);

            if (error) {
                this.logger.error('Error getting all documents:', error);
                throw error;
            }

            console.log(`[VectorService] Found ${data?.length || 0} documents in database`);
            return data;
        } catch (error) {
            this.logger.error('Error getting all documents:', error);
            throw error;
        }
    }

    /**
     * Debug method to test search with lower threshold
     */
    async debugSearch(queryEmbedding: number[], limit: number = 5) {
        try {
            console.log(`[VectorService] Debug search with embedding dimensions: ${queryEmbedding.length}`);
            
            // Try different similarity thresholds
            const thresholds = [0.1, 0.3, 0.5, 0.7];
            const results: Array<{threshold: number, count: number, error?: string, data?: any}> = [];
            
            for (const threshold of thresholds) {
                try {
                    const { data, error } = await this.supabase
                        .rpc('search_documents', {
                            query_embedding: queryEmbedding,
                            similarity_threshold: threshold,
                            match_count: limit
                        });

                    if (error) {
                        console.error(`[VectorService] Search error with threshold ${threshold}:`, error);
                        results.push({ threshold, count: 0, error: error.message });
                    } else {
                        console.log(`[VectorService] Search with threshold ${threshold}: ${data?.length || 0} results`);
                        results.push({ threshold, count: data?.length || 0, data });
                    }
                } catch (e) {
                    console.error(`[VectorService] Search failed with threshold ${threshold}:`, e);
                    results.push({ threshold, count: 0, error: e.message });
                }
            }
            
            return results;
        } catch (error) {
            this.logger.error('Debug search error:', error);
            throw error;
        }
    }
}
