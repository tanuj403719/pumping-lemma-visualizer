"use client";

import { create } from "zustand";
import {
  type ExampleId,
  ExampleRegistry,
  type Partition,
} from "@/lib/automata/pumpingLemma";
import type { CustomConditionRule } from "@/lib/automata/customLanguageEngine";

export type LanguageMode = "textbook" | "custom";

interface PumpingLemmaStore {
  mode: LanguageMode;
  selectedLanguage: ExampleId;
  n: number;
  w: string;
  currentPartition: Partition;
  pumpI: number;
  customStringTemplate: string;
  customRegexFormat: string;
  customCondition: CustomConditionRule;
  customEqualCharLeft: string;
  customEqualCharRight: string;
  setMode: (mode: LanguageMode) => void;
  setSelectedLanguage: (selectedLanguage: ExampleId) => void;
  setN: (n: number) => void;
  setW: (w: string) => void;
  setCurrentPartition: (partition: Partition) => void;
  setPartitionByCuts: (xCut: number, xyCut: number) => void;
  setPumpI: (i: number) => void;
  setCustomStringTemplate: (template: string) => void;
  setCustomRegexFormat: (pattern: string) => void;
  setCustomCondition: (condition: CustomConditionRule) => void;
  setCustomEqualCharLeft: (char: string) => void;
  setCustomEqualCharRight: (char: string) => void;
}

const clampPositiveInteger = (value: number, fallback = 1): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
};

const clampNonNegativeInteger = (value: number, fallback = 0): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : fallback;
};

const normalizeCuts = (
  wLength: number,
  xCut: number,
  xyCut: number,
): { xCut: number; xyCut: number } => {
  const boundedLength = Math.max(0, wLength);
  const nextXCut = Math.min(Math.max(0, Math.floor(xCut)), boundedLength);
  const nextXYCut = Math.min(Math.max(0, Math.floor(xyCut)), boundedLength);

  return {
    xCut: nextXCut,
    xyCut: Math.max(nextXCut, nextXYCut),
  };
};

const partitionFromCuts = (w: string, xCut: number, xyCut: number): Partition => {
  const cuts = normalizeCuts(w.length, xCut, xyCut);

  return {
    x: w.slice(0, cuts.xCut),
    y: w.slice(cuts.xCut, cuts.xyCut),
    z: w.slice(cuts.xyCut),
  };
};

const generateExampleW = (selectedLanguage: ExampleId, n: number): string => {
  return ExampleRegistry[selectedLanguage].generateW(n);
};

const defaultPartition = (w: string): Partition => {
  if (w.length === 0) {
    return { x: "", y: "", z: "" };
  }

  return partitionFromCuts(w, 0, 1);
};

const initialLanguage: ExampleId = "5.20";
const initialN = 3;
const initialW = generateExampleW(initialLanguage, initialN);

const initialCustomStringTemplate = "a^n b^(2*n)";
const initialCustomRegexFormat = "^[ab]+$";
const initialCustomCondition: CustomConditionRule = "none";
const initialCustomEqualCharLeft = "a";
const initialCustomEqualCharRight = "b";

export const usePumpingLemmaStore = create<PumpingLemmaStore>((set, get) => ({
  mode: "textbook",
  selectedLanguage: initialLanguage,
  n: initialN,
  w: initialW,
  currentPartition: defaultPartition(initialW),
  pumpI: 0,
  customStringTemplate: initialCustomStringTemplate,
  customRegexFormat: initialCustomRegexFormat,
  customCondition: initialCustomCondition,
  customEqualCharLeft: initialCustomEqualCharLeft,
  customEqualCharRight: initialCustomEqualCharRight,
  setMode: (mode) => {
    set((state) => {
      if (mode === state.mode) {
        return state;
      }

      if (mode === "textbook") {
        const nextW = generateExampleW(state.selectedLanguage, state.n);
        return {
          mode,
          w: nextW,
          currentPartition: defaultPartition(nextW),
          pumpI: 0,
        };
      }

      return {
        mode,
        pumpI: 0,
      };
    });
  },
  setSelectedLanguage: (selectedLanguage) => {
    set((state) => {
      const nextW = generateExampleW(selectedLanguage, state.n);

      return {
        selectedLanguage,
        w: nextW,
        currentPartition: defaultPartition(nextW),
        pumpI: 0,
      };
    });
  },
  setN: (n) => {
    set((state) => {
      const nextN = clampPositiveInteger(n, state.n);

      if (state.mode === "custom") {
        return {
          n: nextN,
          pumpI: 0,
        };
      }

      const nextW = generateExampleW(state.selectedLanguage, nextN);

      return {
        n: nextN,
        w: nextW,
        currentPartition: defaultPartition(nextW),
        pumpI: 0,
      };
    });
  },
  setW: (w) => {
    set((state) => {
      const xCut = state.currentPartition.x.length;
      const xyCut = state.currentPartition.x.length + state.currentPartition.y.length;

      return {
        w,
        currentPartition: partitionFromCuts(w, xCut, xyCut),
      };
    });
  },
  setCurrentPartition: (partition) => {
    const state = get();
    if (`${partition.x}${partition.y}${partition.z}` !== state.w) {
      set({
        currentPartition: partitionFromCuts(
          state.w,
          partition.x.length,
          partition.x.length + partition.y.length,
        ),
      });
      return;
    }

    set({ currentPartition: partition });
  },
  setPartitionByCuts: (xCut, xyCut) => {
    set((state) => ({
      currentPartition: partitionFromCuts(state.w, xCut, xyCut),
    }));
  },
  setPumpI: (i) => {
    set({ pumpI: clampNonNegativeInteger(i, 0) });
  },
  setCustomStringTemplate: (template) => {
    set({ customStringTemplate: template });
  },
  setCustomRegexFormat: (pattern) => {
    set({ customRegexFormat: pattern });
  },
  setCustomCondition: (condition) => {
    set({ customCondition: condition });
  },
  setCustomEqualCharLeft: (char) => {
    set({ customEqualCharLeft: char.slice(0, 1) });
  },
  setCustomEqualCharRight: (char) => {
    set({ customEqualCharRight: char.slice(0, 1) });
  },
}));