import { Controller, Post, Body, Get, Query, Delete, Param, HttpStatus, HttpException } from '@nestjs/common';
import { VectorService } from './vector.service';

@Controller('vector')
export class VectorController {
  constructor(private readonly vectorService: VectorService) {}

  @Post('store')
  async storeDocuments(@Body() body: { 
    documentId: string; 
    content: string; 
    metadata?: any 
  }) {
    // This would be called by your document processing service
    // For now, this is a placeholder - the actual storage happens in LlmService
    return { message: 'Use LlmService.processAndStoreDocument() instead' };
  }

  @Get('search')
  async searchDocuments(@Query('query') query: string, @Query('limit') limit: number = 5) {
    try {
      if (!query) {
        throw new HttpException('Query parameter is required', HttpStatus.BAD_REQUEST);
      }
      
      // Note: This endpoint needs embeddings generated first
      // For now, return a message indicating the proper usage
      return { 
        message: 'Use LlmService.searchSimilarDocuments() instead',
        query,
        limit
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('document/:id')
  async getDocument(@Param('id') id: string) {
    try {
      const document = await this.vectorService.getDocument(id);
      return { document };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('document/:id')
  async deleteDocument(@Param('id') id: string) {
    try {
      await this.vectorService.deleteDocumentChunks([id]);
      return { message: 'Document deleted successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
