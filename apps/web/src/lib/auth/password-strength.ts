import { MIN_PASSWORD_LENGTH } from "@/utils/constants/auth";

/**
 * Rule-based password strength — length + character-class variety only.
 * Deliberately dependency-free (no zxcvbn): it's an advisory nudge, not a
 * gate. The only hard rule the server enforces is MIN_PASSWORD_LENGTH; this
 * helper never blocks submit, it just labels the choice.
 */
export type PasswordStrengthLevel = "weak" | "fair" | "strong";

export interface PasswordStrength {
  /** 0 (empty) through 4 — drives the meter's filled-segment count. */
  score: number;
  level: PasswordStrengthLevel;
  /** Human label for the meter. */
  label: string;
}

const LEVEL_LABEL: Record<PasswordStrengthLevel, string> = {
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
};

function characterClassCount(password: string): number {
  return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password))
    .length;
}

/**
 * Classify a password into weak/fair/strong with a 0–4 score. Boundaries:
 * - empty → score 0, weak.
 * - below MIN_PASSWORD_LENGTH → weak, however varied (it can't be submitted).
 * - one character class only → weak, however long (a single class is guessable).
 * - meets length + ≥2 classes → fair.
 * - ≥12 chars AND ≥3 classes → strong (length and variety both required).
 */
export function scorePassword(password: string): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, level: "weak", label: LEVEL_LABEL.weak };
  }
  const classes = characterClassCount(password);
  if (password.length < MIN_PASSWORD_LENGTH || classes < 2) {
    return { score: 1, level: "weak", label: LEVEL_LABEL.weak };
  }
  let score = 2;
  if (password.length >= 12) score += 1;
  if (classes >= 3) score += 1;
  const level: PasswordStrengthLevel = score >= 4 ? "strong" : "fair";
  return { score, level, label: LEVEL_LABEL[level] };
}
