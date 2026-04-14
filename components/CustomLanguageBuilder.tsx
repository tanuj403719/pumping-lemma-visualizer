"use client";

import type { CustomConditionRule } from "@/lib/automata/customLanguageEngine";

interface CustomLanguageBuilderProps {
  stringTemplate: string;
  regexFormat: string;
  condition: CustomConditionRule;
  equalCharLeft: string;
  equalCharRight: string;
  templateError: string | null;
  regexError: string | null;
  conditionError: string | null;
  onStringTemplateChange: (value: string) => void;
  onRegexFormatChange: (value: string) => void;
  onConditionChange: (value: CustomConditionRule) => void;
  onEqualCharLeftChange: (value: string) => void;
  onEqualCharRightChange: (value: string) => void;
  onGenerateW: () => void;
  canGenerateW: boolean;
}

export default function CustomLanguageBuilder({
  stringTemplate,
  regexFormat,
  condition,
  equalCharLeft,
  equalCharRight,
  templateError,
  regexError,
  conditionError,
  onStringTemplateChange,
  onRegexFormatChange,
  onConditionChange,
  onEqualCharLeftChange,
  onEqualCharRightChange,
  onGenerateW,
  canGenerateW,
}: CustomLanguageBuilderProps) {
  return (
    <section className="mt-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Custom Mode
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-700">
        Build L with format and mathematical constraints, then generate w from a
        symbolic template that uses n.
      </p>

      <div className="mt-4 grid gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-700">String Template (use n)</span>
          <input
            value={stringTemplate}
            onChange={(event) => onStringTemplateChange(event.target.value)}
            placeholder="a^n b^(2*n)"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-sky-500 focus:outline-none"
          />

          {templateError ? (
            <p className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Template error: {templateError}
            </p>
          ) : (
            <p className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Template parsed successfully.
            </p>
          )}
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">Format (Regex)</span>
            <input
              value={regexFormat}
              onChange={(event) => onRegexFormatChange(event.target.value)}
              placeholder="^[ab]+$"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-sky-500 focus:outline-none"
            />

            {regexError ? (
              <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Regex error: {regexError}
              </p>
            ) : (
              <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Format rule is valid.
              </p>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">Condition</span>
            <select
              value={condition}
              onChange={(event) => onConditionChange(event.target.value as CustomConditionRule)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none"
            >
              <option value="none">None (Format only)</option>
              <option value="length-even">Length is Even</option>
              <option value="length-odd">Length is Odd</option>
              <option value="length-prime">Length is Prime</option>
              <option value="length-perfect-square">Length is a Perfect Square</option>
              <option value="equal-character-count">Equal number of two characters</option>
            </select>

            {conditionError ? (
              <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Condition error: {conditionError}
              </p>
            ) : (
              <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Condition rule is valid.
              </p>
            )}
          </label>
        </div>

        {condition === "equal-character-count" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">Character 1</span>
              <input
                value={equalCharLeft}
                onChange={(event) => onEqualCharLeftChange(event.target.value)}
                maxLength={1}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-sky-500 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">Character 2</span>
              <input
                value={equalCharRight}
                onChange={(event) => onEqualCharRightChange(event.target.value)}
                maxLength={1}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-sky-500 focus:outline-none"
              />
            </label>
          </div>
        ) : null}

        <div>
          <button
            type="button"
            onClick={onGenerateW}
            disabled={!canGenerateW}
            className="mt-3 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Generate w from n
          </button>
        </div>
      </div>
    </section>
  );
}