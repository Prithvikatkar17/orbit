import test from "node:test";
import assert from "node:assert/strict";

import {
  removeQueryParams,
  buildDeepLinkSignature,
  isValidRecordId,
  isValidDateString,
} from "../src/lib/utils/deep-links.ts";

test("Phase 6D: removeQueryParams removes single target param and preserves path", () => {
  const result = removeQueryParams("/tasks", "taskId=task-123", ["taskId"]);
  assert.equal(result, "/tasks");
});

test("Phase 6D: removeQueryParams preserves unrelated query parameters", () => {
  const urlWithMultiple = "taskId=task-123&sort=dueDate&filter=active";
  const result = removeQueryParams("/tasks", urlWithMultiple, ["taskId"]);
  assert.equal(result, "/tasks?sort=dueDate&filter=active");
});

test("Phase 6D: removeQueryParams removes multiple target parameters simultaneously", () => {
  // Calendar: eventId + date removed, view=week preserved
  const calendarParams = "eventId=evt-99&date=2026-11-10&view=week";
  const result = removeQueryParams("/calendar", calendarParams, ["eventId", "date"]);
  assert.equal(result, "/calendar?view=week");

  // Library: entryId + view removed
  const noteParams = "entryId=entry-42&view=note";
  const noteResult = removeQueryParams("/library", noteParams, ["entryId", "view"]);
  assert.equal(noteResult, "/library");
});

test("Phase 6D: removeQueryParams handles URLSearchParams instances and null/undefined safely", () => {
  const searchParamsObj = new URLSearchParams("collectionId=col-1&sidebar=open");
  const result = removeQueryParams("/library", searchParamsObj, ["collectionId"]);
  assert.equal(result, "/library?sidebar=open");

  // Null or undefined searchParams
  assert.equal(removeQueryParams("/habits", null, ["habitId"]), "/habits");
  assert.equal(removeQueryParams("/habits", undefined, ["habitId"]), "/habits");
  assert.equal(removeQueryParams("/habits", "", ["habitId"]), "/habits");
});

test("Phase 6D: removeQueryParams does nothing when target parameter is not present", () => {
  const params = "filter=priority&page=2";
  const result = removeQueryParams("/tasks", params, ["taskId"]);
  assert.equal(result, "/tasks?filter=priority&page=2");
});

test("Phase 6D: buildDeepLinkSignature produces canonical, sorted, deterministic keys", () => {
  // Reordered keys must produce identical signature
  const sig1 = buildDeepLinkSignature({ eventId: "ev-1", date: "2026-11-10" });
  const sig2 = buildDeepLinkSignature({ date: "2026-11-10", eventId: "ev-1" });
  assert.equal(sig1, "date=2026-11-10&eventId=ev-1");
  assert.equal(sig1, sig2);

  // Trims whitespace and excludes empty/whitespace values
  const sigWithEmpty = buildDeepLinkSignature({ taskId: " t-1 ", other: "" });
  assert.equal(sigWithEmpty, "taskId=t-1");
});

test("Phase 6D: isValidRecordId validates non-empty non-whitespace strings", () => {
  assert.equal(isValidRecordId("task-123"), true);
  assert.equal(isValidRecordId("uuid-v4-abc"), true);
  assert.equal(isValidRecordId(""), false);
  assert.equal(isValidRecordId("   "), false);
  assert.equal(isValidRecordId(null), false);
  assert.equal(isValidRecordId(undefined), false);
  assert.equal(isValidRecordId(123), false);
});

test("Phase 6D: isValidDateString validates YYYY-MM-DD calendar dates", () => {
  assert.equal(isValidDateString("2026-11-10"), true);
  assert.equal(isValidDateString("2024-02-29"), true); // Leap day format
  assert.equal(isValidDateString("2026-1-1"), false);
  assert.equal(isValidDateString("invalid"), false);
  assert.equal(isValidDateString(""), false);
  assert.equal(isValidDateString(null), false);
  assert.equal(isValidDateString(undefined), false);
});

test("Phase 6D: Route mapping contract simulation across all modules", () => {
  const routes = [
    {
      module: "task",
      url: "/tasks?taskId=task-001",
      expectedPath: "/tasks",
      expectedParam: "taskId",
      expectedValue: "task-001",
    },
    {
      module: "goal",
      url: "/tasks?taskId=goal-002",
      expectedPath: "/tasks",
      expectedParam: "taskId",
      expectedValue: "goal-002",
    },
    {
      module: "library",
      url: "/library?entryId=entry-003",
      expectedPath: "/library",
      expectedParam: "entryId",
      expectedValue: "entry-003",
    },
    {
      module: "note",
      url: "/library?entryId=note-004&view=note",
      expectedPath: "/library",
      expectedParam: "entryId",
      expectedValue: "note-004",
      secondaryParam: "view",
      secondaryValue: "note",
    },
    {
      module: "collection",
      url: "/library?collectionId=col-005",
      expectedPath: "/library",
      expectedParam: "collectionId",
      expectedValue: "col-005",
    },
    {
      module: "habit",
      url: "/habits?habitId=habit-006",
      expectedPath: "/habits",
      expectedParam: "habitId",
      expectedValue: "habit-006",
    },
    {
      module: "calendar",
      url: "/calendar?eventId=event-007&date=2026-11-10",
      expectedPath: "/calendar",
      expectedParam: "eventId",
      expectedValue: "event-007",
      secondaryParam: "date",
      secondaryValue: "2026-11-10",
    },
    {
      module: "inbox",
      url: "/inbox?itemId=item-008",
      expectedPath: "/inbox",
      expectedParam: "itemId",
      expectedValue: "item-008",
    },
  ];

  for (const item of routes) {
    const [pathname, qs] = item.url.split("?");
    assert.equal(pathname, item.expectedPath);

    const params = new URLSearchParams(qs);
    assert.equal(params.get(item.expectedParam), item.expectedValue);

    if (item.secondaryParam) {
      assert.equal(params.get(item.secondaryParam), item.secondaryValue);
    }

    // Cleaning consumed params should leave pathname clean
    const keysToRemove = [item.expectedParam];
    if (item.secondaryParam) keysToRemove.push(item.secondaryParam);
    const cleaned = removeQueryParams(pathname, params, keysToRemove);
    assert.equal(cleaned, item.expectedPath);
  }
});

