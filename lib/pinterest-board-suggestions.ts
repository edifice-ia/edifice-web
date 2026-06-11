export type PinterestBoardSuggestionConfidence = "eleve" | "moyen" | "faible";

export type PinterestBoardSuggestionPin = {
  accountId: string;
  title: string | null;
  description: string | null;
  keywords?: string[] | null;
  niche?: string | null;
  boardId?: string | null;
  boardName?: string | null;
};

export type PinterestBoardSuggestionBoard = {
  id: string;
  name: string;
  accountKey: string;
  description?: string | null;
};

export type PinterestBoardSuggestion = {
  boardId: string | null;
  boardName: string | null;
  confidence: PinterestBoardSuggestionConfidence | null;
  reason: string | null;
  score: number;
  source: "confirmed" | "suggested" | "none";
};

const rules = [
  {
    name: "discipline, habitudes, productivite",
    terms: ["discipline", "habitude", "habitudes", "productivite", "objectif", "objectifs"],
    boardHints: ["discipline", "habitude", "habitudes", "productivite", "objectif", "objectifs"],
  },
  {
    name: "sommeil, relaxation, nuit",
    terms: ["sommeil", "dormir", "routine", "soir", "relaxation", "stress", "nuit"],
    boardHints: ["sommeil", "dormir", "relaxation", "stress", "nuit", "soir"],
  },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(values: Array<string | null | undefined>) {
  return new Set(
    values
      .join(" ")
      .split(/[^a-zA-Z0-9_]+/)
      .map((token) => normalizeText(token).trim())
      .filter((token) => token.length >= 3),
  );
}

function confidenceFromScore(score: number): PinterestBoardSuggestionConfidence {
  if (score >= 5) {
    return "eleve";
  }

  if (score >= 2) {
    return "moyen";
  }

  return "faible";
}

function describeMatches(matches: string[]) {
  if (matches.length === 0) {
    return "peu de mots-cles communs, choix a confirmer";
  }

  return `mots-cles ${matches.slice(0, 5).join(", ")}`;
}

export function suggestPinterestBoard(
  pin: PinterestBoardSuggestionPin,
  boards: PinterestBoardSuggestionBoard[],
): PinterestBoardSuggestion {
  const accountBoards = boards.filter((board) => board.accountKey === pin.accountId);

  if (pin.boardId || pin.boardName) {
    const confirmedBoard =
      accountBoards.find((board) => board.id === pin.boardId) ??
      accountBoards.find((board) => board.name === pin.boardName);

    return {
      boardId: confirmedBoard?.id ?? pin.boardId ?? null,
      boardName: confirmedBoard?.name ?? pin.boardName ?? null,
      confidence: "eleve",
      reason: "tableau deja confirme",
      score: 99,
      source: "confirmed",
    };
  }

  if (accountBoards.length === 0) {
    return {
      boardId: null,
      boardName: null,
      confidence: null,
      reason: "aucun tableau accessible pour ce compte",
      score: 0,
      source: "none",
    };
  }

  const keywordText = pin.keywords?.join(" ") ?? "";
  const pinTokens = tokenize([pin.title, pin.description, keywordText, pin.niche]);
  const scoredBoards = accountBoards.map((board) => {
    const boardTokens = tokenize([board.name, board.description]);
    const matches: string[] = [];
    let score = 0;

    for (const token of pinTokens) {
      if (boardTokens.has(token)) {
        matches.push(token);
        score += 2;
      }
    }

    for (const rule of rules) {
      const ruleMatched = rule.terms.some((term) => pinTokens.has(normalizeText(term)));
      const boardMatched = rule.boardHints.some((hint) => boardTokens.has(normalizeText(hint)));

      if (ruleMatched && boardMatched) {
        score += 3;
        matches.push(rule.name);
      }
    }

    return { board, score, matches: Array.from(new Set(matches)) };
  });

  scoredBoards.sort((left, right) => right.score - left.score);
  const best = scoredBoards[0];

  return {
    boardId: best.board.id,
    boardName: best.board.name,
    confidence: confidenceFromScore(best.score),
    reason: describeMatches(best.matches),
    score: best.score,
    source: "suggested",
  };
}
