/**
 * Pure Universal Search Engine & Relevance Scoring Core for ORBIT.
 * Local-first, memory-safe, deterministic, and staged indexing for high-scale local datasets.
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
import { db as defaultDb, type OrbitDatabase } from "../db/client.ts";

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
    let startIdx = 0;
    while (startIdx < lower.length) {
      const idx = lower.indexOf(token, startIdx);
      if (idx === -1) break;
      rawIntervals.push({
        start: idx,
        end: idx + token.length,
      });
      startIdx = idx + 1; // Slide forward to find all occurrences
    }
  }

  if (rawIntervals.length === 0) return [];

  // Sort intervals by start ascending, then length descending
  rawIntervals.sort((a, b) => a.start - b.start || b.end - a.end);

  // Merge overlapping and contiguous intervals
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
    const inTags = inTitle
      ? true
      : normTags.some(
          (t) =>
            t === token ||
            t.replace(/^#/, "") === token.replace(/^#/, "") ||
            t.includes(token)
        );
    const inUrl = inTags ? true : normUrl.includes(token);
    const inFileName = inUrl ? true : normFileName.includes(token);
    const inNotes = inFileName ? true : normNotes.includes(token);

    if (!inTitle && !inTags && !inUrl && !inFileName && !inNotes) {
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
 * Optimized with deferred snippet generation to prevent main-thread freezing at scale.
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
  const rawResults: Array<SearchResultItem & { _rawNotes?: string }> = [];

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

      const subtitle = task.dueDate
        ? `Due ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ""}`
        : task.priority
        ? `Priority: ${task.priority}`
        : undefined;

      rawResults.push({
        id: task.id,
        module: targetModule,
        title: task.title,
        subtitle,
        badge: isGoal ? "Goal" : task.category || "Task",
        badgeColor: isGoal ? "pink" : "indigo",
        route: `/tasks?taskId=${task.id}`,
        score,
        highlights,
        updatedAt: task.updatedAt || task.createdAt,
        originalRecord: task,
        _rawNotes: task.notes,
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

      rawResults.push({
        id: entry.id,
        module: targetModule,
        title: entry.title,
        subtitle,
        badge,
        badgeColor: isNote ? "purple" : isFile ? "amber" : "emerald",
        route,
        score,
        highlights,
        updatedAt: entry.updatedAt || entry.createdAt,
        originalRecord: entry,
        _rawNotes: entry.notes,
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

      const frequencyLabel =
        habit.frequency === "daily"
          ? "Daily"
          : habit.frequency === "weekdays"
          ? "Weekdays"
          : habit.frequency === "weekly"
          ? "Weekly"
          : "Custom schedule";

      rawResults.push({
        id: habit.id,
        module: "habit",
        title: habit.title,
        subtitle: frequencyLabel,
        badge: habit.frequency || "Habit",
        badgeColor: "violet",
        route: `/habits?habitId=${habit.id}`,
        score,
        highlights,
        updatedAt: habit.updatedAt || habit.createdAt,
        originalRecord: habit,
        _rawNotes: habit.notes,
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

      const subtitle = `${event.date}${event.startTime ? ` · ${event.startTime}` : " · All day"}`;

      rawResults.push({
        id: event.id,
        module: "event",
        title: event.title,
        subtitle,
        badge: event.type || "Event",
        badgeColor: "blue",
        route: `/calendar?eventId=${event.id}&date=${event.date}`,
        score,
        highlights,
        updatedAt: event.updatedAt || event.createdAt,
        originalRecord: event,
        _rawNotes: event.notes,
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

      const subtitle = item.category ? `Category: ${item.category}` : `Status: ${item.status}`;

      rawResults.push({
        id: item.id,
        module: "inbox",
        title: item.title,
        subtitle,
        badge: item.category || "Inbox",
        badgeColor: "slate",
        route: `/inbox?itemId=${item.id}`,
        score,
        highlights,
        updatedAt: item.updatedAt || item.createdAt,
        originalRecord: item,
        _rawNotes: item.notes,
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

      rawResults.push({
        id: col.id,
        module: "collection",
        title: col.name,
        subtitle: col.description || "Collection",
        badge: "Collection",
        badgeColor: "indigo",
        route: `/library?collectionId=${col.id}`,
        score,
        highlights,
        updatedAt: col.updatedAt || col.createdAt,
        originalRecord: col,
        _rawNotes: col.description,
      });
    }
  }

  // Deterministic sorting with stable tie-breaking:
  // 1. Score descending
  // 2. UpdatedAt descending (if present)
  // 3. Title ascending (alphabetical)
  // 4. ID ascending
  rawResults.sort((a, b) => {
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

  const totalMatches = rawResults.length;
  const paginatedItems = limit > 0 ? rawResults.slice(0, limit) : rawResults;

  // Defer snippet generation strictly to paginated winner items (eliminates thousands of regex scans)
  for (const item of paginatedItems) {
    if (item._rawNotes) {
      item.snippet = extractSnippet(item._rawNotes, tokens);
    }
    delete item._rawNotes;
  }

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

// ===========================================================================
// STAGED SEARCH INDEX & HIGH-PERFORMANCE IN-MEMORY CACHE
// ===========================================================================

export interface SearchIndexDoc {
  id: string;
  module: SearchModuleType;
  title: string;
  normTitle: string;
  notes?: string;
  normNotes?: string;
  tags: string[];
  normTags: string[];
  url?: string;
  normUrl?: string;
  fileName?: string;
  normFileName?: string;
  updatedAt?: string;
  createdAt?: string;
  subtitle?: string;
  badge: string;
  badgeColor: string;
  route: string;
  originalRecord: SearchOriginalRecord;
}

interface TableCacheState {
  tasks: SearchIndexDoc[];
  libraryEntries: SearchIndexDoc[];
  habits: SearchIndexDoc[];
  events: SearchIndexDoc[];
  items: SearchIndexDoc[];
  collections: SearchIndexDoc[];
}

const SEARCHABLE_TABLES = [
  "tasks",
  "libraryEntries",
  "habits",
  "events",
  "items",
  "collections",
] as const;

type SearchableTableName = (typeof SEARCHABLE_TABLES)[number];

const tableCache: TableCacheState = {
  tasks: [],
  libraryEntries: [],
  habits: [],
  events: [],
  items: [],
  collections: [],
};

const dirtyTables = new Set<SearchableTableName>([
  "tasks",
  "libraryEntries",
  "habits",
  "events",
  "items",
  "collections",
]);

let isIndexInitialized = false;
let isHooksRegistered = false;
let activeSyncPromise: Promise<void> | null = null;

// Table mutation versioning to prevent stale data from concurrent writes during indexing
const tableMutationVersions: Record<SearchableTableName, number> = {
  tasks: 0,
  libraryEntries: 0,
  habits: 0,
  events: 0,
  items: 0,
  collections: 0,
};

// Cross-tab synchronization via BroadcastChannel
const SEARCH_SYNC_CHANNEL_NAME = "orbit_search_sync_channel";
let syncChannel: BroadcastChannel | null = null;
const currentTabInstanceId =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

function getSearchSyncChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!syncChannel) {
    try {
      syncChannel = new BroadcastChannel(SEARCH_SYNC_CHANNEL_NAME);
      if (typeof (syncChannel as unknown as { unref?: () => void }).unref === "function") {
        (syncChannel as unknown as { unref: () => void }).unref();
      }
      syncChannel.onmessage = (event) => {
        if (!event?.data || typeof event.data !== "object") return;
        const { type, tables, senderId } = event.data;
        if (senderId === currentTabInstanceId) return; // Skip own broadcast

        if (type === "invalidate") {
          invalidateLocalSearchCache(tables);
        } else if (type === "reset") {
          resetLocalSearchIndex();
        }
      };
    } catch {
      syncChannel = null;
    }
  }
  return syncChannel;
}

export function closeSearchSyncChannelForTest(): void {
  if (syncChannel) {
    try {
      syncChannel.close();
    } catch {
      // Ignore close error
    }
    syncChannel = null;
  }
}

// LRU Query Result Cache
const MAX_QUERY_CACHE_SIZE = 50;
const queryCache = new Map<string, SearchResultsGrouped>();

function getCachedResult(key: string): SearchResultsGrouped | undefined {
  const result = queryCache.get(key);
  if (result) {
    // Refresh LRU position
    queryCache.delete(key);
    queryCache.set(key, result);
    return result;
  }
  return undefined;
}

function setCachedResult(key: string, result: SearchResultsGrouped): void {
  if (queryCache.has(key)) {
    queryCache.delete(key);
  } else if (queryCache.size >= MAX_QUERY_CACHE_SIZE) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey !== undefined) queryCache.delete(oldestKey);
  }
  queryCache.set(key, result);
}

export function clearQueryCache(): void {
  queryCache.clear();
}

/**
 * Local cache invalidation without triggering outgoing broadcast.
 */
