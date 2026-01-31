console.log("🔥 MULLE – Fängelseedition (Core v1)");

// ================= GAME STATE =================
let game = {
  players: [],
  deck: [],
  tableCards: [],
  builds: [],
  currentPlayer: 0,
  phase: "PLAY"
};

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

  render();
}

// ================= DATA MODELS =================
function createPlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    name: `Spelare ${i + 1}`,
    hand: [],
    score: 0,          // behåll för nu
    takenCards: [],    // vanliga stick
    mulleCards: [],    // mullar (2 kort per mulle)
    tabbes: 0          // antal tabbar
  }));
}


// ================= CORE RULES =================
function getCardTableValue(card) {
  if (card.rank === "A") return 1;
  if (card.rank === 2 && card.suit === "spades") return 2;
  if (card.rank === 10 && card.suit === "diamonds") return 10;
  return typeof card.rank === "number" ? card.rank : 10;
}

function getCardHandValue(card) {
  if (card.rank === "A") return 14;
  if (card.rank === 2 && card.suit === "spades") return 15;
  if (card.rank === 10 && card.suit === "diamonds") return 16;
  return typeof card.rank === "number" ? card.rank : 10;
}

// ================= PLAY =================
function playCard(cardIndex) {
  const player = game.players[game.currentPlayer];
  const card = player.hand.splice(cardIndex, 1)[0];

  // MULLE – lika med lika
  const match = game.tableCards.find(
    c => c.rank === card.rank && c.suit === card.suit
  );

  if (match) {
    player.mulleCards.push(card, match);
    game.tableCards = game.tableCards.filter(c => c !== match);
    nextPlayer();
    return render();
  }

  // VANLIG TAGNING (summa)
  const cardValue = getCardHandValue(card);
  const taken = findSumCombination(cardValue);

  if (taken.length > 0) {
    player.takenCards.push(card, ...taken);
    game.tableCards = game.tableCards.filter(c => !taken.includes(c));

    if (game.tableCards.length === 0) player.tabbes++;
    nextPlayer();
    return render();
  }

  // ANNARS LÄGG UT
  game.tableCards.push(card);
  nextPlayer();
  render();
}

// ================= SUM LOGIC =================
function findSumCombination(target) {
  const results = [];

  function dfs(start, sum, path) {
    if (sum === target && path.length > 0) {
      results.push([...path]);
      return;
    }
    if (sum > target) return;

    for (let i = start; i < game.tableCards.length; i++) {
      dfs(
        i + 1,
        sum + getCardTableValue(game.tableCards[i]),
        [...path, game.tableCards[i]]
      );
    }
  }

  dfs(0, 0, []);
  return results[0] || [];
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

  // TABLE
  const table = document.createElement("div");
  table.className = "table";
  game.tableCards.forEach(c => table.appendChild(renderCard(c)));
  area.appendChild(table);

  // PLAYERS
  game.players.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "player";
    div.innerHTML = `
      <h3>${p.name}${i === game.currentPlayer ? " ← TUR" : ""}</h3>
      <div>Mullar: ${p.mulleCards.length / 2}</div>
      <div>Tabbar: ${p.tabbes}</div>
    `;

    const hand = document.createElement("div");
    hand.className = "hand";

    p.hand.forEach((c, idx) => {
      const cardDiv = renderCard(c);
      if (i === game.currentPlayer) {
        cardDiv.onclick = () => playCard(idx);
        cardDiv.classList.add("playable");
      } else cardDiv.classList.add("disabled");
      hand.appendChild(cardDiv);
    });

    div.appendChild(hand);
    area.appendChild(div);
  });
}

// ================= HELPERS =================
function renderCard(card) {
  const d = document.createElement("div");
  d.className = `card ${card.suit}`;
  d.innerHTML = `<span>${card.rank}${getSuitSymbol(card.suit)}</span>`;
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
