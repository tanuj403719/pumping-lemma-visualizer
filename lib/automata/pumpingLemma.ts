export type StateCount = number;
export type InputString = string;
export type PumpMultiplier = number;

export interface Partition {
  x: string;
  y: string;
  z: string;
}

export interface PumpingLemmaData {
  n: StateCount;
  w: InputString;
  partition: Partition;
  i: PumpMultiplier;
}

export type ExampleId = "5.18" | "5.19" | "5.20" | "5.21";

export interface ExampleConfig {
  id: ExampleId;
  language: string;
  generateW: (seed?: number) => string;
  validate: (value: string) => boolean;
}

const normalizePositiveInteger = (value: number, fallback = 1): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
};

const isOnlySymbol = (value: string, symbol: string): boolean => {
  return value.length > 0 && [...value].every((char) => char === symbol);
};

const isPerfectSquare = (value: number): boolean => {
  if (!Number.isInteger(value) || value < 1) {
    return false;
  }

  const root = Math.floor(Math.sqrt(value));
  return root * root === value;
};

const isPrime = (value: number): boolean => {
  if (!Number.isInteger(value) || value < 2) {
    return false;
  }

  if (value === 2) {
    return true;
  }

  if (value % 2 === 0) {
    return false;
  }

  const limit = Math.floor(Math.sqrt(value));
  for (let divisor = 3; divisor <= limit; divisor += 2) {
    if (value % divisor === 0) {
      return false;
    }
  }

  return true;
};

const nthPrime = (index: number): number => {
  const target = normalizePositiveInteger(index, 1);
  let count = 0;
  let candidate = 1;

  while (count < target) {
    candidate += 1;
    if (isPrime(candidate)) {
      count += 1;
    }
  }

  return candidate;
};

const buildABWord = (length: number): string => {
  const size = normalizePositiveInteger(length, 1);
  let output = "";

  for (let index = 0; index < size; index += 1) {
    output += index % 2 === 0 ? "a" : "b";
  }

  return output;
};

export const ExampleRegistry: Record<ExampleId, ExampleConfig> = {
  "5.18": {
    id: "5.18",
    language: "L = { a^(n^2) | n >= 1 }",
    generateW: (seed = 3) => {
      const n = normalizePositiveInteger(seed, 3);
      return "a".repeat(n * n);
    },
    validate: (value) => isOnlySymbol(value, "a") && isPerfectSquare(value.length),
  },
  "5.19": {
    id: "5.19",
    language: "L = { a^p | p is a prime }",
    generateW: (seed = 3) => {
      const prime = nthPrime(seed);
      return "a".repeat(prime);
    },
    validate: (value) => isOnlySymbol(value, "a") && isPrime(value.length),
  },
  "5.20": {
    id: "5.20",
    language: "L = { 0^n 1^n | n >= 1 }",
    generateW: (seed = 3) => {
      const n = normalizePositiveInteger(seed, 3);
      return `${"0".repeat(n)}${"1".repeat(n)}`;
    },
    validate: (value) => {
      if (!/^0+1+$/.test(value)) {
        return false;
      }

      const firstOneIndex = value.indexOf("1");
      const zeroCount = firstOneIndex;
      const oneCount = value.length - firstOneIndex;
      return zeroCount === oneCount;
    },
  },
  "5.21": {
    id: "5.21",
    language: "L = { ww | w in {a,b}* }",
    generateW: (seed = 4) => {
      const base = buildABWord(seed);
      return `${base}${base}`;
    },
    validate: (value) => {
      if (!/^[ab]*$/.test(value) || value.length % 2 !== 0) {
        return false;
      }

      const half = value.length / 2;
      return value.slice(0, half) === value.slice(half);
    },
  },
};

export function pump(partition: Partition, i: PumpMultiplier): string {
  if (!Number.isInteger(i) || i < 0) {
    throw new RangeError("Pump multiplier i must be an integer with i >= 0.");
  }

  return `${partition.x}${partition.y.repeat(i)}${partition.z}`;
}

export function validateConstraints(
  w: InputString,
  partition: Partition,
  n: StateCount,
): boolean {
  if (!Number.isInteger(n) || n < 1) {
    return false;
  }

  if (`${partition.x}${partition.y}${partition.z}` !== w) {
    return false;
  }

  return partition.x.length + partition.y.length <= n && partition.y.length > 0;
}