function invalidateLocalSearchCache(tables?: string[]): void {
  clearQueryCache();
  if (!tables || tables.length === 0) {
    for (const t of SEARCHABLE_TABLES) {
      dirtyTables.add(t);
      tableMutationVersions[t] = (tableMutationVersions[t] || 0) + 1;
    }
  } else {
    for (const t of tables) {
      if (SEARCHABLE_TABLES.includes(t as SearchableTableName)) {
        const tbl = t as SearchableTableName;
        dirtyTables.add(tbl);
        tableMutationVersions[tbl] = (tableMutationVersions[tbl] || 0) + 1;
      }
    }
  }
}

/**
 * Marks specific tables as dirty, purges cached query results,
 * and notifies other open browser tabs across BroadcastChannel.
 */
export function invalidateSearchCache(tables?: string[]): void {
  invalidateLocalSearchCache(tables);
  const ch = getSearchSyncChannel();
  if (ch) {
    try {
      ch.postMessage({
        type: "invalidate",
        tables,
        senderId: currentTabInstanceId,
      });
    } catch {
      // Ignore broadcast channel errors
    }
  }
}

/**
 * Local index reset without outgoing broadcast.
 */
function resetLocalSearchIndex(): void {
  clearQueryCache();
  for (const t of SEARCHABLE_TABLES) {
    tableCache[t] = [];
    dirtyTables.add(t);
    tableMutationVersions[t] = (tableMutationVersions[t] || 0) + 1;
  }
  isIndexInitialized = false;
}

