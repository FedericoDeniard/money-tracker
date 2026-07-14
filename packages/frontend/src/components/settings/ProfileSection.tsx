import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { getDisplayName } from "../../utils/user";
import { Button } from "../ui/Button";
import { SettingsCategoryCard } from "./SettingsCategoryCard";
import { toast } from "../../utils/toast";

const MAX_NAME_LENGTH = 100;

export function ProfileSection() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const inputId = useId();

  const initialName = getDisplayName(user);
  const [draft, setDraft] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const trimmed = draft.trim();
  const dirty = trimmed !== initialName;
  const valid = trimmed.length > 0 && trimmed.length <= MAX_NAME_LENGTH;

  const handleEdit = () => {
    setDraft(initialName);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(initialName);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!valid || !dirty || isSaving) return;
    setIsSaving(true);
    try {
      const { getSupabase } = await import("../../lib/supabase");
      const supabase = await getSupabase();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed, name: trimmed },
      });
      if (error) {
        throw error;
      }
      await refreshUser();
      setIsEditing(false);
      toast.success(t("settingsLayout.profile.saved"));
    } catch (error) {
      console.error("Failed to update display name:", error);
      toast.error(t("settingsLayout.profile.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsCategoryCard
      id="profile"
      titleKey="settingsLayout.nav.profile"
      descriptionKey="settingsLayout.categoryDescription.profile"
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            {t("settingsLayout.profile.email")}
          </p>
          <p className="mt-1 text-sm text-[var(--text-primary)]">
            {user?.email ?? "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)] opacity-70">
            {t("settingsLayout.profile.emailHint")}
          </p>
        </div>

        <div>
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[var(--text-secondary)]"
          >
            {t("settingsLayout.profile.displayName")}
          </label>
          {isEditing ? (
            <div className="mt-1 space-y-2">
              <input
                id={inputId}
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                maxLength={MAX_NAME_LENGTH}
                placeholder={t("settingsLayout.profile.displayNamePlaceholder")}
                className="w-full px-3 py-2 rounded-lg border border-[var(--text-secondary)]/30 bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#3d5a80] focus:ring-1 focus:ring-[#3d5a80]"
                disabled={isSaving}
                autoFocus
              />
              <p className="text-xs text-[var(--text-secondary)] opacity-70">
                {t("settingsLayout.profile.displayNameHint")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={!valid || !dirty || isSaving}
                  loading={isSaving}
                >
                  {t("settingsLayout.profile.save")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  {t("settingsLayout.profile.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--text-primary)]">
                {initialName || (
                  <span className="text-[var(--text-secondary)] italic">
                    {t("settingsLayout.profile.displayNamePlaceholder")}
                  </span>
                )}
              </p>
              <Button variant="secondary" size="sm" onClick={handleEdit}>
                {t("common.edit", "Edit")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </SettingsCategoryCard>
  );
}
