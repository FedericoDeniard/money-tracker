import { useState } from "react";
import { Mail, MailOpen, Calendar, User } from "lucide-react";
import { useSupabaseQuery } from "../hooks/useSupabaseQuery";
import { createEmailsService, type Email } from "../services/emails.service";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";

export function Emails() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const {
    data: emails,
    loading,
    error,
    refetch,
  } = useSupabaseQuery(async (supabase) => {
    const service = createEmailsService(supabase);
    return await service.getEmails();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading emails</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Email List */}
      <div className="w-1/3 bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[var(--text-secondary)]/20">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Mail size={20} />
            Emails recibidos ({emails?.length || 0})
          </h2>
        </div>
        <div className="overflow-y-auto h-full">
          {emails && emails.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No hay emails guardados"
              description="Los emails que recibas aparecerán aquí"
            />
          ) : (
            emails?.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 border-b border-[var(--text-secondary)]/10 cursor-pointer transition-colors hover:bg-[var(--bg-primary)] ${
                  selectedEmail?.id === email.id ? "bg-[var(--bg-primary)]" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1">
                    {email.subject || "Sin asunto"}
                  </span>
                  {email.processed ? (
                    <MailOpen
                      size={16}
                      className="text-green-500 ml-2 flex-shrink-0"
                    />
                  ) : (
                    <Mail
                      size={16}
                      className="text-[var(--text-secondary)] ml-2 flex-shrink-0"
                    />
                  )}
                </div>
                <div className="text-xs text-[var(--text-secondary)] space-y-1">
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>{email.gmail_email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{formatDate(email.date)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
        {selectedEmail ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-[var(--text-secondary)]/20">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {selectedEmail.subject || "Sin asunto"}
              </h3>
              <div className="text-sm text-[var(--text-secondary)] space-y-1">
                <p>De: {selectedEmail.gmail_email}</p>
                <p>Fecha: {formatDate(selectedEmail.date)}</p>
                <p>ID: {selectedEmail.gmail_message_id}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      selectedEmail.processed
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {selectedEmail.processed ? (
                      <>
                        <MailOpen size={12} />
                        Procesado
                      </>
                    ) : (
                      <>
                        <Mail size={12} />
                        No procesado
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="bg-[var(--bg-primary)] rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)] font-mono">
                  {selectedEmail.body_text || "Sin contenido"}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center">
              <Mail size={48} className="mx-auto mb-4 opacity-50" />
              <p>Selecciona un email para ver su contenido</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