/**
 * Completely resets index and caches (primarily for testing and mock environments)
 * and notifies other tabs.
 */
export function resetSearchIndex(): void {
  resetLocalSearchIndex();
  const ch = getSearchSyncChannel();
  if (ch) {
    try {
      ch.postMessage({
        type: "reset",
        senderId: currentTabInstanceId,
      });
    } catch {
      // Ignore broadcast channel errors
    }
  }
}

/**
 * Returns current status of search index memory cache.
 */
export function getSearchIndexStats(): {
  entryCount: number;
  dirtyTables: string[];
  queryCacheSize: number;
  isWarm: boolean;
} {
  let count = 0;
  for (const t of SEARCHABLE_TABLES) {
    count += tableCache[t].length;
  }
  return {
    entryCount: count,
    dirtyTables: Array.from(dirtyTables),
    queryCacheSize: queryCache.size,
    isWarm: isIndexInitialized && dirtyTables.size === 0,
  };
}

/**
 * Checks if search index is currently warmed in memory.
 */
export function isSearchIndexWarm(): boolean {
  return isIndexInitialized && dirtyTables.size === 0;
}

// Entity transformation to pre-normalized SearchIndexDoc
function taskToIndexDoc(task: Task): SearchIndexDoc {
  const isGoal = isGoalTask(task);
  const targetModule: SearchModuleType = isGoal ? "goal" : "task";
  const subtitle = task.dueDate
    ? `Due ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ""}`
    : task.priority
    ? `Priority: ${task.priority}`
    : undefined;

  return {
    id: task.id,
    module: targetModule,
    title: task.title,
    normTitle: task.title.trim().toLowerCase(),
    notes: task.notes || "",
    normNotes: task.notes ? task.notes.toLowerCase() : "",
    tags: task.tags || [],
    normTags: (task.tags || []).map((t) => t.trim().toLowerCase()),
    url: task.link || "",
    normUrl: (task.link || "").toLowerCase(),
    fileName: "",
    normFileName: "",
    updatedAt: task.updatedAt || task.createdAt,
    createdAt: task.createdAt,
    subtitle,
    badge: isGoal ? "Goal" : task.category || "Task",
    badgeColor: isGoal ? "pink" : "indigo",
    route: `/tasks?taskId=${task.id}`,
    originalRecord: task,
  };
}

