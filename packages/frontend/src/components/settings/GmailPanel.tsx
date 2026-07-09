import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  Mail,
  X,
} from "lucide-react";
import { useGmailStatus, useGmailWatches } from "../../hooks/useGmailStatus";
import { Button } from "../ui/Button";

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale);
}

interface GmailPanelProps {
  userId: string | undefined;
  isConnecting: boolean;
  isConnectButtonEnabled: boolean;
  isDisconnecting: string | null;
  onConnect: () => Promise<void>;
  onDisconnect: (connectionId: string, email: string) => void;
  onStartSeed: (connectionId: string, gmailEmail: string) => void;
  userLoading: boolean;
}

export function GmailPanel({
  userId,
  isConnecting,
  isConnectButtonEnabled,
  isDisconnecting,
  onConnect,
  onDisconnect,
  onStartSeed,
  userLoading,
}: GmailPanelProps) {
  const { t, i18n } = useTranslation();
  const { data: gmailStatus } = useGmailStatus(userId);
  const { data: gmailWatches } = useGmailWatches(userId);

  const activeConnections =
    gmailStatus?.connections.filter(c => c.status !== "disconnected") ?? [];
  const disconnectedConnections =
    gmailStatus?.connections.filter(c => c.status === "disconnected") ?? [];
  const connectedConnections =
    activeConnections.filter(c => c.status === "connected") ?? [];
  const watchedEmails = new Set((gmailWatches ?? []).map(w => w.gmail_email));
  const connectionsWithoutWatch = connectedConnections.filter(
    c => !watchedEmails.has(c.gmail_email)
  );
  const showWebhookWarning =
    (gmailStatus?.needsReconnectTotal ?? 0) > 0 ||
    connectionsWithoutWatch.length > 0;

  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-[var(--primary)]/10 rounded-lg shrink-0">
          <Mail className="text-[var(--primary)]" size={20} />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t("settings.emailNotifications")}
          </p>
          {gmailStatus && gmailStatus.total > 0 ? (
            gmailStatus.activeTotal > 0 ? (
              gmailStatus.needsReconnectTotal > 0 ? (
                <span className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                  <AlertCircle size={14} />
                  {t("settings.connectedAndReconnectCount", {
                    connected: gmailStatus.connectedTotal,
                    reconnect: gmailStatus.needsReconnectTotal,
                  })}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-green-600 mt-1">
                  <CheckCircle size={14} />
                  {t("settings.connectedCount", {
                    count: gmailStatus.connectedTotal,
                  })}
                </span>
              )
            ) : (
              <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)] mt-1">
                <AlertCircle size={14} />
                {t("settings.notConnected")}
              </span>
            )
          ) : (
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)] mt-1">
              <AlertCircle size={14} />
              {t("settings.notConnected")}
            </span>
          )}
        </div>
      </div>

      {gmailStatus && gmailStatus.total > 0 ? (
        <div className="space-y-3">
          {showWebhookWarning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                <strong>{t("common.note")}:</strong>{" "}
                {t("settings.gmailReconnectWarning")}
              </p>
              {connectionsWithoutWatch.length > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  {t("settings.gmailMissingWatchWarning", {
                    count: connectionsWithoutWatch.length,
                  })}
                </p>
              )}
            </div>
          )}

          {activeConnections.map(connection => {
            const connectedDate =
              connection.status === "connected"
                ? formatDate(connection.connected_at, i18n.language)
                : "";
            return (
              <div
                key={connection.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-zinc-200 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Mail className="text-zinc-500 shrink-0" size={20} />
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate">
                      {connection.gmail_email}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {connection.status === "connected"
                        ? `${t("settings.connectedAt")} ${connectedDate}`
                        : t("settings.needsReconnect")}
                    </p>
                    {connection.status === "needs_reconnect" && (
                      <p className="text-xs text-amber-700 mt-1">
                        {t("settings.reconnectHint")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {connection.status === "connected" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download size={16} />}
                      onClick={() =>
                        onStartSeed(connection.id, connection.gmail_email)
                      }
                    >
                      {t("settings.importEmails") || "Importar"}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={
                        isConnecting ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Mail size={16} />
                        )
                      }
                      onClick={onConnect}
                      disabled={!isConnectButtonEnabled}
                    >
                      {isConnecting
                        ? t("settings.connecting")
                        : t("settings.reconnectGmail")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={
                      isDisconnecting === connection.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <X size={16} />
                      )
                    }
                    onClick={() =>
                      onDisconnect(connection.id, connection.gmail_email)
                    }
                    disabled={isDisconnecting === connection.id}
                  >
                    {isDisconnecting === connection.id
                      ? t("settings.disconnecting")
                      : t("settings.disconnect")}
                  </Button>
                </div>
              </div>
            );
          })}

          {disconnectedConnections.length > 0 && (
            <div className="pt-3 border-t border-zinc-200 space-y-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {t("settings.disconnectedAccountsTitle")}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {t("settings.disconnectedAccountsDescription")}
              </p>
              {disconnectedConnections.map(connection => (
                <div
                  key={connection.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-zinc-200 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="text-zinc-500 shrink-0" size={20} />
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text-primary)] truncate">
                        {connection.gmail_email}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {t("settings.disconnectedNoToken")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end sm:justify-start">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={
                        isConnecting ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Mail size={16} />
                        )
                      }
                      onClick={onConnect}
                      disabled={!isConnectButtonEnabled}
                    >
                      {isConnecting
                        ? t("settings.connecting")
                        : t("settings.reconnectGmail")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-zinc-200">
            <Button
              variant="primary"
              icon={
                isConnecting || userLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Mail size={20} />
                )
              }
              iconPosition="left"
              onClick={onConnect}
              disabled={!isConnectButtonEnabled}
            >
              {userLoading
                ? t("common.loading")
                : isConnecting
                  ? t("settings.connecting")
                  : t("settings.addAnotherAccount")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {t("settings.connectDescription")}
          </p>
          <Button
            variant="primary"
            icon={
              isConnecting || userLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Mail size={20} />
              )
            }
            iconPosition="left"
            onClick={onConnect}
            disabled={!isConnectButtonEnabled}
          >
            {userLoading
              ? t("common.loading")
              : isConnecting
                ? t("settings.connecting")
                : t("settings.connectGmail")}
          </Button>
        </>
      )}

      <p className="mt-4 text-xs text-[var(--text-secondary)]">
        <strong className="text-[var(--primary)]">{t("common.note")}:</strong>{" "}
        {t("settings.gmailPrivacyNote")}
      </p>
    </div>
  );
}
