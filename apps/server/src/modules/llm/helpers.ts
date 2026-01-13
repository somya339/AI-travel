import { PDFParse } from 'pdf-parse';
import { UploadedFile } from './llm.controller';
import { readFileSync } from 'fs';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const retrieveTextFromPDF = async (file: UploadedFile): Promise<string[]> => {
    try {
        // Use the correct pdf-parse API for server-side
        const fileBuffer = readFileSync(file.path)
        const data = await new PDFParse({ data: fileBuffer }).getText();
        const chunksContent = await createChunksfromFileContent(data.text)
        return chunksContent;
    } catch (error) {
        console.error(`Error extracting text from PDF ${file.originalname}:`, error);
        throw error;
    }
};

export const createChunksfromFileContent = async (content: string) => {

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 100,
    });

    const chunks = await splitter.splitText(content);
    return chunks;
};