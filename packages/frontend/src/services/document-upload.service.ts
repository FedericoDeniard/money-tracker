import { getSupabase } from "../lib/supabase";
import { getConfig } from "../config";

export interface DocumentUploadResult {
  success: boolean;
  transaction?: Record<string, unknown>;
  error?: string;
}

export async function uploadDocumentForAnalysis(
  fileData: ArrayBuffer,
  fileName: string,
  fileType: string
): Promise<DocumentUploadResult> {
  const supabase = await getSupabase();
  const config = await getConfig();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Authentication required");
  }

  const functionsUrl = `${config.supabase.url.replace(/\/+$/, "")}/functions/v1/process-document`;

  const response = await fetch(functionsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": fileType,
      "X-File-Name": fileName,
    },
    body: fileData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result as DocumentUploadResult;
}
