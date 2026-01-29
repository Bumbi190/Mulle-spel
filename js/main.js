console.log("🔥 Mulle – Fängelseedition startar");

// ===== GLOBAL STATE =====
let players = [];
let deck = [];
let tablePile = [];
let currentPlayerIndex = 0;

// ===== UI =====
const status = document.getElementById("status");

// ===== START =====
fetch("rules.json")
  .then(res => res.json())
  .then(rules => {
    console.log("✅ Regler OK:", rules);

    deck = createDeck(rules.game.decks);
    shuffle(deck);

    players = createPlayers(4);
    dealCards(deck, players, 5);

    console.log(
      players.map(p => `${p.name}: ${p.hand.map(formatCard).join(" ")}`)
    );

    updateStatus();
    renderGame();
  });


// ===== RENDER =====
function renderGame() {
  const gameArea = document.getElementById("game");
  gameArea.innerHTML = "";

  // 🃏 MITTEN
  const table = document.createElement("div");
  table.className = "table";

  if (tablePile.length === 0) {
    table.textContent = "🃏 Mitten är tom";
  } else {
    tablePile.forEach((card, i) => {
      const c = document.createElement("div");
      c.className = "table-card";
      c.textContent = formatCard(card);
      c.style.top = `${i * 2}px`;
      c.style.left = `${i * 2}px`;
      table.appendChild(c);
    });
  }

  gameArea.appendChild(table);

  // 👥 SPELARE
  players.forEach((player, index) => {
    const playerDiv = document.createElement("div");
    playerDiv.className = "player";

    const title = document.createElement("h3");
    title.textContent =
      player.name + (index === currentPlayerIndex ? " ← TUR" : "");
    playerDiv.appendChild(title);

    const handDiv = document.createElement("div");
    handDiv.className = "hand";

    player.hand.forEach((card, cardIndex) => {
      const cardDiv = document.createElement("div");
      cardDiv.className = "card";
      cardDiv.textContent = formatCard(card);

      if (index === currentPlayerIndex && canPlayCard(card)) {
        cardDiv.onclick = () => playCard(index, cardIndex);
      } else {
        cardDiv.style.opacity = "0.4";
      }

      handDiv.appendChild(cardDiv);
    });

    playerDiv.appendChild(handDiv);

    // 👉 TA UPP MITTEN
    if (index === currentPlayerIndex && !hasPlayableCard(player)) {
      const btn = document.createElement("button");
      btn.textContent = "Ta upp mitten";
      btn.onclick = () => takeTablePile(player);
      playerDiv.appendChild(btn);
    }

    gameArea.appendChild(playerDiv);
  });
}

// ===== LOGIK =====
function playCard(playerIndex, cardIndex) {
  const card = players[playerIndex].hand.splice(cardIndex, 1)[0];
  tablePile.push(card);

  // Spader 2
  if (card.rank === 2 && card.suit === "spades") {
    const next = (playerIndex + 1) % players.length;
    takeTablePile(players[next]);
  }

  nextTurn();
}

function canPlayCard(card) {
  if (tablePile.length === 0) return true;
  return card.suit === tablePile.at(-1).suit;
}

function hasPlayableCard(player) {
  return player.hand.some(canPlayCard);
}

function takeTablePile(player) {
  player.hand.push(...tablePile);
  tablePile = [];
  nextTurn();
}

function nextTurn() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  updateStatus();
  renderGame();
}

function updateStatus() {
  status.textContent = `Tur: ${players[currentPlayerIndex].name}`;
}

// ===== HJÄLP =====
function createDeck(decks) {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"];
  const deck = [];
  for (let d = 0; d < decks; d++) {
    suits.forEach(s => ranks.forEach(r => deck.push({ suit: s, rank: r })));
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function createPlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    name: `Spelare ${i + 1}`,
    hand: []
  }));
}

function dealCards(deck, players, n) {
  for (let i = 0; i < n; i++) {
    players.forEach(p => p.hand.push(deck.pop()));
  }
}

function formatCard(card) {
  const s = { spades:"♠", hearts:"♥", diamonds:"♦", clubs:"♣" };
  return `${card.rank}${s[card.suit]}`;
}
