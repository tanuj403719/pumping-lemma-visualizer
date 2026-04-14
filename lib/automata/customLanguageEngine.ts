const TEMPLATE_PART_REGEX = /([^\s^]+)(?:\^\s*(\([^)]*\)|[^\s]+))?/g;
const EXPRESSION_TOKEN_REGEX = /\s*([0-9]+|n|[()+\-*])\s*/gy;
const MAX_REPEAT_COUNT = 50000;

export type CustomConditionRule =
  | "none"
  | "length-even"
  | "length-odd"
  | "length-prime"
  | "length-perfect-square"
  | "equal-character-count";

export interface CustomLanguageConfig {
  template: string;
  regexFormat: string;
  condition: CustomConditionRule;
  equalCharLeft: string;
  equalCharRight: string;
}

export interface CustomLanguageCompilationResult {
  isMember: ((w: string) => boolean) | null;
  generateW: ((n: number) => string) | null;
  errors: {
    template: string | null;
    regexFormat: string | null;
    condition: string | null;
  };
}

export function customEngineErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown custom engine error.";
}

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
  for (let candidate = 3; candidate <= limit; candidate += 2) {
    if (value % candidate === 0) {
      return false;
    }
  }

  return true;
};

const isPerfectSquare = (value: number): boolean => {
  if (!Number.isInteger(value) || value < 0) {
    return false;
  }

  const root = Math.floor(Math.sqrt(value));
  return root * root === value;
};

const normalizeN = (n: number): number => {
  if (!Number.isFinite(n)) {
    return 1;
  }

  return Math.max(1, Math.floor(n));
};

const tokenizeExpression = (expression: string): string[] => {
  const tokens: string[] = [];
  let cursor = 0;

  while (cursor < expression.length) {
    EXPRESSION_TOKEN_REGEX.lastIndex = cursor;
    const match = EXPRESSION_TOKEN_REGEX.exec(expression);

    if (!match) {
      throw new Error(`Invalid exponent expression near: "${expression.slice(cursor)}"`);
    }

    tokens.push(match[1]);
    cursor = EXPRESSION_TOKEN_REGEX.lastIndex;
  }

  return tokens;
};

const evaluateExponentExpression = (expression: string, n: number): number => {
  const tokens = tokenizeExpression(expression);
  let index = 0;

  const peek = (): string | null => {
    return index < tokens.length ? tokens[index] : null;
  };

  const consume = (): string => {
    const token = tokens[index];
    index += 1;
    return token;
  };

  const parseExpression = (): number => {
    let value = parseTerm();

    while (peek() === "+" || peek() === "-") {
      const operator = consume();
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }

    return value;
  };

  const parseTerm = (): number => {
    let value = parseFactor();

    while (peek() === "*") {
      consume();
      value *= parseFactor();
    }

    return value;
  };

  const parseFactor = (): number => {
    const token = peek();

    if (token === null) {
      throw new Error("Unexpected end of exponent expression.");
    }

    if (token === "-") {
      consume();
      return -parseFactor();
    }

    if (token === "(") {
      consume();
      const value = parseExpression();
      if (peek() !== ")") {
        throw new Error("Missing closing parenthesis in exponent expression.");
      }
      consume();
      return value;
    }

    if (token === "n") {
      consume();
      return n;
    }

    if (/^[0-9]+$/.test(token)) {
      consume();
      return Number(token);
    }

    throw new Error(`Unexpected token "${token}" in exponent expression.`);
  };

  const result = parseExpression();
  if (index !== tokens.length) {
    throw new Error("Invalid trailing tokens in exponent expression.");
  }

  if (!Number.isFinite(result)) {
    throw new Error("Exponent expression is not a finite number.");
  }

  const normalized = Math.floor(result);
  if (normalized < 0) {
    throw new Error("Exponent cannot evaluate to a negative integer.");
  }

  if (normalized > MAX_REPEAT_COUNT) {
    throw new Error(`Exponent exceeds max repeat limit (${MAX_REPEAT_COUNT}).`);
  }

  return normalized;
};

