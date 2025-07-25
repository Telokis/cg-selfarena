export interface SelfArenaConfig {
  refereeCommand: string[];
  playerCommands: string[];
  playerNames: string[];
  seed: number;
  gameCount: number;
  playersPerGame: number;
  swap: boolean;
  batches: number;
  quiet: boolean;
}

export interface MatchResult {
  players: number[];
  scores: Record<number, number>;
  seed: number;
  matchId: number;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
