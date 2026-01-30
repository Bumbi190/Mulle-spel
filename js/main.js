const HELP_MODE = true;
console.log("🔥 Mulle – Fängelseedition startar");

// ================= GLOBAL STATE =================
let players = [];
let deck = [];
let tablePile = [];
let currentPlayerIndex = 0;

let currentDragSuit = null;
let choosingSuit = false;

// MULLE
let mustCallMulle = false;
let mulleCalled = false;

// ================= UI =================
const status = document.getElementById("status");
const gameArea = document.getElementById("game");

// ================= START =================
fetch("rules.json")
  .then(res => res.json())
  .then(rules => {
    deck = createDeck(rules.game.decks || 2);
    shuffle(deck);

    players = createPlayers(4);
    dealCards(deck, players, 5);

    updateStatus();
    renderGame();
  });

// ================= RENDER =================
function renderGame() {
  gameArea.innerHTML = "";

  // ===== MITTEN =====
  const table = document.createElement("div");
  table.className = "table";

  if (tablePile.length === 0) {
    table.textContent = "Mitten är tom";
  } else {
    tablePile.forEach((card, i) => {
      const c = document.createElement("div");
      c.className = `table-card ${card.suit}`;
      c.innerHTML = `
        <span class="rank">${card.rank}</span>
        <span class="suit">${getSuitSymbol(card.suit)}</span>
      `;
      c.style.top = `${i * 2}px`;
      c.style.left = `${i * 2}px`;
      table.appendChild(c);
    });
  }

  gameArea.appendChild(table);

  // ===== DRAG-INDIKATOR =====
  if (currentDragSuit) {
    const dragInfo = document.createElement("div");
    dragInfo.className = "drag-indicator";
    dragInfo.textContent = `Du lägger ${getSuitSymbol(currentDragSuit)}`;
    gameArea.appendChild(dragInfo);
  }

  // ===== ESS – VÄLJ FÄRG =====
  if (choosingSuit) {
    const suitPicker = document.createElement("div");
    suitPicker.className = "suit-picker";

    ["hearts", "diamonds", "clubs", "spades"].forEach(suit => {
      const btn = document.createElement("button");
      btn.textContent = getSuitSymbol(suit);
      btn.onclick = () => {
        currentDragSuit = suit;
        choosingSuit = false;
        renderGame();
      };
      suitPicker.appendChild(btn);
    });

    gameArea.appendChild(suitPicker);
  }

  // ===== SPELARE =====
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
      cardDiv.className = `card ${card.suit}`;
      cardDiv.innerHTML = `
        <span class="rank">${card.rank}</span>
        <span class="suit">${getSuitSymbol(card.suit)}</span>
      `;

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

    playerDiv.appendChild(handDiv);

    // ===== MULLE-KNAPP =====
    if (index === currentPlayerIndex && mustCallMulle && !mulleCalled) {
      const mulleBtn = document.createElement("button");
      mulleBtn.textContent = "MULLE";
      mulleBtn.className = "mulle-btn";
      mulleBtn.onclick = () => {
        mulleCalled = true;
        renderGame();
      };
      playerDiv.appendChild(mulleBtn);
    }

    // ===== AVSLUTA DRAG =====
    if (index === currentPlayerIndex && currentDragSuit !== null) {
      const doneBtn = document.createElement("button");
      doneBtn.textContent = "Avsluta drag";
      doneBtn.onclick = endTurn;
      playerDiv.appendChild(doneBtn);
    }

    // ===== TA UPP MITTEN =====
    if (index === currentPlayerIndex && !hasPlayableCard(player)) {
      const btn = document.createElement("button");
      btn.textContent = "Ta upp mitten";
      btn.onclick = () => takeTablePile(index);
      playerDiv.appendChild(btn);
    }

    gameArea.appendChild(playerDiv);
  });
}

// ================= GAME LOGIC =================
function playCard(playerIndex, cardIndex) {
  const player = players[playerIndex];
  const card = player.hand[cardIndex];
  if (!canPlayCard(card)) return;

  player.hand.splice(cardIndex, 1);
  tablePile.push(card);

  // ===== MULLE CHECK =====
  mustCallMulle = player.hand.length === 1;
  mulleCalled = false;

  // 🔟 RUTER 10 – TABBE
  if (card.rank === 10 && card.suit === "diamonds") {
    tablePile.length = 0;
    currentDragSuit = null;
    nextTurn();
    return;
  }

  // 🟥 SPADER 2 – NÄSTA TAR MITTEN
  if (card.rank === 2 && card.suit === "spades") {
    const victimIndex = (currentPlayerIndex + 1) % players.length;
    players[victimIndex].hand.push(...tablePile);

    tablePile.length = 0;
    currentDragSuit = null;

    currentPlayerIndex = (currentPlayerIndex + 2) % players.length;
    updateStatus();
    renderGame();
    return;
  }

  // 🅰️ ESS – VÄLJ FÄRG
  if (card.rank === "A") {
    choosingSuit = true;
    currentDragSuit = null;
    renderGame();
    return;
  }

  // 🔒 LÅS FÄRG
  if (!currentDragSuit) {
    currentDragSuit = card.suit;
  }

  renderGame();
}

function endTurn() {
  // Straff om MULLE glömdes
  if (mustCallMulle && !mulleCalled) {
    players[currentPlayerIndex].hand.push(...tablePile);
    tablePile.length = 0;
  }

  mustCallMulle = false;
  mulleCalled = false;
  currentDragSuit = null;
  nextTurn();
}

function canPlayCard(card) {
  if (currentDragSuit) return card.suit === currentDragSuit;
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

// ================= HELPERS =================
function createDeck(decks) {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"];
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
    hand: []
  }));
}

function dealCards(deckArr, playersArr, n) {
  for (let i = 0; i < n; i++) {
    playersArr.forEach(p => p.hand.push(deckArr.pop()));
  }
}

function getSuitSymbol(suit) {
  return { spades:"♠", hearts:"♥", diamonds:"♦", clubs:"♣" }[suit];
}
