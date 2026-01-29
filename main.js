console.log("Mulle – Fängelseedition startar");

// ===== GLOBAL STATE =====
let players = [];
let deck = [];
let tablePile = [];
let currentPlayerIndex = 0;

// ===== UI STATUS =====
const status = document.createElement("p");
document.body.appendChild(status);

// ===== LÄS IN REGLER =====
fetch("rules.json")
  .then(res => res.json())
  .then(rules => {
    deck = createDeck(rules.game.decks);
    shuffle(deck);

    players = createPlayers(4);
    dealCards(deck, players, rules.game.startCards);

    status.textContent = `Tur: ${players[currentPlayerIndex].name}`;

    renderGame();
  });

// ===== RENDER GAME =====
function renderGame() {
  document.getElementById("game")?.remove();

  const gameArea = document.createElement("div");
  gameArea.id = "game";
  document.body.appendChild(gameArea);

  // 🔥 MITTEN
  const table = document.createElement("div");
  table.className = "table";

  table.textContent =
    tablePile.length === 0
      ? "🃏 Mitten är tom"
      : `Mitten: ${formatCard(tablePile.at(-1))}`;

  gameArea.appendChild(table);

  // 🧑‍🤝‍🧑 SPELARE
  players.forEach((player, index) => {
    const playerDiv = document.createElement("div");
    playerDiv.className = "player";

    const name = document.createElement("h3");
    name.textContent =
      player.name + (index === currentPlayerIndex ? " ← TUR" : "");
    playerDiv.appendChild(name);

    const handDiv = document.createElement("div");
    handDiv.className = "hand";

    player.hand.forEach((card, cardIndex) => {
      const cardDiv = document.createElement("span");
      cardDiv.className = "card";
      cardDiv.textContent = formatCard(card);

      // 🎯 SPELA KORT
      if (index === currentPlayerIndex && canPlayCard(card)) {
  cardDiv.onclick = () => playCard(index, cardIndex);
} else {
  cardDiv.style.opacity = "0.4";
}


      handDiv.appendChild(cardDiv);
    });

    playerDiv.appendChild(handDiv);
    gameArea.appendChild(playerDiv);
  });
}

// ===== SPELA KORT =====
function playCard(playerIndex, cardIndex) {
  const card = players[playerIndex].hand.splice(cardIndex, 1)[0];
  tablePile.push(card);

  currentPlayerIndex =
    (currentPlayerIndex + 1) % players.length;

  status.textContent = `Tur: ${players[currentPlayerIndex].name}`;
  renderGame();
}

function canPlayCard(card) {
  if (tablePile.length === 0) return true;

  const topCard = tablePile.at(-1);
  return card.suit === topCard.suit;
}


// ===== FUNKTIONER =====
function createDeck(decks = 2) {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"];
  const deck = [];

  for (let d = 0; d < decks; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function createPlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Spelare ${i + 1}`,
    hand: [],
    score: 0
  }));
}

function dealCards(deck, players, cardsPerPlayer) {
  for (let r = 0; r < cardsPerPlayer; r++) {
    players.forEach(p => p.hand.push(deck.pop()));
  }
}

function formatCard(card) {
  const suits = {
    spades: "♠",
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣"
  };
  return `${card.rank}${suits[card.suit]}`;
}
