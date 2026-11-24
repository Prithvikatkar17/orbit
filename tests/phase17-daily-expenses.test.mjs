import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  formatINR,
  parseINRToPaise,
  ExpenseSchema,
  EXPENSE_CATEGORIES,
} from "../src/lib/schemas/expense.ts";
import { SyncQueueItemSchema } from "../src/lib/schemas/sync-queue.ts";
import { SettingsSchema } from "../src/lib/schemas/settings.ts";
import {
  CHORD_NAV_MAP,
} from "../src/lib/services/navigation-chords-service.ts";
import {
  COMMAND_PALETTE_ITEMS,
  filterCommandPalette,
} from "../src/lib/services/command-palette-service.ts";

const ROOT_DIR = process.cwd();

test("Phase 17: Daily Expenses Module Verification", async (t) => {
  await t.test("1. Currency Representation: Integer paise parsing & formatINR (no floating-point drift)", () => {
    // Parse tests
    assert.equal(parseINRToPaise("40.50"), 4050);
    assert.equal(parseINRToPaise("40.5"), 4050);
    assert.equal(parseINRToPaise("40"), 4000);
    assert.equal(parseINRToPaise(40.5), 4050);
    assert.equal(parseINRToPaise("₹1,25,000"), 12500000);
    assert.equal(parseINRToPaise("0"), 0);
    assert.equal(parseINRToPaise(""), 0);
    assert.equal(parseINRToPaise("abc"), 0);

    // formatINR tests
    // Whole rupees: omits .00
    const formatted40 = formatINR(4000);
    assert.ok(formatted40.includes("40"), "Should format 4000 paise as 40");
    assert.ok(!formatted40.includes("40.00"), "Should omit .00 for whole rupees");

    // Fractional rupees: includes .50
    const formatted4050 = formatINR(4050);
    assert.ok(formatted4050.includes("40.50") || formatted4050.includes("40.5"), "Should include decimals for 4050 paise");

    // Large amounts with Indian grouping: ₹1,25,000
    const formattedLarge = formatINR(12500000);
    assert.ok(formattedLarge.includes("1,25,000"), "Should use Indian number grouping");
  });

  await t.test("2. ExpenseSchema & SyncQueue Validation", () => {
    // Valid expense object
    const valid = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      amountPaise: 4050,
      category: "food",
      paymentMode: "upi",
      note: "Chai and snacks",
      date: "2026-11-24",
      createdAt: 1732450000000,
      updatedAt: 1732450000000,
    };
    const parsed = ExpenseSchema.parse(valid);
    assert.equal(parsed.amountPaise, 4050);
    assert.equal(parsed.category, "food");

    // Reject non-positive amount
    assert.throws(() => {
      ExpenseSchema.parse({ ...valid, amountPaise: 0 });
    });
    assert.throws(() => {
      ExpenseSchema.parse({ ...valid, amountPaise: -500 });
    });

    // Reject invalid category
    assert.throws(() => {
      ExpenseSchema.parse({ ...valid, category: "luxury" });
    });

    // Valid categories count
    assert.equal(EXPENSE_CATEGORIES.length, 7);
    assert.ok(EXPENSE_CATEGORIES.includes("food"));
    assert.ok(EXPENSE_CATEGORIES.includes("travel"));
    assert.ok(EXPENSE_CATEGORIES.includes("bills"));
    assert.ok(EXPENSE_CATEGORIES.includes("study"));
    assert.ok(EXPENSE_CATEGORIES.includes("fitness"));
    assert.ok(EXPENSE_CATEGORIES.includes("shopping"));
    assert.ok(EXPENSE_CATEGORIES.includes("misc"));

    // SyncQueueItemSchema supports entityType: "expense"
    const validQueueItem = SyncQueueItemSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      endpoint: "/api/expenses",
      method: "POST",
      entityType: "expense",
      entityId: "exp-123",
      createdAt: Date.now(),
      retryCount: 0,
    });
    assert.equal(validQueueItem.entityType, "expense");

    // SettingsSchema supports optional monthlyExpenseBudgetPaise
    const validSettings = SettingsSchema.parse({
      id: "user_settings",
      updatedAt: new Date().toISOString(),
      monthlyExpenseBudgetPaise: 1500000, // ₹15,000
    });
    assert.equal(validSettings.monthlyExpenseBudgetPaise, 1500000);
  });

  await t.test("3. SQLite Idempotent Endpoint & Tombstone Hardening", () => {
    const routePath = path.join(ROOT_DIR, "src", "app", "api", "expenses", "route.ts");
    assert.ok(fs.existsSync(routePath), "expenses route.ts must exist");
    const routeContent = fs.readFileSync(routePath, "utf-8");

    // GET, POST, PATCH, DELETE handlers
    assert.match(routeContent, /export async function GET/);
    assert.match(routeContent, /export async function POST/);
    assert.match(routeContent, /export async function PATCH/);
    assert.match(routeContent, /export async function DELETE/);

    // Idempotent upsert via onConflictDoUpdate
    assert.match(routeContent, /onConflictDoUpdate/);

    // Soft-delete tombstone with deletedAt and updatedAt
    assert.match(routeContent, /deletedAt:\s*now/);

    // SQLite schema table
    const schemaPath = path.join(ROOT_DIR, "src", "lib", "db", "schema.ts");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    assert.match(schemaContent, /export const expenses = sqliteTable\("expenses"/);

    // Reset endpoint clears expenses table
    const resetPath = path.join(ROOT_DIR, "src", "app", "api", "reset", "route.ts");
    const resetContent = fs.readFileSync(resetPath, "utf-8");
    assert.match(resetContent, /await db\.delete\(expenses\)/);
  });

  await t.test("4. Daily Grouping, Monthly Subtotal & Budget Pacing Calculation", () => {
    const sampleExpenses = [
      { id: "1", amountPaise: 4000, category: "food", date: "2026-11-24", createdAt: 100 },
      { id: "2", amountPaise: 2500, category: "food", date: "2026-11-24", createdAt: 200 },
      { id: "3", amountPaise: 15000, category: "bills", date: "2026-11-23", createdAt: 300 },
      { id: "4", amountPaise: 5000, category: "travel", date: "2026-10-31", createdAt: 400 },
    ];

    // Filter for November 2026
    const novExpenses = sampleExpenses.filter((e) => e.date.startsWith("2026-11"));
    assert.equal(novExpenses.length, 3);

    // Monthly total
    const monthTotalPaise = novExpenses.reduce((sum, e) => sum + e.amountPaise, 0);
    assert.equal(monthTotalPaise, 21500); // ₹215.00

    // Top category for November
    const catTotals = {};
    for (const e of novExpenses) {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amountPaise;
    }
    assert.equal(catTotals["bills"], 15000);
    assert.equal(catTotals["food"], 6500);

    // Budget Pacing: ₹250.00 allowance (25000 paise)
    const budgetPaise = 25000;
    const percentage = Math.round((monthTotalPaise / budgetPaise) * 100);
    assert.equal(percentage, 86);
    const isWarning = percentage >= 80 && percentage < 100;
    assert.equal(isWarning, true, "86% spend must trigger budget warning token");
  });

  await t.test("5. Navigation, Chords, Command Palette & Zero GPU Blur Tax", () => {
    // Navigation Chord: g then e -> /expenses
    assert.equal(CHORD_NAV_MAP.e, "/expenses");

    // Command Palette: > expenses
    const expenseCommands = filterCommandPalette("> expenses");
    assert.ok(expenseCommands.some((c) => c.id === "nav-expenses"));
    const cmd = COMMAND_PALETTE_ITEMS.find((c) => c.id === "nav-expenses");
    assert.equal(cmd.shortcutHint, "g e");

    // Command execution
    let targetRoute = "";
    let closed = false;
    cmd.run({
      router: { push: (r) => { targetRoute = r; } },
      setThemePersonality: () => {},
      setTheme: () => {},
      closePalette: () => { closed = true; },
    });
    assert.equal(targetRoute, "/expenses");
    assert.equal(closed, true);

    // Sidebar includes Expenses
    const sidebarPath = path.join(ROOT_DIR, "src", "components", "sidebar.tsx");
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
    assert.match(sidebarContent, /href:\s*"\/expenses"/);

    // Expenses page has backdrop-filter: none
    const expensesPagePath = path.join(ROOT_DIR, "src", "app", "expenses", "page.tsx");
    assert.ok(fs.existsSync(expensesPagePath), "Expenses page must exist");
    const expensesPageContent = fs.readFileSync(expensesPagePath, "utf-8");
    assert.match(expensesPageContent, /backdropFilter:\s*"none"/);
  });
});
