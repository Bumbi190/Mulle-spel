console.log("🔥 MULLE – Fängelseedition (Core v1)");

// ================= GAME STATE =================
let game = {
  players: [],
  deck: [],
  tableCards: [],
  builds: [],
  currentPlayer: 0
};

let buildSelection = []; // valda kort (0-2 st)

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
function getCardTableValue(card) {
  if (card.rank === "A") return 1;
  if (card.rank === 2 && card.suit === "spades") return 2;
  if (card.rank === 10 && card.suit === "diamonds") return 10;

  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;

  return typeof card.rank === "number" ? card.rank : 10;
}


function getCardHandValue(card) {
  // Specialkort i fängelse-Mulle
  if (card.rank === "A") return 14;
  if (card.rank === 2 && card.suit === "spades") return 15;      // spader 2
  if (card.rank === 10 && card.suit === "diamonds") return 16;   // ruter 10

  // Klädda kort på HANDEN
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;

  // Siffror
  if (typeof card.rank === "number") return card.rank;

  // fallback (borde aldrig hända)
  return 10;
}


function playerHasBuildValue(player, value, usedCards) {
  return player.hand.some(
    c =>
      !usedCards.includes(c) &&
      getCardHandValue(c) === value
  );
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

  // toggle select
  if (buildSelection.includes(card)) {
    buildSelection = buildSelection.filter(c => c !== card);
  } else {
    if (buildSelection.length === 2) return; // max två valda
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

  // 1) måste välja exakt två kort
  if (buildSelection.length !== 2) {
    alert("Välj exakt två kort för att bygga");
    return;
  }

  // 2) räkna byggvärdet (BORDSVÄRDE)
  function buildSelectedCards() {
  const player = game.players[game.currentPlayer];

  // 1) exakt två kort
  if (buildSelection.length !== 2) {
    alert("Välj exakt två kort för att bygga");
    return;
  }

  // 2) räkna byggvärde (BORDSVÄRDE)
  const buildValue = buildSelection.reduce(
    (sum, c) => sum + getCardTableValue(c),
    0
  );

  // 3) måste ha HANDKORT som kan ta bygget
  const canTake = player.hand.some(
    c =>
      !buildSelection.includes(c) &&
      getCardHandValue(c) === buildValue
  );

  if (!canTake) {
    alert(`Ogiltigt bygge: du har inget handkort med värde ${buildValue}`);
    return;
  }

  // 4) skapa bygge
  const build = createBuild(buildSelection, game.currentPlayer);
  player.hand = player.hand.filter(c => !buildSelection.includes(c));
  game.builds.push(build);

  // 5) reset & nästa tur
  buildSelection = [];
  nextPlayer();
  render();
}

  }

  // 4) skapa bygge + ta bort valda kort
  const build = createBuild(buildSelection, game.currentPlayer);
  player.hand = player.hand.filter(c => !buildSelection.includes(c));
  game.builds.push(build);

  // 5) clear selection + nästa spelare
  buildSelection = [];
  nextPlayer();
  render();
}



// ================= PLAY =================
function playCard(cardIndex) {
  const player = game.players[game.currentPlayer];
  const card = player.hand.splice(cardIndex, 1)[0];

  // rensa val när vi spelar
  buildSelection = [];

  // MULLE – exakt lika kort (samma rank + suit)
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

  // VANLIG TAGNING (summa)
  const value = getCardHandValue(card);
  const taken = findSumCombination(value);

  if (taken.length) {
    player.takenCards.push(card, ...taken);
    game.tableCards = game.tableCards.filter(c => !taken.includes(c));

    // tabbe om bord + byggen är tomma
    if (game.tableCards.length === 0 && game.builds.length === 0) {
      player.tabbes++;
    }

    nextPlayer();
    render();
    return;
  }

  // ANNARS LÄGG UT
  game.tableCards.push(card);
  nextPlayer();
  render();
}

// ================= TAKE BUILD =================
function tryTakeBuild(buildIndex) {
  const player = game.players[game.currentPlayer];
  const build = game.builds[buildIndex];
  if (!build) return;

  // bara ta eget bygge (v1)
  if (build.owner !== game.currentPlayer) {
    alert("Du får bara ta ditt eget bygge");
    return;
  }

  // Matcha mot HANDVÄRDE (J=11, Q=12, K=13, A=14, specialkort 15/16)
  const handIndex = player.hand.findIndex(
  c => getCardHandValue(c) === build.value
);

  if (handIndex === -1) {
    alert(`Du måste ha ${build.value} på handen för att ta detta bygge`);
    return;
  }

  // ta kortet + byggets kort
  const takeCard = player.hand.splice(handIndex, 1)[0];
  player.takenCards.push(takeCard, ...build.cards);

  // ta bort bygget
  game.builds.splice(buildIndex, 1);

  // tabbe om allt på bordet är tomt
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
      if (
        dfs(
          i + 1,
          sum + getCardTableValue(game.tableCards[i]),
          [...path, game.tableCards[i]]
        )
      ) return true;
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

  // ===== TABLE =====
  const table = document.createElement("div");
  table.className = "table";

  // kort på bordet
  game.tableCards.forEach(c => table.appendChild(renderCard(c)));

  // byggen på bordet
  game.builds.forEach((b, index) => {
    const div = document.createElement("div");
    div.className = "build";

    const ownerName = game.players[b.owner]?.name || `Spelare ${b.owner + 1}`;

    div.innerHTML = `
      <div class="build-value">Bygge ${b.value}</div>
      <div class="build-owner">${ownerName}</div>
    `;

    // markera egna byggen och gör klickbara
    if (b.owner === game.currentPlayer) {
      div.classList.add("own-build");
      div.onclick = () => tryTakeBuild(index);
      div.title = "Klicka för att försöka ta bygget";
    } else {
      div.classList.add("other-build");
      div.title = "Motståndares bygge (låst i v1)";
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
        Tagna: ${p.takenCards.length} kort • Mullar: ${p.mulleCards.length / 2} • Tabbar: ${p.tabbes}
      </div>
    `;

    const hand = document.createElement("div");
    hand.className = "hand";

    p.hand.forEach((c, idx) => {
      const cardDiv = renderCard(c);

      // selected highlight
      if (buildSelection.includes(c)) {
        cardDiv.classList.add("selected");
      }

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
  return { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" }[s];
}
