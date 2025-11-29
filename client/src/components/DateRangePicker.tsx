import { useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import "react-day-picker/style.css";

interface DateRangePickerProps {
  onRangeChange: (range: { startDate?: string; endDate?: string }) => void;
  onPresetChange: (preset: string) => void;
  selectedPreset: string;
}

export function DateRangePicker({ onRangeChange, onPresetChange, selectedPreset }: DateRangePickerProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isOpen, setIsOpen] = useState(false);

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onRangeChange({
        startDate: range.from.toISOString(),
        endDate: range.to.toISOString(),
      });
      onPresetChange("custom");
    } else if (range?.from) {
      onRangeChange({
        startDate: range.from.toISOString(),
        endDate: range.from.toISOString(),
      });
      onPresetChange("custom");
    }
  };

  const handleClear = () => {
    setDateRange(undefined);
    onRangeChange({});
    onPresetChange("all");
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return "Выбрать период";
    if (!dateRange.to) return format(dateRange.from, "dd MMM yyyy", { locale: ru });
    return `${format(dateRange.from, "dd MMM", { locale: ru })} - ${format(dateRange.to, "dd MMM yyyy", { locale: ru })}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`${
            selectedPreset === "custom"
              ? "bg-primary text-primary-foreground"
              : "bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-white"
          } flex items-center gap-2`}
        >
          <Calendar className="w-4 h-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700" align="start">
        <div className="p-3 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-white">Выбрать период</h4>
            {dateRange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 px-2 text-xs text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3 mr-1" />
                Очистить
              </Button>
            )}
          </div>
          {dateRange?.from && (
            <p className="text-xs text-slate-400">
              {dateRange.to
                ? `${format(dateRange.from, "dd MMMM yyyy", { locale: ru })} - ${format(dateRange.to, "dd MMMM yyyy", { locale: ru })}`
                : format(dateRange.from, "dd MMMM yyyy", { locale: ru })}
            </p>
          )}
        </div>
        <div className="p-3">
          <DayPicker
            mode="range"
            selected={dateRange}
            onSelect={handleRangeSelect}
            locale={ru}
            numberOfMonths={2}
            className="custom-day-picker"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center text-white",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-slate-400 rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-white hover:bg-slate-800 rounded-md transition-colors",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-slate-800 text-white",
              day_outside: "text-slate-600 opacity-50",
              day_disabled: "text-slate-600 opacity-50",
              day_range_middle: "aria-selected:bg-slate-800 aria-selected:text-white",
              day_hidden: "invisible",
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
