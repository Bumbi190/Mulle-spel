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

function endTurn() {
  currentDragSuit = null;
  nextTurn();
}


// ===== RENDER =====
function renderGame() {
  gameArea.innerHTML = "";

  // 🃏 MITTEN
const table = document.createElement("div");
table.className = "table";

if (tablePile.length === 0) {
  table.textContent = "Mitten är tom";
} else {
  tablePile.forEach((card, i) => {
    const c = document.createElement("div");
    c.className = `table-card ${card.suit}`;
    c.textContent = formatCard(card);

    // liten offset så det ser staplat ut
    c.style.top = `${i * 2}px`;
    c.style.left = `${i * 2}px`;

    table.appendChild(c);
  });
}

gameArea.appendChild(table);

  if (currentDragSuit !== null) {
  const dragInfo = document.createElement("div");
  dragInfo.className = "drag-indicator";
  dragInfo.textContent = `Du lägger ${getSuitSymbol(currentDragSuit)}`;
  gameArea.appendChild(dragInfo);
}


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
  cardDiv.className = `card ${card.suit}`;

  cardDiv.innerHTML = `
    <span class="rank">${card.rank}</span>
    <span class="suit">${getSuitSymbol(card.suit)}</span>
  `;

  // ✅ HÄR ÄR NYCKELN – drag-indikatorn
  if (index === currentPlayerIndex) {
    if (canPlayCard(card)) {
      cardDiv.onclick = () => playCard(index, cardIndex);
      cardDiv.classList.add("playable");
    } else {
      cardDiv.classList.add("disabled");
    }
  } else {
    cardDiv.classList.add("disabled");
  }

  handDiv.appendChild(cardDiv);
});



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
      btn.onclick = () => takeTablePile(index);
      playerDiv.appendChild(btn);
    }

    gameArea.appendChild(playerDiv);
  });
}

// ===== GAME LOGIC =====
function playCard(playerIndex, cardIndex) {
  const card = players[playerIndex].hand[cardIndex];

  if (!canPlayCard(card)) return;

  // Ta bort kortet från handen
  players[playerIndex].hand.splice(cardIndex, 1);
  tablePile.push(card);

  // Lås färg vid första kortet
  if (currentDragSuit === null) {
    currentDragSuit = card.suit;
  }

  function endTurn() {
  currentDragSuit = null;
  nextTurn();
}


  // 🟥 SPADER 2 – nästa spelare tar mitten
  if (card.rank === 2 && card.suit === "spades") {
    const nextPlayer =
      players[(currentPlayerIndex + 1) % players.length];

    nextPlayer.hand.push(...tablePile);
    tablePile.length = 0;
    currentDragSuit = null;

    // hoppa vidare till nästa efter den drabbade
    currentPlayerIndex =
      (currentPlayerIndex + 2) % players.length;

    updateStatus();
    renderGame();
    return;
  }

  renderGame(); // samma spelare fortsätter
}


function canPlayCard(card) {
  if (currentDragSuit !== null) return card.suit === currentDragSuit;
  if (tablePile.length === 0) return true;
  return card.suit === tablePile[tablePile.length - 1].suit;
}

function hasPlayableCard(player) {
  return player.hand.some(canPlayCard);
}

function takeTablePile(playerIndex) {
  players[playerIndex].hand.push(...tablePile);
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
  const suitSymbols = {
    spades: "♠",
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣"
  };

  return `${card.rank}${suitSymbols[card.suit]}`;
}

function getSuitSymbol(suit) {
  return {
    spades: "♠",
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
  }[suit];
}
