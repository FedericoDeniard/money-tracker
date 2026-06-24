import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_TIMEZONE = "UTC";

function partsForTimezone(
  timezone: string,
  now: Date = new Date()
): {
  year: string;
  month: string;
  day: string;
  weekday: string;
  hour: string;
  minute: string;
} {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  });
  const parts = dtf.formatToParts(now);
  const map = new Map<string, string>();
  for (const p of parts) {
    if (p.type !== "literal") map.set(p.type, p.value);
  }
  return {
    year: map.get("year") ?? "1970",
    month: map.get("month") ?? "01",
    day: map.get("day") ?? "01",
    weekday: map.get("weekday") ?? "Thu",
    hour: map.get("hour") ?? "00",
    minute: map.get("minute") ?? "00",
  };
}

function weekdayToIndex(weekday: string): number {
  const normalized = weekday.toLowerCase();
  const aliases: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  const key = normalized.slice(0, 3);
  return aliases[key] ?? 4;
}

export const getCurrentDateTool = createTool({
  id: "get-current-date",
  description:
    "Get the current date in the user's local timezone. Returns today's date as YYYY-MM-DD, the day of the week, an ISO 8601 timestamp with the timezone offset, and the IANA timezone identifier (e.g. 'America/Argentina/Buenos_Aires'). Use this whenever the user refers to relative dates (today, yesterday, this month, this year, last week) and you need an absolute date to pass to other tools such as listTransactionsTool (from/to), createTransactionTool (transaction_date), updateTransactionTool (transaction_date), or getSpendingSummaryTool (from/to). You do NOT reliably know today's date on your own, so always call this tool first when a relative date is involved. Do not guess or hardcode the current date.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    today: z
      .string()
      .describe("Current date in YYYY-MM-DD format (user timezone)."),
    dayOfWeek: z.string().describe("Day of the week, e.g. 'Saturday'."),
    isoTimestamp: z
      .string()
      .describe(
        "ISO 8601 timestamp with timezone offset, e.g. '2026-06-20T14:30:00-03:00'."
      ),
    timezone: z
      .string()
      .describe(
        "IANA timezone identifier used to compute the date, e.g. 'America/Argentina/Buenos_Aires' or 'UTC'."
      ),
  }),
  requestContextSchema: z.object({
    userId: z.string(),
    userTimezone: z.string().optional(),
  }),
  execute: async (_input, ctx) => {
    const requestedTimezone = ctx.requestContext!.all.userTimezone;

    // Validate the timezone by attempting to format with it. If it is
    // missing or invalid, fall back to UTC so the tool never throws.
    let timezone = DEFAULT_TIMEZONE;
    if (requestedTimezone) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: requestedTimezone });
        timezone = requestedTimezone;
      } catch {
        timezone = DEFAULT_TIMEZONE;
      }
    }

    const now = new Date();
    const parts = partsForTimezone(timezone, now);

    const today = `${parts.year}-${parts.month}-${parts.day}`;
    const dayOfWeek = DAY_NAMES[weekdayToIndex(parts.weekday)];

    // Build an ISO 8601 string with the real offset of `timezone` at
    // `now`. We construct a local-time string and let Date.parse compute
    // the offset vs UTC, then format it as ±HH:MM.
    const localMs = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      0
    );
    const offsetMs = localMs - now.getTime();
    const offsetMinutes = Math.round(offsetMs / 60000);
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absMinutes / 60)).padStart(2, "0");
    const offsetMins = String(absMinutes % 60).padStart(2, "0");
    const offsetStr = `${sign}${offsetHours}:${offsetMins}`;

    const isoTimestamp = `${today}T${parts.hour}:${parts.minute}:00${offsetStr}`;

    return {
      today,
      dayOfWeek,
      isoTimestamp,
      timezone,
    };
  },
});
