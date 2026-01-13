import { Controller, Post, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFiles, BadRequestException, Get, Query } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { LlmService } from './llm.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { join } from 'path';
import { retrieveTextFromPDF } from './helpers';

export class ChatRequestDto {
  message: string;
}

export class ChatResponseDto {
  response: string;
  context?: any[];
}

export class UploadResponseDto {
  success: boolean;
  message: string;
  documentId?: string;
  chunksStored?: number;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) { }

  @Post('upload-pdf')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'files', maxCount: 5 }
    ], {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5,
      },
    })
  )
  async uploadPdf(
    @UploadedFiles() files: { files?: UploadedFile[] }
  ): Promise<UploadResponseDto> {
    try {
      if (!files?.files || files.files.length === 0) {
        throw new BadRequestException('At least one PDF file is required');
      }

      const results: Array<{
        documentId?: string;
        filename: string;
        chunksStored?: number;
        success: boolean;
        error?: any;
      }> = [];

      for (const file of files.files) {
        console.log(`[Controller] Processing PDF: ${file.originalname}`);

        try {
          // Extract text from PDF
          const pdfChunks = await retrieveTextFromPDF(file);
          const pdfText = pdfChunks.join('\n\n'); // Join chunks into single text
          console.log(`[Controller] Extracted ${pdfText.length} characters from PDF`);

          // Generate document ID
          const documentId = `doc_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`;

          // Process and store as vectors
          const result = await this.llmService.processAndStoreDocument(
            documentId,
            pdfText,
            {
              filename: file.originalname,
              fileSize: file.size,
              uploadDate: new Date().toISOString()
            }
          );

          results.push({
            documentId,
            filename: file.originalname,
            chunksStored: result.chunksStored,
            success: true
          });

          console.log(`[Controller] Successfully stored ${result.chunksStored} chunks for ${file.originalname}`);

        } catch (error) {
          console.error(`[Controller] Failed to process PDF ${file.originalname}:`, error);
          results.push({
            filename: file.originalname,
            success: false,
            error: error.message
          });
        }
      }

      const successfulUploads = results.filter(r => r.success);

      return {
        success: successfulUploads.length > 0,
        message: `Successfully processed ${successfulUploads.length} out of ${files.files.length} PDFs`,
        documentId: successfulUploads[0]?.documentId,
        chunksStored: successfulUploads.reduce((sum, r) => sum + (r.chunksStored || 0), 0)
      };

    } catch (error) {
      console.error('[Controller] Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'files', maxCount: 5 }
    ], {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5,
      },
    })
  )
  async chat(
    @UploadedFiles() files: { files?: UploadedFile[] },
    @Body() body: any
  ): Promise<ChatResponseDto> {
    try {
      // Extract message from body
      const message = body?.message || body?.get?.('message');
      if (!message || message.trim() === '') {
        throw new BadRequestException('Message is required');
      }

      console.log(`[Controller] Chat message: ${message}`);

      // Process files if provided
      let documentIds: string[] = [];
      if (files?.files && files.files.length > 0) {
        console.log(`[Controller] Processing ${files.files.length} files with chat message`);

        for (const file of files.files) {
          try {
            // Extract text from PDF
            const pdfChunks = await retrieveTextFromPDF(file);
            const pdfText = pdfChunks.join('\n\n');
            console.log(`[Controller] Extracted ${pdfText.length} characters from PDF`);

            // Generate document ID
            const documentId = `chat_doc_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`;

            // Process and store as vectors
            const result = await this.llmService.processAndStoreDocument(
              documentId,
              pdfText,
              {
                filename: file.originalname,
                fileSize: file.size,
                uploadDate: new Date().toISOString()
              }
            );

            documentIds.push(documentId);
            console.log(`[Controller] Successfully stored ${result.chunksStored} chunks for ${file.originalname}`);

          } catch (error) {
            console.error(`[Controller] Failed to process PDF ${file.originalname}:`, error);
            // Continue with other files even if one fails
          }
        }
      }

      // Search for relevant context
      const contextResults = await this.llmService.searchSimilarDocuments(message, 5);
      console.log(`[Controller] Found ${contextResults.length} context results`);

      // Build enhanced prompt with context
      let enhancedMessage = message;

      if (contextResults && contextResults.length > 0) {
        const contextText = contextResults
          .map((doc, index) => `[Context ${index + 1}]: ${doc.content}`)
          .join('\n\n');

        enhancedMessage = `Context information:\n${contextText}\n\nUser question: ${message}\n\nPlease answer based on the provided context.`;
        console.log(`[Controller] Using ${contextResults.length} context chunks`);
      } else {
        console.log('[Controller] No relevant context found, using original message');
      }

      // Get response from LLM
      const response = await this.llmService.fetchResponsefromLLM(enhancedMessage);

      return {
        response,
        context: contextResults || []
      };

    } catch (error) {
      console.error('[Controller] Chat error:', error);
      throw new Error(`Chat service error: ${error?.message}`);
    }
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchContext(@Query('q') query: string, @Query('limit') limit: number = 5) {
    try {
      if (!query || query.trim() === '') {
        throw new BadRequestException('Query parameter is required');
      }

      const results = await this.llmService.searchSimilarDocuments(query, limit);
      return { results, query, count: results.length };

    } catch (error) {
      console.error('[Controller] Search error:', error);
      throw new Error(`Search service error: ${error?.message}`);
    }
  }

  @Get('debug/documents')
  @HttpCode(HttpStatus.OK)
  async debugStoredDocuments() {
    try {
      const documents = await this.llmService.debugStoredDocuments();
      return { documents, count: documents.length };

    } catch (error) {
      console.error('[Controller] Debug documents error:', error);
      throw new Error(`Debug service error: ${error?.message}`);
    }
  }

  @Get('debug/search')
  @HttpCode(HttpStatus.OK)
  async debugSearch(@Query('q') query: string) {
    try {
      if (!query || query.trim() === '') {
        throw new BadRequestException('Query parameter is required');
      }

      const results = await this.llmService.debugSearch(query);
      return { results, query };

    } catch (error) {
      console.error('[Controller] Debug search error:', error);
      throw new Error(`Debug search service error: ${error?.message}`);
    }
  }
}
