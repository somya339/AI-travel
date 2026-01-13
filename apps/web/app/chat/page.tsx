'use client';

import { useState } from 'react';
import { ChatSidebar } from '../components/chat-sidebar';
import { ChatArea } from '../components/chat-area';
import { PdfUpload } from '../components/pdf-upload';
import { sendChatMessage } from '../lib/llm';
import styles from './chat.module.css';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: FileAttachment[];
};

type FileAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
};

type Conversation = {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  messages: Message[];
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([
    { 
      id: '1', 
      title: 'Paris Trip Planning', 
      preview: 'Let me help you plan your Paris adventure...', 
      timestamp: '2 hours ago',
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'I want to plan a trip to Paris for 5 days',
          timestamp: '2 hours ago'
        },
        {
          id: '2',
          role: 'assistant',
          content: 'I\'d be happy to help you plan your Paris adventure! A 5-day trip to Paris sounds wonderful. Let me suggest some must-see attractions and create an itinerary for you.\n\nDay 1: Eiffel Tower and Seine River Cruise\nDay 2: Louvre Museum and Tuileries Garden\nDay 3: Notre-Dame and Latin Quarter\nDay 4: Versailles Day Trip\nDay 5: Montmartre and Sacré-Cœur\n\nWould you like me to elaborate on any of these days?',
          timestamp: '2 hours ago'
        }
      ]
    },
    { 
      id: '2', 
      title: 'Tokyo Restaurant Recommendations', 
      preview: 'Here are some amazing restaurants in Tokyo...', 
      timestamp: '1 day ago',
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'What are the best restaurants in Tokyo?',
          timestamp: '1 day ago'
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Tokyo has an incredible dining scene! Here are my top recommendations:\n\n🍱 Sukiyabashi Jiro - World-famous sushi\n🍜 Ichiran - Famous ramen chain\n🥩 Aragawa - Premium wagyu beef\n🍤 Tempura Kondo - Michelin-starred tempura\n\nWhat type of cuisine are you most interested in?',
          timestamp: '1 day ago'
        }
      ]
    },
    { 
      id: '3', 
      title: 'Budget Travel Tips', 
      preview: 'For budget-friendly travel, consider these options...', 
      timestamp: '3 days ago',
      messages: []
    },
  ]);
  
  const [currentConversation, setCurrentConversation] = useState('1');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentChat = conversations.find(c => c.id === currentConversation);

  const handleSendMessage = async (content: string, attachments?: FileAttachment[]) => {
    if (!content.trim() && !attachments) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: 'Just now',
      attachments: attachments && attachments.length > 0 ? attachments : undefined
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConversation) {
        const updatedMessages = [...conv.messages, userMessage];
        return {
          ...conv,
          messages: updatedMessages,
          preview: content.trim().substring(0, 50) + '...',
          timestamp: 'Just now'
        };
      }
      return conv;
    }));

    try {
      // Call the real LLM API with files
      const assistantResponse = await sendChatMessage(content, attachments);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: 'Just now'
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversation) {
          return {
            ...conv,
            messages: [...conv.messages, userMessage, assistantMessage]
          };
        }
        return conv;
      }));
    } catch (error) {
      console.error('Error getting LLM response:', error);
      
      // Fallback message in case of error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again later.',
        timestamp: 'Just now'
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversation) {
          return {
            ...conv,
            messages: [...conv.messages, userMessage, errorMessage]
          };
        }
        return conv;
      }));
    }
  };

  return (
    <div className={styles.chatContainer}>
      <ChatSidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onConversationSelect={setCurrentConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <ChatArea
        conversation={currentChat}
        messages={currentChat?.messages || []}
        onSendMessage={handleSendMessage}
        sidebarOpen={sidebarOpen}
      />
    </div>
  );
}
