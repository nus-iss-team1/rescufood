"use client";

import * as React from "react";
import dayjs from "dayjs";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@rescufood/ui/components/button";
import { Calendar } from "@rescufood/ui/components/calendar";
import { Field, FieldGroup, FieldLabel } from "@rescufood/ui/components/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rescufood/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rescufood/ui/components/select";
import { cn } from "@/lib/utils";

const HOURS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MINUTES = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
];

function parseDateTime(val?: string) {
  const today = new Date();
  if (!val) return { date: today, time: "" };
  const parsed = new Date(val);
  if (Number.isNaN(parsed.getTime())) {
    const parts = val.split("T");
    return { date: today, time: parts[1] ? parts[1].slice(0, 5) : "" };
  }
  const timeStr = val.includes("T")
    ? val.split("T")[1].slice(0, 5)
    : `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
  return { date: parsed, time: timeStr };
}

function to12Hour(time24?: string): {
  hour: string;
  minute: string;
  period: "AM" | "PM";
} {
  if (!time24) return { hour: "12", minute: "00", period: "PM" };
  const parts = time24.split(":");
  const h24 = parseInt(parts[0] || "12", 10);
  const m = parseInt(parts[1] || "0", 10);

  // Snap to nearest 5-minute interval
  const nearest5 = Math.round(m / 5) * 5;
  const snappedM = nearest5 >= 60 ? 55 : nearest5;
  const minStr = String(snappedM).padStart(2, "0");

  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;

  return {
    hour: String(h12),
    minute: minStr,
    period,
  };
}

function to24Hour(hour: string, minute: string, period: "AM" | "PM"): string {
  const hNum = parseInt(hour || "12", 10);
  let h24 = hNum % 12;
  if (period === "PM") {
    h24 += 12;
  }
  const minStr = (minute || "00").padStart(2, "0");
  return `${String(h24).padStart(2, "0")}:${minStr}:00`;
}

/**
 * Dropdown-based 12-hour time selector (Hours 1-12, Minutes in 5-min intervals, AM/PM).
 */
function DropdownTimeInput({
  id,
  value = "",
  onChange,
  className,
}: {
  id: string;
  value?: string;
  onChange?: (time24: string) => void;
  className?: string;
}) {
  const initial = to12Hour(value);
  const [hour, setHour] = React.useState(initial.hour);
  const [minute, setMinute] = React.useState(initial.minute);
  const [period, setPeriod] = React.useState<"AM" | "PM">(initial.period);
  const [prevValue, setPrevValue] = React.useState(value);

  // Synchronize when value changes externally
  if (value !== prevValue) {
    setPrevValue(value);
    const next = to12Hour(value);
    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  }

  const handleHourChange = (newHour: string) => {
    setHour(newHour);
    const time24 = to24Hour(newHour, minute, period);
    setPrevValue(time24);
    onChange?.(time24);
  };

  const handleMinuteChange = (newMinute: string) => {
    setMinute(newMinute);
    const time24 = to24Hour(hour, newMinute, period);
    setPrevValue(time24);
    onChange?.(time24);
  };

  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    setPeriod(newPeriod);
    const time24 = to24Hour(hour, minute, newPeriod);
    setPrevValue(time24);
    onChange?.(time24);
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Select value={hour} onValueChange={(val) => val && handleHourChange(val)}>
        <SelectTrigger
          id={`${id}-hour`}
          aria-label="Hour"
          className="h-9 w-[4.25rem] px-2 text-center"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-56 min-w-[4.25rem]">
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span
        className="select-none text-sm font-semibold text-muted-foreground"
        aria-hidden="true"
      >
        :
      </span>

      <Select
        value={minute}
        onValueChange={(val) => val && handleMinuteChange(val)}
      >
        <SelectTrigger
          id={`${id}-minute`}
          aria-label="Minute"
          className="h-9 w-[4.25rem] px-2 text-center"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-56 min-w-[4.25rem]">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={period}
        onValueChange={(val) =>
          val && handlePeriodChange(val as "AM" | "PM")
        }
      >
        <SelectTrigger
          id={`${id}-period`}
          aria-label="AM or PM"
          className="h-9 w-[4.75rem] px-2 text-center font-medium"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[4.75rem]">
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Date and time pickers over one hidden input.
 * Defaults date to today and provides clean dropdowns for 12-hour time (1-12, 0-55 in 5-min intervals, AM/PM).
 * Outputs standard local "YYYY-MM-DDTHH:mm:ss" ISO format for backend compatibility.
 */
export function DateTimeField({
  id,
  name,
  label,
  value,
  defaultValue = "",
  onChange,
  className,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (val: string) => void;
  className?: string;
}) {
  const isControlled = value !== undefined;
  const currentVal = isControlled ? value : defaultValue;
  const parsed = parseDateTime(currentVal);

  const [open, setOpen] = React.useState(false);
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(
    parsed.date
  );
  const [internalTime, setInternalTime] = React.useState(parsed.time || "12:00:00");

  const date = (isControlled ? parsed.date : internalDate) ?? new Date();
  const time = isControlled ? parsed.time : internalTime;

  const handleDateSelect = (nextDate: Date | undefined) => {
    const selectedDate = nextDate ?? new Date();
    if (!isControlled) {
      setInternalDate(selectedDate);
    }
    const formattedTime = time || "12:00:00";
    const nextVal = `${dayjs(selectedDate).format("YYYY-MM-DD")}T${formattedTime.length === 5 ? `${formattedTime}:00` : formattedTime}`;
    onChange?.(nextVal);
    setOpen(false);
  };

  const handleTimeChange = (nextTime24: string) => {
    if (!isControlled) {
      setInternalTime(nextTime24);
    }
    const nextVal = date
      ? `${dayjs(date).format("YYYY-MM-DD")}T${nextTime24}`
      : "";
    onChange?.(nextVal);
  };

  const formattedTime = time || "12:00:00";
  const hiddenValue = date
    ? `${dayjs(date).format("YYYY-MM-DD")}T${formattedTime.length === 5 ? `${formattedTime}:00` : formattedTime}`
    : "";

  return (
    <FieldGroup className={cn("flex flex-col sm:flex-row gap-3 sm:gap-2", className)}>
      <Field className="flex-1">
        <FieldLabel htmlFor={`${id}-date`}>{label}</FieldLabel>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                id={`${id}-date`}
                className="h-auto min-h-9 w-full justify-between px-2.5 py-1 font-normal"
              >
                {dayjs(date).format("D MMM YYYY")}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            }
          />
          <PopoverContent
            className="w-(--anchor-width) overflow-hidden p-0"
            align="start"
          >
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              defaultMonth={date}
              onSelect={handleDateSelect}
              className="w-full"
            />
          </PopoverContent>
        </Popover>
      </Field>
      <Field className="w-fit">
        <FieldLabel htmlFor={`${id}-hour`}>Time</FieldLabel>
        <DropdownTimeInput
          id={id}
          value={time}
          onChange={handleTimeChange}
        />
      </Field>
      <input type="hidden" name={name} value={hiddenValue} readOnly />
    </FieldGroup>
  );
}
