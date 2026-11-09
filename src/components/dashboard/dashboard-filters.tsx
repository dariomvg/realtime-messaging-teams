"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { dashboardContent, positions } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DashboardView = "workers" | "messages";

type Props = { view: DashboardView; q: string; position: string };

const ALL = "all";

function buildUrl(pathname: string, view: DashboardView, q: string, position: string) {
  const params = new URLSearchParams();
  if (view !== "workers") params.set("view", view);
  if (q) params.set("q", q);
  if (position) params.set("position", position);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function DashboardFilters({ view, q, position }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const content = dashboardContent.filters;
  const [search, setSearch] = useState(q);

  // Debounced search: the URL is the single source of truth for filters.
  useEffect(() => {
    const next = search.trim();
    if (next === q) return;
    const timeout = setTimeout(() => {
      router.replace(buildUrl(pathname, view, next, position), { scroll: false });
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, q, view, position, pathname, router]);

  function changeView(next: DashboardView) {
    if (next === view) return;
    setSearch("");
    router.replace(buildUrl(pathname, next, "", position), { scroll: false });
  }

  function changePosition(value: string | null) {
    const next = !value || value === ALL ? "" : value;
    router.replace(buildUrl(pathname, view, q, next), { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={
          view === "workers" ? content.searchPlaceholder : content.searchMessagesPlaceholder
        }
        maxLength={100}
        aria-label={content.searchPlaceholder}
        className="md:max-w-xs"
      />

      <Select value={position || ALL} onValueChange={changePosition}>
        <SelectTrigger className="w-full md:w-56" aria-label={content.positionPlaceholder}>
          <SelectValue placeholder={content.positionPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{content.allPositions}</SelectItem>
          {positions.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div role="group" className="flex md:ml-auto">
        <Button
          type="button"
          variant={view === "workers" ? "default" : "outline"}
          aria-pressed={view === "workers"}
          onClick={() => changeView("workers")}
          className="flex-1 md:flex-none"
        >
          {content.workersView}
        </Button>
        <Button
          type="button"
          variant={view === "messages" ? "default" : "outline"}
          aria-pressed={view === "messages"}
          onClick={() => changeView("messages")}
          className="flex-1 md:flex-none"
        >
          {content.messagesView}
        </Button>
      </div>
    </div>
  );
}
