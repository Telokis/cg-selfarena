import minimist from "minimist";
import { SelfArenaConfig, ConfigError } from "./types";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { z } from "zod";

const FileConfigSchema = z.object({
  referee: z.object({
    command: z.string().min(1, "Referee command is mandatory"),
  }),
  players: z
    .array(
      z.object({
        name: z.string(),
        command: z.string().min(1, "Player command can't be empty"),
      }),
    )
    .min(2, "At least two players must be specified"),
  game: z.object({
    seed: z.number().default(0),
    games_per_matchup: z.number().int().positive().default(1),
    players_per_game: z.number().int().min(2).max(4),
    swap_positions: z.boolean().default(false),
  }),
  execution: z
    .object({
      batches: z.number().int().positive().default(20),
    })
    .optional()
    .default({}),
});

type FileConfig = z.infer<typeof FileConfigSchema>;

function displayHelpMessage(): void {
  console.log(`
SelfArena - Tournament runner for competitive games

Usage:
  bun run start -- <config.yml> [options]

Options:
  -seed <num>                      Override the seed (default: from config or 0)
  -n, --games <num>                Override the number of games to play (default: from config)
  --swap                           Override asymmetric map handling (default: from config)
  -b, --batch, --batches <num>     Override simultaneous batches to run (default: from config)
  -h, --help                       Display this help message
  -q, --quiet                      Hide the match detailed output

Examples:
  bun run start -- config.yml --seed 33 --games 10
  bun run start -- tournament.yml --swap -n 5
`);
}

/**
 * Parse command line arguments and create config
 */
export function getConfig(): SelfArenaConfig {
  const argv = minimist(process.argv.slice(2), {
    boolean: ["swap", "h", "help", "quiet"],
    default: {
      seed: null,
      n: null,
      games: null,
      swap: null,
      b: null,
      batch: null,
      batches: null,
      h: false,
      help: false,
      q: false,
      quiet: false,
    },
    alias: {
      n: ["games"],
      b: ["batch", "batches"],
      h: ["help"],
      q: ["quiet"],
    },
  });

  // Check for help flag
  if (argv.h) {
    displayHelpMessage();
    process.exit(0);
  }

  // Check if config file was provided as positional argument
  const positionalArgs = argv._;
  if (positionalArgs.length < 1) {
    console.error("Error: Config file is required.");
    displayHelpMessage();
    process.exit(1);
  }

  const configPath = positionalArgs[0];
  let validatedConfig: FileConfig;
  const configDir = path.dirname(path.resolve(configPath));

  try {
    // Read and parse YAML config file
    const configContent = fs.readFileSync(configPath, "utf8");
    const parsedConfig = yaml.load(configContent) as Record<string, any>;

    const processedConfig = replaceConfigDirPlaceholder(parsedConfig, configDir);

    // Validate with Zod
    const result = FileConfigSchema.safeParse(processedConfig);

    if (!result.success) {
      console.error("Invalid configuration file:");
      console.error(result.error.format());
      process.exit(1);
    }

    validatedConfig = result.data;
  } catch (error) {
    console.error(`Error reading or parsing config file: ${(error as Error).message}`);
    process.exit(1);
  }

  const config: SelfArenaConfig = {
    refereeCommand: [],
    playerCommands: [],
    playerNames: [],
    seed: validatedConfig.game.seed,
    gameCount: validatedConfig.game.games_per_matchup,
    playersPerGame: validatedConfig.game.players_per_game,
    swap: validatedConfig.game.swap_positions,
    batches: validatedConfig.execution?.batches || 20,
    quiet: false,
  };

  try {
    // Parse referee from validated config
    config.refereeCommand = smartSplit(validatedConfig.referee.command);

    // Parse players from validated config
    for (const player of validatedConfig.players) {
      const cmd = replaceConfigDirPlaceholder(injectPlayerCommandHelper(player.command), configDir);

      config.playerCommands.push(`"${cmd}"`);
      config.playerNames.push(player.name || `P${config.playerCommands.length}`);
    }

    console.log(config.playerCommands);

    // Override with CLI arguments if provided
    if (argv.seed !== null) {
      config.seed = Number(argv.seed);
    }

    if (argv.n !== null) {
      config.gameCount = Number(argv.n);
    }

    if (argv.swap !== null) {
      config.swap = Boolean(argv.swap);
    }

    if (argv.quiet !== null) {
      config.quiet = Boolean(argv.quiet);
    }

    if (argv.b !== null) {
      config.batches = Number(argv.b);
    }

    // Final validation
    if (config.gameCount < 1) {
      throw new ConfigError("Number of games can't be negative or zero.");
    }

    if (config.batches < 1) {
      throw new ConfigError("Number of batches can't be negative or zero.");
    }

    if (config.playersPerGame < 2 || config.playersPerGame > 4) {
      throw new ConfigError("Players per game must be in the range 2-4.");
    }

    if (config.playerCommands.length < 2) {
      throw new ConfigError("You need to specify at least two players");
    }
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Error: ${error.message}\n`);
      displayHelpMessage();
      process.exit(1);
    }
    throw error;
  }

  return config;
}

function injectPlayerCommandHelper(cmd: string): string {
  // For NodeJS, we need to add `-r <helpers_dir>/js_helper.js` right after the "node" string
  if (cmd.startsWith("node")) {
    const args = smartSplit(cmd);
    const index = args.indexOf("node");
    if (index !== -1) {
      args.splice(index + 1, 0, "-r", "<helpers_dir>/js_helper.js");
      return args.join(" ");
    }
  }

  return cmd;
}

/**
 * Splits a command string into an array of arguments while respecting quotes
 */
function smartSplit(cmd: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i];

    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === " " && !inQuote) {
      if (current) {
        result.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

/**
 * Recursively replace <config_dir> placeholder in strings
 */
function replaceConfigDirPlaceholder(obj: any, configDir: string): any {
  const botsDir = path.join(configDir, "..", "bots").replaceAll("\\", "/");
  const helpersDir = path.join(configDir, "..", "helpers").replaceAll("\\", "/");
  const refereesDir = path.join(configDir, "..", "referees").replaceAll("\\", "/");

  if (typeof obj === "string") {
    return obj
      .replaceAll("<config_dir>", configDir)
      .replaceAll("<bots_dir>", botsDir)
      .replaceAll("<helpers_dir>", helpersDir)
      .replaceAll("<referees_dir>", refereesDir);
  } else if (Array.isArray(obj)) {
    return obj.map((item) => replaceConfigDirPlaceholder(item, configDir));
  } else if (typeof obj === "object" && obj !== null) {
    const result: any = {};

    for (const key in obj) {
      result[key] = replaceConfigDirPlaceholder(obj[key], configDir);
    }

    return result;
  }
  return obj;
}
