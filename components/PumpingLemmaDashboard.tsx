"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  type ExampleId,
  ExampleRegistry,
  pump,
  validateConstraints,
} from "@/lib/automata/pumpingLemma";
import {
  compileCustomLanguage,
  customEngineErrorMessage,
} from "@/lib/automata/customLanguageEngine";
import { usePumpingLemmaStore } from "@/lib/state/usePumpingLemmaStore";
import CustomLanguageBuilder from "@/components/CustomLanguageBuilder";

const exampleOrder: ExampleId[] = ["5.18", "5.19", "5.20", "5.21"];

const toInteger = (value: string, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.floor(parsed);
};

const positiveClass = "border-emerald-300 bg-emerald-50 text-emerald-700";
const negativeClass = "border-rose-300 bg-rose-50 text-rose-700";

interface ContextualTooltipNote {
  id: string;
  label: string;
  message: string;
  tone: "amber" | "sky";
}

export default function PumpingLemmaDashboard() {
  const {
    mode,
    selectedLanguage,
    n,
    w,
    currentPartition,
    pumpI,
    customStringTemplate,
    customRegexFormat,
    customCondition,
    customEqualCharLeft,
    customEqualCharRight,
    setMode,
    setSelectedLanguage,
    setN,
    setW,
    setPartitionByCuts,
    setPumpI,
    setCustomStringTemplate,
    setCustomRegexFormat,
    setCustomCondition,
    setCustomEqualCharLeft,
    setCustomEqualCharRight,
  } = usePumpingLemmaStore();

  const [activeBoundary, setActiveBoundary] = useState<"x" | "xy">("xy");
  const [customRuntimeError, setCustomRuntimeError] = useState<string | null>(null);

  const selectedExample = ExampleRegistry[selectedLanguage];
  const customCompilation = useMemo(() => {
    return compileCustomLanguage({
      template: customStringTemplate,
      regexFormat: customRegexFormat,
      condition: customCondition,
      equalCharLeft: customEqualCharLeft,
      equalCharRight: customEqualCharRight,
    });
  }, [
    customStringTemplate,
    customRegexFormat,
    customCondition,
    customEqualCharLeft,
    customEqualCharRight,
  ]);

  const xCut = currentPartition.x.length;
  const xyCut = currentPartition.x.length + currentPartition.y.length;
  const wCharacters = [...w];

  const checks = {
    wLength: w.length >= n,
    xyLength: xCut + currentPartition.y.length <= n,
    yNonEmpty: currentPartition.y.length > 0,
  };

  const stepTwoValid =
    checks.wLength && validateConstraints(w, currentPartition, n) && checks.yNonEmpty;

  const pumpedWord = useMemo(() => {
    return pump(currentPartition, pumpI);
  }, [currentPartition, pumpI]);

  const pumpedEvaluation = (() => {
    if (mode === "custom") {
      if (!customCompilation.isMember) {
        return {
          inLanguage: false,
          error:
            customCompilation.errors.regexFormat ??
            customCompilation.errors.condition ??
            "Membership rule is invalid.",
        };
      }

      try {
        return {
          inLanguage: customCompilation.isMember(pumpedWord),
          error: null,
        };
      } catch (error) {
        return {
          inLanguage: false,
          error: customEngineErrorMessage(error),
        };
      }
    }

    return {
      inLanguage: selectedExample.validate(pumpedWord),
      error: null,
    };
  })();

  const pumpedInLanguage = pumpedEvaluation.inLanguage;
  const pumpedError = pumpedEvaluation.error;
  const contradictionDetected = stepTwoValid && !pumpedError && !pumpedInLanguage;

  const contextualTooltips = useMemo<ContextualTooltipNote[]>(() => {
    if (mode !== "textbook") {
      return [];
    }

    const notes: ContextualTooltipNote[] = [];

    if (
      selectedLanguage === "5.20" &&
      currentPartition.y.includes("0") &&
      currentPartition.y.includes("1")
    ) {
      notes.push({
        id: "example-5-20-case-3",
        label: "Example 5.20 Case 3",
        message:
          "Case 3: y has both 0s and 1s. Pumping i=2 results in xy^2 z which is not of the form 0^i 1^i",
        tone: "amber",
      });
    }

    if (selectedLanguage === "5.21") {
      notes.push({
        id: "example-5-21-warning",
        label: "Example 5.21 Constraint",
        message: "Constraint warning: y cannot have two b's because |y| <= |xy| <= n.",
        tone: "sky",
      });
    }

    return notes;
  }, [mode, selectedLanguage, currentPartition.y]);

  const yBlockCount = Math.max(0, pumpI);

  const statusLabel = !stepTwoValid
    ? "Step 3 Locked"
    : pumpedError
      ? "Custom predicate execution error"
    : contradictionDetected
      ? "Contradiction! xy^i z ∉ L. Hence L is not regular"
      : "xy^i z is in L";

  const statusClass = !stepTwoValid
    ? "border-zinc-300 bg-zinc-100 text-zinc-600"
    : pumpedError
      ? "border-amber-300 bg-amber-100 text-amber-700"
    : contradictionDetected
      ? "border-rose-300 bg-rose-100 text-rose-700"
    : pumpedInLanguage
      ? "border-sky-300 bg-sky-100 text-sky-700"
      : "border-emerald-300 bg-emerald-100 text-emerald-700";

  const applyCuts = (nextXCut: number, nextXYCut: number) => {
    setPartitionByCuts(nextXCut, nextXYCut);
  };

  const applyGeneratedW = () => {
    if (mode === "custom") {
      if (!customCompilation.generateW) {
        setCustomRuntimeError(customCompilation.errors.template ?? "Template rule is invalid.");
        return;
      }

      try {
        const generated = customCompilation.generateW(n);
        setW(generated);
        setCustomRuntimeError(null);
      } catch (error) {
        setCustomRuntimeError(customEngineErrorMessage(error));
      }

      return;
    }

    setW(selectedExample.generateW(n));
  };

  const handleBlockClick = (index: number) => {
    const cut = index + 1;
    if (activeBoundary === "x") {
      applyCuts(cut, xyCut);
      return;
    }

    applyCuts(xCut, cut);
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
      <header className="rounded-2xl border border-sky-200 bg-gradient-to-r from-amber-100 via-orange-100 to-sky-100 p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Pumping Lemma Visualizer
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-700">
          Follow the proof chronologically by choosing a textbook language, selecting
          a decomposition w = xyz, and searching for a pump value i where x y^i z
          exits the language.
        </p>
      </header>

      <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Step 1
        </p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900">
          Assume L is regular. Let n be the number of states.
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("textbook")}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              mode === "textbook"
                ? "border-sky-300 bg-sky-100 text-sky-700"
                : "border-zinc-300 bg-white text-zinc-600"
            }`}
          >
            Textbook Mode
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              mode === "custom"
                ? "border-sky-300 bg-sky-100 text-sky-700"
                : "border-zinc-300 bg-white text-zinc-600"
            }`}
          >
            Custom Mode
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {mode === "textbook" ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">Language</span>
              <select
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value as ExampleId)}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none"
              >
                {exampleOrder.map((exampleId) => {
                  const example = ExampleRegistry[exampleId];
                  return (
                    <option key={exampleId} value={exampleId}>
                      Example {example.id}
                    </option>
                  );
                })}
              </select>
            </label>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">Language</span>
              <p className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                Custom Template and Rule Builder
              </p>
            </div>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">n (states)</span>
            <input
              type="number"
              min={1}
              value={n}
              onChange={(event) => {
                const parsed = toInteger(event.target.value, n);
                setN(parsed < 1 ? 1 : parsed);
              }}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none"
            />
          </label>
        </div>

        <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
          {mode === "textbook"
            ? selectedExample.language
            : "L = { w | isMember(w) returns true }"}
        </p>

        {mode === "custom" ? (
          <CustomLanguageBuilder
            stringTemplate={customStringTemplate}
            regexFormat={customRegexFormat}
            condition={customCondition}
            equalCharLeft={customEqualCharLeft}
            equalCharRight={customEqualCharRight}
            templateError={customCompilation.errors.template}
            regexError={customCompilation.errors.regexFormat}
            conditionError={customCompilation.errors.condition}
            onStringTemplateChange={setCustomStringTemplate}
            onRegexFormatChange={setCustomRegexFormat}
            onConditionChange={setCustomCondition}
            onEqualCharLeftChange={setCustomEqualCharLeft}
            onEqualCharRightChange={setCustomEqualCharRight}
            onGenerateW={applyGeneratedW}
            canGenerateW={Boolean(customCompilation.generateW)}
          />
        ) : null}
      </article>

      <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Step 2
        </p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900">
          Choose w with |w| &gt;= n and write w = xyz with |xy| &lt;= n and |y| &gt; 0.
        </h2>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">w</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={w}
                onChange={(event) => setW(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-sky-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={applyGeneratedW}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                {mode === "custom" ? "Generate w from n" : "Use textbook w"}
              </button>
            </div>
          </label>

          {customRuntimeError ? (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Runtime error: {customRuntimeError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveBoundary("x")}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                activeBoundary === "x"
                  ? "border-sky-300 bg-sky-100 text-sky-700"
                  : "border-zinc-300 bg-white text-zinc-600"
              }`}
            >
              Click blocks to set x|y boundary
            </button>
            <button
              type="button"
              onClick={() => setActiveBoundary("xy")}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                activeBoundary === "xy"
                  ? "border-sky-300 bg-sky-100 text-sky-700"
                  : "border-zinc-300 bg-white text-zinc-600"
              }`}
            >
              Click blocks to set y|z boundary
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex min-h-16 min-w-max items-center gap-2">
              {wCharacters.length === 0 ? (
                <p className="text-sm text-zinc-500">w is empty. Add characters to begin.</p>
              ) : (
                wCharacters.map((character, index) => {
                  const inX = index < xCut;
                  const inY = index >= xCut && index < xyCut;

                  const blockClass = inX
                    ? "border-sky-300 bg-sky-100 text-sky-700"
                    : inY
                      ? "border-amber-300 bg-amber-100 text-amber-700"
                      : "border-rose-300 bg-rose-100 text-rose-700";

                  return (
                    <button
                      type="button"
                      key={`${character}-${index}`}
                      onClick={() => handleBlockClick(index)}
                      className={`h-10 w-10 rounded-lg border font-mono text-sm font-semibold transition hover:-translate-y-0.5 ${blockClass}`}
                    >
                      {character}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">x|y boundary</span>
              <input
                type="range"
                min={0}
                max={w.length}
                value={xCut}
                onChange={(event) => applyCuts(toInteger(event.target.value, xCut), xyCut)}
                className="w-full"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">y|z boundary</span>
              <input
                type="range"
                min={0}
                max={w.length}
                value={xyCut}
                onChange={(event) => applyCuts(xCut, toInteger(event.target.value, xyCut))}
                className="w-full"
              />
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 font-mono text-sm text-sky-700">
              x = {currentPartition.x || "Lambda"}
            </p>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-sm text-amber-700">
              y = {currentPartition.y || "Lambda"}
            </p>
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-sm text-rose-700">
              z = {currentPartition.z || "Lambda"}
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <p
              className={`rounded-xl border px-3 py-2 text-sm ${
                checks.wLength ? positiveClass : negativeClass
              }`}
            >
              |w| &gt;= n : {String(checks.wLength)} ({w.length} &gt;= {n})
            </p>
            <p
              className={`rounded-xl border px-3 py-2 text-sm ${
                checks.xyLength ? positiveClass : negativeClass
              }`}
            >
              |xy| &lt;= n : {String(checks.xyLength)} ({xCut + currentPartition.y.length} &lt;= {n})
            </p>
            <p
              className={`rounded-xl border px-3 py-2 text-sm ${
                checks.yNonEmpty ? positiveClass : negativeClass
              }`}
            >
              |y| &gt; 0 : {String(checks.yNonEmpty)} ({currentPartition.y.length} &gt; 0)
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Step 3
        </p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900">
          Find i such that x y^i z is not in L.
        </h2>

        {contextualTooltips.length > 0 ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Textbook Logic Tooltips
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {contextualTooltips.map((note) => {
                const noteClass =
                  note.tone === "amber"
                    ? "border-amber-300 bg-amber-100 text-amber-700"
                    : "border-sky-300 bg-sky-100 text-sky-700";

                return (
                  <div key={note.id} className="group relative">
                    <button
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${noteClass}`}
                    >
                      {note.label}
                    </button>
                    <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-700 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">
                      {note.message}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <fieldset
          disabled={!stepTwoValid}
          className={`mt-5 grid gap-4 rounded-xl border p-4 ${
            stepTwoValid
              ? "border-zinc-200 bg-zinc-50"
              : "border-zinc-200 bg-zinc-100 opacity-70"
          }`}
        >
          <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">Pump multiplier i</span>
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={pumpI}
                onChange={(event) => setPumpI(toInteger(event.target.value, pumpI))}
                className="w-full"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">i value</span>
              <input
                type="number"
                min={0}
                value={pumpI}
                onChange={(event) => {
                  const parsed = toInteger(event.target.value, pumpI);
                  setPumpI(parsed < 0 ? 0 : parsed);
                }}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Pumping Visualizer
            </p>
            <motion.div
              layout
              className="mt-3 flex min-h-16 flex-wrap items-center gap-2"
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
            >
              <motion.div
                layout
                className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 font-mono text-xs text-sky-700"
              >
                x: {currentPartition.x || "Lambda"}
              </motion.div>

              <AnimatePresence initial={false} mode="popLayout">
                {Array.from({ length: yBlockCount }).map((_, index) => (
                  <motion.div
                    layout
                    key={`y-${index}`}
                    initial={{ opacity: 0, scale: 0.92, x: -12 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.82, x: -20 }}
                    transition={{ duration: 0.24, delay: index * 0.03 }}
                    className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 font-mono text-xs text-amber-700"
                  >
                    y{index + 1}: {currentPartition.y || "Lambda"}
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.div
                layout
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
                className="rounded-lg border border-rose-300 bg-rose-100 px-3 py-2 font-mono text-xs text-rose-700"
              >
                z: {currentPartition.z || "Lambda"}
              </motion.div>
            </motion.div>

            <p className="mt-3 text-xs text-zinc-600">
              {pumpI === 0
                ? "i = 0: y fades out, and z slides left to concatenate with x (xz case)."
                : pumpI >= 2
                  ? "i >= 2: y is duplicated and z is pushed to the right."
                  : "i = 1: baseline decomposition xyz."}
            </p>
          </div>

          <p className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-sm break-all text-zinc-700">
            x y^i z = {pumpedWord || "Lambda"}
          </p>

          <div
            className={`rounded-2xl border px-4 py-5 text-center text-xl font-semibold tracking-wide ${statusClass}`}
          >
            {statusLabel}
          </div>

          {contradictionDetected ? (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              Contradiction! xy^i z ∉ L. Hence L is not regular.
            </p>
          ) : null}

          {pumpedError ? (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {pumpedError}
            </p>
          ) : null}
        </fieldset>

        {!stepTwoValid ? (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Step 3 is disabled until Step 2 constraints all evaluate to true.
          </p>
        ) : null}
      </article>
    </section>
  );
}