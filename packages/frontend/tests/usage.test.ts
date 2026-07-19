/**
 * Pure-logic tests for the usage panel helpers. No Supabase, no
 * React, no i18n — bun:test is enough.
 */
import { describe, expect, test } from "bun:test";
import {
  addMonthsIso,
  computeResetsAt,
  findCurrentPeriodCounter,
  formatResetDate,
  getUsageRowStatus,
  resolveUsageLimit,
  startOfMonthUtc,
} from "../src/utils/usage";
import type { Capability } from "../src/lib/capabilities";

describe("resolveUsageLimit", () => {
  const limits = [
    {
      capability: "ai_assistant" as Capability,
      scopeKind: "role" as const,
      scopeValue: "tester",
      period: "month" as const,
      maxCount: 200,
    },
    {
      capability: "ai_assistant" as Capability,
      scopeKind: "default" as const,
      scopeValue: null,
      period: "month" as const,
      maxCount: 50,
    },
    {
      capability: "gmail_sync" as Capability,
      scopeKind: "default" as const,
      scopeValue: null,
      period: "month" as const,
      maxCount: 100,
    },
    {
      capability: "report_pdf_export" as Capability,
      scopeKind: "role" as const,
      scopeValue: "tester",
      period: "month" as const,
      maxCount: 500,
    },
    {
      capability: "report_pdf_export" as Capability,
      scopeKind: "plan" as const,
      scopeValue: "lite_monthly",
      period: "month" as const,
      maxCount: 200,
    },
    {
      capability: "report_pdf_export" as Capability,
      scopeKind: "default" as const,
      scopeValue: null,
      period: "month" as const,
      maxCount: 10,
    },
  ];

  test("role override wins over plan and default", () => {
    expect(resolveUsageLimit("tester", null, "ai_assistant", limits)).toEqual({
      value: 200,
      scopeKind: "role",
      scopeValue: "tester",
    });
  });

  test("plan override wins over default", () => {
    expect(
      resolveUsageLimit("user", "lite_monthly", "report_pdf_export", limits)
    ).toEqual({
      value: 200,
      scopeKind: "plan",
      scopeValue: "lite_monthly",
    });
  });

  test("falls through to default", () => {
    expect(resolveUsageLimit("user", null, "ai_assistant", limits)).toEqual({
      value: 50,
      scopeKind: "default",
      scopeValue: null,
    });
    expect(resolveUsageLimit(null, null, "gmail_sync", limits)).toEqual({
      value: 100,
      scopeKind: "default",
      scopeValue: null,
    });
  });

  test("returns null when no row matches at any scope", () => {
    expect(
      resolveUsageLimit(
        "user",
        "lite_monthly",
        "push_notifications" as Capability,
        limits
      )
    ).toBeNull();
  });

  test("skips rows with non-month period", () => {
    const dayLimits = [
      {
        capability: "ai_assistant" as Capability,
        scopeKind: "default" as const,
        scopeValue: null,
        period: "day" as const,
        maxCount: 1,
      },
      {
        capability: "ai_assistant" as Capability,
        scopeKind: "default" as const,
        scopeValue: null,
        period: "month" as const,
        maxCount: 50,
      },
    ];
    expect(resolveUsageLimit("user", null, "ai_assistant", dayLimits)).toEqual({
      value: 50,
      scopeKind: "default",
      scopeValue: null,
    });
  });

  test("treats unknown scope_kind as no override (falls through)", () => {
    const teamLimits = [
      {
        capability: "ai_assistant" as Capability,
        scopeKind: "team" as const,
        scopeValue: "enterprise",
        period: "month" as const,
        maxCount: 999,
      },
      {
        capability: "ai_assistant" as Capability,
        scopeKind: "default" as const,
        scopeValue: null,
        period: "month" as const,
        maxCount: 50,
      },
    ];
    expect(resolveUsageLimit("user", null, "ai_assistant", teamLimits)).toEqual(
      { value: 50, scopeKind: "default", scopeValue: null }
    );
  });
});

