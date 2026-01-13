import type { ReactNode } from 'react';
import { ItineraryRenderer } from './itinerary-renderer';
import styles from './message.module.css';

type MessageRole = 'user' | 'assistant';

type MessageAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
};

type MessageProps = {
  role: MessageRole;
  content: string;
  timestamp?: string;
  attachments?: MessageAttachment[];
};

export function Message({ role, content, timestamp, attachments }: MessageProps) {
  // Check if content contains HTML (itinerary response)
  const isHtmlContent = content.includes('<section class="trip-itinerary">') || 
                        content.includes('<section') && 
                        content.includes('</section>');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`${styles.message} ${styles[role]}`}>
      <div className={styles.messageBubble}>
        <div className={styles.messageContent}>
          {isHtmlContent && role === 'assistant' ? (
            <ItineraryRenderer htmlContent={content} />
          ) : (
            content
          )}
        </div>
        {attachments && attachments.length > 0 && (
          <div className={styles.messageAttachments}>
            {attachments.map(attachment => (
              <div key={attachment.id} className={styles.messageAttachment}>
                {attachment.type.startsWith('image/') ? (
                  <img src={attachment.url} alt={attachment.name} className={styles.attachmentImage} />
                ) : (
                  <div className={styles.attachmentFileIcon}>
                    📄
                    <div className={styles.attachmentFileInfo}>
                      <span className={styles.attachmentFileName}>{attachment.name}</span>
                      <span className={styles.attachmentFileSize}>{formatFileSize(attachment.size)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {timestamp && (
          <div className={styles.messageTimestamp}>
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}