function libraryEntryToIndexDoc(entry: LibraryEntry): SearchIndexDoc {
  const isNote = entry.type === "note";
  const isFile = entry.type === "file" || Boolean(entry.fileMetadata);

  let targetModule: SearchModuleType = "library";
  if (isNote) targetModule = "note";
  else if (isFile) targetModule = "file";

  const fileName = entry.fileMetadata?.fileName || "";
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

  return {
    id: entry.id,
    module: targetModule,
    title: entry.title,
    normTitle: entry.title.trim().toLowerCase(),
    notes: entry.notes || "",
    normNotes: entry.notes ? entry.notes.toLowerCase() : "",
    tags: entry.tags || [],
    normTags: (entry.tags || []).map((t) => t.trim().toLowerCase()),
    url: entry.link || "",
    normUrl: (entry.link || "").toLowerCase(),
    fileName,
    normFileName: fileName.toLowerCase(),
    updatedAt: entry.updatedAt || entry.createdAt,
    createdAt: entry.createdAt,
    subtitle,
    badge,
    badgeColor: isNote ? "purple" : isFile ? "amber" : "emerald",
    route,
    originalRecord: entry,
  };
}

function habitToIndexDoc(habit: Habit): SearchIndexDoc {
  const frequencyLabel =
    habit.frequency === "daily"
      ? "Daily"
      : habit.frequency === "weekdays"
      ? "Weekdays"
      : habit.frequency === "weekly"
      ? "Weekly"
      : "Custom schedule";

  return {
    id: habit.id,
    module: "habit",
    title: habit.title,
    normTitle: habit.title.trim().toLowerCase(),
    notes: habit.notes || "",
    normNotes: habit.notes ? habit.notes.toLowerCase() : "",
    tags: [],
    normTags: [],
    url: "",
    normUrl: "",
    fileName: "",
    normFileName: "",
    updatedAt: habit.updatedAt || habit.createdAt,
    createdAt: habit.createdAt,
    subtitle: frequencyLabel,
    badge: habit.frequency || "Habit",
    badgeColor: "violet",
    route: `/habits?habitId=${habit.id}`,
    originalRecord: habit,
  };
}

function eventToIndexDoc(event: Event): SearchIndexDoc {
  const subtitle = `${event.date}${event.startTime ? ` · ${event.startTime}` : " · All day"}`;

  return {
    id: event.id,
    module: "event",
    title: event.title,
    normTitle: event.title.trim().toLowerCase(),
    notes: event.notes || "",
    normNotes: event.notes ? event.notes.toLowerCase() : "",
    tags: [],
    normTags: [],
    url: "",
    normUrl: "",
    fileName: "",
    normFileName: "",
    updatedAt: event.updatedAt || event.createdAt,
    createdAt: event.createdAt,
    subtitle,
    badge: event.type || "Event",
    badgeColor: "blue",
    route: `/calendar?eventId=${event.id}&date=${event.date}`,
    originalRecord: event,
  };
}

function itemToIndexDoc(item: Item): SearchIndexDoc {
  const subtitle = item.category ? `Category: ${item.category}` : `Status: ${item.status}`;

  return {
    id: item.id,
    module: "inbox",
    title: item.title,
    normTitle: item.title.trim().toLowerCase(),
    notes: item.notes || "",
    normNotes: item.notes ? item.notes.toLowerCase() : "",
    tags: [],
    normTags: [],
    url: item.link || "",
    normUrl: (item.link || "").toLowerCase(),
    fileName: "",
    normFileName: "",
    updatedAt: item.updatedAt || item.createdAt,
    createdAt: item.createdAt,
    subtitle,
    badge: item.category || "Inbox",
    badgeColor: "slate",
    route: `/inbox?itemId=${item.id}`,
    originalRecord: item,
  };
}

function collectionToIndexDoc(col: LibraryCollection): SearchIndexDoc {
  return {
    id: col.id,
    module: "collection",
    title: col.name,
    normTitle: col.name.trim().toLowerCase(),
    notes: col.description || "",
    normNotes: col.description ? col.description.toLowerCase() : "",
    tags: [],
    normTags: [],
    url: "",
    normUrl: "",
    fileName: "",
    normFileName: "",
    updatedAt: col.updatedAt || col.createdAt,
    createdAt: col.createdAt,
    subtitle: col.description || "Collection",
    badge: "Collection",
    badgeColor: "indigo",
    route: `/library?collectionId=${col.id}`,
    originalRecord: col,
  };
}

