import {
  Calendar,
  Circle,
  Tag,
  Wallet,
  Mail,
  ArrowUpDown,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  LayoutList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterType } from "./filters-types";

export function FilterIcon({
  type,
  className,
}: {
  type: FilterType | string;
  className?: string;
}) {
  const iconClass = cn("size-3.5", className);
  switch (type) {
    case FilterType.TYPE:
      return <LayoutList className={iconClass} />;
    case FilterType.CATEGORY:
      return <Tag className={iconClass} />;
    case FilterType.SERVICE_NAME:
      return <Search className={iconClass} />;
    case FilterType.CURRENCY:
      return <Wallet className={iconClass} />;
    case FilterType.EMAIL:
      return <Mail className={iconClass} />;
    case FilterType.START_DATE:
    case FilterType.END_DATE:
      return <Calendar className={iconClass} />;
    case FilterType.SORT_BY:
      return <ArrowUpDown className={iconClass} />;
    case "income":
      return <ArrowDownCircle className={iconClass} />;
    case "expense":
      return <ArrowUpCircle className={iconClass} />;
    case "all":
      return <LayoutList className={iconClass} />;
    default:
      return <Circle className={iconClass} />;
  }
}
