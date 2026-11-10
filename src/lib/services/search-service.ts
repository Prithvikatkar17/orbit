/**
 * Pure Universal Search Engine & Relevance Scoring Core for ORBIT.
 * Local-first, memory-safe, deterministic, and independent of React/Dexie.
 */

import type {
  Task,
  LibraryEntry,
  Habit,
  Event,
  Item,
  LibraryCollection,
} from "../schemas/index.ts";
import { isGoalTask } from "./analytics-service.ts";
import { parseLocalDate, getLocalDateString } from "../utils/dates.ts";

export type SearchModuleType =
  | "task"
  | "goal"
  | "library"
  | "note"
  | "file"
  | "habit"
  | "event"
  | "inbox"
  | "collection";

export type SearchOriginalRecord =
  | Task
  | LibraryEntry
  | Habit
  | Event
  | Item
  | LibraryCollection;

export interface TextHighlightOffset {
  start: number;
  end: number;
}

export interface SearchMatchHighlight {
  field: "title" | "notes" | "tag" | "url" | "fileName";
  matchedText: string;
  offsets?: TextHighlightOffset[];
}

export interface SearchSnippet {
  text: string;
  matchStart: number;
  matchEnd: number;
  hasLeadingEllipsis: boolean;
  hasTrailingEllipsis: boolean;
}

export interface SearchResultItem {
  id: string;
  module: SearchModuleType;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon?: string;
  route: string;
  score: number;
  snippet?: SearchSnippet;
  highlights: SearchMatchHighlight[];
  updatedAt?: string;
  originalRecord: SearchOriginalRecord;
}

export interface SearchResultGroup {
  module: SearchModuleType;
  label: string;
  items: SearchResultItem[];
}

export interface SearchResultsGrouped {
  query: string;
  totalMatches: number;
  items: SearchResultItem[];
  groups: SearchResultGroup[];
}

export interface SearchDataSources {
  tasks?: Task[];
  libraryEntries?: LibraryEntry[];
  habits?: Habit[];
  events?: Event[];
  items?: Item[];
  collections?: LibraryCollection[];
}

export interface SearchOptions {
  moduleFilter?: SearchModuleType | "all";
  limit?: number;
  currentDate?: string; // "YYYY-MM-DD" for deterministic recency evaluation
}

const MODULE_LABELS: Record<SearchModuleType, string> = {
  task: "Tasks",
  goal: "Goals",
  note: "Notes",
  library: "Library Resources",
  file: "Files & Attachments",
  habit: "Habits",
  event: "Calendar Events",
  inbox: "Inbox",
  collection: "Collections",
};

const MODULE_DISPLAY_ORDER: SearchModuleType[] = [
  "task",
  "goal",
  "note",
  "library",
  "file",
  "habit",
  "event",
  "inbox",
  "collection",
];

/**
 * Escapes characters for safe RegExp construction.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalizes query string: trims whitespace and lowercases.
 */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Splits query into lowercase tokens, preserving special tags or symbols.
 */
export function tokenizeQuery(query: string): string[] {
  const norm = normalizeQuery(query);
  if (!norm) return [];
  // Split on whitespace; filter empty tokens
  return norm.split(/\s+/).filter(Boolean);
}

/**
 * Checks if a given timestamp/date is within the trailing N days of reference.
 */
export function isWithinLastDays(
  dateStr?: string,
  days = 7,
  refDateStr?: string
): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const ref = refDateStr ? parseLocalDate(refDateStr) : new Date();
    // 7 days window: from (ref - 7 days) to (ref + 1 day for timezone boundary)
    const cutoff = new Date(ref.getTime() - days * 24 * 60 * 60 * 1000);
    return d >= cutoff;
  } catch {
    return false;
  }
}

/**
 * Finds all character match offsets in text for the given query tokens.
 * Merges overlapping/adjacent intervals and returns sorted offsets.
 */
