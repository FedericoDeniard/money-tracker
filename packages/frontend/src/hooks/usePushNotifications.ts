import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  isPushSupported,
  PushSubscriptionService,
} from "../services/push-subscription.service";

// ─── Query key ────────────────────────────────────────────────────────────────

const PUSH_SUBSCRIPTION_QUERY_KEY = ["push-subscription"] as const;

// ─── Derived state ────────────────────────────────────────────────────────────

export type PushBannerState =
  | "enable" // push is supported and user is not yet subscribed
  | "blocked" // user denied notification permission
  | "subscribed" // user is already subscribed
  | "unsupported"; // browser doesn't support push

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns the current PushSubscription (or null) and tracks loading state.
 * Refetches on window focus in case the browser revoked the subscription.
 */
export function usePushSubscription() {
  return useQuery({
    queryKey: PUSH_SUBSCRIPTION_QUERY_KEY,
    queryFn: () => PushSubscriptionService.getSubscription(),
    staleTime: 60 * 1000, // 1 minute
    enabled: isPushSupported(),
  });
}

/**
 * Returns the current push notification banner state based on:
 * - Whether push is supported in this browser
 * - Whether the user has already subscribed
 * - Whether notification permission was denied
 */
export function usePushBannerState(): PushBannerState {
  const { data: subscription } = usePushSubscription();

  if (!isPushSupported()) return "unsupported";
  if (subscription) return "subscribed";
  if (Notification.permission === "denied") return "blocked";
  return "enable";
}

/**
 * Mutation to subscribe the current device to push notifications.
 * Registers the SW, requests permission, and saves the subscription to DB.
 */
export function useSubscribeToPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Ensure the service worker is registered before subscribing
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service workers are not supported");
      }
      // Register SW if not already registered
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      return PushSubscriptionService.subscribe();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUSH_SUBSCRIPTION_QUERY_KEY });
    },
  });
}

/**
 * Mutation to unsubscribe the current device from push notifications.
 * Unsubscribes in the browser and removes the subscription from DB.
 */
export function useUnsubscribeFromPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => PushSubscriptionService.unsubscribe(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUSH_SUBSCRIPTION_QUERY_KEY });
    },
  });
}

/**
 * Convenience hook that bundles all push notification state and actions.
 */
export function usePushNotifications() {
  const { data: subscription, isLoading } = usePushSubscription();
  const bannerState = usePushBannerState();
  const subscribe = useSubscribeToPush();
  const unsubscribe = useUnsubscribeFromPush();

  return {
    subscription,
    isLoading,
    bannerState,
    isSupported: isPushSupported(),
    isSubscribed: !!subscription,
    subscribe,
    unsubscribe,
  };
}

/**
 * Registers the service worker on mount.
 * Call this once near the app root (e.g. in App.tsx or a top-level layout).
 * Safe to call even if the SW is already registered — the browser is idempotent.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.error("[sw] Registration failed:", err);
  }
}