/**
 * Registers Dexie table lifecycle hooks and wraps bulk/clear methods
 * to ensure every mutation path (create, update, delete, bulkPut, bulkAdd, bulkDelete, clear)
 * invalidates the corresponding search cache slice.
 */
export function registerSearchDatabaseHooks(
  database: OrbitDatabase = defaultDb,
  forceRegister = false
): void {
  if ((isHooksRegistered && !forceRegister) || !database) return;

  // Initialize cross-tab synchronization channel
  getSearchSyncChannel();

  const tableConfigs = [
    { name: "tasks", cacheTarget: "tasks" as SearchableTableName },
    { name: "libraryEntries", cacheTarget: "libraryEntries" as SearchableTableName },
    { name: "habits", cacheTarget: "habits" as SearchableTableName },
    { name: "events", cacheTarget: "events" as SearchableTableName },
    { name: "items", cacheTarget: "items" as SearchableTableName },
    { name: "libraryCollections", cacheTarget: "collections" as SearchableTableName },
  ] as const;

  for (const { name, cacheTarget } of tableConfigs) {
    const table = (database as unknown as Record<string, Record<string, unknown>>)[name];
    if (!table) continue;

    // 1. Dexie table lifecycle hooks (creating, updating, deleting)
    if (typeof table.hook === "function") {
      table.hook("creating", () => invalidateSearchCache([cacheTarget]));
      table.hook("updating", () => invalidateSearchCache([cacheTarget]));
      table.hook("deleting", () => invalidateSearchCache([cacheTarget]));
    }

    // 2. Intercept clear and bulk methods to guarantee invalidation even if Dexie suppresses item hooks
    const wrapMethod = (methodName: string) => {
      const orig = table[methodName];
      if (typeof orig === "function" && !("__orbitWrapped" in orig)) {
        const wrapped = function (this: unknown, ...args: unknown[]) {
          invalidateSearchCache([cacheTarget]);
          return (orig as (...fnArgs: unknown[]) => unknown).apply(this, args);
        };
        (wrapped as unknown as Record<string, unknown>).__orbitWrapped = true;
        table[methodName] = wrapped;
      }
    };

    wrapMethod("clear");
    wrapMethod("bulkPut");
    wrapMethod("bulkAdd");
    wrapMethod("bulkDelete");
  }

  isHooksRegistered = true;
}

/**
 * Loads a single table from IndexedDB, mapping records to SearchIndexDoc.
 * Uses tableMutationVersions to detect whether a mutation occurred while toArray() was in-flight.
 */
async function syncSingleTable(
  table: SearchableTableName,
  database: OrbitDatabase
): Promise<void> {
  const versionAtStart = tableMutationVersions[table];
  let mappedDocs: SearchIndexDoc[] = [];

  switch (table) {
    case "tasks": {
      if (!database?.tasks) return;
      const records = await database.tasks.toArray();
      mappedDocs = records.map(taskToIndexDoc);
      break;
    }
    case "libraryEntries": {
      if (!database?.libraryEntries) return;
      const records = await database.libraryEntries.toArray();
      mappedDocs = records.map(libraryEntryToIndexDoc);
      break;
    }
    case "habits": {
      if (!database?.habits) return;
      const records = await database.habits.toArray();
      mappedDocs = records.map(habitToIndexDoc);
      break;
    }
    case "events": {
      if (!database?.events) return;
      const records = await database.events.toArray();
      mappedDocs = records.map(eventToIndexDoc);
      break;
    }
    case "items": {
      if (!database?.items) return;
      const records = await database.items.toArray();
      mappedDocs = records.map(itemToIndexDoc);
      break;
    }
    case "collections": {
      if (!database?.libraryCollections) return;
      const records = await database.libraryCollections.toArray();
      mappedDocs = records.map(collectionToIndexDoc);
      break;
    }
  }

  // Atomically assign ONLY if no new mutation occurred while toArray() was reading
  if (versionAtStart === tableMutationVersions[table]) {
    tableCache[table] = mappedDocs;
    dirtyTables.delete(table);
  }
}

/**
 * Incremental synchronization loop: syncs all dirty tables, repeating if concurrent mutations occurred.
 */
