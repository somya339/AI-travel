import { useState, useRef, useEffect } from 'react';
import { Message } from './message';
import styles from './chat-area.module.css';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

type Conversation = {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  messages: Message[];
};

type ChatAreaProps = {
  conversation: Conversation | undefined;
  messages: Message[];
  onSendMessage: (content: string) => void;
  sidebarOpen: boolean;
};

export function ChatArea({ conversation, messages, onSendMessage, sidebarOpen }: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Also scroll when typing indicator appears
  useEffect(() => {
    if (isTyping) {
      scrollToBottom();
    }
  }, [isTyping]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    onSendMessage(inputValue);
    setInputValue('');
    setIsTyping(true);
    
    // Reset typing state after assistant response would come
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <main className={`${styles.chatArea} ${!sidebarOpen ? styles.fullWidth : ''}`}>
      <header className={styles.chatHeader}>
        <h1 className={styles.chatTitle}>
          {conversation?.title || 'Select a conversation'}
        </h1>
        <div className={styles.chatActions}>
          <button className={styles.actionButton}>🔄</button>
          <button className={styles.actionButton}>📋</button>
          <button className={styles.actionButton}>⚙️</button>
        </div>
      </header>
      
      <div ref={messagesContainerRef} className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.welcomeMessage}>
            <div className={styles.welcomeIcon}>🌍</div>
            <h2>Welcome to AI Travel Planner</h2>
            <p>Start planning your perfect trip with AI assistance</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Message
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}
            {isTyping && (
              <div className={styles.typingIndicator}>
                <div className={styles.typingBubble}>
                  <div className={styles.typingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <div className={styles.inputContainer}>
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <div className={styles.inputWrapper}>
            <textarea
              ref={textareaRef}
              className={styles.messageInput}
              placeholder="Ask me anything about travel planning..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isTyping}
            />
            <button 
              type="submit"
              className={styles.sendButton}
              disabled={!inputValue.trim() || isTyping}
            >
              <span>Send</span>
              <span className={styles.sendIcon}>→</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
