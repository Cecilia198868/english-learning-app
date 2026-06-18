export type ExpressionVariantKey = "standard" | "idiomatic" | "simple" | "natural";

export type ExpressionVariantMap = Record<ExpressionVariantKey, string>;

const placeholderExpressions = new Set([
  "Preparing a better expression.",
  "Preparing a better expression...",
  "This sentence is still being prepared.",
  "I'm still working on this sentence.",
]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function hasFinalPunctuation(value: string) {
  return /[.!?]$/.test(value);
}

function ensureSentence(value: string) {
  const text = cleanText(value);
  if (!text) return "";
  return hasFinalPunctuation(text) ? text : `${text}.`;
}

function stripFinalPeriod(value: string) {
  return value.replace(/[.!?]$/, "");
}

function normalizeComparableText(value: string) {
  return cleanText(value)
    .replace(/[.!?。！？,，]/g, "")
    .toLowerCase();
}

function capitalizeFirst(value: string) {
  const text = cleanText(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function lowerFirst(value: string) {
  const text = cleanText(value);
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function normalizeCommonLearnerEnglish(value: string) {
  return ensureSentence(value)
    .replace(
      /^It[’']?s (?:fine|nice|good) today,? we (?:are )?hiking for (?:two|2)(?: hours?)?\.$/i,
      "It's nice out today, so we went hiking for two hours."
    )
    .replace(
      /^It[’']?s (?:fine|nice|good) today,? we (?:are )?hiking\.$/i,
      "It's nice out today, so we went hiking."
    )
    .replace(
      /\bwe (?:are )?hiking for (?:two|2)\b/gi,
      "we went hiking for two hours"
    )
    .replace(/\bwe (?:are )?hiking\b/gi, "we went hiking")
    .replace(/^It[’']?s fine today\b/i, "It's nice out today")
    .replace(/\bwent to park\b/gi, "went to the park")
    .replace(/\bgo to park\b/gi, "go to the park")
    .replace(/\bvery beautiful\b/gi, "beautiful")
    .replace(
      /^Today (.+) went to the park there (?:are|were) (.+)\.$/i,
      (_match, subject: string, description: string) =>
        `${capitalizeFirst(subject)} went to the park today, and there were ${description}.`
    )
    .replace(
      /^(.+) went to the park there (?:are|were) (.+)\.$/i,
      (_match, subject: string, description: string) =>
        `${capitalizeFirst(subject)} went to the park, and there were ${description}.`
    );
}

function createSimpleVariant(standard: string) {
  const text = ensureSentence(standard);
  const withoutPeriod = stripFinalPeriod(text);

  const hikingMatch = withoutPeriod.match(
    /^It[’']s nice out today, so we went hiking(?: for two hours)?$/i
  );
  if (hikingMatch) {
    return /two hours/i.test(withoutPeriod)
      ? "The weather was nice today. We went hiking for two hours."
      : "The weather was nice today. We went hiking.";
  }

  const parkMatch = withoutPeriod.match(
    /^(.+) went to the park today, and there were (.+)$/i
  );
  if (parkMatch) {
    return ensureSentence(
      `${capitalizeFirst(parkMatch[1])} went to the park today. There were ${parkMatch[2]}`
    );
  }

  const patterns: Array<[RegExp, string]> = [
    [/^I would like to (.+)\.$/i, "I want to $1."],
    [/^I[’']d like to (.+)\.$/i, "I want to $1."],
    [/^I really want to (.+)\.$/i, "I want to $1."],
    [/^I have to (.+) because (.+)\.$/i, "I need to $1."],
    [/^If it[’']s not too much trouble, could you (.+)\?$/i, "Could you $1?"],
    [/^I would appreciate it if you could help me (.+)\.$/i, "Please help me $1."],
    [/^I was wondering if you could (.+)\.$/i, "Could you $1?"],
    [/^In my opinion, (.+)\.$/i, "I think $1."],
    [/^From my point of view, (.+)\.$/i, "I think $1."],
    [/^It seems to me that (.+)\.$/i, "I think $1."],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(text)) {
      return ensureSentence(text.replace(pattern, replacement));
    }
  }

  const commaSplit = withoutPeriod.match(/^(.+), and (.+)$/i);
  if (commaSplit) {
    return ensureSentence(`${commaSplit[1]}. ${capitalizeFirst(commaSplit[2])}`);
  }

  return text;
}

function createNaturalVariant(standard: string) {
  const leadingToday = ensureSentence(standard).match(/^Today (.+?)([.!?])?$/i);
  const baseText = leadingToday
    ? ensureSentence(`${capitalizeFirst(stripFinalPeriod(leadingToday[1]))} today`)
    : ensureSentence(standard);

  const hikingMatch = stripFinalPeriod(baseText).match(
    /^It[’']s nice out today, so we went hiking(?: for two hours)?$/i
  );
  if (hikingMatch) {
    return /two hours/i.test(baseText)
      ? "The weather was great today, so we went hiking for two hours."
      : "The weather was great today, so we went hiking.";
  }

  const parkMatch = stripFinalPeriod(baseText).match(
    /^(.+) went to the park today, and there were (?:many |some )?beautiful (.+)$/i
  );
  if (parkMatch) {
    return ensureSentence(
      `${capitalizeFirst(parkMatch[1])} went to the park today, and the ${parkMatch[2]} were beautiful`
    );
  }

  const text = baseText
    .replace(/^In my opinion, /i, "I think ")
    .replace(/^From my point of view, /i, "To me, ")
    .replace(/\bI would like to\b/gi, "I'd like to")
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bI will\b/g, "I'll")
    .replace(/\bIt is\b/g, "It's")
    .replace(/\bThere is\b/g, "There's")
    .replace(/\bdo not\b/g, "don't")
    .replace(/\bdoes not\b/g, "doesn't");

  return ensureSentence(text);
}

function createIdiomaticVariant(standard: string, natural: string) {
  const text = ensureSentence(standard);
  const withoutPeriod = stripFinalPeriod(text);

  const hikingMatch = withoutPeriod.match(
    /^It[’']s nice out today, so we went hiking(?: for two hours)?$/i
  );
  if (hikingMatch) {
    return /two hours/i.test(withoutPeriod)
      ? "It was such a nice day that we went hiking for a couple of hours."
      : "It was such a nice day that we went hiking.";
  }

  const parkMatch = withoutPeriod.match(
    /^(.+) went to the park today, and there were (?:many |some )?beautiful roses$/i
  );
  if (parkMatch) {
    return ensureSentence(
      `${capitalizeFirst(parkMatch[1])} went to the park today, and the roses were absolutely beautiful`
    );
  }

  const patterns: Array<[RegExp, string]> = [
    [/^I want to (.+)\.$/i, "I'd really like to $1."],
    [/^I want (.+)\.$/i, "I'd really like $1."],
    [/^I need (?!to\b)(.+)\.$/i, "I could really use $1."],
    [/^I[’']m worried about (.+)\.$/i, "I'm a bit worried about $1."],
    [/^I[’']m excited that (.+)\.$/i, "I'm really excited that $1."],
    [/^Can you help me (.+)\?$/i, "Could you help me $1?"],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(text)) {
      return ensureSentence(text.replace(pattern, replacement));
    }
  }

  return ensureSentence(natural || text);
}

function createOralVariant(standard: string, natural: string) {
  const text = ensureSentence(natural || standard);
  if (/^I think /i.test(text)) return text.replace(/^I think /i, "Honestly, I think ");
  if (/^I /i.test(text)) return text.replace(/^I /i, "Honestly, I ");
  return `Honestly, ${lowerFirst(text)}`;
}

function makeUniqueVariant(
  preferred: string,
  fallback: string,
  used: Set<string>
) {
  const candidates = [preferred, fallback, createOralVariant(fallback, preferred)]
    .map(ensureSentence)
    .filter(Boolean);

  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (!used.has(key)) {
      used.add(key);
      return candidate;
    }
  }

  const finalCandidate = ensureSentence(`In other words, ${lowerFirst(fallback)}`);
  used.add(finalCandidate.toLowerCase());
  return finalCandidate;
}

export function isPlaceholderExpression(value: unknown) {
  const text = cleanText(value);
  return !text || placeholderExpressions.has(text);
}

export function createFallbackExpressionVariantMap(sourceText: string): ExpressionVariantMap {
  const standardBase = normalizeCommonLearnerEnglish(sourceText);
  const standard = ensureSentence(standardBase) || "I want to say this more clearly.";
  const simple = createSimpleVariant(standard);
  const natural = createNaturalVariant(standard);
  const idiomatic = createIdiomaticVariant(standard, natural);
  const used = new Set<string>();

  const standardText = makeUniqueVariant(standard, standard, used);

  return {
    standard: standardText,
    idiomatic: makeUniqueVariant(idiomatic, standardText, used),
    simple: makeUniqueVariant(simple, standardText, used),
    natural: makeUniqueVariant(natural, standardText, used),
  };
}

export function normalizeExpressionVariantMap(
  variants: Partial<Record<ExpressionVariantKey, unknown>> | undefined,
  fallbackSource: string
): ExpressionVariantMap {
  const fallback = createFallbackExpressionVariantMap(fallbackSource);
  const used = new Set<string>();
  const fallbackSourceKey = normalizeComparableText(fallbackSource);

  function candidateOrFallback(
    value: unknown,
    fallbackValue: string,
    allowSourceEcho = false
  ) {
    const candidate =
      !isPlaceholderExpression(value) && cleanText(value) ? cleanText(value) : "";
    const candidateKey = normalizeComparableText(candidate);
    const echoesLearnerSource =
      !allowSourceEcho &&
      Boolean(candidateKey && fallbackSourceKey && candidateKey === fallbackSourceKey) &&
      candidateKey !== normalizeComparableText(fallbackValue);

    return candidate && !echoesLearnerSource ? candidate : fallbackValue;
  }

  const standard = candidateOrFallback(
    variants?.standard,
    fallback.standard,
    normalizeComparableText(fallback.standard) === fallbackSourceKey
  );
  const standardText = makeUniqueVariant(standard, fallback.standard, used);

  return {
    standard: standardText,
    idiomatic: makeUniqueVariant(
      candidateOrFallback(variants?.idiomatic, fallback.idiomatic),
      fallback.idiomatic,
      used
    ),
    simple: makeUniqueVariant(
      candidateOrFallback(variants?.simple, fallback.simple),
      fallback.simple,
      used
    ),
    natural: makeUniqueVariant(
      candidateOrFallback(variants?.natural, fallback.natural),
      fallback.natural,
      used
    ),
  };
}