async function performIncrementalSync(database: OrbitDatabase): Promise<void> {
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  while (dirtyTables.size > 0 && attempts < MAX_ATTEMPTS) {
    attempts++;
    const currentDirty = Array.from(dirtyTables);
    await Promise.all(currentDirty.map((t) => syncSingleTable(t, database)));
  }

  if (dirtyTables.size === 0) {
    isIndexInitialized = true;
  }
}

/**
 * Ensures search index is populated and up-to-date.
 * Reuses in-flight promise to serialize concurrent requests and eliminate redundant IndexedDB queries.
 */
export async function syncSearchIndex(database: OrbitDatabase = defaultDb): Promise<void> {
  registerSearchDatabaseHooks(database);

  if (dirtyTables.size === 0 && isIndexInitialized) {
    return;
  }

  // If another sync is in-flight, await it to avoid concurrent redundant reads
  while (activeSyncPromise) {
    try {
      await activeSyncPromise;
    } catch {
      // If previous sync failed, break to let this invocation retry cleanly
      break;
    }
    if (dirtyTables.size === 0 && isIndexInitialized) {
      return;
    }
  }

  activeSyncPromise = (async () => {
    try {
      await performIncrementalSync(database);
    } finally {
      activeSyncPromise = null;
    }
  })();

  await activeSyncPromise;
}

/**
 * Non-blocking warm-up helper that prepares index in idle time.
 */
export async function warmSearchIndex(database: OrbitDatabase = defaultDb): Promise<void> {
  if (typeof window === "undefined" && !database) return;
  await syncSearchIndex(database);
}

/**
 * Compares two candidates using the canonical deterministic tie-breaker:
 * 1. Score descending
 * 2. UpdatedAt descending
 * 3. Title ascending
 * 4. ID ascending
 */
function compareCandidates(a: SearchResultItem, b: SearchResultItem): number {
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
}

/**
 * Executes high-speed search across pre-indexed, pre-normalized in-memory documents.
 */
