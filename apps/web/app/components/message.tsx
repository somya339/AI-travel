import type { ReactNode } from 'react';
import styles from './message.module.css';

type MessageRole = 'user' | 'assistant';

type MessageProps = {
  role: MessageRole;
  content: string;
  timestamp?: string;
};

export function Message({ role, content, timestamp }: MessageProps) {
  return (
    <div className={`${styles.message} ${styles[role]}`}>
      <div className={styles.messageBubble}>
        <div className={styles.messageContent}>
          {content}
        </div>
        {timestamp && (
          <div className={styles.messageTimestamp}>
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}
