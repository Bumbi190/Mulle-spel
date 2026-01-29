const HELP_MODE = true;
console.log("Mulle - Fangeleseedition startar");

// ===== GLOBAL STATE =====
let players = [];
let deck = [];
let tablePile = [];
let currentPlayerIndex = 0;
let currentDragSuit = null;

// ===== UI =====
const status = document.getElementById("status");
const gameArea = document.getElementById("game");

// ===== START =====
fetch("rules.json")
  .then((res) => res.json())
  .then((rules) => {
    deck = createDeck(rules.game.decks);
    shuffle(deck);

    players = createPlayers(4);
    dealCards(deck, players, 5);

    updateStatus();
    renderGame();
  })
  .catch((err) => {
    console.error("Kunde inte ladda rules.json:", err);
  });

// ===== RENDER =====
function renderGame() {
  gameArea.innerHTML = "";

  // TABLE (MITTEN)
  const table = document.createElement("div");
  table.className = "table";

  if (tablePile.length === 0) {
    table.textContent = "Mitten ar tom";
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

  // PLAYERS
  players.forEach((player, index) => {
    const playerDiv = document.createElement("div");
    playerDiv.className = "player";

    const title = document.createElement("h3");
    title.textContent =
      player.name + (index === currentPlayerIndex ? " <- TUR" : "");
    playerDiv.appendChild(title);

    const handDiv = document.createElement("div");
    handDiv.className = "hand";

    player.hand.forEach((card, cardIndex) => {
      const cardDiv = document.createElement("div");
      cardDiv.className = "card";
      cardDiv.textContent = formatCard(card);

      if (index === currentPlayerIndex) {
        cardDiv.onclick = () => playCard(index, cardIndex);

        if (HELP_MODE) {
          if (canPlayCard(card)) cardDiv.classList.add("playable");
          else cardDiv.classList.add("disabled");
        }
      } else {
        cardDiv.classList.add("disabled");
      }

      handDiv.appendChild(cardDiv);
    });

    playerDiv.appendChild(handDiv);

    // DONE BUTTON (LAGG KLART)
    if (index === currentPlayerIndex && currentDragSuit !== null) {
      const doneBtn = document.createElement("button");
      doneBtn.textContent = "Lagg klart";
      doneBtn.onclick = endTurn;
      playerDiv.appendChild(doneBtn);
    }

    // TAKE TABLE (TA UPP MITTEN)
    if (index === currentPlayerIndex && !hasPlayableCard(player)) {
      const btn = document.createElement("button");
      btn.textContent = "Ta upp mitten";
      btn.onclick = () => takeTablePile(player);
      playerDiv.appendChild(btn);
    }

    gameArea.appendChild(playerDiv);
  });
}

// ===== GAME LOGIC =====
function playCard(playerIndex, cardIndex) {
  const card = players[playerIndex].hand[cardIndex];
  if (!canPlayCard(card)) return;

  players[playerIndex].hand.splice(cardIndex, 1);
  tablePile.push(card);

  if (currentDragSuit === null) currentDragSuit = card.suit;

  renderGame(); // same player continues until "Lagg klart"
}

function endTurn() {
  currentDragSuit = null;
  nextTurn();
}

function canPlayCard(card) {
  if (currentDragSuit !== null) return card.suit === currentDragSuit;
  if (tablePile.length === 0) return true;
  return card.suit === tablePile[tablePile.length - 1].suit;
}

function hasPlayableCard(player) {
  return player.hand.some(canPlayCard);
}

function takeTablePile(player) {
  player.hand.push(...tablePile);
  tablePile.length = 0;
  currentDragSuit = null;
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

// ===== HELPERS =====
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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function createPlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    name: `Spelare ${i + 1}`,
    hand: [],
  }));
}

function dealCards(deckArr, playersArr, n) {
  for (let i = 0; i < n; i++) {
    playersArr.forEach((p) => p.hand.push(deckArr.pop()));
  }
}

function formatCard(card) {
  const s = { spades: "S", hearts: "H", diamonds: "D", clubs: "C" };
  return `${card.rank}${s[card.suit]}`;
}
