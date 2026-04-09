import { useCallback, useEffect } from "react";
import {
  getFileFromClipboardData,
  readFileFromNavigatorClipboard,
  type ClipboardReadError,
} from "../utils/clipboard";

export type { ClipboardReadError } from "../utils/clipboard";

interface UseClipboardFileOptions {
  isEnabled: boolean;
  acceptedMimeTypes: string[];
  onFile: (file: File) => void;
}

export function useClipboardFile({
  isEnabled,
  acceptedMimeTypes,
  onFile,
}: UseClipboardFileOptions) {
  const readFromClipboard =
    useCallback(async (): Promise<ClipboardReadError | null> => {
      const result = await readFileFromNavigatorClipboard(acceptedMimeTypes);

      if ("error" in result) {
        return result.error;
      }

      onFile(result.file);
      return null;
    }, [acceptedMimeTypes, onFile]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const handleWindowPaste = (event: ClipboardEvent) => {
      const pastedFile = getFileFromClipboardData(
        event.clipboardData,
        acceptedMimeTypes
      );
      if (!pastedFile) {
        return;
      }

      event.preventDefault();
      onFile(pastedFile);
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, [acceptedMimeTypes, isEnabled, onFile]);

  return { readFromClipboard };
}
