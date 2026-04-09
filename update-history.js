// Runs in GitHub Actions to fetch ESPN scores, compute standings + win %, and append to history.json
const fs = require("fs");
const https = require("https");

const ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";
const HISTORY_FILE = "history.json";
const NUM_SIMS = 10000;
const ROUND_STD = 1.75;
const PAR = 72;
const MISSED_CUT_PENALTY = 8;

// ── ENTRIES ──
const ENTRIES = [
  { name: "Steve Bowker", picks: ["Xander Schauffele","Ludvig Aberg","Jon Rahm","Nicolai Hojgaard","Jason Day","Adam Scott"] },
  { name: "Frank Coleman", picks: ["Scottie Scheffler","Ludvig Aberg","Bryson DeChambeau","Tyrrell Hatton","Corey Conners","Sungjae Im"] },
  { name: "Kyle Fry", picks: ["Justin Rose","Chris Gotterup","Bryson DeChambeau","Nicolai Hojgaard","Jake Knapp","Jordan Spieth"] },
  { name: "Harrison Burns", picks: ["Rory McIlroy","Ludvig Aberg","Akshay Bhatia","Marco Penge","Jake Knapp","Adam Scott"] },
  { name: "Pat Scully Sucks", picks: ["Xander Schauffele","Ludvig Aberg","Bryson DeChambeau","Shane Lowry","Corey Conners","Adam Scott"] },
  { name: "Pat Scully", picks: ["Scottie Scheffler","Ludvig Aberg","Jon Rahm","Shane Lowry","Jason Day","Jordan Spieth"] },
  { name: "Sean Robb", picks: ["Rory McIlroy","Ludvig Aberg","Jon Rahm","Patrick Cantlay","Jake Knapp","Matt Fitzpatrick"] },
  { name: "Sydney DuBuque", picks: ["Scottie Scheffler","Ludvig Aberg","Akshay Bhatia","Patrick Cantlay","Brian Harman","Max Homa"] },
  { name: "Pat Scully Really Sucks", picks: ["Scottie Scheffler","Ludvig Aberg","Jon Rahm","Tyrrell Hatton","Corey Conners","Brooks Koepka"] },
  { name: "Matt Higley", picks: ["Matt Fitzpatrick","Ludvig Aberg","Bryson DeChambeau","Kurt Kitayama","Jason Day","Adam Scott"] },
  { name: "Austin Barry", picks: ["Cameron Young","Ludvig Aberg","Jon Rahm","Tyrrell Hatton","Jason Day","Jordan Spieth"] },
  { name: "Tom Higley", picks: ["Matt Fitzpatrick","Jacob Bridgeman","Jon Rahm","Shane Lowry","Jake Knapp","Harry Hall"] },
  { name: "Rich Danforth", picks: ["Justin Rose","Ludvig Aberg","Bryson DeChambeau","Shane Lowry","Corey Conners","Jordan Spieth"] },
  { name: "Luke Schneese", picks: ["Scottie Scheffler","Ludvig Aberg","Akshay Bhatia","Sam Burns","Corey Conners","Adam Scott"] },
  { name: "Andrew Gilbert", picks: ["Matt Fitzpatrick","Ludvig Aberg","Jon Rahm","Tyrrell Hatton","Corey Conners","Brooks Koepka"] },
  { name: "James Zdanoff", picks: ["Scottie Scheffler","Ludvig Aberg","Jon Rahm","Nicolai Hojgaard","Corey Conners","Adam Scott"] },
  { name: "Matthew Drejza", picks: ["Justin Rose","Ludvig Aberg","Min Woo Lee","Shane Lowry","Michael Kim","Rasmus Hojgaard"] },
  { name: "Alex Hughes", picks: ["Robert MacIntyre","Hideki Matsuyama","Viktor Hovland","Shane Lowry","Corey Conners","Rasmus Hojgaard"] },
  { name: "Mary Catherine LeNoir", picks: ["J.J. Spaun","Hideki Matsuyama","Viktor Hovland","Shane Lowry","Jason Day","Jordan Spieth"] },
  { name: "Tom Kokolas", picks: ["Cameron Young","Ludvig Aberg","Akshay Bhatia","Nicolai Hojgaard","Jason Day","Gary Woodland"] },
  { name: "Evan Callaghan", picks: ["Cameron Young","Ludvig Aberg","Maverick McNealy","Shane Lowry","Jake Knapp","Gary Woodland"] },
  { name: "Benjamin Quinutolo", picks: ["Scottie Scheffler","Hideki Matsuyama","Bryson DeChambeau","Kurt Kitayama","Samuel Stevens","Adam Scott"] },
  { name: "Tom Fickinger", picks: ["Matt Fitzpatrick","Chris Gotterup","Bryson DeChambeau","Patrick Cantlay","Jake Knapp","Cameron Smith"] },
  { name: "Juls LeNoir", picks: ["Xander Schauffele","Ludvig Aberg","Akshay Bhatia","Sam Burns","Michael Kim","Max Greyserman"] },
  { name: "Nate S", picks: ["Scottie Scheffler","Ludvig Aberg","Jon Rahm","Patrick Cantlay","Jason Day","Max Homa"] },
  { name: "Tim Brady", picks: ["Xander Schauffele","Ludvig Aberg","Bryson DeChambeau","Nicolai Hojgaard","Corey Conners","Jordan Spieth"] },
  { name: "Ben Phillips", picks: ["Rory McIlroy","Harris English","Patrick Reed","Shane Lowry","Jason Day","Rickie Fowler"] },
  { name: "Ethan Scharp", picks: ["Scottie Scheffler","Ludvig Aberg","Bryson DeChambeau","Sam Burns","Jake Knapp","Max Homa"] },
  { name: "Brian LeNoir", picks: ["Xander Schauffele","Ludvig Aberg","Patrick Reed","Sam Burns","Corey Conners","Sahith Theegala"] },
  { name: "Sean Fagan", picks: ["Xander Schauffele","Ludvig Aberg","Jon Rahm","Tyrrell Hatton","Corey Conners","Sergio Garcia"] },
  { name: "Chris Wecht", picks: ["Scottie Scheffler","Ludvig Aberg","Jon Rahm","Patrick Cantlay","Jake Knapp","Jordan Spieth"] },
  { name: "Ryan Hughes", picks: ["Xander Schauffele","Ludvig Aberg","Jon Rahm","Patrick Cantlay","Jason Day","Adam Scott"] },
];

