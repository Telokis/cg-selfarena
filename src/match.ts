import { exec } from "child_process";
import { promisify } from "util";
import { SelfArenaConfig, MatchResult } from "./types";

const execPromise = promisify(exec);

export class Match {
  config: SelfArenaConfig;
  players: number[];
  seed: number;
  matchId: number;

  constructor(config: SelfArenaConfig, players: number[], seed: number, matchId: number) {
    this.config = config;
    this.players = players;
    this.seed = seed;
    this.matchId = matchId;
  }

  async run(): Promise<MatchResult> {
    const result: MatchResult = {
      players: this.players,
      scores: {},
      seed: this.seed,
      matchId: this.matchId,
    };

    try {
      const command: string[] = [...this.config.refereeCommand];

      command.push("-d", `seed=${this.seed}`);

      for (let i = 0; i < this.players.length; i++) {
        const id = this.players[i];
        command.push(`-p${i + 1}`, this.config.playerCommands[id]);
      }

      const output = await this.execCommand(command[0], command.slice(1));

      if (output === "ERROR") {
        return result;
      }

      // Process output - remove warnings and normalize line endings
      let cleanOutput = output.replace(/^WARNING:.*\n/gim, "").replace(/\r\n/g, "\n");

      const fields = cleanOutput.trim().split(/\s+/);

      for (let i = 0; i < this.players.length; i++) {
        const id = this.players[i];
        const score = parseInt(fields[i], 10);

        if (isNaN(score)) {
          throw new Error(`Invalid score for player ${id}: ${fields[i]}`);
        }

        result.scores[id] = score;
      }

      return result;
    } catch (err) {
      console.log("\n\n");
      console.log("An error occurred:", err);
      console.log("\n\n");

      return result;
    }
  }

  private async execCommand(name: string, args: string[]): Promise<string> {
    try {
      const command = `${name} ${args.join(" ")}`;
      const { stdout } = await execPromise(command);

      // Simulate the sleep from Go code
      await new Promise((resolve) => setTimeout(resolve, 50 * (Math.floor(Math.random() * 3) + 1)));

      return stdout;
    } catch (err: any) {
      console.log("\n\n");
      console.log("Command failed:", name, args);
      if (err.stdout) console.log(err.stdout);
      console.log("An error occurred:", err.message);
      console.log("\n\n");

      return "ERROR";
    }
  }
}
