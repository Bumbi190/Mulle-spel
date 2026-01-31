console.log("🔥 MULLE – Fängelseedition (Core v2 clean)");

// ================= GAME STATE =================
const game = {
  players: [],
  deck: [],
  tableCards: [],
  builds: [],
  currentPlayer: 0,
  lastTaker: null   // 👈 NY
};


let buildSelection = []; // valda handkort (max 2)

// ================= START =================
startGame();

// ================= INIT =================
function startGame() {
  game.deck = createDeck(2);
  shuffle(game.deck);

  game.players = createPlayers(4);
  deal(game.deck, game.players, 8);

  game.tableCards = [];
  for (let i = 0; i < 8; i++) game.tableCards.push(game.deck.pop());

  game.builds = [];
  game.currentPlayer = 0;
  buildSelection = [];

  render();
}

// ================= DATA MODELS =================
function createPlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    name: `Spelare ${i + 1}`,
    hand: [],
    takenCards: [],
    mulleCards: [], // sparar Mulle-par (2 kort per mulle)
    tabbes: 0,
    score: 0

  }));
}

// ================= VALUES =================
// Bordsvärde: används för summor på bordet och byggvärden
function getCardTableValue(card) {
  if (card.rank === "A") return 1;

  // Special enligt fängelse-Mulle
  if (card.rank === 2 && card.suit === "spades") return 2;         // ♠2 = 2 på bord
  if (card.rank === 10 && card.suit === "diamonds") return 10;     // ♦10 = 10 på bord

  // Klädda kort på bordet räknas som 11/12/13 i din variant (så byggen kan bli 11 osv)
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;

  // 2–10
  return card.rank;
}

// Handvärde: används när man tar in (och för "höga" specialkort)
function getCardHandValue(card) {
  if (card.rank === "A") return 14;
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;

  // Specialkort på handen
  if (card.rank === 2 && card.suit === "spades") return 15;        // ♠2 = 15 på hand
  if (card.rank === 10 && card.suit === "diamonds") return 16;     // ♦10 = 16 på hand

  // 2–10
  return card.rank;
}

// ================= BUILDS =================
function createBuild(cards, owner) {
  return {
    cards: [...cards],
    value: cards.reduce((sum, c) => sum + getCardTableValue(c), 0),
    owner,
  };
}

// ================= CARD SELECTION =================
function handleCardClick(cardIndex) {
  const player = game.players[game.currentPlayer];
  const card = player.hand[cardIndex];

  // Toggle select
  if (buildSelection.includes(card)) {
    buildSelection = buildSelection.filter((c) => c !== card);
  } else {
    if (buildSelection.length >= 2) return;
    buildSelection.push(card);
  }

  render();
}

// ================= ACTIONS =================
function playSelectedCard() {
  const player = game.players[game.currentPlayer];

  if (buildSelection.length !== 1) {
    alert("Välj exakt ett kort att spela");
    return;
  }

  const card = buildSelection[0];
  const cardIndex = player.hand.indexOf(card);

  if (cardIndex === -1) {
    alert("Kortet finns inte längre i handen (bugg).");
    buildSelection = [];
    render();
    return;
  }

  playCard(cardIndex);
}

function buildSelectedCards() {
  const player = game.players[game.currentPlayer];

  if (buildSelection.length !== 2) {
    alert("Välj exakt två kort för att bygga");
    return;
  }

  // Byggvärde räknas på bordsvärde (A=1, ♦10=10 etc)
  const buildValue = buildSelection.reduce(
    (sum, c) => sum + getCardTableValue(c),
    0
  );

  // Regel: du måste ha ett KVAR i handen som kan ta bygget senare (handvärde)
  const canTakeLater = player.hand.some(
    (c) => !buildSelection.includes(c) && getCardHandValue(c) === buildValue
  );

  if (!canTakeLater) {
    alert(`Ogiltigt bygge: du har inget ${buildValue}-kort kvar på handen`);
    return;
  }

  const build = createBuild(buildSelection, game.currentPlayer);

  // Ta bort valda kort från handen
  player.hand = player.hand.filter((c) => !buildSelection.includes(c));

  // Lägg bygget på bordet
  game.builds.push(build);

  buildSelection = [];
  nextPlayer();
  render();
}