export function searchIndexedDocs(
  query: string,
  allDocs: SearchIndexDoc[],
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

  let totalMatches = 0;
  const topCandidates: Array<SearchResultItem & { _rawNotes?: string }> = [];
  let minThresholdItem: SearchResultItem | null = null;

  for (const doc of allDocs) {
    if (moduleFilter !== "all" && moduleFilter !== doc.module) continue;

    // Fast token check with early bypass
    let hasAllTokens = true;
    for (const token of tokens) {
      const inTitle = doc.normTitle.includes(token);
      if (inTitle) continue;

      const inTags = doc.normTags.some(
        (t) =>
          t === token ||
          t.replace(/^#/, "") === token.replace(/^#/, "") ||
          t.includes(token)
      );
      if (inTags) continue;

      const inUrl = doc.normUrl ? doc.normUrl.includes(token) : false;
      if (inUrl) continue;

      const inFileName = doc.normFileName ? doc.normFileName.includes(token) : false;
      if (inFileName) continue;

      const inNotes = doc.normNotes ? doc.normNotes.includes(token) : false;
      if (!inNotes) {
        hasAllTokens = false;
        break;
      }
    }

    if (!hasAllTokens) continue;

    // Relevance scoring
    let score = 0;
    const highlights: SearchMatchHighlight[] = [];

    // 1. Exact Title Match (+100)
    if (doc.normTitle === normQuery) {
      score += 100;
    }
    // 2. Prefix Title Match (+50)
    else if (doc.normTitle.startsWith(normQuery)) {
      score += 50;
    }

    // 3. Word-Boundary Title Match (+20 per token)
    let titleHasTokenMatch = false;
    for (const token of tokens) {
      const pattern = new RegExp(`(?:^|[\\s_\\-.,/])` + escapeRegex(token), "i");
      if (pattern.test(doc.title)) {
        score += 20;
        titleHasTokenMatch = true;
      } else if (doc.normTitle.includes(token)) {
        titleHasTokenMatch = true;
      }
    }
    if (titleHasTokenMatch) {
      highlights.push({
        field: "title",
        matchedText: doc.title,
        offsets: findMatchOffsets(doc.title, tokens),
      });
    }

    // 4. Exact Tag Match (+30)
    for (const token of tokens) {
      const rawTok = token.replace(/^#/, "");
      for (const tag of doc.tags) {
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
    if (doc.url && tokens.some((t) => doc.normUrl?.includes(t))) {
      score += 25;
      highlights.push({
        field: "url",
        matchedText: doc.url,
        offsets: findMatchOffsets(doc.url, tokens),
      });
    } else if (doc.fileName && tokens.some((t) => doc.normFileName?.includes(t))) {
      score += 25;
      highlights.push({
        field: "fileName",
        matchedText: doc.fileName,
        offsets: findMatchOffsets(doc.fileName, tokens),
      });
    }

    // 6. Notes Match (+10)
    if (doc.notes && tokens.some((t) => doc.normNotes?.includes(t))) {
      score += 10;
      highlights.push({
        field: "notes",
        matchedText: doc.notes,
        offsets: findMatchOffsets(doc.notes, tokens),
      });
    }

    // 7. Recency Boost (+5)
    const refTimestamp = doc.updatedAt || doc.createdAt;
    if (isWithinLastDays(refTimestamp, 7, currentDate)) {
      score += 5;
    }

    totalMatches++;

    const candidate: SearchResultItem & { _rawNotes?: string } = {
      id: doc.id,
      module: doc.module,
      title: doc.title,
      subtitle: doc.subtitle,
      badge: doc.badge,
      badgeColor: doc.badgeColor,
      route: doc.route,
      score,
      highlights,
      updatedAt: doc.updatedAt,
      originalRecord: doc.originalRecord,
      _rawNotes: doc.notes,
    };

    // Bounded top collection to eliminate array sort on huge matches
    if (limit <= 0) {
      topCandidates.push(candidate);
    } else if (topCandidates.length < limit) {
      topCandidates.push(candidate);
      if (topCandidates.length === limit) {
        topCandidates.sort(compareCandidates);
        minThresholdItem = topCandidates[limit - 1];
      }
    } else if (minThresholdItem && compareCandidates(candidate, minThresholdItem) < 0) {
      topCandidates[limit - 1] = candidate;
      topCandidates.sort(compareCandidates);
      minThresholdItem = topCandidates[limit - 1];
    }
  }

  topCandidates.sort(compareCandidates);

  // Extract snippet strictly for final paginated winner items
  for (const item of topCandidates) {
    const raw = item._rawNotes;
    if (raw) {
      item.snippet = extractSnippet(raw, tokens);
    }
    delete item._rawNotes;
  }

  const paginatedItems: SearchResultItem[] = topCandidates;

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

/**
 * High-level staged Universal Search entry point.
 * Integrates incremental database syncing, caching, and instant sub-millisecond querying.
 */
export async function executeUniversalSearch(
  query: string,
  options: SearchOptions = {},
  database: OrbitDatabase = defaultDb
): Promise<SearchResultsGrouped> {
  const normQuery = normalizeQuery(query);
  if (!normQuery) {
    return {
      query: "",
      totalMatches: 0,
      items: [],
      groups: [],
    };
  }

  const moduleFilter = options.moduleFilter || "all";
  const limit = options.limit !== undefined ? options.limit : 25;
  const cacheKey = `${moduleFilter}:${limit}:${normQuery}:${options.currentDate || ""}`;

  // 1. Check LRU query cache
  const cached = getCachedResult(cacheKey);
  if (cached && dirtyTables.size === 0) {
    return cached;
  }

  // 2. Ensure database index is synced
  await syncSearchIndex(database);

  // 3. Assemble active indexed docs
  let activeDocs: SearchIndexDoc[] = [];
  if (moduleFilter === "all") {
    activeDocs = [
      ...tableCache.tasks,
      ...tableCache.libraryEntries,
      ...tableCache.habits,
      ...tableCache.events,
      ...tableCache.items,
      ...tableCache.collections,
    ];
  } else if (moduleFilter === "task" || moduleFilter === "goal") {
    activeDocs = tableCache.tasks;
  } else if (moduleFilter === "library" || moduleFilter === "note" || moduleFilter === "file") {
    activeDocs = tableCache.libraryEntries;
  } else if (moduleFilter === "habit") {
    activeDocs = tableCache.habits;
  } else if (moduleFilter === "event") {
    activeDocs = tableCache.events;
  } else if (moduleFilter === "inbox") {
    activeDocs = tableCache.items;
  } else if (moduleFilter === "collection") {
    activeDocs = tableCache.collections;
  }

  // 4. Run fast bounded search
  const result = searchIndexedDocs(query, activeDocs, options);

  // 5. Cache result
  setCachedResult(cacheKey, result);

  return result;
}
