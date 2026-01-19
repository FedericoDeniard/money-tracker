import { Mail, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { seedService } from "../../services/seed.service";
import { toast } from "../../utils/toast";
import { ConfirmModal } from "../ui/ConfirmModal";

interface SeedEmailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  gmailEmail: string;
}

export function SeedEmailsModal({
  isOpen,
  onClose,
  connectionId,
  gmailEmail,
}: SeedEmailsModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartSeed = async () => {
    console.log("[SeedModal] Starting seed for connection:", connectionId);
    setIsLoading(true);

    try {
      console.log("[SeedModal] Calling seedService.startSeed...");
      const result = await seedService.startSeed(connectionId);
      console.log("[SeedModal] Seed started successfully:", result);
      
      toast.success(
        t("settings.seedStartedSuccess") || "Importación iniciada. Las transacciones aparecerán pronto."
      );

      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[SeedModal] Error starting seed:", error.message);
      
      // Check if error is because a seed is already in progress
      const errorMessage = error.message.includes("already in progress")
        ? (t("settings.seedAlreadyInProgress") || "Ya hay una importación en progreso para esta cuenta. Por favor espera a que termine.")
        : (t("settings.seedStartError") || "Error al iniciar la importación. Intenta de nuevo.");
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={handleSkip}
      onConfirm={handleStartSeed}
      title={t("settings.seedEmailsTitle") || "¡Importa tus facturas!"}
      confirmText={t("settings.seedStart") || "Sí, importar"}
      cancelText={t("settings.seedSkip") || "Ahora no"}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <p className="text-[var(--text-secondary)]">
          {t("settings.seedEmailsDescription") || 
            "Acabas de conectar tu cuenta de Gmail. ¿Quieres que analicemos tus correos de los últimos 3 meses para encontrar facturas y transacciones automáticamente?"
          }
        </p>

        {/* Features */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg mt-0.5">
              <Mail size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)] text-sm">
                {t("settings.seedFeature1Title") || "Análisis automático"}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("settings.seedFeature1Description") || 
                  "Revisaremos todos tus correos en busca de facturas y recibos"
                }
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg mt-0.5">
              <Calendar size={18} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)] text-sm">
                {t("settings.seedFeature2Title") || "Últimos 3 meses"}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("settings.seedFeature2Description") || 
                  "Importaremos transacciones desde hace 3 meses hasta hoy"
                }
              </p>
            </div>
          </div>
        </div>

        {/* Gmail account info */}
        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">
              {t("settings.account") || "Cuenta"}:
            </span>{" "}
            {gmailEmail}
          </p>
        </div>

        {/* Info note */}
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-800">
            <strong>{t("settings.seedNote") || "Nota"}:</strong>{" "}
            {t("settings.seedNoteDescription") || 
              "El proceso se ejecutará en segundo plano. Las transacciones aparecerán automáticamente en tu lista cuando se complete el análisis."
            }
          </p>
        </div>
      </div>
    </ConfirmModal>
  );
}
