import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { reportSchema, type ReportFormData } from "../../lib/forms/schemas";
import type { Report } from "../../types/reports";

interface ReportFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  report?: Report | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string | null;
    dateRangeStart: string | null;
    dateRangeEnd: string | null;
  }) => Promise<void>;
}

interface ReportFormBodyProps {
  defaultValues: ReportFormData;
  isSubmitting: boolean;
  formId: string;
  onSubmit: ReportFormModalProps["onSubmit"];
}

export function ReportFormModal({
  isOpen,
  mode,
  report,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ReportFormModalProps) {
  const { t } = useTranslation();

  const titleKey = mode === "create" ? "reports.create" : "reports.edit";
  const titleText = t(
    titleKey,
    mode === "create" ? "New report" : "Edit report"
  );

  const footer = (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={onClose}
        disabled={isSubmitting}
      >
        {t("reports.form.cancel")}
      </Button>
      <Button
        type="submit"
        form="report-form"
        variant="primary"
        loading={isSubmitting}
      >
        {t(
          mode === "create" ? "reports.form.create" : "reports.form.save",
          mode === "create" ? "Create report" : "Save changes"
        )}
      </Button>
    </>
  );

  // Forms are remounted via `key` whenever the target report changes or the
  // modal reopens with a fresh state. Avoids the useEffect+derived-prop
  // anti-pattern (no-derived-state).
  const formKey = `${mode}-${report?.id ?? "new"}-${isOpen ? "open" : "closed"}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={isSubmitting}
      title={titleText}
      footer={footer}
    >
      {isOpen && (
        <ReportFormBody
          key={formKey}
          defaultValues={toDefaultValues(report)}
          isSubmitting={isSubmitting}
          formId="report-form"
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}

const EMPTY: ReportFormData = {
  title: "",
  description: "",
  dateRangeStart: "",
  dateRangeEnd: "",
};

function toDefaultValues(report?: Report | null): ReportFormData {
  if (!report) return EMPTY;
  return {
    title: report.title,
    description: report.description ?? "",
    dateRangeStart: report.dateRangeStart ?? "",
    dateRangeEnd: report.dateRangeEnd ?? "",
  };
}

function ReportFormBody({
  defaultValues,
  isSubmitting,
  formId,
  onSubmit,
}: ReportFormBodyProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues,
    mode: "onChange",
  });

  const submit = handleSubmit(async values => {
    await onSubmit({
      title: values.title.trim(),
      description: values.description?.trim()
        ? values.description.trim()
        : null,
      dateRangeStart: values.dateRangeStart || null,
      dateRangeEnd: values.dateRangeEnd || null,
    });
  });

  return (
    <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
      <Field
        label={t("reports.form.titleLabel", "Title")}
        error={errors.title?.message}
      >
        <input
          id="report-title"
          type="text"
          maxLength={120}
          placeholder={t("reports.form.titlePlaceholder")}
          {...register("title")}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] disabled:opacity-60"
        />
      </Field>

      <Field
        label={t("reports.form.descriptionLabel", "Description")}
        error={errors.description?.message}
      >
        <textarea
          id="report-description"
          rows={3}
          maxLength={2000}
          placeholder={t("reports.form.descriptionPlaceholder")}
          {...register("description")}
          disabled={isSubmitting}
          className="w-full resize-none rounded-lg border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] disabled:opacity-60"
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[var(--text-primary)]">
          {t("reports.form.dateRangeLabel", "Date range (optional)")}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t("reports.form.startDateLabel", "Start date")}
            error={errors.dateRangeStart?.message}
          >
            <input
              id="report-start"
              type="date"
              {...register("dateRangeStart")}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] disabled:opacity-60"
            />
          </Field>
          <Field
            label={t("reports.form.endDateLabel", "End date")}
            error={errors.dateRangeEnd?.message}
          >
            <input
              id="report-end"
              type="date"
              {...register("dateRangeEnd")}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] disabled:opacity-60"
            />
          </Field>
        </div>
      </fieldset>

      {!isValid && Object.keys(errors).length > 0 && (
        <p className="sr-only" role="alert">
          {t("reports.form.titleRequired")}
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-[var(--text-primary)]">
        {label}
      </span>
      {children}
      {error && (
        <span className="block text-xs text-rose-600" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
