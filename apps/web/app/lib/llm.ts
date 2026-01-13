const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface LLMResponse {
  response: string;
}

export interface LLMRequest {
  message: string;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export async function sendChatMessage(message: string, attachments?: FileAttachment[]): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('message', message);
    
    // Convert file URLs back to files for upload
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          const response = await fetch(attachment.url);
          const blob = await response.blob();
          const file = new File([blob], attachment.name, { type: attachment.type });
          formData.append('files', file);
        } catch (error) {
          console.error('Error fetching file:', attachment.name, error);
        }
      }
    }

    const response = await fetch(`${API_BASE}/llm/chat`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: LLMResponse = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}
