export type SubscriptionStatus = "active" | "inactive" | "unknown";

const SUBSCRIPTION_INACTIVE_GRACE_DAYS = 10;

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
