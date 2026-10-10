import Link from "next/link";

import { Badge } from "@rescufood/ui/components/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";

export type KpiTone = "warning" | "info" | "success" | "secondary";

/**
 * One headline figure: a label, the number, and a link out. Shared by the
 * dashboard and the reports page so both read as one system.
 */
export function KpiCard({
  label,
  value,
  suffix,
  badge,
  badgeTone = "secondary",
  footer,
  caption,
  href,
}: {
  label: string;
  value: string;
  suffix?: string;
  badge?: string;
  badgeTone?: KpiTone;
  footer: string;
  caption: string;
  href: string;
}) {
  return (
    <Card
      data-slot="card"
      // Four across on a phone leaves ~80px a card, so the inset shrinks.
      className="group gap-0 [--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(5)]"
    >
      <CardHeader>
        <CardDescription className="truncate text-xs sm:text-sm">
          {label}
        </CardDescription>
        <CardTitle className="text-lg font-semibold tabular-nums sm:text-2xl lg:text-3xl">
          {value}
          {suffix && (
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              {suffix}
            </span>
          )}
        </CardTitle>
        {badge && (
          <CardAction>
            <Badge variant={badgeTone}>{badge}</Badge>
          </CardAction>
        )}
      </CardHeader>
      {/* mt-auto keeps this flush with the card's base, so a row aligns. */}
      <CardContent className="mt-auto pt-3 sm:pt-4">
        <Link
          href={href}
          className="block truncate text-xs font-medium underline-offset-4 hover:underline sm:text-sm"
        >
          {footer}
        </Link>
        {/* The caption is supporting detail; it goes first when space is tight. */}
        <p className="mt-1 hidden line-clamp-1 text-xs text-muted-foreground sm:block">
          {caption}
        </p>
      </CardContent>
    </Card>
  );
}
