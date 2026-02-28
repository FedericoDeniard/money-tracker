import type { TFunction } from "i18next";
import { seedService } from "../services/seed.service";
import { toast } from "./toast";

export async function startSeedWithFeedback(
  connectionId: string,
  t: TFunction,
): Promise<boolean> {
  try {
    await seedService.startSeed(connectionId);
    toast.success(t("settings.seedStartedSuccess"));
    return true;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const errorMessage = error.message.includes("already in progress")
      ? t("settings.seedAlreadyInProgress")
      : t("settings.seedStartError");
    toast.error(errorMessage);
    return false;
  }
}
