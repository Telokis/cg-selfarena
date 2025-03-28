import _ from "lodash";
import { getConfig } from "./config";
import { Match } from "./match";
import { permute } from "./permutations";
import { Stats } from "./stats";
import { promiseBatch } from "./batchPromise";

/**
 * Calculate binomial coefficient (n choose k)
 */
function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  let result = 1;

  // Use symmetry to calculate faster
  k = Math.min(k, n - k);

  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }

  return Math.round(result);
}

async function main() {
  try {
    const config = getConfig();
    let matchId = 0;

    // Calculate total matches (using lodash for combinations)
    let totalMatches = binomial(config.playerCommands.length, config.playersPerGame);

    if (config.swap) {
      totalMatches *= config.playersPerGame;
    }

    totalMatches *= config.gameCount;

    console.log(`Launching ${totalMatches} matches...`);

    // Create stats object
    const stats = new Stats(totalMatches);

    // Create promises array for matches
    const matches: Match[] = [];

    // Generate all permutations and run matches
    permute(config.playerCommands.length, config.playersPerGame, (permutation) => {
      for (let g = 0; g < config.gameCount; g++) {
        let seed = config.seed;

        if (config.seed === 0) {
          seed = Math.floor(Math.random() * 0xffffffff);
        }

        // Create original match
        const permCopy = [...permutation];
        const match = new Match(config, permCopy, seed, matchId++);
        matches.push(match);

        // Handle swapping if enabled
        if (config.swap) {
          for (let i = 1; i < config.playersPerGame; i++) {
            const swapPerm = [...permutation];

            for (let j = 1; j < config.playersPerGame; j++) {
              // Swap players
              [swapPerm[0], swapPerm[j]] = [swapPerm[j], swapPerm[0]];

              // Create swapped match
              const swapMatch = new Match(config, [...swapPerm], seed, matchId++);
              matches.push(swapMatch);
            }
          }
        }
      }
    });

    console.log("Waiting for match results...");
    console.log(`Running matches in batches of ${config.batches} (total: ${matches.length})...`);

    // Define handler function
    const runMatch = async (index: number, match: Match) => {
      const result = await match.run();

      stats.printMatchStats(result, index, config.playerNames, totalMatches);

      return result;
    };

    // Run matches in batches
    const results = await promiseBatch(
      config.batches,
      runMatch,
      matches.map((match) => [match] as [Match]),
      100,
    );

    // Process results
    for (const result of results) {
      stats.addScore(result);
    }

    stats.calculateWinrates();
    stats.printStats(config.playerNames);

    console.log("Finished execution");
  } catch (err) {
    console.error(`An error occurred:`, err);
  }
}

// Run the application
main();
