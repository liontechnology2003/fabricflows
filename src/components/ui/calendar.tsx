
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, CaptionProps, useNavigation, DropdownProps } from "react-day-picker"
import { format, getYear, getMonth } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  view?: "days" | "months" | "years";
  onViewChange?: (view: "days" | "months" | "years") => void;
};


function CustomCaption(props: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  const years = Array.from({ length: getYear(new Date()) + 10 - 2020 }, (_, i) => 2020 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);
  
  return (
    <div className="flex justify-center pt-1 relative items-center">
      <div className="flex gap-1">
        <Select
          value={String(getMonth(props.displayMonth))}
          onValueChange={(value) => {
            const newDate = new Date(props.displayMonth);
            newDate.setMonth(parseInt(value, 10));
            goToMonth(newDate);
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month} value={String(month)}>
                {format(new Date(2000, month), "MMMM")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(getYear(props.displayMonth))}
          onValueChange={(value) => {
            const newDate = new Date(props.displayMonth);
            newDate.setFullYear(parseInt(value, 10));
            goToMonth(newDate);
          }}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-x-1 flex items-center absolute right-0">
          <Button
            disabled={!previousMonth}
            onClick={() => previousMonth && goToMonth(previousMonth)}
            variant="outline"
            className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            disabled={!nextMonth}
            onClick={() => nextMonth && goToMonth(nextMonth)}
            variant="outline"
            className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
      </div>
    </div>
  );
}


function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  view = "days",
  onViewChange,
  ...props
}: CalendarProps) {
  const isMonthView = view === "months";
  
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: isMonthView ? "space-y-4 w-full" : "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...(isMonthView && {
            month: "space-y-0",
            table: "w-full",
            tbody: "grid grid-cols-3 gap-2",
            row: "flex-col space-y-2",
            head: "hidden",
            day: cn(
              buttonVariants({ variant: "outline" }),
              "w-full h-auto py-2 px-4 justify-center text-sm"
            ),
        }),
        ...classNames,
      }}
      components={{
        Caption: isMonthView ? CustomCaption : undefined,
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