// ── GOLFER MODELS ──
const GOLFER_MODEL = {
  "Adam Scott": { roundMean: -0.427, cutProb: 0.75 },
  "Akshay Bhatia": { roundMean: -0.463, cutProb: 0.7561 },
  "Brian Harman": { roundMean: -0.023, cutProb: 0.6296 },
  "Brooks Koepka": { roundMean: -0.589, cutProb: 0.7619 },
  "Bryson DeChambeau": { roundMean: -1.195, cutProb: 0.8824 },
  "Cameron Smith": { roundMean: -0.258, cutProb: 0.6774 },
  "Cameron Young": { roundMean: -0.888, cutProb: 0.8305 },
  "Chris Gotterup": { roundMean: -0.488, cutProb: 0.7619 },
  "Corey Conners": { roundMean: -0.322, cutProb: 0.7222 },
  "Gary Woodland": { roundMean: -0.224, cutProb: 0.6721 },
  "Harris English": { roundMean: -0.232, cutProb: 0.7059 },
  "Harry Hall": { roundMean: -0.087, cutProb: 0.6599 },
  "Hideki Matsuyama": { roundMean: -0.65, cutProb: 0.8305 },
  "J.J. Spaun": { roundMean: -0.34, cutProb: 0.7222 },
  "Jacob Bridgeman": { roundMean: -0.271, cutProb: 0.7222 },
  "Jake Knapp": { roundMean: -0.353, cutProb: 0.726 },
  "Jason Day": { roundMean: -0.385, cutProb: 0.75 },
  "Jon Rahm": { roundMean: -1.293, cutProb: 0.9091 },
  "Jordan Spieth": { roundMean: -0.573, cutProb: 0.7778 },
  "Justin Rose": { roundMean: -0.622, cutProb: 0.7727 },
  "Kurt Kitayama": { roundMean: -0.243, cutProb: 0.7183 },
  "Ludvig Aberg": { roundMean: -0.987, cutProb: 0.84 },
  "Marco Penge": { roundMean: -0.116, cutProb: 0.6403 },
  "Matt Fitzpatrick": { roundMean: -0.851, cutProb: 0.8462 },
  "Maverick McNealy": { roundMean: -0.279, cutProb: 0.726 },
  "Max Greyserman": { roundMean: 0.062, cutProb: 0.6154 },
  "Max Homa": { roundMean: -0.083, cutProb: 0.6599 },
  "Michael Kim": { roundMean: 0.076, cutProb: 0.6241 },
  "Min Woo Lee": { roundMean: -0.595, cutProb: 0.8039 },
  "Nicolai Hojgaard": { roundMean: -0.294, cutProb: 0.726 },
  "Patrick Cantlay": { roundMean: -0.385, cutProb: 0.75 },
  "Patrick Reed": { roundMean: -0.585, cutProb: 0.7727 },
  "Rasmus Hojgaard": { roundMean: -0.106, cutProb: 0.6721 },
  "Rickie Fowler": { roundMean: 1.5, cutProb: 0.45 },
  "Robert MacIntyre": { roundMean: -0.66, cutProb: 0.8 },
  "Rory McIlroy": { roundMean: -1.129, cutProb: 0.8824 },
  "Sahith Theegala": { roundMean: 1.5, cutProb: 0.45 },
  "Sam Burns": { roundMean: -0.379, cutProb: 0.7297 },
  "Samuel Stevens": { roundMean: 0.02, cutProb: 0.6552 },
  "Scottie Scheffler": { roundMean: -1.593, cutProb: 0.9333 },
  "Sergio Garcia": { roundMean: 0.039, cutProb: 0.6063 },
  "Shane Lowry": { roundMean: -0.367, cutProb: 0.7561 },
  "Sungjae Im": { roundMean: -0.175, cutProb: 0.6875 },
  "Tyrrell Hatton": { roundMean: -0.321, cutProb: 0.7183 },
  "Viktor Hovland": { roundMean: -0.573, cutProb: 0.7561 },
  "Xander Schauffele": { roundMean: -0.981, cutProb: 0.875 },
};
const DEFAULT_MODEL = { roundMean: 1.5, cutProb: 0.45 };