export function findMatchOffsets(
  text: string,
  tokens: string[]
): TextHighlightOffset[] {
  if (!text || tokens.length === 0) return [];

  const lower = text.toLowerCase();
  const rawIntervals: TextHighlightOffset[] = [];

  for (const token of tokens) {
    if (!token) continue;
    let idx = 0;
    while ((idx = lower.indexOf(token, idx)) !== -1) {
      rawIntervals.push({ start: idx, end: idx + token.length });
      idx += token.length;
    }
  }

  if (rawIntervals.length === 0) return [];

  // Sort intervals by start ascending, then end descending
  rawIntervals.sort((a, b) => a.start - b.start || b.end - a.end);

  // Merge overlapping or adjacent intervals
  const merged: TextHighlightOffset[] = [rawIntervals[0]];
  for (let i = 1; i < rawIntervals.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = rawIntervals[i];

    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}

/**
 * Extracts a contextual snippet around the first matching token from text.
 * Shows ~40 characters before and after the match with ellipses.
 * Safe for large markdown notes up to 50,000 characters.
 */
export function extractSnippet(
  content?: string,
  tokens: string[] = [],
  maxContext = 40
): SearchSnippet | undefined {
  if (!content || tokens.length === 0) return undefined;

  const lower = content.toLowerCase();
  let firstIdx = -1;
  let matchLen = 0;

  for (const t of tokens) {
    if (!t) continue;
    const idx = lower.indexOf(t);
    if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
      firstIdx = idx;
      matchLen = t.length;
    }
  }

  if (firstIdx === -1) return undefined;

  // Determine slice boundaries
  let start = Math.max(0, firstIdx - maxContext);
  let end = Math.min(content.length, firstIdx + matchLen + maxContext);

  // Soft word boundary snapping
  if (start > 0) {
    const spaceIdx = content.indexOf(" ", start);
    if (spaceIdx !== -1 && spaceIdx < firstIdx) {
      start = spaceIdx + 1;
    }
  }
  if (end < content.length) {
    const spaceIdx = content.lastIndexOf(" ", end);
    if (spaceIdx !== -1 && spaceIdx > firstIdx + matchLen) {
      end = spaceIdx;
    }
  }

  const hasLeadingEllipsis = start > 0;
  const hasTrailingEllipsis = end < content.length;

  const rawSlice = content.substring(start, end).trim();
  const snippetText =
    (hasLeadingEllipsis ? "..." : "") +
    rawSlice +
    (hasTrailingEllipsis ? "..." : "");

  const matchStartInRaw = firstIdx - start;
  const matchStart = matchStartInRaw + (hasLeadingEllipsis ? 3 : 0);
  const matchEnd = matchStart + matchLen;

  return {
    text: snippetText,
    matchStart,
    matchEnd,
    hasLeadingEllipsis,
    hasTrailingEllipsis,
  };
}

/**
 * Scores an item against the query string and tokens based on Phase 6A rules:
 * - Exact title match: +100
 * - Prefix title match: +50
 * - Word-boundary title match: +20 per token
 * - Exact tag match: +30
 * - URL or filename match: +25
 * - Notes and description match: +10
 * - Recency boost: +5 for records updated within last 7 days
 *
 * An item must match all query tokens across its searchable fields to qualify.
 */
