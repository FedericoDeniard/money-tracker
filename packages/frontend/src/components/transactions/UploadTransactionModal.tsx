import { useState, useCallback, useEffect } from "react";
import {
  X,
  Upload,
  File,
  AlertCircle,
  CheckCircle,
  Loader,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { uploadDocumentForAnalysis } from "../../services/document-upload.service";

export type TransactionFormData = {
  transaction_type: "income" | "expense";
  merchant: string;
  amount: string;
  currency: string;
  category: string;
  transaction_date: string;
};

interface UploadTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

// File validation constants (matching existing infrastructure)
const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/webp",
  "application/pdf",
];

type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

const FILE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function UploadTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: UploadTransactionModalProps) {
  const { t, i18n } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [pasteSuccessMessage, setPasteSuccessMessage] = useState("");

  const isProcessing =
    uploadState === "uploading" || uploadState === "processing";

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return t(
        "upload.errors.unsupportedType",
        "Unsupported file type. Please upload PDF or image files."
      );
    }
    const maxSize =
      file.type === "application/pdf" ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return t(
        "upload.errors.fileTooLarge",
        `File too large. Maximum size is ${maxSizeMB}MB.`
      );
    }
    return null;
  };

  const createClipboardFile = useCallback((blob: Blob): File | null => {
    if (!blob.type || !SUPPORTED_TYPES.includes(blob.type)) {
      return null;
    }

    const extension = FILE_EXTENSION_BY_MIME[blob.type] ?? "bin";
    const generatedName = `pasted-document-${Date.now()}.${extension}`;
    return new File([blob], generatedName, { type: blob.type });
  }, []);

  const getFileFromClipboardData = useCallback(
    (clipboardData: DataTransfer | null): File | null => {
      if (!clipboardData) {
        return null;
      }

      if (clipboardData.files.length > 0 && clipboardData.files[0]) {
        const firstFile = clipboardData.files[0];
        if (SUPPORTED_TYPES.includes(firstFile.type)) {
          return firstFile;
        }
      }

      for (const item of Array.from(clipboardData.items)) {
        if (item.kind !== "file") {
          continue;
        }
        const file = item.getAsFile();
        if (!file) {
          continue;
        }
        if (SUPPORTED_TYPES.includes(file.type)) {
          return file;
        }
      }

      return null;
    },
    []
  );

  const handleFileSelect = useCallback(
    (file: File, source: "file" | "clipboard" = "file") => {
      const validationError = validateFile(file);
      if (validationError) {
        setErrorMessage(validationError);
        setUploadState("error");
        setPasteSuccessMessage("");
        return;
      }
      setSelectedFile(file);
      setErrorMessage("");
      setUploadState("idle");
      setPasteSuccessMessage(
        source === "clipboard"
          ? t("upload.paste.success", "Image pasted successfully.")
          : ""
      );
    },
    [t]
  );

  const handlePasteFromClipboard = useCallback(async () => {
    if (isProcessing || selectedFile) {
      return;
    }

    if (!navigator.clipboard?.read) {
      setErrorMessage(
        t(
          "upload.errors.clipboardNotSupported",
          "Clipboard read is not supported in this browser."
        )
      );
      setUploadState("error");
      setPasteSuccessMessage("");
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const clipboardItem of clipboardItems) {
        const supportedType = clipboardItem.types.find(type =>
          SUPPORTED_TYPES.includes(type)
        );
        if (!supportedType) {
          continue;
        }

        const blob = await clipboardItem.getType(supportedType);
        const clipboardFile = createClipboardFile(blob);
        if (!clipboardFile) {
          continue;
        }

        handleFileSelect(clipboardFile, "clipboard");
        return;
      }

      setErrorMessage(
        t(
          "upload.errors.clipboardEmpty",
          "No supported file found in clipboard."
        )
      );
      setUploadState("error");
      setPasteSuccessMessage("");
    } catch (error) {
      const permissionDenied =
        error instanceof DOMException && error.name === "NotAllowedError";
      setErrorMessage(
        permissionDenied
          ? t(
              "upload.errors.clipboardPermissionDenied",
              "Clipboard access was denied. Please allow paste access and try again."
            )
          : t(
              "upload.errors.clipboardReadFailed",
              "Could not read clipboard content."
            )
      );
      setUploadState("error");
      setPasteSuccessMessage("");
    }
  }, [createClipboardFile, handleFileSelect, isProcessing, selectedFile, t]);

  useEffect(() => {
    if (!isOpen || isProcessing || selectedFile) {
      return;
    }

    const handleWindowPaste = (event: ClipboardEvent) => {
      const pastedFile = getFileFromClipboardData(event.clipboardData);
      if (!pastedFile) {
        return;
      }
      event.preventDefault();
      handleFileSelect(pastedFile, "clipboard");
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, [
    getFileFromClipboardData,
    handleFileSelect,
    isOpen,
    isProcessing,
    selectedFile,
  ]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && files[0]) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const uploadFile = async () => {
    if (!selectedFile) return;
    setUploadState("uploading");
    try {
      const fileData = await selectedFile.arrayBuffer();
      setUploadState("processing");
      const result = await uploadDocumentForAnalysis(
        fileData,
        selectedFile.name,
        selectedFile.type,
        i18n.language
      );
      if (result.success && result.transaction) {
        setUploadState("success");
        onSuccess();
        setTimeout(() => {
          onClose();
          resetModal();
        }, 2000);
      } else {
        throw new Error(result.error || "Processing failed");
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMessage(errorMsg);
      setUploadState("error");
      onError(errorMsg);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setUploadState("idle");
    setErrorMessage("");
    setDragActive(false);
    setPasteSuccessMessage("");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") {
      return <File className="w-8 h-8 text-red-500" />;
    }
    return <File className="w-8 h-8 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("upload.title", "Upload Document")}
      closeDisabled={isProcessing}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isProcessing}
            fullWidth
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={uploadFile}
            disabled={!selectedFile || uploadState === "success"}
            loading={isProcessing}
            variant="primary"
            fullWidth
          >
            {t("upload.analyze", "Analyze Document")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Upload Area */}
        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-gray-300 hover:border-[var(--primary)]"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {t("upload.dragDrop", "Drag and drop your document here")}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {t(
                "upload.supportedFormats",
                "Supports PDF and image files (JPG, PNG, etc.)"
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = SUPPORTED_TYPES.join(",");
                  input.onchange = e => {
                    const target = e.target as {
                      files?: { [key: number]: File; length: number } | null;
                    };
                    if (
                      target.files &&
                      target.files.length > 0 &&
                      target.files[0]
                    ) {
                      handleFileSelect(target.files[0]);
                    }
                  };
                  input.click();
                }}
              >
                {t("upload.selectFile", "Select File")}
              </Button>
              <Button
                variant="secondary"
                onClick={handlePasteFromClipboard}
                disabled={isProcessing}
              >
                {t("upload.paste.button", "Paste from clipboard")}
              </Button>
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              {t(
                "upload.paste.hint",
                "You can also paste directly with Cmd/Ctrl + V."
              )}
            </p>
          </div>
        ) : (
          /* File Preview */
          <div className="border rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] truncate">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                onClick={() => {
                  setSelectedFile(null);
                  setPasteSuccessMessage("");
                }}
                variant="ghost"
                size="sm"
                icon={<X size={16} />}
                disabled={isProcessing}
              />
            </div>
          </div>
        )}

        {pasteSuccessMessage && uploadState !== "error" && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700">{pasteSuccessMessage}</p>
          </div>
        )}

        {/* Error */}
        {uploadState === "error" && errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Success */}
        {uploadState === "success" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">
              {t("upload.success", "Document processed successfully!")}
            </p>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader className="w-5 h-5 text-blue-500 flex-shrink-0 animate-spin" />
            <p className="text-sm text-blue-700">
              {uploadState === "uploading"
                ? t("upload.uploading", "Uploading document...")
                : t("upload.processing", "Analyzing document with AI...")}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
