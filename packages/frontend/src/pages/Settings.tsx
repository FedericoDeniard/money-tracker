import { Suspense, useEffect, useReducer } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSeedNotifications } from "../hooks/useSeedNotifications";
import {
  useGmailStatus,
  useGmailWatches,
  useInvalidateGmailQueries,
} from "../hooks/useGmailStatus";
import { Button } from "../components/ui/Button";
import {
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Download,
  BookOpen,
  RotateCcw,
  SkipForward,
  CreditCard,
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { gmailService } from "../services/gmail.service";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { SeedEmailsModal } from "../components/settings/SeedEmailsModal";
import { NotificationPreferencesChecklist } from "../components/notifications/NotificationPreferencesChecklist";
import { PushNotificationToggle } from "../components/notifications/PushNotificationToggle";
import { SuspenseFallback } from "../components/ui/SuspenseFallback";
import { useTourStatus } from "../hooks/useTour";
import { APP_VERSION, BUILD_TIMESTAMP } from "../lib/version";
import { Info } from "lucide-react";
import { toast } from "../utils/toast";

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale);
}

const BUILD_DATE = BUILD_TIMESTAMP
  ? new Date(BUILD_TIMESTAMP).toLocaleString("en-US")
  : "";

// ─── Gmail section — suspends while status + watches load ────────────────────
interface GmailSectionProps {
  userId: string | undefined;
  isConnecting: boolean;
  isConnectButtonEnabled: boolean;
  isDisconnecting: string | null;
  onConnect: () => Promise<void>;
  onDisconnect: (connectionId: string, email: string) => void;
  onStartSeed: (connectionId: string, gmailEmail: string) => void;
  userLoading: boolean;
}

