import { useState, useRef, useEffect } from 'react';
import { Message } from './message';
import styles from './chat-area.module.css';

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

type ChatAreaProps = {
  conversation: Conversation | undefined;
  messages: Message[];
  onSendMessage: (content: string, attachments?: FileAttachment[]) => void;
  sidebarOpen: boolean;
};

export function ChatArea({ conversation, messages, onSendMessage, sidebarOpen }: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if ((!inputValue.trim() && attachments.length === 0) || isTyping) return;

    onSendMessage(inputValue, attachments.length > 0 ? attachments : undefined);
    setInputValue('');
    setAttachments([]);
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

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const newAttachments: FileAttachment[] = [];
    
    Array.from(files).forEach(file => {
      if (validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024) { // 10MB limit
        const url = URL.createObjectURL(file);
        newAttachments.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          size: file.size,
          url
        });
      }
    });
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                attachments={message.attachments}
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
          {attachments.length > 0 && (
            <div className={styles.attachmentsPreview}>
              {attachments.map(attachment => (
                <div key={attachment.id} className={styles.attachmentItem}>
                  {attachment.type.startsWith('image/') ? (
                    <img src={attachment.url} alt={attachment.name} className={styles.attachmentPreview} />
                  ) : (
                    <div className={styles.attachmentIcon}>📄</div>
                  )}
                  <div className={styles.attachmentInfo}>
                    <span className={styles.attachmentName}>{attachment.name}</span>
                    <span className={styles.attachmentSize}>{formatFileSize(attachment.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className={styles.removeAttachment}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
          <div 
            className={`${styles.inputWrapper} ${dragActive ? styles.dragActive : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className={styles.fileInput}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.attachButton}
              title="Attach files (PDF, images)"
            >
              📎
            </button>
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
              disabled={(!inputValue.trim() && attachments.length === 0) || isTyping}
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
