import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Mail, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { useSearchParams } from 'react-router-dom';
import { gmailService, type GmailStatus } from "../services/gmail.service";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
import { ConfirmModal } from "../components/ui/ConfirmModal";

export function Settings() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [disconnectModal, setDisconnectModal] = useState<{
    isOpen: boolean;
    connectionId: string;
    email: string;
  }>({ isOpen: false, connectionId: '', email: '' });

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      setNotification({
        type: "success",
        message: t("settings.emailConfiguredSuccess"),
      });
      setSearchParams({});
      checkGmailStatus();
    } else if (error === 'auth_failed') {
      setNotification({
        type: "error",
        message: t("settings.emailConfigError"),
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    checkGmailStatus();
  }, [user?.id]);

  const checkGmailStatus = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingStatus(true);
      const status = await gmailService.getConnectionStatus(user.id);
      setGmailStatus(status);
    } catch (error) {
      console.error("Error checking Gmail status:", error);
      setGmailStatus({ connections: [], total: 0 });
    } finally {
      setIsLoadingStatus(false);
    }
  };

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
        setNotification({
          type: "success",
          message: t("settings.gmailDisconnectedSuccess"),
        });
        await checkGmailStatus();
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

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-6">
          {t("settings.title")}
        </h1>

        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              notification.type === "success"
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
              className={`text-sm ${
                notification.type === "success"
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
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle size={16} />
                      {t("settings.connectedCount", {
                        count: gmailStatus.total,
                      })}
                    </span>
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

                    {gmailStatus.connections.map((connection) => (
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
                              {t("settings.connectedAt")}{" "}
                              {new Date(
                                connection.connected_at,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="self-end sm:self-auto shrink-0"
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
                    ))}

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
      </div>

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
    </div>
  );
}