// ── ESPN NAME NORMALIZATION ──
const ESPN_NAME_MAP = {
  "Ludvig Åberg": "Ludvig Aberg",
  "Robert Macintyre": "Robert MacIntyre",
  "Nicolai Højgaard": "Nicolai Hojgaard",
  "Rasmus Højgaard": "Rasmus Hojgaard",
  "Sungjae Im": "Sungjae Im",
  "Sung-jae Im": "Sungjae Im",
  "Sung-Jae Im": "Sungjae Im",
  "Cam Smith": "Cameron Smith",
  "J.J Spaun": "J.J. Spaun",
  "Sam Stevens": "Samuel Stevens",
  "Nico Echavarria": "Nicolas Echavarria",
  "Matthew Fitzpatrick": "Matt Fitzpatrick",
  "Minwoo Lee": "Min Woo Lee",
  "Si-Woo Kim": "Si Woo Kim",
  "Jordan Speith": "Jordan Spieth",
};

function normalizeESPNName(name) {
  const trimmed = (name || "").trim();
  return ESPN_NAME_MAP[trimmed] || trimmed;
}

// ── FETCH ESPN ──
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function fetchESPN() {
  const data = await fetchJSON(ESPN_URL);

  let event = null;
  for (const ev of (data.events || [])) {
    if (ev.name && ev.name.toLowerCase().includes("masters")) { event = ev; break; }
  }
  if (!event && data.events && data.events.length > 0) event = data.events[0];
  if (!event) return null;

  const competition = (event.competitions || [])[0];
  if (!competition) return null;

  const status = competition.status || {};
  const statusType = status.type || {};
  const state = statusType.state;

  let tournamentStatus = "pre_tournament";
  let currentRound = 0;
  if (state === "in") { tournamentStatus = "in_progress"; currentRound = status.period || 1; }
  else if (state === "post") { tournamentStatus = "complete"; currentRound = 4; }

  const competitors = competition.competitors || [];
  const golfers = {};

  for (const c of competitors) {
    const athlete = c.athlete || {};
    const rawName = athlete.displayName || athlete.fullName || "";
    const name = normalizeESPNName(rawName);

    const toPar = c.score || null;
    let playerStatus = "active";
    const cStatus = c.status || {};
    const cStatusType = cStatus.type || {};
    if (cStatusType.name && cStatusType.name.toLowerCase().includes("cut")) playerStatus = "cut";

    const linescores = c.linescores || [];
    const roundDisplays = [];
    for (const ls of linescores) {
      if (ls.displayValue && ls.displayValue !== "-") roundDisplays.push(ls.displayValue);
    }

    let thru = null;
    const currentRoundLS = linescores[currentRound - 1];
    if (currentRoundLS) {
      const holeScores = currentRoundLS.linescores || [];
      if (holeScores.length > 0) {
        const holesPlayed = holeScores.filter(h => h.value !== undefined && h.value > 0).length;
        thru = holesPlayed === 18 ? "F" : holesPlayed === 0 ? null : String(holesPlayed);
      } else if (currentRoundLS.value && currentRoundLS.value > 0) {
        thru = "F";
      }
    }

    golfers[name] = { toPar, status: playerStatus, roundDisplays, thru };
    if (rawName !== name) golfers[rawName] = golfers[name];
  }

  return { tournament_status: tournamentStatus, current_round: currentRound, golfers };
}

