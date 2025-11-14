"use client";

import * as React from "react";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MonthPicker({
  date,
  setDate,
  className,
}: {
  date?: Date;
  setDate: (date?: Date) => void;
  className?: string;
}) {
  const [currentMonth, setCurrentMonth] = React.useState(startOfMonth(date || new Date()));

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleMonthSelect = (month: Date) => {
    setDate(month);
  };

  const renderMonths = () => {
    const months = [];
    const currentYear = currentMonth.getFullYear();

    for (let i = 0; i < 12; i++) {
      const month = new Date(currentYear, i, 1);
      months.push(
        <Button
          key={i}
          variant={format(month, "MMM") === format(date || new Date(), "MMM") ? "default" : "ghost"}
          onClick={() => handleMonthSelect(month)}
          className="w-full"
        >
          {format(month, "MMMM")}
        </Button>
      );
    }
    return months;
  };

  return (
    <div className={cn("p-3", className)}>
        <div className="flex items-center justify-between pb-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
                {format(currentMonth, "yyyy")}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
            {renderMonths()}
        </div>
    </div>
  );
}
