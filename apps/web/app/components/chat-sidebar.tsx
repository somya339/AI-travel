import type { ReactNode } from 'react';
import styles from './chat-sidebar.module.css';

type Conversation = {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
};

type ChatSidebarProps = {
  conversations: Conversation[];
  currentConversation: string;
  onConversationSelect: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
};

export function ChatSidebar({
  conversations,
  currentConversation,
  onConversationSelect,
  isOpen,
  onToggle
}: ChatSidebarProps) {
  return (
    <>
      <button 
        className={styles.sidebarToggle}
        onClick={onToggle}
      >
        ☰
      </button>
      
      <aside className={`${styles.sidebar} ${!isOpen ? styles.sidebarClosed : ''}`}>
        <div className={styles.sidebarHeader}>
          <button className={styles.newChatButton}>
            <span className={styles.newChatIcon}>+</span>
            New Chat
          </button>
        </div>
        
        <div className={styles.conversationsList}>
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`${styles.conversationItem} ${
                currentConversation === conversation.id ? styles.active : ''
              }`}
              onClick={() => onConversationSelect(conversation.id)}
            >
              <div className={styles.conversationTitle}>
                {conversation.title}
              </div>
              <div className={styles.conversationPreview}>
                {conversation.preview}
              </div>
              <div className={styles.conversationTimestamp}>
                {conversation.timestamp}
              </div>
            </button>
          ))}
        </div>
        
        <div className={styles.sidebarFooter}>
          <button className={styles.settingsButton}>
            ⚙️ Settings
          </button>
        </div>
      </aside>
    </>
  );
}
