export type ClipboardReadError =
  | "not_supported"
  | "permission_denied"
  | "empty"
  | "read_failed";

type ClipboardReadResult = { file: File } | { error: ClipboardReadError };

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

function createClipboardFile(
  blob: Blob,
  acceptedMimeTypes: string[],
  fileNamePrefix = "pasted-document"
): File | null {
  if (!blob.type || !acceptedMimeTypes.includes(blob.type)) {
    return null;
  }

  const extension = FILE_EXTENSION_BY_MIME[blob.type] ?? "bin";
  const generatedName = `${fileNamePrefix}-${Date.now()}.${extension}`;

  return new File([blob], generatedName, { type: blob.type });
}

export function getFileFromClipboardData(
  clipboardData: DataTransfer | null,
  acceptedMimeTypes: string[]
): File | null {
  if (!clipboardData) {
    return null;
  }

  if (clipboardData.files.length > 0 && clipboardData.files[0]) {
    const firstFile = clipboardData.files[0];
    if (acceptedMimeTypes.includes(firstFile.type)) {
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

    if (acceptedMimeTypes.includes(file.type)) {
      return file;
    }
  }

  return null;
}

export async function readFileFromNavigatorClipboard(
  acceptedMimeTypes: string[]
): Promise<ClipboardReadResult> {
  if (!navigator.clipboard?.read) {
    return { error: "not_supported" };
  }

  try {
    const clipboardItems = await navigator.clipboard.read();

    for (const clipboardItem of clipboardItems) {
      const supportedType = clipboardItem.types.find(type =>
        acceptedMimeTypes.includes(type)
      );
      if (!supportedType) {
        continue;
      }

      const blob = await clipboardItem.getType(supportedType);
      const file = createClipboardFile(blob, acceptedMimeTypes);
      if (!file) {
        continue;
      }

      return { file };
    }

    return { error: "empty" };
  } catch (error) {
    const permissionDenied =
      error instanceof DOMException && error.name === "NotAllowedError";

    return { error: permissionDenied ? "permission_denied" : "read_failed" };
  }
}
