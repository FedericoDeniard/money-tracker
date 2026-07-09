import type { User } from "@supabase/supabase-js";

export function getDisplayName(user: User | null | undefined): string {
  const metadata = user?.user_metadata as
    | { full_name?: string; name?: string }
    | undefined;
  const fullName = metadata?.full_name ?? metadata?.name;
  if (fullName) {
    const first = fullName.split(" ")[0]?.trim();
    if (first) return first;
  }
  const email = user?.email;
  if (email) {
    const local = email.split("@")[0];
    if (local) {
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
  }
  return "";
}
