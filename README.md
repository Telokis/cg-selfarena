# SelfArena

A local tournament runner for testing Codingame PvP bots against each other.

## Overview

SelfArena orchestrates matches between your AI implementations, collects statistics, and calculates win rates to help you make sure your changes are effective without uploading to Codingame.

## Requirements

- `Bun` to execute the project
- Node.js
- Java (for running referee JARs)

## Installation

```bash
# Clone repository
git clone https://github.com/Telokis/cg-selfarena.git
cd selfarena

# Install dependencies
bun install
```

## Usage

1. Create a YAML configuration file in the `configs/` directory
2. Place referee JARs in the `referees/` directory
3. Place your bots in the `bots/` directory
4. Run a tournament:

```bash
bun run start -- configs/breakthrough.yml
```

### CLI Options

Override configuration settings. Using the following CLI options will override the values specified in the config file:

```bash
bun run start -- configs/breakthrough.yml -n 50 --seed 42 --batches 10 --swap
```

Options:
- `-n, --games <num>`: Number of games per matchup
- `-seed <num>`: Set a specific random seed
- `-b, --batches <num>`: Number of parallel matches
- `--swap`: Enable position swapping (for games with first-player advantage)
- `-h, --help`: Display help

## Configuration

Example `configs/breakthrough.yml`:

```yaml
referee:
  command: "java -jar <referees_dir>/Breakthrough-1.0-SNAPSHOT.jar"

players:
  - name: "MCTS Bot"
    command: "node <bots_dir>/my_mcts_bot.js"

  - name: "Minimax Bot"
    command: "<bots_dir>/my_minimax_bot.exe"

game:
  seed: 0  # Random seed
  games_per_matchup: 100
  players_per_game: 2
  swap_positions: true # Play each match as both sides (white and black)

execution:
  batches: 20 # Runs at most 20 matchs in parallel
```

In the config file, you can use:
- `<config_dir>` to point to the directory the config is located in
- `<bots_dir>` which is a shortcut to `<config_dir>/../bots`
- `<referees_dir>` which is a shortcut to `<config_dir>/../referees`

Note: for `node` commands, the tool automatically adds `-r <helpers_dir>/js_helper.js` to give you access to `readline()`.

## Output

SelfArena shows match results and calculates overall statistics:

```
...
Match 42/100: Seed=1234567890  MCTS Bot:1 | Minimax Bot:0
...
Summary of performance:
MCTS Bot: 58.50% (52 win / 35 lose / 13 draw)
Minimax Bot: 41.50% (35 win / 52 lose / 13 draw)
```