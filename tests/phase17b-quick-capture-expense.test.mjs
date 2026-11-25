import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ExpenseSchema,
  parseINRToPaise,
} from "../src/lib/schemas/expense.ts";
import { syncMutation } from "../src/lib/services/sync-queue-service.ts";
import {
  COMMAND_PALETTE_ITEMS,
  filterCommandPalette,
} from "../src/lib/services/command-palette-service.ts";

const ROOT_DIR = process.cwd();

test("Phase 17B: Quick Capture Expense Tab Verification", async (t) => {
  await t.test("1. UI Store supports defaultTab: 'expense' in openQuickCapture", () => {
    const uiStorePath = path.join(ROOT_DIR, "src", "lib", "stores", "ui-store.ts");
    const uiStoreContent = fs.readFileSync(uiStorePath, "utf-8");

    assert.match(uiStoreContent, /defaultTab\?:\s*string/);
    assert.match(uiStoreContent, /"defaultTab" in data/);
  });

  await t.test("2. ExpenseSchema validation blocks empty, zero, and negative amounts", () => {
    const emptyPaise = parseINRToPaise("");
    assert.equal(emptyPaise, 0);

    const zeroPaise = parseINRToPaise("0");
    assert.equal(zeroPaise, 0);

    const basePayload = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      category: "food",
      paymentMode: "upi",
      note: "Coffee",
      date: "2026-11-25",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    assert.equal(
      ExpenseSchema.safeParse({ ...basePayload, amountPaise: 0 }).success,
      false,
      "Zero paise must fail ExpenseSchema validation"
    );
    assert.equal(
      ExpenseSchema.safeParse({ ...basePayload, amountPaise: -2500 }).success,
      false,
      "Negative paise must fail ExpenseSchema validation"
    );
    assert.equal(
      ExpenseSchema.safeParse({ ...basePayload, amountPaise: 12050 }).success,
      true,
      "Valid positive paise must pass ExpenseSchema validation"
    );
  });

  await t.test("3. QuickCaptureModal implements Expense tab, validation-before-close, and 0ms optimistic sync", () => {
    const modalPath = path.join(ROOT_DIR, "src", "components", "quick-capture-modal.tsx");
    const modalContent = fs.readFileSync(modalPath, "utf-8");

    // Expense tab in QUICK_TYPES with Wallet icon & >=44px mobile touch target
    assert.match(modalContent, /\{\s*id:\s*"expense",\s*label:\s*"Expense"/);
    assert.match(modalContent, /<Wallet className="h-3\.5 w-3\.5"/);
    assert.match(modalContent, /min-h-\[44px\]/);

    // Validation before closeQuickCapture
    const validateIndex = modalContent.indexOf('if (lowerCat === "expense")');
    const closeIndex = modalContent.indexOf("closeQuickCapture();", validateIndex);
    assert.ok(validateIndex > -1, "Must validate expense before closing");
    assert.ok(closeIndex > validateIndex, "Validation must run before closeQuickCapture()");
    assert.match(modalContent, /ExpenseSchema\.safeParse/);
    assert.match(modalContent, /setFormError\("Please enter a valid amount greater than ₹0"\)/);

    // Optimistic Dexie write + syncMutation with entityType: "expense"
    assert.match(modalContent, /db\.expenses\.put\(expense\)/);
    assert.match(modalContent, /entityType:\s*"expense"/);
    assert.match(modalContent, /endpoint:\s*"\/api\/expenses"/);
  });

  await t.test("4. syncMutation queues offline expense mutation with entityType: 'expense'", async () => {
    const queuedItems = [];
    const mockDb = {
      syncQueue: {
        add: async (item) => {
          queuedItems.push(item);
          return queuedItems.length;
        },
      },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("Offline");
    };

    try {
      const expense = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        amountPaise: 4050,
        category: "food",
        paymentMode: "upi",
        note: "Masala chai",
        date: "2026-11-25",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const res = await syncMutation({
        endpoint: "/api/expenses",
        method: "POST",
        body: expense,
        entityType: "expense",
        entityId: expense.id,
        database: mockDb,
      });

      assert.equal(res.queued, true);
      assert.equal(queuedItems.length, 1);
      assert.equal(queuedItems[0].entityType, "expense");
      assert.equal(queuedItems[0].endpoint, "/api/expenses");
      assert.equal(queuedItems[0].method, "POST");
      assert.equal(queuedItems[0].entityId, expense.id);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("5. Command Palette registers '> Log Expense' shortcut opening Expense tab", () => {
    const matches = filterCommandPalette("> log expense");
    assert.ok(matches.some((c) => c.id === "action-log-expense"));

    const cmd = COMMAND_PALETTE_ITEMS.find((c) => c.id === "action-log-expense");
    assert.ok(cmd, "action-log-expense command must exist");
    assert.equal(cmd.title, "Log Expense");

    let closed = false;
    let captureArgs = null;
    cmd.run({
      router: { push: () => {} },
      setThemePersonality: () => {},
      setTheme: () => {},
      closePalette: () => {
        closed = true;
      },
      openQuickCapture: (data) => {
        captureArgs = data;
      },
    });

    assert.equal(closed, true);
    assert.deepEqual(captureArgs, { defaultTab: "expense" });
  });
});