// ================= PLAY LOGIC =================
function playCard(cardIndex) {
  const player = game.players[game.currentPlayer];
  const card = player.hand.splice(cardIndex, 1)[0];

  // Rensa selection så UI inte hänger kvar
  buildSelection = [];

  // 1) MULLE: exakt samma rank + suit tar endast de två korten
  const matchIndex = game.tableCards.findIndex(
    (c) => c.rank === card.rank && c.suit === card.suit
  );

  if (matchIndex !== -1) {
    const match = game.tableCards.splice(matchIndex, 1)[0];
    player.mulleCards.push(card, match);
    game.lastTaker = game.currentPlayer;
    updateScores();

    nextPlayer();
    checkNewDealOrEnd();
    render();
    return;
  }

  // 2) SUMTAGNING: handvärde (A=14, ♠2=15, ♦10=16) tar kombination på bordet
  const target = getCardHandValue(card);
  const taken = findSumCombination(target);

  if (taken.length) {
  player.takenCards.push(card, ...taken);
  game.lastTaker = game.currentPlayer;
  game.tableCards = game.tableCards.filter((c) => !taken.includes(c));

  if (game.tableCards.length === 0 && game.builds.length === 0) {
    player.tabbes++;
  }

  updateScores();   // 👈 NY
  nextPlayer();
  render();
  return;
}


  // 3) Annars: lägg ut på bordet
  game.tableCards.push(card);
  nextPlayer();
  render();
}

// ================= TAKE BUILD =================
function tryTakeBuild(buildIndex) {
  const player = game.players[game.currentPlayer];
  const build = game.builds[buildIndex];
  if (!build) return;

  // v2: fortfarande bara ta eget bygge
  if (build.owner !== game.currentPlayer) {
    alert("Du får bara ta ditt eget bygge (v2)");
    return;
  }

  // Byggvärdet är bord-summan, tas in med handvärde
  const handIndex = player.hand.findIndex(
    (c) => getCardHandValue(c) === build.value
  );

  if (handIndex === -1) {
    alert(`Du måste ha ${build.value} på handen för att ta detta bygge`);
    return;
  }

  const takeCard = player.hand.splice(handIndex, 1)[0];
  player.takenCards.push(takeCard, ...build.cards);
  game.lastTaker = game.currentPlayer;
  game.builds.splice(buildIndex, 1);

  // Tabbe om bord + byggen blev tomma
  if (game.tableCards.length === 0 && game.builds.length === 0) {
    player.tabbes++;
  }

  buildSelection = [];
  updateScores();   // 👈 NY
  nextPlayer();
  checkNewDealOrEnd();
  render();
}

// ================= SUM SEARCH =================
function findSumCombination(target) {
  let result = [];

  function dfs(start, sum, path) {
    if (sum === target && path.length) {
      result = path;
      return true;
    }
    if (sum > target) return false;

    for (let i = start; i < game.tableCards.length; i++) {
      const next = game.tableCards[i];
      if (dfs(i + 1, sum + getCardTableValue(next), [...path, next])) return true;
    }
    return false;
  }

  dfs(0, 0, []);
  return result;
}

// ================= TURN =================
function nextPlayer() {
  game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
}

