export type SubscriptionStatus = "active" | "inactive" | "unknown";

const SUBSCRIPTION_INACTIVE_GRACE_DAYS = 10;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getSubscriptionStatus(nextEstimatedDate: string | null): SubscriptionStatus {
  if (!nextEstimatedDate) return "unknown";

  const nextDate = new Date(`${nextEstimatedDate}T00:00:00`);
  if (Number.isNaN(nextDate.getTime())) return "unknown";

  const inactiveDeadline = new Date(nextDate);
  inactiveDeadline.setDate(inactiveDeadline.getDate() + SUBSCRIPTION_INACTIVE_GRACE_DAYS);

  return new Date() > inactiveDeadline ? "inactive" : "active";
}

export function getSubscriptionStatusRank(status: SubscriptionStatus): number {
  if (status === "active") return 0;
  if (status === "inactive") return 1;
  return 2;
}

export interface SubscriptionGraceInfo {
  isInGracePeriod: boolean;
  graceDaysRemaining: number;
  graceDaysTotal: number;
}

export function getSubscriptionGraceInfo(nextEstimatedDate: string | null): SubscriptionGraceInfo | null {
  if (!nextEstimatedDate) return null;

  const nextDate = new Date(`${nextEstimatedDate}T00:00:00`);
  if (Number.isNaN(nextDate.getTime())) return null;

  const now = new Date();
  const status = getSubscriptionStatus(nextEstimatedDate);
  const isPastNextEstimate = now > nextDate;
  if (!isPastNextEstimate || status !== "active") return null;

  const inactiveDeadline = new Date(nextDate);
  inactiveDeadline.setDate(inactiveDeadline.getDate() + SUBSCRIPTION_INACTIVE_GRACE_DAYS);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const deadlineStart = new Date(inactiveDeadline);
  deadlineStart.setHours(0, 0, 0, 0);
  const daysRemaining = Math.max(
    0,
    Math.floor((deadlineStart.getTime() - todayStart.getTime()) / ONE_DAY_IN_MS),
  );

  return {
    isInGracePeriod: true,
    graceDaysRemaining: daysRemaining,
    graceDaysTotal: SUBSCRIPTION_INACTIVE_GRACE_DAYS,
  };
}
