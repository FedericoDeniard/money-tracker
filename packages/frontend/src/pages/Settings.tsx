import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSeedNotifications } from '../hooks/useSeedNotifications';
import {
  useGmailStatus,
  useGmailWatches,
  useInvalidateGmailQueries,
} from '../hooks/useGmailStatus';
import { Button } from '../components/ui/Button';
import { Mail, CheckCircle, AlertCircle, Loader2, X, Download } from "lucide-react";
import { useSearchParams } from 'react-router-dom';
import { gmailService } from "../services/gmail.service";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { SeedEmailsModal } from "../components/settings/SeedEmailsModal";
import { NotificationPreferencesChecklist } from "../components/notifications/NotificationPreferencesChecklist";

export function Settings() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  // Enable seed notifications
  useSeedNotifications(user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const invalidateGmailQueries = useInvalidateGmailQueries();
  const { data: gmailStatus, isLoading: isLoadingStatus } = useGmailStatus(user?.id);
  const { data: gmailWatches, isLoading: isLoadingWatches } = useGmailWatches(user?.id);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [disconnectModal, setDisconnectModal] = useState<{
    isOpen: boolean;
    connectionId: string;
    email: string;
  }>({ isOpen: false, connectionId: '', email: '' });

  // Seed modal state
  const [seedModal, setSeedModal] = useState<{
    isOpen: boolean;
    connectionId: string;
    gmailEmail: string;
  }>({ isOpen: false, connectionId: '', gmailEmail: '' });

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      setNotification({
        type: "success",
        message: t("settings.emailConfiguredSuccess"),
      });
      setSearchParams({});

      // Refresh Gmail status and show seed modal
      gmailService.clearConnectionStatusCache(user?.id);
      invalidateGmailQueries();
      // Wait a bit for the cache to update, then show seed modal
      setTimeout(() => {
        if (gmailStatus && gmailStatus.connections.length > 0) {
          const latestConnection = gmailStatus.connections[0];
          if (latestConnection) {
            setSeedModal({
              isOpen: true,
              connectionId: latestConnection.id,
              gmailEmail: latestConnection.gmail_email,
            });
          }
        }
      }, 1000);
    } else if (error === 'auth_failed') {
      setNotification({
        type: "error",
        message: t("settings.emailConfigError"),
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Gmail status is automatically managed by useGmailStatus hook

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleConnectEmail = async () => {
    if (!user?.id) {
      setNotification({
        type: "error",
        message: t("settings.userIdError"),
      });
      return;
    }

    // Disable the button immediately to prevent double clicks
    setIsConnecting(true);

    try {
      await gmailService.connectGmail();
      // Note: user will be redirected, so setIsConnecting(false) won't be called
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      setNotification({
        type: "error",
        message: t("settings.gmailConnectError"),
      });
      setIsConnecting(false);
    }
  };

  // Check if the button should be enabled
  // - Not loading auth state
  // - User is authenticated
  // - Not currently connecting
  const isConnectButtonEnabled = !loading && !!user?.id && !isConnecting;

  const handleDisconnectEmail = async (connectionId: string, email: string) => {
    setDisconnectModal({ isOpen: true, connectionId, email });
  };

  const confirmDisconnect = async () => {
    const { connectionId } = disconnectModal;

    try {
      setIsDisconnecting(connectionId);
      setDisconnectModal({ isOpen: false, connectionId: '', email: '' });

      const result = await gmailService.disconnectGmail(connectionId);

      if (result.success) {
        gmailService.clearConnectionStatusCache(user?.id);
        setNotification({
          type: "success",
          message: t("settings.gmailDisconnectedSuccess"),
        });
        invalidateGmailQueries();
      } else {
        throw new Error(result.error || "Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      setNotification({
        type: "error",
        message: t("settings.gmailDisconnectError"),
      });
    } finally {
      setIsDisconnecting(null);
    }
  };

  const handleStartSeed = (connectionId: string, gmailEmail: string) => {
    setSeedModal({
      isOpen: true,
      connectionId,
      gmailEmail,
    });
  };

  const activeConnections =
    gmailStatus?.connections.filter(
      (connection) => connection.status !== "disconnected",
    ) ?? [];
  const disconnectedConnections =
    gmailStatus?.connections.filter(
      (connection) => connection.status === "disconnected",
    ) ?? [];
  const connectedConnections =
    activeConnections.filter((connection) => connection.status === "connected") ?? [];
  const watchedEmails = new Set((gmailWatches ?? []).map((watch) => watch.gmail_email));
  const connectionsWithoutWatch = connectedConnections.filter(
    (connection) => !watchedEmails.has(connection.gmail_email),
  );
  const showWebhookWarning =
    (gmailStatus?.needsReconnectTotal ?? 0) > 0 ||
    (!isLoadingWatches && connectionsWithoutWatch.length > 0);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 flex flex-col gap-4">
      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 md:p-6 shadow-sm shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)]">
          {t("settings.pageDescription", "Manage your account preferences and integrations.")}
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 sm:p-6 shadow-sm flex-1 mb-8">
        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${notification.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
              }`}
          >
            {notification.type === "success" ? (
              <CheckCircle
                className="text-green-600 flex-shrink-0 mt-0.5"
                size={20}
              />
            ) : (
              <AlertCircle
                className="text-red-600 flex-shrink-0 mt-0.5"
                size={20}
              />
            )}
            <p
              className={`text-sm ${notification.type === "success"
                ? "text-green-800"
                : "text-red-800"
                }`}
            >
              {notification.message}
            </p>
          </div>
        )}

        <div className="border-t border-[var(--text-secondary)]/30 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("settings.emailNotifications")}
          </h2>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="p-3 bg-[var(--primary)]/10 rounded-lg shrink-0">
                <Mail className="text-[var(--primary)]" size={24} />
              </div>

              <div className="flex-1 w-full min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <h3 className="font-medium text-[var(--text-primary)]">
                    Gmail
                  </h3>
                  {isLoadingStatus ? (
                    <Loader2
                      className="animate-spin text-[var(--text-secondary)]"
                      size={16}
                    />
                  ) : gmailStatus && gmailStatus.total > 0 ? (
                    gmailStatus.activeTotal > 0 ? (
                      gmailStatus.needsReconnectTotal > 0 ? (
                        <span className="flex items-center gap-1 text-sm text-amber-600">
                          <AlertCircle size={16} />
                          {t("settings.connectedAndReconnectCount", {
                            connected: gmailStatus.connectedTotal,
                            reconnect: gmailStatus.needsReconnectTotal,
                          })}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle size={16} />
                          {t("settings.connectedCount", {
                            count: gmailStatus.connectedTotal,
                          })}
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                        <AlertCircle size={16} />
                        {t("settings.notConnected")}
                      </span>
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                      <AlertCircle size={16} />
                      {t("settings.notConnected")}
                    </span>
                  )}
                </div>

                {gmailStatus && gmailStatus.total > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t("settings.notificationsDescription")}
                    </p>
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

                    {activeConnections.map((connection) => (
                      <div
                        key={connection.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-gray-200 gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Mail className="text-gray-500 shrink-0" size={20} />
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">
                              {connection.gmail_email}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {connection.status === "connected"
                                ? `${t("settings.connectedAt")} ${new Date(
                                  connection.connected_at,
                                ).toLocaleDateString()}`
                                : t("settings.needsReconnect")}
                            </p>
                            {connection.status === "needs_reconnect" && (
                              <p className="text-xs text-amber-700 mt-1">
                                {t("settings.reconnectHint")}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 self-end sm:self-auto shrink-0">
                          {connection.status === "connected" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Download size={16} />}
                              onClick={() =>
                                handleStartSeed(
                                  connection.id,
                                  connection.gmail_email,
                                )
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
                              onClick={handleConnectEmail}
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
                              handleDisconnectEmail(
                                connection.id,
                                connection.gmail_email,
                              )
                            }
                            disabled={isDisconnecting === connection.id}
                          >
                            {isDisconnecting === connection.id
                              ? t("settings.disconnecting")
                              : t("settings.disconnect")}
                          </Button>
                        </div>
                      </div>
                    ))}

                    {disconnectedConnections.length > 0 && (
                      <div className="pt-3 border-t border-gray-200 space-y-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {t("settings.disconnectedAccountsTitle")}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {t("settings.disconnectedAccountsDescription")}
                        </p>

                        {disconnectedConnections.map((connection) => (
                          <div
                            key={connection.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-gray-200 gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Mail className="text-gray-500 shrink-0" size={20} />
                              <div className="min-w-0">
                                <p className="font-medium text-[var(--text-primary)] truncate">
                                  {connection.gmail_email}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                  {t("settings.disconnectedNoToken")}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2 self-end sm:self-auto shrink-0">
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
                                onClick={handleConnectEmail}
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

                    <div className="pt-3 border-t border-gray-200">
                      <Button
                        variant="primary"
                        icon={
                          isConnecting || loading ? (
                            <Loader2 className="animate-spin" size={20} />
                          ) : (
                            <Mail size={20} />
                          )
                        }
                        iconPosition="left"
                        onClick={handleConnectEmail}
                        disabled={!isConnectButtonEnabled}
                      >
                        {loading
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
                        isConnecting || loading ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <Mail size={20} />
                        )
                      }
                      iconPosition="left"
                      onClick={handleConnectEmail}
                      disabled={!isConnectButtonEnabled}
                    >
                      {loading
                        ? t("common.loading")
                        : isConnecting
                          ? t("settings.connecting")
                          : t("settings.connectGmail")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{t("common.note")}:</strong>{" "}
              {t("settings.gmailPrivacyNote")}
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("settings.language")}
          </h2>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {t("settings.selectLanguage")}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {t("settings.languageDescription")}
                </p>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("notifications.settings.title")}
          </h2>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              {t("notifications.settings.description")}
            </p>
            <NotificationPreferencesChecklist />
          </div>
        </div>

        <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("settings.accountInfo")}
          </h2>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-medium">{t("auth.email")}:</span>{" "}
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disconnect Gmail Confirmation Modal */}
      <ConfirmModal
        isOpen={disconnectModal.isOpen}
        onClose={() => setDisconnectModal({ isOpen: false, connectionId: '', email: '' })}
        onConfirm={confirmDisconnect}
        title={t("settings.disconnectGmail")}
        message={t("settings.confirmDisconnectEmail", { email: disconnectModal.email })}
        confirmText={t("settings.disconnect")}
        isDestructive
      />

      {/* Seed Emails Modal */}
      <SeedEmailsModal
        isOpen={seedModal.isOpen}
        onClose={() => setSeedModal({ isOpen: false, connectionId: '', gmailEmail: '' })}
        connectionId={seedModal.connectionId}
        gmailEmail={seedModal.gmailEmail}
      />
    </div >
  );
}
