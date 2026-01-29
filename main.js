console.log("Mulle – Fängelseedition startar");

const style = document.createElement("style");
style.textContent = `
  .table {
    position: relative;
    width: 120px;
    height: 160px;
    border: 2px dashed #aaa;
    margin: 20px 0;
  }

  .table-card {
    width: 80px;
    height: 120px;
    background: white;
    border: 1px solid black;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
`;
document.head.appendChild(style);


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

if (tablePile.length === 0) {
  table.textContent = "🃏 Mitten är tom";
} else {
  tablePile.forEach((card, index) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "table-card";
    cardDiv.textContent = formatCard(card);

    // Stapel-effekt
    cardDiv.style.position = "absolute";
    cardDiv.style.top = `${index * 2}px`;
    cardDiv.style.left = `${index * 2}px`;
    cardDiv.style.zIndex = index;

    table.appendChild(cardDiv);
  });
}

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

// 👉 KNAPP OM INGA GILTIGA KORT
if (
  index === currentPlayerIndex &&
  !hasPlayableCard(player)
) {
  const takeButton = document.createElement("button");
  takeButton.textContent = "Ta upp mitten";
  takeButton.onclick = () => takeTablePile(player);
  playerDiv.appendChild(takeButton);
}

gameArea.appendChild(playerDiv);

  });
}

// ===== SPELA KORT =====
function playCard(playerIndex, cardIndex) {
  const card = players[playerIndex].hand.splice(cardIndex, 1)[0];
  tablePile.push(card);

  // 👉 SPADER 2-REGEL
  if (card.rank === 2 && card.suit === "spades") {
    const nextPlayerIndex =
      (playerIndex + 1) % players.length;

    console.log(
      `${players[nextPlayerIndex].name} måste ta upp mitten (Spader 2)`
    );

    takeTablePile(players[nextPlayerIndex]);
  }

  // Nästa tur
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

function hasPlayableCard(player) {
  return player.hand.some(card => canPlayCard(card));
}

function takeTablePile(player) {
  player.hand.push(...tablePile);
  tablePile.length = 0;

  console.log(`${player.name} tog upp mitten`);

  nextTurn();
}

function nextTurn() {
  currentPlayerIndex =
    (currentPlayerIndex + 1) % players.length;

  status.textContent = `Tur: ${players[currentPlayerIndex].name}`;
  renderGame();
}
