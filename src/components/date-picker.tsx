
"use client"

import * as React from "react"
import { format, startOfMonth } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    className?: string;
    viewMode?: "daily" | "monthly";
}

export function DatePicker({ date, setDate, className, viewMode = "daily" }: DatePickerProps) {
    const [popoverOpen, setPopoverOpen] = React.useState(false);

    if (viewMode === 'monthly') {
      const handleMonthSelect = (month: Date) => {
        setDate(startOfMonth(month));
        setPopoverOpen(false);
      }

      return (
        <div className={cn("grid gap-2", className)}>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "LLLL yyyy") : <span>Pick a month</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  if (d) handleMonthSelect(d);
                }}
                components={{
                  Row: () => null, // Hide days
                  Day: () => null, // Hide days
                }}
                footer={
                    <div className="grid grid-cols-3 gap-2 p-2">
                        {Array.from({ length: 12 }).map((_, i) => {
                            const monthDate = new Date(date?.getFullYear() || new Date().getFullYear(), i, 1);
                            return (
                                <Button
                                    key={i}
                                    variant={date?.getMonth() === i ? "default" : "outline"}
                                    onClick={() => handleMonthSelect(monthDate)}
                                >
                                    {format(monthDate, "MMM")}
                                </Button>
                            );
                        })}
                    </div>
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      );
    }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
