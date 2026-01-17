import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Mail, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { useSearchParams } from 'react-router-dom';
import { gmailService, type GmailStatus } from "../services/gmail.service";

export function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      setNotification({
        type: 'success',
        message: '¡Email configurado exitosamente! Ahora recibirás notificaciones de tus correos.',
      });
      setSearchParams({});
      checkGmailStatus();
    } else if (error === 'auth_failed') {
      setNotification({
        type: 'error',
        message: 'Error al configurar el email. Por favor, intenta nuevamente.',
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
      setGmailStatus({ connected: false, gmail_email: null });
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
        type: 'error',
        message: 'Error: No se pudo obtener el ID de usuario.',
      });
      return;
    }

    try {
      setIsConnecting(true);
      await gmailService.connectGmail(user.id);
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      setNotification({
        type: "error",
        message: "Error al conectar Gmail. Por favor, intenta nuevamente.",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnectEmail = async () => {
    if (!user?.id) return;

    if (
      !confirm("¿Estás seguro de que deseas desconectar tu cuenta de Gmail?")
    ) {
      return;
    }

    try {
      setIsDisconnecting(true);
      const result = await gmailService.disconnectGmail(user.id);

      if (result.success) {
        setNotification({
          type: "success",
          message: "Gmail desconectado exitosamente.",
        });
        await checkGmailStatus();
      } else {
        throw new Error(result.error || "Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      setNotification({
        type: "error",
        message: "Error al desconectar Gmail. Por favor, intenta nuevamente.",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
          Configuración
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
            Notificaciones por Email
          </h2>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[var(--primary)]/10 rounded-lg">
                <Mail className="text-[var(--primary)]" size={24} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-[var(--text-primary)]">
                    Gmail
                  </h3>
                  {isLoadingStatus ? (
                    <Loader2
                      className="animate-spin text-[var(--text-secondary)]"
                      size={16}
                    />
                  ) : gmailStatus?.connected ? (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle size={16} />
                      Conectado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                      <AlertCircle size={16} />
                      No conectado
                    </span>
                  )}
                </div>

                {gmailStatus?.connected ? (
                  <>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">
                      Cuenta conectada:{" "}
                      <span className="font-medium">
                        {gmailStatus.gmail_email}
                      </span>
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      Recibirás notificaciones automáticas cuando lleguen nuevos
                      correos a tu bandeja de entrada.
                    </p>
                    <Button
                      variant="secondary"
                      icon={
                        isDisconnecting ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <X size={20} />
                        )
                      }
                      iconPosition="left"
                      onClick={handleDisconnectEmail}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting
                        ? "Desconectando..."
                        : "Desconectar Gmail"}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      Conecta tu cuenta de Gmail para recibir notificaciones
                      automáticas cuando lleguen nuevos correos a tu bandeja de
                      entrada. Podrás procesar transacciones directamente desde
                      tus emails.
                    </p>
                    <Button
                      variant="primary"
                      icon={
                        isConnecting ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <Mail size={20} />
                        )
                      }
                      iconPosition="left"
                      onClick={handleConnectEmail}
                      disabled={isConnecting}
                    >
                      {isConnecting ? "Conectando..." : "Conectar Gmail"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Al conectar tu Gmail, se te pedirá permiso
              para leer tus correos. Solo usaremos esta información para
              procesar transacciones financieras y notificarte de nuevos correos
              relevantes.
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            Información de la Cuenta
          </h2>

          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-medium">User ID:</span> {user?.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
