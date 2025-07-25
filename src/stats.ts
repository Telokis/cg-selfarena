import { MatchResult } from "./types";

interface Score {
  win: number;
  loss: number;
  draw: number;
  total: number;
  winrate: number;
}

export class Stats {
  scores: Record<number, Score>;
  total: number;
  results: MatchResult[];

  constructor(matchCount: number) {
    this.scores = {};
    this.total = 0;
    this.results = new Array(matchCount);
  }

  addScore(result: MatchResult): void {
    const l = result.players.length;

    for (let i = 0; i < l - 1; i++) {
      const p1 = result.players[i];
      const score1 = result.scores[p1];

      if (!this.scores[p1]) {
        this.scores[p1] = { win: 0, loss: 0, draw: 0, total: 0, winrate: 0 };
      }

      for (let j = i + 1; j < l; j++) {
        const p2 = result.players[j];
        const score2 = result.scores[p2];

        if (!this.scores[p2]) {
          this.scores[p2] = { win: 0, loss: 0, draw: 0, total: 0, winrate: 0 };
        }

        this.scores[p1].total++;
        this.scores[p2].total++;

        if (score1 > score2) {
          this.scores[p1].win++;
          this.scores[p2].loss++;
        } else if (score1 < score2) {
          this.scores[p1].loss++;
          this.scores[p2].win++;
        } else {
          this.scores[p1].draw++;
          this.scores[p2].draw++;
        }
      }
    }

    this.results[result.matchId] = result;
    this.total++;
  }

  calculateWinrates(): void {
    for (const id in this.scores) {
      const score = this.scores[id];
      score.winrate = (100.0 * (score.win + score.draw * 0.5)) / score.total;
    }
  }

  printMatchStats(
    result: MatchResult,
    id: number,
    playerNames: string[],
    totalMatches: number,
    printInfo: boolean,
  ): void {
    const padding = totalMatches.toString().length;
    const infos = result.players.map((playerId) => `${playerNames[playerId]}:${result.scores[playerId]}`);

    if (printInfo) {
      console.log(
        `Match ${(id + 1).toString().padStart(padding, " ")}/${totalMatches}:  Seed=${result.seed
          .toString()
          .padEnd(10, " ")}  ${infos.join(" | ")}`,
      );
    }
  }

  printStats(playerNames: string[]): void {
    console.log();
    console.log("Summary of performance:");

    for (const id in this.scores) {
      const score = this.scores[id];
      const pId = parseInt(id);
      const pName = playerNames[pId];

      console.log(
        `${pName}: ${score.winrate.toFixed(2)}% (${score.win} win / ${score.loss} lose / ${score.draw} draw)`,
      );
    }
  }
}
