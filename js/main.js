console.log("🔥 MULLE – Fängelseedition (Core v1)");

// ================= GAME STATE =================
let game = {
  players: [],
  deck: [],
  tableCards: [],
  builds: [],
  currentPlayer: 0
};

let buildSelection = []; // valda kort (0-2)

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
    mulleCards: [],
    tabbes: 0
  }));
}

// ================= VALUES =================
// Bordsvärde: används för summa på bordet + byggen
function getCardTableValue(card) {
  if (card.rank === "A") return 1;
  if (card.rank === 2 && card.suit === "spades") return 2;      // ♠2
  if (card.rank === 10 && card.suit === "diamonds") return 10;  // ♦10
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;
  return card.rank; // 2–10
}

// Handvärde: används för att ta in / mulle / special
function getCardHandValue(card) {
  if (card.rank === "A") return 14;
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;
  if (card.rank === 2 && card.suit === "spades") return 15;         // ♠2
  if (card.rank === 10 && card.suit === "diamonds") return 16;      // ♦10
  return card.rank; // 2–10
}

// ================= BUILDS =================
function createBuild(cards, owner) {
  return {
    cards,
    value: cards.reduce((s, c) => s + getCardTableValue(c), 0),
    owner
  };
}

// ================= CARD SELECTION =================
function handleCardClick(cardIndex) {
  const player = game.players[game.currentPlayer];
  const card = player.hand[cardIndex];

  if (buildSelection.includes(card)) {
    buildSelection = buildSelection.filter(c => c !== card);
  } else {
    if (buildSelection.length === 2) return;
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

  const cardIndex = player.hand.indexOf(buildSelection[0]);
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

  const buildValue = buildSelection.reduce(
    (s, c) => s + getCardTableValue(c), 0
  );

  // Måste ha ett kvarvarande handkort som kan ta in bygget (HANDVÄRDE)
  const canTakeLater = player.hand.some(
    c => !buildSelection.includes(c) && getCardHandValue(c) === buildValue
  );

  if (!canTakeLater) {
    alert(`Ogiltigt bygge: du har inget ${buildValue}-kort kvar på handen`);
    return;
  }

  const build = createBuild(buildSelection, game.currentPlayer);

  player.hand = player.hand.filter(c => !buildSelection.includes(c));
  game.builds.push(build);

  buildSelection = [];
  nextPlayer();
  render();
}

// ================= PLAY =================
function playCard(cardIndex) {
  const player = game.players[game.currentPlayer];
  const card = player.hand.splice(cardIndex, 1)[0];

  buildSelection = [];

  // MULLE (lika med lika)
  const matchIndex = game.tableCards.findIndex(
    c => c.rank === card.rank && c.suit === card.suit
  );

  if (matchIndex !== -1) {
    const match = game.tableCards.splice(matchIndex, 1)[0];
    player.mulleCards.push(card, match);
    nextPlayer();
    render();
    return;
  }

  // SUMTAGNING
  const value = getCardHandValue(card);
  const taken = findSumCombination(value);

  if (taken.length) {
    player.takenCards.push(card, ...taken);
    game.tableCards = game.tableCards.filter(c => !taken.includes(c));

    if (game.tableCards.length === 0 && game.builds.length === 0) {
      player.tabbes++;
    }

    nextPlayer();
    render();
    return;
  }

  // Lägg ut
  game.tableCards.push(card);
  nextPlayer();
  render();
}

// ================= TAKE BUILD =================
function tryTakeBuild(buildIndex) {
  const player = game.players[game.currentPlayer];
  const build = game.builds[buildIndex];
  if (!build) return;

  if (build.owner !== game.currentPlayer) {
    alert("Du får bara ta ditt eget bygge");
    return;
  }

  // Bygge-värdet är bordsvärde-summa, tas in med HANDVÄRDE
  const handIndex = player.hand.findIndex(
    c => getCardHandValue(c) === build.value
  );

  if (handIndex === -1) {
    alert(`Du måste ha ${build.value} på handen för att ta detta bygge`);
    return;
  }

  const takeCard = player.hand.splice(handIndex, 1)[0];
  player.takenCards.push(takeCard, ...build.cards);

  game.builds.splice(buildIndex, 1);

  // Tabbe om både bord + byggen är tomt
  if (game.tableCards.length === 0 && game.builds.length === 0) {
    player.tabbes++;
  }

  buildSelection = [];
  nextPlayer();
  render();
}


// ================= SUM =================
function findSumCombination(target) {
  let result = [];

  function dfs(start, sum, path) {
    if (sum === target && path.length) {
      result = path;
      return true;
    }
    if (sum > target) return false;

    for (let i = start; i < game.tableCards.length; i++) {
      if (dfs(i + 1, sum + getCardTableValue(game.tableCards[i]), [...path, game.tableCards[i]]))
        return true;
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

  status.textContent = `Tur: ${game.players[game.currentPlayer].name}`;
  area.innerHTML = "";

  const table = document.createElement("div");
  table.className = "table";

  game.tableCards.forEach(c => table.appendChild(renderCard(c)));

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
    } else {
      div.classList.add("other-build");
    }

    table.appendChild(div);
  });

  area.appendChild(table);

  game.players.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "player";

    div.innerHTML = `
      <h3>${p.name}${i === game.currentPlayer ? " ← TUR" : ""}</h3>
      <div style="font-size:12px; opacity:0.8;">
        Tagna: ${p.takenCards.length} • Mullar: ${p.mulleCards.length / 2} • Tabbar: ${p.tabbes}
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
  const ranks = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"];
  const out = [];
  for (let d = 0; d < decks; d++)
    for (const s of suits)
      for (const r of ranks) out.push({ suit: s, rank: r });
  return out;
}

function deal(deck, players, n) {
  for (let i = 0; i < n; i++)
    players.forEach(p => p.hand.push(deck.pop()));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getSuitSymbol(s) {
  return { spades:"♠", hearts:"♥", diamonds:"♦", clubs:"♣" }[s];
}
  }