// ── SCORING ──
function parseToPar(str) {
  if (str === null || str === undefined || str === "-" || str === "") return null;
  const s = String(str).trim().replace("E", "0");
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

function golferTotalToPar(g) {
  if (!g) return 0;
  const espnTotal = parseToPar(g.toPar);
  if (espnTotal !== null) {
    if (g.status === "cut") {
      const roundsPlayed = (g.roundDisplays || []).filter(r => r && r !== "-").length;
      return espnTotal + (4 - roundsPlayed) * MISSED_CUT_PENALTY;
    }
    return espnTotal;
  }
  return 0;
}

// ── SIMULATION ──
function randomNormal(mean, std) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function getSimState(g, currentRound) {
  if (!g) return { currentToPar: 0, completedRounds: 0, holesIntoRound: 0, isCut: false };
  const toPar = parseToPar(g.toPar) || 0;
  const isCut = g.status === "cut";

  if (isCut) {
    const played = (g.roundDisplays || []).filter(r => r && r !== "-").length;
    return { currentToPar: toPar, completedRounds: played, holesIntoRound: 0, isCut: true };
  }
  if (g.thru === "F") {
    return { currentToPar: toPar, completedRounds: currentRound, holesIntoRound: 0, isCut: false };
  }
  const n = g.thru ? parseInt(g.thru) : 0;
  const holesIntoRound = (!isNaN(n) && n > 0) ? n : 0;
  return { currentToPar: toPar, completedRounds: currentRound - 1, holesIntoRound, isCut: false };
}

function simulateGolferFinal(state, model, cutHappened) {
  if (state.isCut) return state.currentToPar + (4 - state.completedRounds) * MISSED_CUT_PENALTY;

  let score = state.currentToPar;
  let roundsFullyDone = state.completedRounds;

  if (state.holesIntoRound > 0 && state.holesIntoRound < 18) {
    const holesLeft = 18 - state.holesIntoRound;
    score += randomNormal(model.roundMean * (holesLeft / 18), ROUND_STD * Math.sqrt(holesLeft / 18));
    roundsFullyDone++;
  }

  while (roundsFullyDone < 4) {
    if (!cutHappened && roundsFullyDone === 2) {
      if (Math.random() > model.cutProb) return score + 2 * MISSED_CUT_PENALTY;
    }
    score += randomNormal(model.roundMean, ROUND_STD);
    roundsFullyDone++;
  }
  return score;
}

function runSimulation(espnData) {
  const golfers = espnData.golfers;
  const currentRound = espnData.current_round;

  const uniqueNames = new Set();
  for (const e of ENTRIES) for (const p of e.picks) uniqueNames.add(p);
  const golferNames = [...uniqueNames];
  const golferIndex = {};
  golferNames.forEach((n, i) => golferIndex[n] = i);

  const states = golferNames.map(n => getSimState(golfers[n], currentRound));
  const models = golferNames.map(n => GOLFER_MODEL[n] || DEFAULT_MODEL);
  const cutHappened = golferNames.some(n => golfers[n] && golfers[n].status === "cut") || currentRound >= 3;
  const entryIndices = ENTRIES.map(e => e.picks.map(n => golferIndex[n]));

  const winCounts = new Float64Array(ENTRIES.length);

  for (let sim = 0; sim < NUM_SIMS; sim++) {
    const finals = new Float64Array(golferNames.length);
    for (let g = 0; g < golferNames.length; g++) {
      finals[g] = simulateGolferFinal(states[g], models[g], cutHappened);
    }
    let bestScore = Infinity;
    const bestIndices = [];
    for (let p = 0; p < ENTRIES.length; p++) {
      const scores = entryIndices[p].map(i => finals[i]);
      scores.sort((a, b) => a - b);
      const total = scores[0] + scores[1] + scores[2] + scores[3];
      if (total < bestScore - 0.001) {
        bestScore = total;
        bestIndices.length = 0;
        bestIndices.push(p);
      } else if (Math.abs(total - bestScore) < 0.001) {
        bestIndices.push(p);
      }
    }
    const share = 1.0 / bestIndices.length;
    for (const idx of bestIndices) winCounts[idx] += share;
  }

  const winPcts = {};
  for (let p = 0; p < ENTRIES.length; p++) {
    winPcts[ENTRIES[p].name] = +(winCounts[p] / NUM_SIMS).toFixed(4);
  }
  return winPcts;
}

// ── MAIN ──
async function main() {
  const espnData = await fetchESPN();
  if (!espnData || espnData.tournament_status === "pre_tournament") {
    console.log("Tournament not in progress, skipping.");
    return;
  }

  // Compute current scores
  const scores = {};
  for (const entry of ENTRIES) {
    const golferScores = entry.picks.map(name => {
      const g = espnData.golfers[name];
      return golferTotalToPar(g);
    });
    golferScores.sort((a, b) => a - b);
    scores[entry.name] = golferScores[0] + golferScores[1] + golferScores[2] + golferScores[3];
  }

  // Run simulation
  const winPcts = runSimulation(espnData);

  // Load existing history
  let history = [];
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    }
  } catch (e) { history = []; }

  // Don't record duplicate if last entry is within 3 minutes
  const now = Date.now();
  if (history.length > 0 && (now - history[history.length - 1].time) < 180000) {
    console.log("Too recent, skipping.");
    return;
  }

  // Append snapshot
  history.push({
    time: now,
    round: espnData.current_round,
    status: espnData.tournament_status,
    scores,
    winPcts,
  });

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));
  console.log(`Recorded snapshot #${history.length} at ${new Date(now).toISOString()}`);
}

main().catch(e => { console.error(e); process.exit(1); });
