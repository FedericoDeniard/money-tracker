// Fixed 8-color palette for transaction tags. Matches the palette already
// used by CategoryPieChart / CategoryTreeMapChart to keep visual consistency
// across the app.

export const TAG_COLORS = [
  "slate",
  "emerald",
  "indigo",
  "coral",
  "amber",
  "cerulean",
  "lavender",
  "rose",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const DEFAULT_TAG_COLOR: TagColor = "slate";

export const TAG_COLOR_CLASSES: Record<
  TagColor,
  { bg: string; fg: string; border: string; ring: string }
> = {
  slate: {
    bg: "bg-slate-100",
    fg: "text-slate-700",
    border: "border-slate-300",
    ring: "ring-slate-400",
  },
  emerald: {
    bg: "bg-emerald-100",
    fg: "text-emerald-700",
    border: "border-emerald-300",
    ring: "ring-emerald-400",
  },
  indigo: {
    bg: "bg-indigo-100",
    fg: "text-indigo-700",
    border: "border-indigo-300",
    ring: "ring-indigo-400",
  },
  coral: {
    bg: "bg-rose-100",
    fg: "text-rose-700",
    border: "border-rose-300",
    ring: "ring-rose-400",
  },
  amber: {
    bg: "bg-amber-100",
    fg: "text-amber-700",
    border: "border-amber-300",
    ring: "ring-amber-400",
  },
  cerulean: {
    bg: "bg-sky-100",
    fg: "text-sky-700",
    border: "border-sky-300",
    ring: "ring-sky-400",
  },
  lavender: {
    bg: "bg-violet-100",
    fg: "text-violet-700",
    border: "border-violet-300",
    ring: "ring-violet-400",
  },
  rose: {
    bg: "bg-pink-100",
    fg: "text-pink-700",
    border: "border-pink-300",
    ring: "ring-pink-400",
  },
};