function GmailSection({
  userId,
  isConnecting,
  isConnectButtonEnabled,
  isDisconnecting,
  onConnect,
  onDisconnect,
  onStartSeed,
  userLoading,
}: GmailSectionProps) {
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
    <div className="bg-[var(--bg-secondary)] rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="p-3 bg-[var(--primary)]/10 rounded-lg shrink-0">
          <Mail className="text-[var(--primary)]" size={24} />
        </div>

        <div className="flex-1 w-full min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h3 className="font-medium text-[var(--text-primary)]">Gmail</h3>
            {gmailStatus && gmailStatus.total > 0 ? (
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
        </div>
      </div>
    </div>
  );
}

// ─── Page shell — renders immediately ────────────────────────────────────────
interface SettingsState {
  isConnecting: boolean;
  isDisconnecting: string | null;
  disconnectModal: {
    isOpen: boolean;
    connectionId: string;
    email: string;
  };
  seedModal: {
    isOpen: boolean;
    connectionId: string;
    gmailEmail: string;
  };
}

type SettingsAction =
  | { type: "SET_CONNECTING"; isConnecting: boolean }
  | { type: "SET_DISCONNECTING"; connectionId: string | null }
  | { type: "OPEN_DISCONNECT_MODAL"; connectionId: string; email: string }
  | { type: "CLOSE_DISCONNECT_MODAL" }
  | { type: "OPEN_SEED_MODAL"; connectionId: string; gmailEmail: string }
  | { type: "CLOSE_SEED_MODAL" };

const initialDisconnectModal = {
  isOpen: false,
  connectionId: "",
  email: "",
};

const initialSeedModal = {
  isOpen: false,
  connectionId: "",
  gmailEmail: "",
};

function settingsReducer(
  state: SettingsState,
  action: SettingsAction
): SettingsState {
  switch (action.type) {
    case "SET_CONNECTING":
      return { ...state, isConnecting: action.isConnecting };
    case "SET_DISCONNECTING":
      return { ...state, isDisconnecting: action.connectionId };
    case "OPEN_DISCONNECT_MODAL":
      return {
        ...state,
        disconnectModal: {
          isOpen: true,
          connectionId: action.connectionId,
          email: action.email,
        },
      };
    case "CLOSE_DISCONNECT_MODAL":
      return { ...state, disconnectModal: initialDisconnectModal };
    case "OPEN_SEED_MODAL":
      return {
        ...state,
        seedModal: {
          isOpen: true,
          connectionId: action.connectionId,
          gmailEmail: action.gmailEmail,
        },
      };
    case "CLOSE_SEED_MODAL":
      return { ...state, seedModal: initialSeedModal };
  }
}

const initialSettingsState: SettingsState = {
  isConnecting: false,
  isDisconnecting: null,
  disconnectModal: initialDisconnectModal,
  seedModal: initialSeedModal,
};

export function Settings() {
  const { user, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isSkippedAll, completedCount, totalCount, skipAll, resetAll } =
    useTourStatus();

  useSeedNotifications(user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const invalidateGmailQueries = useInvalidateGmailQueries();
  const [state, dispatch] = useReducer(settingsReducer, initialSettingsState);
  const { isConnecting, isDisconnecting, disconnectModal, seedModal } = state;

  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (successParam === "true") {
      toast.success(t("settings.emailConfiguredSuccess"));
      setSearchParams({});
      gmailService.clearConnectionStatusCache(user?.id);
      invalidateGmailQueries();
    } else if (errorParam === "auth_failed") {
      toast.error(t("settings.emailConfigError"));
      setSearchParams({});
    }
  }, [
    successParam,
    errorParam,
    t,
    user?.id,
    invalidateGmailQueries,
    setSearchParams,
  ]);

  const isConnectButtonEnabled = !loading && !!user?.id && !isConnecting;

  const handleConnectEmail = async () => {
    if (!user?.id) {
      toast.error(t("settings.userIdError"));
      return;
    }
    dispatch({ type: "SET_CONNECTING", isConnecting: true });
    try {
      await gmailService.connectGmail();
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      toast.error(t("settings.gmailConnectError"));
      dispatch({ type: "SET_CONNECTING", isConnecting: false });
    }
  };

  const handleDisconnectEmail = (connectionId: string, email: string) => {
    dispatch({ type: "OPEN_DISCONNECT_MODAL", connectionId, email });
  };

  const confirmDisconnect = async () => {
    const { connectionId } = disconnectModal;
    try {
      dispatch({ type: "SET_DISCONNECTING", connectionId });
      dispatch({ type: "CLOSE_DISCONNECT_MODAL" });
      const result = await gmailService.disconnectGmail(connectionId);
      if (result.success) {
        gmailService.clearConnectionStatusCache(user?.id);
        toast.success(t("settings.gmailDisconnectedSuccess"));
        invalidateGmailQueries();
      } else {
        throw new Error(result.error || "Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      toast.error(t("settings.gmailDisconnectError"));
    } finally {
      dispatch({ type: "SET_DISCONNECTING", connectionId: null });
    }
  };

  const handleStartSeed = (connectionId: string, gmailEmail: string) => {
    dispatch({ type: "OPEN_SEED_MODAL", connectionId, gmailEmail });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 flex flex-col gap-4">
      {/* Title — renders immediately */}
      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 md:p-6 shadow-sm shrink-0">
        <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)]">
          {t(
            "settings.pageDescription",
            "Manage your account preferences and integrations."
          )}
        </p>
      </section>

      {/* Main settings card */}
      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 sm:p-6 shadow-sm flex-1 mb-8">
        {/* Gmail section — suspends while status/watches load */}
        <div
          data-tour="settings-gmail"
          className="border-t border-[var(--text-secondary)]/30 pt-6"
        >
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("settings.emailNotifications")}
          </h2>
          <Suspense fallback={<SuspenseFallback rows={3} />}>
            <GmailSection
              userId={user?.id}
              isConnecting={isConnecting}
              isConnectButtonEnabled={isConnectButtonEnabled}
              isDisconnecting={isDisconnecting}
              onConnect={handleConnectEmail}
              onDisconnect={handleDisconnectEmail}
              onStartSeed={handleStartSeed}
              userLoading={loading}
            />
          </Suspense>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{t("common.note")}:</strong>{" "}
              {t("settings.gmailPrivacyNote")}
            </p>
          </div>
        </div>

        {/* Account & Billing — renders immediately */}
        <div
          data-tour="settings-billing"
          className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6"
        >
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("settings.accountBilling")}
          </h2>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[var(--primary)]/10 rounded-lg shrink-0">
                  <CreditCard size={20} className="text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {t("settings.accountBillingTitle")}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {t("settings.accountBillingDescription")}
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<CreditCard size={16} />}
                onClick={() => navigate("/account/billing")}
              >
                {t("settings.accountBillingAction")}
              </Button>
            </div>
          </div>
        </div>

        {/* Language — renders immediately */}
        <div
          data-tour="settings-language"
          className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6"
        >
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

        {/* Notification preferences — renders immediately */}
        <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("notifications.settings.title")}
          </h2>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-6">
            <p className="text-sm text-[var(--text-secondary)]">
              {t("notifications.settings.description")}
            </p>

            {/* Push notifications toggle for this device */}
            <div data-tour="settings-push-notification">
              <PushNotificationToggle />
            </div>

            <div data-tour="settings-notifications">
              <NotificationPreferencesChecklist />
            </div>
          </div>
        </div>

        {/* Tutorial section */}
        <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-1">
            {t("tour.panel.title")}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {t("tour.panel.description")}
          </p>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BookOpen
                  size={16}
                  className="text-[var(--text-secondary)] shrink-0"
                />
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isSkippedAll
                      ? "bg-zinc-100 text-zinc-500"
                      : completedCount === totalCount
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isSkippedAll
                    ? t("tour.panel.allSkipped")
                    : t("tour.panel.completedCount", {
                        count: completedCount,
                        total: totalCount,
                      })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RotateCcw size={15} />}
                  onClick={() => {
                    resetAll();
                    navigate("/dashboard");
                  }}
                >
                  {t("tour.panel.restartButton")}
                </Button>
                {!isSkippedAll && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<SkipForward size={15} />}
                    onClick={skipAll}
                  >
                    {t("tour.panel.skipButton")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account info — renders immediately */}
        <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("settings.accountInfo")}
          </h2>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium">{t("auth.email")}:</span>{" "}
              {user?.email}
            </p>
          </div>
        </div>

        {/* App version */}
        <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("settings.about")}
          </h2>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Info
                size={16}
                className="text-[var(--text-secondary)] shrink-0"
              />
              <div className="space-y-1">
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-medium">{t("settings.version")}:</span>{" "}
                  {APP_VERSION}
                </p>
                {BUILD_TIMESTAMP && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t("settings.buildDate")}: {BUILD_DATE}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ConfirmModal
        isOpen={disconnectModal.isOpen}
        onClose={() => dispatch({ type: "CLOSE_DISCONNECT_MODAL" })}
        onConfirm={confirmDisconnect}
        title={t("settings.disconnectGmail")}
        message={t("settings.confirmDisconnectEmail", {
          email: disconnectModal.email,
        })}
        confirmText={t("settings.disconnect")}
        isDestructive
      />
      <SeedEmailsModal
        isOpen={seedModal.isOpen}
        onClose={() => dispatch({ type: "CLOSE_SEED_MODAL" })}
        connectionId={seedModal.connectionId}
        gmailEmail={seedModal.gmailEmail}
      />
    </div>
  );
}
