# 2026 Masters Pool

A live leaderboard site for a friends-and-family Masters pool. Each participant picks one golfer from each of six tiers (based on world rankings). Your best four scores out of six count toward your total. Lowest total wins.

**Live site:** Hosted on GitHub Pages from this repo (`cwecht15/Masters`).

## How It Works

### Live Scores
- The site fetches live scores from the **ESPN PGA Scoreboard API** every 2 minutes directly in the browser (client-side).
- No backend server is needed — `index.html` is the entire app.

### Pool Scoring
- Each participant's best 4 (of 6) golfer scores are summed.
- Players who miss the cut receive a penalty score of +8 per missed weekend round.
- A Monte Carlo simulation (~10,000 iterations) runs in-browser to estimate each participant's **win probability** based on remaining holes and historical score variance.

### Projected Cut Line
- The Masters Leaderboard tab shows a **projected cut line** (red dashed separator) based on the top-50-and-ties rule.
- It's computed automatically from live ESPN scores: the 50th-best score among active players becomes the cut threshold.
- Can be manually overridden by setting `"cut_line"` in `scores.json` (e.g., `"cut_line": 4` for +4).

### Live Odds
- Outright win odds are fetched from The Odds API (rate-limited, refreshes every 15 minutes during play hours).

### Trend History
- `history.json` stores periodic snapshots of standings and win probabilities, powering the Trends tab chart.
- Updated automatically by the GitHub Actions workflow (see below).

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire site — HTML, CSS, and JS in one file |
| `entries.csv` | Pool entries: each row is a participant and their 6 picks |
| `scores.json` | Fallback/override scores file (used if ESPN API is unavailable) |
| `scores_example.json` | Example of what `scores.json` looks like with data |
| `history.json` | Time-series snapshots of standings and win % for the Trends chart |
| `update-history.js` | Node script that fetches ESPN scores, runs simulations, and appends to `history.json` |

## GitHub Setup

### Repository
- **Repo:** `cwecht15/Masters`
- **Branch:** `main`
- **GitHub Pages:** Deployed from `main` branch root

### GitHub Actions Workflow (`.github/workflows/update-scores.yml`)
- Runs **every 5 minutes** on a cron schedule (also supports manual trigger).
- Executes `update-history.js` to fetch current ESPN scores, run the Monte Carlo simulation, and append a snapshot to `history.json`.
- Auto-commits and pushes `history.json` if there are changes.

## Adding / Updating Entries

Edit `entries.csv` with the participant name and their six picks (one per tier), then update the matching `ENTRIES` array in both `index.html` and `update-history.js`.