export function parseTemplate(template: string, n: number): string {
  const trimmedTemplate = template.trim();
  if (!trimmedTemplate) {
    throw new Error("String template cannot be empty.");
  }

  const normalizedN = normalizeN(n);
  TEMPLATE_PART_REGEX.lastIndex = 0;

  let cursor = 0;
  let output = "";
  let matchedAnyPart = false;

  for (const match of trimmedTemplate.matchAll(TEMPLATE_PART_REGEX)) {
    matchedAnyPart = true;
    const matchIndex = match.index ?? 0;
    const gap = trimmedTemplate.slice(cursor, matchIndex);

    if (gap.trim().length > 0) {
      throw new Error(`Invalid template segment near "${gap.trim()}".`);
    }

    const symbols = match[1];
    const exponentRaw = match[2];

    if (!symbols || symbols.length === 0) {
      throw new Error("Template includes an empty symbol group.");
    }

    let repeatCount = 1;
    if (typeof exponentRaw === "string" && exponentRaw.trim().length > 0) {
      const exponentExpression = exponentRaw.trim();
      repeatCount = evaluateExponentExpression(exponentExpression, normalizedN);
    }

    output += symbols.repeat(repeatCount);
    cursor = matchIndex + match[0].length;
  }

  const trailingSegment = trimmedTemplate.slice(cursor);
  if (!matchedAnyPart || trailingSegment.trim().length > 0) {
    throw new Error("String template contains invalid syntax.");
  }

  return output;
}

const parseRegexInput = (regexFormat: string): RegExp => {
  const trimmed = regexFormat.trim();
  if (!trimmed) {
    return /^.*$/;
  }

  const literalMatch = trimmed.match(/^\/(.*)\/([a-z]*)$/i);
  if (literalMatch) {
    return new RegExp(literalMatch[1], literalMatch[2]);
  }

  return new RegExp(trimmed);
};

const evaluateCondition = (
  w: string,
  condition: CustomConditionRule,
  equalCharLeft: string,
  equalCharRight: string,
): boolean => {
  switch (condition) {
    case "none":
      return true;
    case "length-even":
      return w.length % 2 === 0;
    case "length-odd":
      return w.length % 2 === 1;
    case "length-prime":
      return isPrime(w.length);
    case "length-perfect-square":
      return isPerfectSquare(w.length);
    case "equal-character-count": {
      const leftCount = w.split(equalCharLeft).length;
      const rightCount = w.split(equalCharRight).length;
      return leftCount === rightCount;
    }
    default:
      return false;
  }
};

export function compileCustomLanguage(
  config: CustomLanguageConfig,
): CustomLanguageCompilationResult {
  let templateError: string | null = null;
  let regexFormatError: string | null = null;
  let conditionError: string | null = null;

  let compiledRegex: RegExp | null = null;

  try {
    parseTemplate(config.template, 2);
  } catch (error) {
    templateError = customEngineErrorMessage(error);
  }

  try {
    compiledRegex = parseRegexInput(config.regexFormat);
  } catch (error) {
    regexFormatError = customEngineErrorMessage(error);
  }

  if (config.condition === "equal-character-count") {
    if (config.equalCharLeft.trim().length !== 1 || config.equalCharRight.trim().length !== 1) {
      conditionError =
        "Equal character count requires one character in each character field.";
    }
  }

  const generateW = templateError
    ? null
    : (n: number) => {
        return parseTemplate(config.template, n);
      };

  const isMember = regexFormatError || conditionError || !compiledRegex
    ? null
    : (w: string) => {
        compiledRegex.lastIndex = 0;
        const matchesFormat = compiledRegex.test(w);
        if (!matchesFormat) {
          return false;
        }

        return evaluateCondition(
          w,
          config.condition,
          config.equalCharLeft.trim(),
          config.equalCharRight.trim(),
        );
      };

  return {
    isMember,
    generateW,
    errors: {
      template: templateError,
      regexFormat: regexFormatError,
      condition: conditionError,
    },
  };
}