export function scoreSearchItem(params: {
  title: string;
  notes?: string;
  tags?: string[];
  url?: string;
  fileName?: string;
  updatedAt?: string;
  createdAt?: string;
  query: string;
  tokens: string[];
  currentDate?: string;
}): { score: number; highlights: SearchMatchHighlight[]; isMatch: boolean } {
  const {
    title,
    notes = "",
    tags = [],
    url = "",
    fileName = "",
    updatedAt,
    createdAt,
    query,
    tokens,
    currentDate,
  } = params;

  if (tokens.length === 0) {
    return { score: 0, highlights: [], isMatch: false };
  }

  const normQuery = normalizeQuery(query);
  const normTitle = title.trim().toLowerCase();
  const normNotes = (notes || "").toLowerCase();
  const normUrl = (url || "").toLowerCase();
  const normFileName = (fileName || "").toLowerCase();
  const normTags = tags.map((t) => t.trim().toLowerCase());

  // Check that every token is present in at least one field (AND condition)
  for (const token of tokens) {
    const inTitle = normTitle.includes(token);
    const inNotes = normNotes.includes(token);
    const inUrl = normUrl.includes(token);
    const inFileName = normFileName.includes(token);
    const inTags = normTags.some(
      (t) => t === token || t.replace(/^#/, "") === token.replace(/^#/, "") || t.includes(token)
    );

    if (!inTitle && !inNotes && !inUrl && !inFileName && !inTags) {
      return { score: 0, highlights: [], isMatch: false };
    }
  }

  let score = 0;
  const highlights: SearchMatchHighlight[] = [];

  // 1. Exact Title Match (+100)
  if (normTitle === normQuery) {
    score += 100;
  }
  // 2. Prefix Title Match (+50)
  else if (normTitle.startsWith(normQuery)) {
    score += 50;
  }

  // 3. Word-Boundary Title Match (+20 per token)
  let titleOffsets: TextHighlightOffset[] = [];
  let titleHasTokenMatch = false;

  for (const token of tokens) {
    if (!token) continue;
    // Word boundary: preceded by start of string or whitespace/punctuation
    const pattern = new RegExp(`(?:^|[\\s_\\-.,/])` + escapeRegex(token), "i");
    if (pattern.test(title)) {
      score += 20;
      titleHasTokenMatch = true;
    } else if (normTitle.includes(token)) {
      // Substring match in title
      titleHasTokenMatch = true;
    }
  }

  if (titleHasTokenMatch) {
    titleOffsets = findMatchOffsets(title, tokens);
    highlights.push({
      field: "title",
      matchedText: title,
      offsets: titleOffsets,
    });
  }

  // 4. Exact Tag Match (+30)
  for (const token of tokens) {
    const rawTok = token.replace(/^#/, "");
    for (const tag of tags) {
      const normTag = tag.trim().toLowerCase().replace(/^#/, "");
      if (normTag === rawTok) {
        score += 30;
        highlights.push({
          field: "tag",
          matchedText: tag,
          offsets: findMatchOffsets(tag, [token, rawTok]),
        });
        break;
      }
    }
  }

  // 5. URL or Filename Match (+25)
  if (url && tokens.some((t) => normUrl.includes(t))) {
    score += 25;
    highlights.push({
      field: "url",
      matchedText: url,
      offsets: findMatchOffsets(url, tokens),
    });
  } else if (fileName && tokens.some((t) => normFileName.includes(t))) {
    score += 25;
    highlights.push({
      field: "fileName",
      matchedText: fileName,
      offsets: findMatchOffsets(fileName, tokens),
    });
  }

  // 6. Notes and Description Match (+10)
  if (notes && tokens.some((t) => normNotes.includes(t))) {
    score += 10;
    highlights.push({
      field: "notes",
      matchedText: notes,
      offsets: findMatchOffsets(notes, tokens),
    });
  }

  // 7. Recency Boost (+5 for records updated within the last 7 days)
  const refTimestamp = updatedAt || createdAt;
  if (isWithinLastDays(refTimestamp, 7, currentDate)) {
    score += 5;
  }

  return { score, highlights, isMatch: true };
}

/**
 * Searches across all ORBIT entities and returns sorted, ranked, and grouped results.
 * Strictly operates on metadata and text; does not search binary attachment Blobs.
 */
export function searchAll(
  query: string,
  dataSources: SearchDataSources,
  options: SearchOptions = {}
): SearchResultsGrouped {
  const normQuery = normalizeQuery(query);
  if (!normQuery) {
    return {
      query: "",
      totalMatches: 0,
      items: [],
      groups: [],
    };
  }

  const tokens = tokenizeQuery(normQuery);
  const { moduleFilter = "all", limit = 25, currentDate } = options;
  const results: SearchResultItem[] = [];

  // 1. Tasks & Goals
  if (dataSources.tasks && (moduleFilter === "all" || moduleFilter === "task" || moduleFilter === "goal")) {
    for (const task of dataSources.tasks) {
      const isGoal = isGoalTask(task);
      const targetModule: SearchModuleType = isGoal ? "goal" : "task";

      if (moduleFilter !== "all" && moduleFilter !== targetModule) continue;

      const { score, highlights, isMatch } = scoreSearchItem({
        title: task.title,
        notes: task.notes,
        tags: task.tags,
        url: task.link,
        updatedAt: task.updatedAt,
        createdAt: task.createdAt,
        query: normQuery,
        tokens,
        currentDate,
      });

      if (!isMatch) continue;

      const snippet = extractSnippet(task.notes, tokens);
      const subtitle = task.dueDate
        ? `Due ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ""}`
        : task.priority
        ? `Priority: ${task.priority}`
        : undefined;

      results.push({
        id: task.id,
        module: targetModule,
        title: task.title,
        subtitle,
        badge: isGoal ? "Goal" : task.category || "Task",
        badgeColor: isGoal ? "pink" : "indigo",
        route: `/tasks?taskId=${task.id}`,
        score,
        snippet,
        highlights,
        updatedAt: task.updatedAt || task.createdAt,
        originalRecord: task,
      });
    }
  }

  // 2. Library Entries (Resources, Notes, Files)
  if (dataSources.libraryEntries) {
    for (const entry of dataSources.libraryEntries) {
      const isNote = entry.type === "note";
      const isFile = entry.type === "file" || Boolean(entry.fileMetadata);

      let targetModule: SearchModuleType = "library";
      if (isNote) targetModule = "note";
      else if (isFile) targetModule = "file";

      if (moduleFilter !== "all" && moduleFilter !== targetModule) continue;

      const fileName = entry.fileMetadata?.fileName;
      const { score, highlights, isMatch } = scoreSearchItem({
        title: entry.title,
        notes: entry.notes,
        tags: entry.tags,
        url: entry.link,
        fileName,
        updatedAt: entry.updatedAt,
        createdAt: entry.createdAt,
        query: normQuery,
        tokens,
        currentDate,
      });

      if (!isMatch) continue;

      const snippet = extractSnippet(entry.notes, tokens);
      let subtitle = entry.link || undefined;
      let badge: string = entry.type || "Resource";

      if (isNote) {
        badge = "Note";
        subtitle = entry.updatedAt
          ? `Updated ${getLocalDateString(new Date(entry.updatedAt))}`
          : undefined;
      } else if (isFile && entry.fileMetadata) {
        badge = entry.fileMetadata.fileType || "File";
        subtitle = entry.fileMetadata.fileName;
      }

      const route = isNote
        ? `/library?entryId=${entry.id}&view=note`
        : `/library?entryId=${entry.id}`;

      results.push({
        id: entry.id,
        module: targetModule,
        title: entry.title,
        subtitle,
        badge,
        badgeColor: isNote ? "purple" : isFile ? "amber" : "emerald",
        route,
        score,
        snippet,
        highlights,
        updatedAt: entry.updatedAt || entry.createdAt,
        originalRecord: entry,
      });
    }
  }

  // 3. Habits
  if (dataSources.habits && (moduleFilter === "all" || moduleFilter === "habit")) {
    for (const habit of dataSources.habits) {
      const { score, highlights, isMatch } = scoreSearchItem({
        title: habit.title,
        notes: habit.notes,
        updatedAt: habit.updatedAt,
        createdAt: habit.createdAt,
        query: normQuery,
        tokens,
        currentDate,
      });

      if (!isMatch) continue;

      const snippet = extractSnippet(habit.notes, tokens);
      const frequencyLabel =
        habit.frequency === "daily"
          ? "Daily"
          : habit.frequency === "weekdays"
          ? "Weekdays"
          : habit.frequency === "weekly"
          ? "Weekly"
          : "Custom schedule";

      results.push({
        id: habit.id,
        module: "habit",
        title: habit.title,
        subtitle: frequencyLabel,
        badge: habit.frequency || "Habit",
        badgeColor: "violet",
        route: `/habits?habitId=${habit.id}`,
        score,
        snippet,
        highlights,
        updatedAt: habit.updatedAt || habit.createdAt,
        originalRecord: habit,
      });
    }
  }

  // 4. Calendar Events
  if (dataSources.events && (moduleFilter === "all" || moduleFilter === "event")) {
    for (const event of dataSources.events) {
      const { score, highlights, isMatch } = scoreSearchItem({
        title: event.title,
        notes: event.notes,
        updatedAt: event.updatedAt,
        createdAt: event.createdAt,
        query: normQuery,
        tokens,
        currentDate,
      });

      if (!isMatch) continue;

      const snippet = extractSnippet(event.notes, tokens);
      const subtitle = `${event.date}${event.startTime ? ` · ${event.startTime}` : " · All day"}`;

      results.push({
        id: event.id,
        module: "event",
        title: event.title,
        subtitle,
        badge: event.type || "Event",
        badgeColor: "blue",
        route: `/calendar?eventId=${event.id}&date=${event.date}`,
        score,
        snippet,
        highlights,
        updatedAt: event.updatedAt || event.createdAt,
        originalRecord: event,
      });
    }
  }

  // 5. Inbox Items
  if (dataSources.items && (moduleFilter === "all" || moduleFilter === "inbox")) {
    for (const item of dataSources.items) {
      const { score, highlights, isMatch } = scoreSearchItem({
        title: item.title,
        notes: item.notes,
        url: item.link,
        updatedAt: item.updatedAt,
        createdAt: item.createdAt,
        query: normQuery,
        tokens,
        currentDate,
      });

      if (!isMatch) continue;

      const snippet = extractSnippet(item.notes, tokens);
      const subtitle = item.category ? `Category: ${item.category}` : `Status: ${item.status}`;

      results.push({
        id: item.id,
        module: "inbox",
        title: item.title,
        subtitle,
        badge: item.category || "Inbox",
        badgeColor: "slate",
        route: `/inbox?itemId=${item.id}`,
        score,
        snippet,
        highlights,
        updatedAt: item.updatedAt || item.createdAt,
        originalRecord: item,
      });
    }
  }

  // 6. Library Collections
  if (dataSources.collections && (moduleFilter === "all" || moduleFilter === "collection")) {
    for (const col of dataSources.collections) {
      const { score, highlights, isMatch } = scoreSearchItem({
        title: col.name,
        notes: col.description,
        updatedAt: col.updatedAt,
        createdAt: col.createdAt,
        query: normQuery,
        tokens,
        currentDate,
      });

      if (!isMatch) continue;

      const snippet = extractSnippet(col.description, tokens);

      results.push({
        id: col.id,
        module: "collection",
        title: col.name,
        subtitle: col.description || "Collection",
        badge: "Collection",
        badgeColor: "indigo",
        route: `/library?collectionId=${col.id}`,
        score,
        snippet,
        highlights,
        updatedAt: col.updatedAt || col.createdAt,
        originalRecord: col,
      });
    }
  }

  // Deterministic sorting with stable tie-breaking:
  // 1. Score descending
  // 2. UpdatedAt descending (if present)
  // 3. Title ascending (alphabetical)
  // 4. ID ascending
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aTime = a.updatedAt || "";
    const bTime = b.updatedAt || "";
    if (aTime !== bTime) {
      return bTime.localeCompare(aTime);
    }
    if (a.title !== b.title) {
      return a.title.localeCompare(b.title);
    }
    return a.id.localeCompare(b.id);
  });

  const totalMatches = results.length;
  const paginatedItems = limit > 0 ? results.slice(0, limit) : results;

  // Group items by module in standard display order
  const groupsMap = new Map<SearchModuleType, SearchResultItem[]>();
  for (const item of paginatedItems) {
    const list = groupsMap.get(item.module) || [];
    list.push(item);
    groupsMap.set(item.module, list);
  }

  const groups: SearchResultGroup[] = [];
  for (const mod of MODULE_DISPLAY_ORDER) {
    const items = groupsMap.get(mod);
    if (items && items.length > 0) {
      groups.push({
        module: mod,
        label: MODULE_LABELS[mod] || mod,
        items,
      });
    }
  }

  return {
    query,
    totalMatches,
    items: paginatedItems,
    groups,
  };
}
