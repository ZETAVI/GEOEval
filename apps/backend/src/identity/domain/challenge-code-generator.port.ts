export const CHALLENGE_CODE_GENERATOR = Symbol("CHALLENGE_CODE_GENERATOR");

export interface ChallengeCodeGenerator {
  generate(): string;
}
