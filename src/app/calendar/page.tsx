"use client";

import React, { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/client";
import { reconcileCalendarFromSQLite } from "@/lib/services/vault-sync-service";
import { type Event } from "@/lib/schemas/event";
import {
  CalendarHeader,
  type CalendarViewMode,
} from "@/components/calendar/calendar-header";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { EventModal } from "@/components/calendar/event-modal";
import { EventDetails } from "@/components/calendar/event-details";
import {
  getAllOccurrencesForRange,
  getMonthCalendarGrid,
  getWeekDays,
} from "@/lib/utils/recurrence";
import {
  getLocalDateString,
  parseLocalDate,
  getOffsetDateString,
  formatMonthYear,
  formatDateDisplay,
  useTodayDate,
} from "@/lib/utils/dates";
import { DeepLinkListener } from "@/components/common/deep-link-listener";
import { Button, EmptyState, SurfaceCard } from "@/components/ui";
import { Calendar as CalendarIcon, Plus } from "lucide-react";

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const todayStr = useTodayDate();
  const [userCurrentDate, setUserCurrentDate] = useState<string | null>(null);
  const [userSelectedDate, setUserSelectedDate] = useState<string | null>(null);

  const activeCurrentDate = userCurrentDate ?? (todayStr || getLocalDateString());
  const activeSelectedDate = userSelectedDate ?? (todayStr || getLocalDateString());
  const setCurrentDateStr = (d: string) => setUserCurrentDate(d);
  const setSelectedDateStr = (d: string) => setUserSelectedDate(d);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [modalInitialEvent, setModalInitialEvent] = useState<Event | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(
    undefined
  );
  const [modalInitialTime, setModalInitialTime] = useState<string | undefined>(
    undefined
  );

  const [activeDetails, setActiveDetails] = useState<{
    event: Event;
    occurrenceDate: string;
  } | null>(null);

  // Deep link handler for /calendar?eventId={id}&date={date}
  const handleCalendarDeepLink = useCallback(
    async ({ eventId, date }: Record<string, string>) => {
      if (!eventId) return;
      try {
        const event = await db.events.get(eventId);
        if (event) {
          const targetDate =
            date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : event.date;
          setCurrentDateStr(targetDate);
          setSelectedDateStr(targetDate);
          setActiveDetails({
            event,
            occurrenceDate: targetDate,
          });
        } else {
          console.warn(`[DeepLink] Event not found: ${eventId}`);
        }
      } catch (err) {
        console.error("[DeepLink] Failed to load calendar event:", err);
      }
    },
    []
  );

  // Fetch user settings (for weekStartsOn) and all events reactively from Dexie
  const userSettings = useLiveQuery(() => db.settings.get("user_settings"), []);
  const weekStartsOn = (userSettings?.weekStartsOn as "monday" | "sunday") ?? "monday";

  const allEvents = useLiveQuery(async () => {
    return await db.events.toArray();
  }, []);

  // Flush-Before-Hydrate for Calendar Events & Reminders
  useEffect(() => {
    void reconcileCalendarFromSQLite();
  }, []);

  const currentDateObj = useMemo(
    () => parseLocalDate(activeCurrentDate),
    [activeCurrentDate]
  );
  const currentYear = currentDateObj.getFullYear();
  const currentMonth = currentDateObj.getMonth() + 1; // 1-12

  // Compute title for the header based on active view mode
  const headerTitle = useMemo(() => {
    if (viewMode === "month") {
      return formatMonthYear(activeCurrentDate);
    } else if (viewMode === "week") {
      const days = getWeekDays(activeCurrentDate, todayStr, weekStartsOn);
      const first = days[0].dateStr;
      const last = days[6].dateStr;
      const [fYear, fMonth, fDay] = first.split("-");
      const [lYear, lMonth, lDay] = last.split("-");

      if (fMonth === lMonth) {
        return `${formatMonthYear(first).split(" ")[0]} ${fDay} – ${lDay}, ${fYear}`;
      }
      return `${formatMonthYear(first).split(" ")[0]} ${fDay} – ${formatMonthYear(last).split(" ")[0]} ${lDay}, ${lYear}`;
    } else {
      return formatDateDisplay(activeCurrentDate);
    }
  }, [viewMode, activeCurrentDate, todayStr, weekStartsOn]);

  // Compute date range window for occurrences calculation
  const { windowStart, windowEnd } = useMemo(() => {
    if (viewMode === "month") {
      const grid = getMonthCalendarGrid(currentYear, currentMonth, todayStr, weekStartsOn);
      return {
        windowStart: grid[0].dateStr,
        windowEnd: grid[grid.length - 1].dateStr,
      };
    } else if (viewMode === "week") {
      const days = getWeekDays(activeCurrentDate, todayStr, weekStartsOn);
      return {
        windowStart: days[0].dateStr,
        windowEnd: days[6].dateStr,
      };
    } else {
      return {
        windowStart: activeCurrentDate,
        windowEnd: activeCurrentDate,
      };
    }
  }, [viewMode, currentYear, currentMonth, activeCurrentDate, todayStr, weekStartsOn]);

  // Filter events by type and search query
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];
    return allEvents.filter((event) => {
      if (selectedType !== "all" && event.type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesNotes = event.notes ? event.notes.toLowerCase().includes(q) : false;
        return matchesTitle || matchesNotes;
      }
      return true;
    });
  }, [allEvents, selectedType, searchQuery]);

  // Generate all occurrences within the window
  const occurrences = useMemo(() => {
    return getAllOccurrencesForRange(filteredEvents, windowStart, windowEnd);
  }, [filteredEvents, windowStart, windowEnd]);

  // Navigation handlers
  function handlePrev() {
    if (viewMode === "month") {
      const prevDate = new Date(currentYear, currentMonth - 2, 1);
      setCurrentDateStr(getLocalDateString(prevDate));
    } else if (viewMode === "week") {
      setCurrentDateStr(getOffsetDateString(-7, parseLocalDate(activeCurrentDate)));
    } else {
      setCurrentDateStr(getOffsetDateString(-1, parseLocalDate(activeCurrentDate)));
    }
  }

  function handleNext() {
    if (viewMode === "month") {
      const nextDate = new Date(currentYear, currentMonth, 1);
      setCurrentDateStr(getLocalDateString(nextDate));
    } else if (viewMode === "week") {
      setCurrentDateStr(getOffsetDateString(7, parseLocalDate(activeCurrentDate)));
    } else {
      setCurrentDateStr(getOffsetDateString(1, parseLocalDate(activeCurrentDate)));
    }
  }

  function handleToday() {
    setCurrentDateStr(todayStr);
    setSelectedDateStr(todayStr);
  }

  function handleCreateEvent(dateStr?: string, defaultTime?: string) {
    setModalInitialEvent(null);
    setModalInitialDate(dateStr || activeCurrentDate);
    setModalInitialTime(defaultTime);
    setIsEventModalOpen(true);
  }

  function handleSelectEvent(event: Event, occurrenceDate: string) {
    setActiveDetails({ event, occurrenceDate });
  }

  function handleEditEvent(event: Event) {
    setActiveDetails(null);
    setModalInitialEvent(event);
    setModalInitialDate(event.date);
    setModalInitialTime(event.startTime);
    setIsEventModalOpen(true);
  }

  return (
    <div className="flex h-full flex-col space-y-5 w-full">
      {/* Deep Link Listener */}
      <Suspense fallback={null}>
        <DeepLinkListener
          params={["eventId", "date"]}
          onDeepLink={handleCalendarDeepLink}
        />
      </Suspense>

      {/* Calendar Header with Navigation and Filters */}
      <CalendarHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        title={headerTitle}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={selectedType}
        onSelectedTypeChange={setSelectedType}
        onNewEvent={() => handleCreateEvent()}
      />

      {allEvents !== undefined && allEvents.length === 0 && (
        <SurfaceCard padding="sm" className="border-dashed">
          <EmptyState
            eyebrow="SCHEDULE HORIZON"
            icon={<CalendarIcon className="h-5 w-5" />}
            title="Your calendar is clear"
            description="Add an event, time block, or reminder to start shaping your schedule."
            action={
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleCreateEvent()}
              >
                <Plus className="h-4 w-4" />
                Create first event
              </Button>
            }
          />
        </SurfaceCard>
      )}

      {/* Main Calendar View Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {viewMode === "month" && (
          <MonthView
            year={currentYear}
            month={currentMonth}
            todayStr={todayStr}
            selectedDateStr={activeSelectedDate}
            onSelectDate={setSelectedDateStr}
            occurrences={occurrences}
            weekStartsOn={weekStartsOn}
            onSelectEvent={handleSelectEvent}
            onCreateEvent={(d) => handleCreateEvent(d)}
          />
        )}

        {viewMode === "week" && (
          <WeekView
            currentDateStr={activeCurrentDate}
            todayStr={todayStr}
            occurrences={occurrences}
            weekStartsOn={weekStartsOn}
            onSelectEvent={handleSelectEvent}
            onCreateEvent={(d, t) => handleCreateEvent(d, t)}
          />
        )}

        {viewMode === "day" && (
          <DayView
            dateStr={activeCurrentDate}
            todayStr={todayStr}
            isToday={activeCurrentDate === todayStr}
            occurrences={occurrences}
            onSelectEvent={handleSelectEvent}
            onCreateEvent={(d, t) => handleCreateEvent(d, t)}
          />
        )}
      </div>

      {/* Event Details Viewer Modal */}
      {activeDetails && (
        <EventDetails
          event={activeDetails.event}
          occurrenceDate={activeDetails.occurrenceDate}
          onClose={() => setActiveDetails(null)}
          onEdit={handleEditEvent}
          onDeleted={() => {
            setActiveDetails(null);
          }}
        />
      )}

      {/* Event Creation / Edit Modal */}
      {isEventModalOpen && (
        <EventModal
          initialEvent={modalInitialEvent}
          initialDate={modalInitialDate}
          initialTime={modalInitialTime}
          onClose={() => {
            setIsEventModalOpen(false);
            setModalInitialEvent(null);
            setModalInitialTime(undefined);
          }}
          onSaved={() => {
            setIsEventModalOpen(false);
            setModalInitialEvent(null);
            setModalInitialTime(undefined);
          }}
        />
      )}
    </div>
  );
}
