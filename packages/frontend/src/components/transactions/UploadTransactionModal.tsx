import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, File, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { getConfig } from '../../config';

export type TransactionFormData = {
  transaction_type: 'income' | 'expense';
  merchant: string;
  amount: string;
  currency: string;
  category: string;
  transaction_date: string;
};

interface UploadTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: TransactionFormData) => void;
  onError: (error: string) => void;
}

// File validation constants (matching existing infrastructure)
const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/webp',
  'application/pdf'
];

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export function UploadTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: UploadTransactionModalProps) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return t('upload.errors.unsupportedType', 'Unsupported file type. Please upload PDF or image files.');
    }

    const maxSize = file.type === 'application/pdf' ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return t('upload.errors.fileTooLarge', `File too large. Maximum size is ${maxSizeMB}MB.`);
    }

    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setUploadState('error');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setUploadState('idle');
  }, [t]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const uploadFile = async () => {
    if (!selectedFile) return;

    if (!session?.access_token) {
      setErrorMessage('Authentication required');
      setUploadState('error');
      onError('Authentication required');
      return;
    }

    setUploadState('uploading');

    try {
      // Get the Supabase functions URL using the same approach as gmail service
      const config = await getConfig();
      const functionsUrl = `${config.supabase.url.replace(/\/+$/, '')}/functions/v1/process-document`;

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      setUploadState('processing');

      const result = await response.json();

      if (result.success && result.transaction) {
        setUploadState('success');
        // Transaction was already saved to database, just close the modal
        setTimeout(() => {
          onClose();
          resetModal();
        }, 2000);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(errorMsg);
      setUploadState('error');
      onError(errorMsg);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setErrorMessage('');
    setDragActive(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <File className="w-8 h-8 text-red-500" />;
    }
    return <File className="w-8 h-8 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {t('upload.title', 'Upload Document')}
                </h2>
                <button
                  onClick={handleClose}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 hover:bg-gray-100 rounded-lg"
                  disabled={uploadState === 'uploading' || uploadState === 'processing'}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {/* Upload Area */}
                {!selectedFile ? (
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-gray-300 hover:border-[var(--primary)]'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                      {t('upload.dragDrop', 'Drag and drop your document here')}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      {t('upload.supportedFormats', 'Supports PDF and image files (JPG, PNG, etc.)')}
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
                    >
                      {t('upload.selectFile', 'Select File')}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={SUPPORTED_TYPES.join(',')}
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </div>
                ) : (
                  /* File Preview */
                  <div className="border rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center gap-3">
                      {getFileIcon(selectedFile)}
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)] truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        disabled={uploadState === 'uploading' || uploadState === 'processing'}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {uploadState === 'error' && errorMessage && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                )}

                {uploadState === 'success' && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-700">
                      {t('upload.success', 'Document processed successfully!')}
                    </p>
                  </div>
                )}

                {/* Processing Indicator */}
                {(uploadState === 'uploading' || uploadState === 'processing') && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Loader className="w-5 h-5 text-blue-500 flex-shrink-0 animate-spin" />
                    <p className="text-sm text-blue-700">
                      {uploadState === 'uploading'
                        ? t('upload.uploading', 'Uploading document...')
                        : t('upload.processing', 'Analyzing document with AI...')}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={uploadState === 'uploading' || uploadState === 'processing'}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gray-100 text-[var(--text-primary)] font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={uploadFile}
                  disabled={!selectedFile || uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'success'}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploadState === 'uploading' && <Loader className="w-4 h-4 animate-spin" />}
                  {uploadState === 'processing' && <Loader className="w-4 h-4 animate-spin" />}
                  {t('upload.analyze', 'Analyze Document')}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
