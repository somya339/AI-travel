import { useState, useRef } from 'react';
import styles from './pdf-upload.module.css';

type UploadResponse = {
    success: boolean;
    message: string;
    documentId?: string;
    chunksStored?: number;
};

type PdfUploadProps = {
    onUploadComplete: (response: UploadResponse) => void;
    onBackToChat: () => void;
};

export function PdfUpload({ onUploadComplete, onBackToChat }: PdfUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return;

        const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
        setSelectedFiles(pdfFiles);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const uploadFiles = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            const response = await fetch('/api/llm/upload-pdf', {
                method: 'POST',
                body: formData,
            });

            const result: UploadResponse = await response.json();

            if (result.success) {
                onUploadComplete(result);
                setSelectedFiles([]);
                setUploadProgress(100);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setIsUploading(false);
            setTimeout(() => setUploadProgress(0), 2000);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={styles.uploadContainer}>
            <header className={styles.uploadHeader}>
                <button
                    className={styles.backButton}
                    onClick={onBackToChat}
                >
                    ← Back to Chat
                </button>
                <h1 className={styles.uploadTitle}>Upload PDFs for Context</h1>
                <p className={styles.uploadDescription}>
                    Upload PDF documents to add them to the AI's knowledge base.
                    The AI will use these documents to provide better context in conversations.
                </p>
            </header>

            <div className={styles.uploadArea}>
                <div
                    className={styles.dropZone}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                    <div className={styles.dropContent}>
                        <div className={styles.uploadIcon}>📄</div>
                        <div className={styles.uploadText}>
                            {selectedFiles.length === 0 ? (
                                <>
                                    <h3>Drop PDFs here or click to browse</h3>
                                    <p>Maximum file size: 10MB</p>
                                </>
                            ) : (
                                <>
                                    <h3>{selectedFiles.length} PDF(s) selected</h3>
                                    <button
                                        className={styles.uploadButton}
                                        onClick={uploadFiles}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? 'Uploading...' : 'Upload & Process'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className={styles.fileInput}
                    />
                </div>

                {selectedFiles.length > 0 && (
                    <div className={styles.fileList}>
                        <h4>Selected Files:</h4>
                        {selectedFiles.map((file, index) => (
                            <div key={index} className={styles.fileItem}>
                                <div className={styles.fileInfo}>
                                    <span className={styles.fileName}>{file.name}</span>
                                    <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                                </div>
                                <button
                                    className={styles.removeButton}
                                    onClick={() => removeFile(index)}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {isUploading && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            </div>
            <p className={styles.progressText}>
              Processing PDFs and generating embeddings...
            </p>
          </div>
        )}
        </div>

      {
        selectedFiles.length > 0 && (
            <div className={styles.uploadActions}>
                <button
                    className={styles.clearButton}
                    onClick={() => setSelectedFiles([])}
                >
                    Clear All
                </button>
            </div>
        )
    }
    </div >
  );
}