// ================= RENDER =================
function render() {
  const status = document.getElementById("status");
  const area = document.getElementById("game");

  if (!status || !area) {
    console.warn("Saknar #status eller #game i HTML");
    return;
  }

  status.textContent = `Tur: ${game.players[game.currentPlayer].name}`;
  area.innerHTML = "";

  // ===== TABLE =====
  const table = document.createElement("div");
  table.className = "table";

  game.tableCards.forEach((c) => table.appendChild(renderCard(c)));

  game.builds.forEach((b, index) => {
    const div = document.createElement("div");
    div.className = "build";

    const ownerName = game.players[b.owner]?.name || `Spelare ${b.owner + 1}`;

    div.innerHTML = `
      <div class="build-value">Bygge ${b.value}</div>
      <div class="build-owner">${ownerName}</div>
    `;

    if (b.owner === game.currentPlayer) {
      div.classList.add("own-build");
      div.onclick = () => tryTakeBuild(index);
      div.title = "Klicka för att ta in bygget";
    } else {
      div.classList.add("other-build");
      div.title = "Motståndares bygge (låst i v2)";
    }

    table.appendChild(div);
  });

  area.appendChild(table);

  // ===== PLAYERS =====
  game.players.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "player";

    div.innerHTML = `
      <h3>${p.name}${i === game.currentPlayer ? " ← TUR" : ""}</h3>
      <div style="font-size:12px; opacity:0.8;">
        Tagna: ${p.takenCards.length}
• Mullar: ${p.mulleCards.length / 2}
• Tabbar: ${p.tabbes}
• 🧮 Poäng: ${p.score}
      </div>
    `;

    const hand = document.createElement("div");
    hand.className = "hand";

    p.hand.forEach((c, idx) => {
      const cardDiv = renderCard(c);

      if (buildSelection.includes(c)) cardDiv.classList.add("selected");

      if (i === game.currentPlayer) {
        cardDiv.onclick = () => handleCardClick(idx);
        cardDiv.classList.add("playable");
      } else {
        cardDiv.classList.add("disabled");
      }

      hand.appendChild(cardDiv);
    });

    div.appendChild(hand);

    // actions bara för current player
    if (i === game.currentPlayer) {
      const actions = document.createElement("div");
      actions.className = "actions";

      const playBtn = document.createElement("button");
      playBtn.textContent = "Spela kort";
      playBtn.onclick = playSelectedCard;

      const buildBtn = document.createElement("button");
      buildBtn.textContent = "Bygg";
      buildBtn.onclick = buildSelectedCards;

      actions.appendChild(playBtn);
      actions.appendChild(buildBtn);
      

      div.appendChild(actions);
    }

    area.appendChild(div);
  });
}

// ================= HELPERS =================
function renderCard(card) {
  const d = document.createElement("div");
  d.className = `card ${card.suit}`;
  d.innerHTML = `${card.rank}${getSuitSymbol(card.suit)}`;
  return d;
}

function createDeck(decks) {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
  const out = [];

  for (let d = 0; d < decks; d++) {
    for (const s of suits) {
      for (const r of ranks) out.push({ suit: s, rank: r });
    }
  }
  return out;
}

function deal(deck, players, n) {
  for (let i = 0; i < n; i++) {
    players.forEach((p) => p.hand.push(deck.pop()));
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getSuitSymbol(s) {
  return { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" }[s];
}

// ================= POÄNGRÄKNING =================

// Poäng för ett enskilt kort
function getCardScore(card) {
  // Alla spader
  if (card.suit === "spades") return 1;

  // Ess
  if (card.rank === "A") return card.suit === "spades" ? 2 : 1;

  // Specialkort
  if (card.rank === 2 && card.suit === "spades") return 2;     // ♠2
  if (card.rank === 10 && card.suit === "diamonds") return 2;  // ♦10

  return 0;
}

// Poäng för en mulle
function getMulleScore(card) {
  if (card.rank === "A") return 14;
  if (card.rank === 2 && card.suit === "spades") return 15;
  if (card.rank === 10 && card.suit === "diamonds") return 16;

  if (typeof card.rank === "number") return card.rank;
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;

  return 0;
}

// Räkna total poäng för en spelare
function calculatePlayerScore(player) {
  let score = 0;

  // Vanliga tagna kort
  player.takenCards.forEach(card => {
    score += getCardScore(card);
  });

  // Mullar (2 kort per mulle)
for (let i = 0; i < player.mulleCards.length; i += 2) {
  const card = player.mulleCards[i];
  score += getMulleScore(card);
}

  // Tabbar
  score += player.tabbes;

  return score;
}

function updateScores() {
  game.players.forEach(p => {
    p.score = calculatePlayerScore(p);
  });
}

function checkNewDealOrEnd() {
  const allHandsEmpty = game.players.every(p => p.hand.length === 0);

  if (!allHandsEmpty) return;

  // 🔁 NY GIV
  if (game.deck.length >= game.players.length * 4) {
    deal(game.deck, game.players, 4);
    render();
    return;
  }

  // 🚤 BÅT (leken slut)
  handleBoat();
}

function handleBoat() {
  if (game.lastTaker === null) return;

  const player = game.players[game.lastTaker];

  if (game.tableCards.length > 0) {
    player.takenCards.push(...game.tableCards);
    game.tableCards = [];

    // Tabbe om byggen också är tomma
    if (game.builds.length === 0) {
      player.tabbes++;
    }
  }

  updateScores();
  render();

  alert(`🚤 Båt! ${player.name} tar sista korten.`);
}
