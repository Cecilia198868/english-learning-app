import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadFreePracticeLimitModule() {
  const source = await readFile(
    new URL("../lib/freePracticeLimit.ts", import.meta.url),
    "utf8"
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString(
    "base64"
  )}`;

  return import(moduleUrl);
}

function createLocalStorage(initialEntries = {}) {
  const store = new Map(Object.entries(initialEntries));

  return {
    clear() {
      store.clear();
    },
    get length() {
      return store.size;
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

const {
  FREE_PRACTICE_DAILY_LIMIT,
  getFreePracticeUsage,
  isFreePracticeLimitReached,
  recordFreePracticeCompletion,
} = await loadFreePracticeLimitModule();

test.beforeEach(() => {
  globalThis.window = {
    localStorage: createLocalStorage(),
  };
});

test.after(() => {
  delete globalThis.window;
});

test("free practice limit is global across projects", () => {
  for (let index = 0; index < 3; index += 1) {
    recordFreePracticeCompletion("free", `free-${index}`);
  }
  for (let index = 0; index < 2; index += 1) {
    recordFreePracticeCompletion("guided", `guided-${index}`);
  }

  assert.equal(getFreePracticeUsage("classic").count, FREE_PRACTICE_DAILY_LIMIT);
  assert.equal(isFreePracticeLimitReached("sentence-pattern"), true);

  const blocked = recordFreePracticeCompletion("classic", "classic-1");
  assert.deepEqual(blocked, {
    count: FREE_PRACTICE_DAILY_LIMIT,
    didRecord: false,
    limitReached: true,
  });
});

test("legacy scoped usage is migrated into the global limit", () => {
  globalThis.window.localStorage = createLocalStorage({
    "speakflow-free-practice-usage:free": JSON.stringify({
      completedIds: ["free-1", "free-2", "free-3"],
      count: 3,
      date: "2020-01-01",
    }),
    "speakflow-free-practice-usage:guided": JSON.stringify({
      completedIds: ["guided-1", "guided-2"],
      count: 2,
      date: "2020-01-02",
    }),
  });

  const usage = getFreePracticeUsage("course");

  assert.equal(usage.count, FREE_PRACTICE_DAILY_LIMIT);
  assert.equal(isFreePracticeLimitReached("expression"), true);
  assert.equal(
    globalThis.window.localStorage.getItem(
      "speakflow-free-practice-usage:global"
    ) !== null,
    true
  );
});

test("free practice usage does not reset on a new date", () => {
  globalThis.window.localStorage = createLocalStorage({
    "speakflow-free-practice-usage:global": JSON.stringify({
      completedIds: ["a", "b", "c", "d", "e"],
      count: 5,
      date: "2000-01-01",
    }),
  });

  const usage = getFreePracticeUsage("free");

  assert.equal(usage.count, FREE_PRACTICE_DAILY_LIMIT);
  assert.equal(usage.date, "2000-01-01");
  assert.equal(isFreePracticeLimitReached("guided"), true);
});