describe("startOfMonthUtc / addMonthsIso / computeResetsAt", () => {
  test("startOfMonthUtc is the first instant of the UTC month", () => {
    const jan15 = new Date("2026-01-15T12:34:56.789Z");
    expect(startOfMonthUtc(jan15)).toBe("2026-01-01T00:00:00.000Z");
  });

  test("addMonthsIso handles year boundary", () => {
    expect(addMonthsIso("2026-12-15T00:00:00.000Z", 1)).toBe(
      "2027-01-15T00:00:00.000Z"
    );
    expect(addMonthsIso("2026-01-15T00:00:00.000Z", 12)).toBe(
      "2027-01-15T00:00:00.000Z"
    );
  });

  test("addMonthsIso clamps month-end (Jan 31 -> Feb 28)", () => {
    // Postgres `interval '1 month'` for Jan 31 + 1 month gives Feb 28.
    expect(addMonthsIso("2026-01-31T00:00:00.000Z", 1)).toBe(
      "2026-02-28T00:00:00.000Z"
    );
    expect(addMonthsIso("2024-01-31T00:00:00.000Z", 1)).toBe(
      "2024-02-29T00:00:00.000Z" // leap year
    );
  });

  test("computeResetsAt is exactly +1 month from period_start", () => {
    expect(computeResetsAt("2026-07-01T00:00:00.000Z")).toBe(
      "2026-08-01T00:00:00.000Z"
    );
  });
});

describe("formatResetDate", () => {
  test("produces YYYY-MM-DD", () => {
    expect(formatResetDate("2026-07-01T00:00:00.000Z")).toBe("2026-07-01");
    expect(formatResetDate("2026-08-01T00:00:00.000Z")).toBe("2026-08-01");
    expect(formatResetDate("2026-12-31T23:59:59.999Z")).toBe("2026-12-31");
  });
});

describe("getUsageRowStatus", () => {
  test("green for 0-79%", () => {
    expect(getUsageRowStatus(0, 100)).toBe("ok");
    expect(getUsageRowStatus(79, 100)).toBe("ok");
  });
  test("yellow for 80-99%", () => {
    expect(getUsageRowStatus(80, 100)).toBe("warn");
    expect(getUsageRowStatus(99, 100)).toBe("warn");
  });
  test("red for >=100%", () => {
    expect(getUsageRowStatus(100, 100)).toBe("exceeded");
    expect(getUsageRowStatus(150, 100)).toBe("exceeded");
  });
  test("limit of zero is exceeded", () => {
    expect(getUsageRowStatus(0, 0)).toBe("exceeded");
    expect(getUsageRowStatus(1, 0)).toBe("exceeded");
  });
});

describe("findCurrentPeriodCounter", () => {
  const counters = [
    {
      capability: "ai_assistant" as Capability,
      count: 12,
      period_start: "2026-07-01T00:00:00.000Z",
    },
    {
      capability: "gmail_sync" as Capability,
      count: 0,
      period_start: "2026-07-01T00:00:00.000Z",
    },
  ];
  test("returns the matching row", () => {
    expect(
      findCurrentPeriodCounter(
        "ai_assistant",
        counters,
        "2026-07-01T00:00:00.000Z"
      )?.count
    ).toBe(12);
  });
  test("returns null when no row exists", () => {
    expect(
      findCurrentPeriodCounter(
        "process_documents" as Capability,
        counters,
        "2026-07-01T00:00:00.000Z"
      )
    ).toBeNull();
  });
  test("uses server period when client mismatch (warns)", () => {
    const stale = findCurrentPeriodCounter(
      "ai_assistant",
      counters,
      "2026-06-01T00:00:00.000Z"
    );
    expect(stale?.count).toBe(12); // server wins
  });
});
