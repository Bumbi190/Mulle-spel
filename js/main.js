console.log("🔥 MULLE – Fängelseedition (Komplett version)");

// ================= GAME STATE =================
const game = {
  players: [],
  deck: [],
  tableCards: [],
  builds: [],
  currentPlayer: 0,
  lastTaker: null,
  teamMode: false, // Kan aktiveras för 2v2
  dealCount: 0
};

let selectedCards = []; // Kan vara både handkort OCH bordskort
let buildMode = null; // null, 'create', 'package', 'add', 'extend'

// ================= START =================
startGame();

// ================= INIT =================
function startGame() {
  game.deck = createDeck(2);
  shuffle(game.deck);

  const numPlayers = parseInt(prompt("Antal spelare (2-4):", "4")) || 4;
  game.players = createPlayers(numPlayers);
  
  // Första given: 8 kort till varje spelare, 8 kort på bordet
  deal(game.deck, game.players, 8);

  game.tableCards = [];
  for (let i = 0; i < 8; i++) {
    if (game.deck.length > 0) {
      game.tableCards.push(game.deck.pop());
    }
  }

  game.builds = [];
  game.currentPlayer = 0;
  game.dealCount = 1;
  selectedCards = [];
  buildMode = null;

  render();
}

// ================= DATA MODELS =================
function createPlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    name: `Spelare ${i + 1}`,
    hand: [],
    takenCards: [],
    mulleCards: [], // Sparar Mulle-par (2 kort per mulle)
    tabbes: 0,
    score: 0
  }));
}

// ================= VALUES =================
// Bordsvärde: används för summor på bordet och byggvärden
function getCardTableValue(card) {
  if (card.rank === "A") return 1;
  if (card.rank === 2 && card.suit === "spades") return 2;         // ♠2 = 2 på bord
  if (card.rank === 10 && card.suit === "diamonds") return 10;     // ♦10 = 10 på bord
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;
  return card.rank;
}

// Handvärde: används när man tar in
function getCardHandValue(card) {
  if (card.rank === "A") return 14;
  if (card.rank === 2 && card.suit === "spades") return 15;        // ♠2 = 15 på hand
  if (card.rank === 10 && card.suit === "diamonds") return 16;     // ♦10 = 16 på hand
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;
  return card.rank;
}

// ================= BUILDS =================
function createBuild(cards, owner, isPackaged = false) {
  return {
    cards: [...cards],
    value: cards.reduce((sum, c) => sum + getCardTableValue(c), 0),
    owner,
    isPackaged // Om bygget är paketerat (då kan man inte bygga vidare på det)
  };
}

// ================= CARD SELECTION =================
function handleHandCardClick(cardIndex) {
  const player = game.players[game.currentPlayer];
  const card = player.hand[cardIndex];

  const selected = selectedCards.find(s => s.type === 'hand' && s.index === cardIndex);
  
  if (selected) {
    // Avmarkera
    selectedCards = selectedCards.filter(s => !(s.type === 'hand' && s.index === cardIndex));
  } else {
    // Markera
    selectedCards.push({ type: 'hand', card, index: cardIndex });
  }

  render();
}

function handleTableCardClick(cardIndex) {
  const card = game.tableCards[cardIndex];
  
  const selected = selectedCards.find(s => s.type === 'table' && s.index === cardIndex);
  
  if (selected) {
    selectedCards = selectedCards.filter(s => !(s.type === 'table' && s.index === cardIndex));
  } else {
    selectedCards.push({ type: 'table', card, index: cardIndex });
  }

  render();
}

function handleBuildClick(buildIndex) {
  const selected = selectedCards.find(s => s.type === 'build' && s.index === buildIndex);
  
  if (selected) {
    selectedCards = selectedCards.filter(s => !(s.type === 'build' && s.index === buildIndex));
  } else {
    selectedCards.push({ type: 'build', build: game.builds[buildIndex], index: buildIndex });
  }

  render();
}

// ================= ACTIONS =================

// SPELA KORT (ta eller lägg ut)
function playCard() {
  const player = game.players[game.currentPlayer];
  const handCards = selectedCards.filter(s => s.type === 'hand');
  
  if (handCards.length !== 1) {
    alert("Välj exakt ETT kort från handen att spela");
    return;
  }

  const handCard = handCards[0].card;
  const cardIndex = handCards[0].index;

  // Ta bort kortet från handen
  player.hand.splice(cardIndex, 1);
  selectedCards = [];

  // 1) MULLE – samma kort med samma kort (INTE ess)
  if (canMulle(handCard)) {
    const matchIndex = game.tableCards.findIndex(
      c => c.rank === handCard.rank && c.suit === handCard.suit
    );

    if (matchIndex !== -1) {
      const match = game.tableCards.splice(matchIndex, 1)[0];
      player.mulleCards.push(handCard, match);
      game.lastTaker = game.currentPlayer;

      // Tabbe om bordet blev tomt
      if (game.tableCards.length === 0 && game.builds.length === 0) {
        player.tabbes++;
      }

      updateScores();
      nextPlayer();
      checkNewDealOrEnd();
      render();
      return;
    }
  }

  // 2) SUMTAGNING: ta kort från bordet som summerar till handvärdet
  if (handCard.rank !== "A") { // Ess får INTE tas direkt
    const target = getCardHandValue(handCard);
    const taken = findSumCombination(target);

    if (taken.length) {
      player.takenCards.push(handCard, ...taken);
      game.lastTaker = game.currentPlayer;
      game.tableCards = game.tableCards.filter(c => !taken.includes(c));

      // Tabbe om bordet blev tomt
      if (game.tableCards.length === 0 && game.builds.length === 0) {
        player.tabbes++;
      }

      updateScores();
      nextPlayer();
      checkNewDealOrEnd();
      render();
      return;
    }
  }

  // 3) Annars: lägg ut på bordet
  game.tableCards.push(handCard);
  nextPlayer();
  render();
}

// BYGG
function createBuildAction() {
  const player = game.players[game.currentPlayer];
  const handCards = selectedCards.filter(s => s.type === 'hand');
  const tableCards = selectedCards.filter(s => s.type === 'table');

  // Regel: Exakt 2 kort totalt (kan vara 2 från hand, 1+1, eller 0+2)
  const totalCards = handCards.length + tableCards.length;
  
  if (totalCards !== 2) {
    alert("Bygg kräver exakt 2 kort totalt (från hand och/eller bord)");
    return;
  }

  const allCards = [
    ...handCards.map(s => s.card),
    ...tableCards.map(s => s.card)
  ];

  const buildValue = allCards.reduce((sum, c) => sum + getCardTableValue(c), 0);

  // Regel: Du måste ha kort kvar som kan ta bygget (handvärde)
  const canTakeLater = player.hand.some(
    c => !handCards.find(hc => hc.card === c) && getCardHandValue(c) === buildValue
  );

  if (!canTakeLater) {
    alert(`Ogiltigt bygge: Du måste ha ${buildValue} kvar på handen för att kunna ta bygget senare`);
    return;
  }

  // Ta bort kort från hand
  handCards.forEach(hc => {
    const idx = player.hand.indexOf(hc.card);
    if (idx !== -1) player.hand.splice(idx, 1);
  });

  // Ta bort kort från bordet
  tableCards.forEach(tc => {
    const idx = game.tableCards.indexOf(tc.card);
    if (idx !== -1) game.tableCards.splice(idx, 1);
  });

  // Skapa bygget
  const build = createBuild(allCards, game.currentPlayer, false);
  game.builds.push(build);

  selectedCards = [];
  nextPlayer();
  render();
}

// PAKETERA (lägg till fler byggen av samma värde)
function packageBuild() {
  const player = game.players[game.currentPlayer];
  const handCards = selectedCards.filter(s => s.type === 'hand');
  const tableCards = selectedCards.filter(s => s.type === 'table');
  const builds = selectedCards.filter(s => s.type === 'build');

  if (builds.length !== 1) {
    alert("Välj exakt ETT bygge att paketera till");
    return;
  }

  const targetBuild = builds[0].build;
  const targetValue = targetBuild.value;

  // Om bygget redan är paketerat, kan man bara lägga till enskilda kort
  if (targetBuild.isPackaged) {
    if (handCards.length + tableCards.length !== 1) {
      alert("Till paketerade byggen kan du bara lägga ETT kort i taget");
      return;
    }

    const card = handCards.length ? handCards[0].card : tableCards[0].card;
    if (getCardTableValue(card) !== targetValue) {
      alert(`Kortet måste ha värde ${targetValue} för att läggas till paketet`);
      return;
    }

    // Lägg till kortet i bygget
    targetBuild.cards.push(card);

    // Ta bort från hand/bord
    if (handCards.length) {
      const idx = player.hand.indexOf(card);
      if (idx !== -1) player.hand.splice(idx, 1);
    } else {
      const idx = game.tableCards.indexOf(card);
      if (idx !== -1) game.tableCards.splice(idx, 1);
    }

  } else {
    // Opaketera bygge - lägg till nya tvåkortskombinationer
    const totalCards = handCards.length + tableCards.length;
    
    if (totalCards !== 2) {
      alert("Paketering kräver 2 kort av samma värde som bygget");
      return;
    }

    const allCards = [
      ...handCards.map(s => s.card),
      ...tableCards.map(s => s.card)
    ];

    const newValue = allCards.reduce((sum, c) => sum + getCardTableValue(c), 0);

    if (newValue !== targetValue) {
      alert(`De valda korten måste summera till ${targetValue}`);
      return;
    }

    // Lägg till korten i bygget
    targetBuild.cards.push(...allCards);
    targetBuild.isPackaged = true; // Nu är det paketerat

    // Ta bort kort från hand
    handCards.forEach(hc => {
      const idx = player.hand.indexOf(hc.card);
      if (idx !== -1) player.hand.splice(idx, 1);
    });

    // Ta bort kort från bordet
    tableCards.forEach(tc => {
      const idx = game.tableCards.indexOf(tc.card);
      if (idx !== -1) game.tableCards.splice(idx, 1);
    });
  }

  selectedCards = [];
  nextPlayer();
  render();
}

// BYGGA VIDARE (uppåt eller neråt)
function extendBuild() {
  const player = game.players[game.currentPlayer];
  const handCards = selectedCards.filter(s => s.type === 'hand');
  const builds = selectedCards.filter(s => s.type === 'build');

  if (handCards.length !== 1 || builds.length !== 1) {
    alert("Välj ETT handkort och ETT bygge att bygga vidare på");
    return;
  }

  const targetBuild = builds[0].build;
  const card = handCards[0].card;

  // Kan inte bygga vidare på paketerade byggen
  if (targetBuild.isPackaged) {
    alert("Du kan inte bygga vidare på paketerade byggen");
    return;
  }

  const cardValue = getCardTableValue(card);
  const buildValue = targetBuild.value;
  const newValue = buildValue + cardValue; // Bygga uppåt
  const downValue = Math.abs(buildValue - cardValue); // Bygga neråt

  // Låt spelaren välja riktning
  const choice = prompt(`Bygga UPPÅT till ${newValue} eller NERÅT till ${downValue}? (u/n)`);

  let finalValue;
  if (choice === 'u') {
    finalValue = newValue;
  } else if (choice === 'n') {
    finalValue = downValue;
  } else {
    alert("Ogiltig val, avbryter");
    return;
  }

  // Regel: Du måste ha kort som kan ta det nya bygget
  const canTakeLater = player.hand.some(
    c => c !== card && getCardHandValue(c) === finalValue
  );

  if (!canTakeLater) {
    alert(`Du måste ha ${finalValue} kvar på handen för att bygga vidare`);
    return;
  }

  // Lägg till kortet i bygget
  targetBuild.cards.push(card);
  targetBuild.value = finalValue;

  // Ta bort från hand
  const idx = player.hand.indexOf(card);
  if (idx !== -1) player.hand.splice(idx, 1);

  selectedCards = [];
  nextPlayer();
  render();
}

// TA BYGGE
function takeBuild() {
  const player = game.players[game.currentPlayer];
  const builds = selectedCards.filter(s => s.type === 'build');
  const handCards = selectedCards.filter(s => s.type === 'hand');

  if (builds.length !== 1 || handCards.length !== 1) {
    alert("Välj ETT bygge och ETT handkort för att ta in");
    return;
  }

  const build = builds[0].build;
  const buildIndex = builds[0].index;
  const card = handCards[0].card;

  // Kontrollera att handkortet kan ta bygget
  if (getCardHandValue(card) !== build.value) {
    alert(`Du måste använda ett kort med värde ${build.value} för att ta detta bygge`);
    return;
  }

  // Ta bygget
  player.takenCards.push(card, ...build.cards);
  game.lastTaker = game.currentPlayer;

  // Ta bort bygget
  game.builds.splice(buildIndex, 1);

  // Ta bort kortet från handen
  const cardIdx = player.hand.indexOf(card);
  if (cardIdx !== -1) player.hand.splice(cardIdx, 1);

  // Tabbe om allt blev tomt
  if (game.tableCards.length === 0 && game.builds.length === 0) {
    player.tabbes++;
  }

  selectedCards = [];
  updateScores();
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

  if (!status || !area) return;

  const player = game.players[game.currentPlayer];
  status.textContent = `Tur: ${player.name} | Giv: ${game.dealCount}`;
  area.innerHTML = "";

  // ===== INSTRUKTIONER =====
  const instructions = document.createElement("div");
  instructions.className = "instructions";
  instructions.innerHTML = `
    <strong>📖 Instruktioner:</strong><br>
    • Klicka på kort för att välja<br>
    • <strong>Spela kort:</strong> 1 handkort → Ta eller lägg ut<br>
    • <strong>Bygg:</strong> 2 kort (hand/bord) → Skapa bygge<br>
    • <strong>Paketera:</strong> 1 bygge + 2 kort → Lägg till paket<br>
    • <strong>Bygga vidare:</strong> 1 bygge + 1 kort → Höj/sänk bygget<br>
    • <strong>Ta bygge:</strong> 1 bygge + 1 handkort → Ta in
  `;
  area.appendChild(instructions);

  // ===== BORDET =====
  const table = document.createElement("div");
  table.className = "table";

  const tableTitle = document.createElement("h3");
  tableTitle.textContent = "🃏 Bordet";
  table.appendChild(tableTitle);

  const tableCardsDiv = document.createElement("div");
  tableCardsDiv.className = "table-cards";
  
  game.tableCards.forEach((c, i) => {
    const cardDiv = renderCard(c);
    const isSelected = selectedCards.find(s => s.type === 'table' && s.index === i);
    if (isSelected) cardDiv.classList.add("selected");
    cardDiv.onclick = () => handleTableCardClick(i);
    tableCardsDiv.appendChild(cardDiv);
  });

  table.appendChild(tableCardsDiv);

  // Byggen
  if (game.builds.length > 0) {
    const buildsDiv = document.createElement("div");
    buildsDiv.className = "builds-container";
    
    game.builds.forEach((b, index) => {
      const buildDiv = document.createElement("div");
      buildDiv.className = "build";

      const ownerName = game.players[b.owner]?.name || `Spelare ${b.owner + 1}`;
      const packagedText = b.isPackaged ? " 📦" : "";

      buildDiv.innerHTML = `
        <div class="build-value">Bygge ${b.value}${packagedText}</div>
        <div class="build-owner">${ownerName}</div>
        <div class="build-cards">${b.cards.length} kort</div>
      `;

      const isSelected = selectedCards.find(s => s.type === 'build' && s.index === index);
      if (isSelected) buildDiv.classList.add("selected");

      if (b.owner === game.currentPlayer) {
        buildDiv.classList.add("own-build");
      } else {
        buildDiv.classList.add("other-build");
      }

      buildDiv.onclick = () => handleBuildClick(index);
      buildsDiv.appendChild(buildDiv);
    });

    table.appendChild(buildsDiv);
  }

  area.appendChild(table);

  // ===== SPELARE =====
  game.players.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "player";
    if (i === game.currentPlayer) div.classList.add("active-player");

    div.innerHTML = `
      <h3>${p.name}${i === game.currentPlayer ? " ⬅️ DIN TUR" : ""}</h3>
      <div class="player-stats">
        📥 Tagna: ${p.takenCards.length} | 
        🎯 Mullar: ${p.mulleCards.length / 2} | 
        🏆 Tabbar: ${p.tabbes} | 
        💯 Poäng: ${p.score}
      </div>
    `;

    const hand = document.createElement("div");
    hand.className = "hand";

    p.hand.forEach((c, idx) => {
      const cardDiv = renderCard(c);
      const isSelected = selectedCards.find(s => s.type === 'hand' && s.index === idx);
      if (isSelected) cardDiv.classList.add("selected");

      if (i === game.currentPlayer) {
        cardDiv.onclick = () => handleHandCardClick(idx);
        cardDiv.classList.add("playable");
      } else {
        cardDiv.classList.add("disabled");
      }

      hand.appendChild(cardDiv);
    });

    div.appendChild(hand);

    // KNAPPAR för current player
    if (i === game.currentPlayer) {
      const actions = document.createElement("div");
      actions.className = "actions";

      const playBtn = document.createElement("button");
      playBtn.textContent = "🎴 Spela kort";
      playBtn.onclick = playCard;

      const buildBtn = document.createElement("button");
      buildBtn.textContent = "🏗️ Bygg";
      buildBtn.onclick = createBuildAction;

      const packageBtn = document.createElement("button");
      packageBtn.textContent = "📦 Paketera";
      packageBtn.onclick = packageBuild;

      const extendBtn = document.createElement("button");
      extendBtn.textContent = "⬆️⬇️ Bygga vidare";
      extendBtn.onclick = extendBuild;

      const takeBtn = document.createElement("button");
      takeBtn.textContent = "✅ Ta bygge";
      takeBtn.onclick = takeBuild;

      const clearBtn = document.createElement("button");
      clearBtn.textContent = "❌ Rensa val";
      clearBtn.className = "clear-btn";
      clearBtn.onclick = () => {
        selectedCards = [];
        render();
      };

      actions.appendChild(playBtn);
      actions.appendChild(buildBtn);
      actions.appendChild(packageBtn);
      actions.appendChild(extendBtn);
      actions.appendChild(takeBtn);
      actions.appendChild(clearBtn);

      div.appendChild(actions);
    }

    area.appendChild(div);
  });
}

// ================= HELPERS =================
function renderCard(card) {
  const d = document.createElement("div");
  d.className = `card ${card.suit}`;
  
  const rankSpan = document.createElement("span");
  rankSpan.className = "rank";
  rankSpan.textContent = card.rank;
  
  const suitSpan = document.createElement("span");
  suitSpan.className = "suit";
  suitSpan.textContent = getSuitSymbol(card.suit);
  
  d.appendChild(rankSpan);
  d.appendChild(suitSpan);
  
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
    players.forEach((p) => {
      if (deck.length > 0) {
        p.hand.push(deck.pop());
      }
    });
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

function canMulle(card) {
  // Ess får ALDRIG mulle-tas direkt
  if (card.rank === "A") return false;
  return true;
}

// ================= POÄNGRÄKNING =================
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

  // Kolla om det finns kort kvar i leken
  if (game.deck.length >= game.players.length * 8) {
    // BÅT-varning om nästa giv är sista
    if (game.deck.length < game.players.length * 16) {
      alert("🚤 BÅT! Nästa giv är den sista.");
    }
    
    // Dela ut 8 nya kort
    deal(game.deck, game.players, 8);
    game.dealCount++;
    render();
    return;
  }

  // BÅT - sista korten
  handleBoat();
}

function handleBoat() {
  if (game.lastTaker === null) {
    alert("Spelet slut! Ingen tog sista sticket.");
    endGame();
    return;
  }

  const player = game.players[game.lastTaker];

  if (game.tableCards.length > 0) {
    player.takenCards.push(...game.tableCards);
    game.tableCards = [];

    // Tabbe om byggen också är tomma
    if (game.builds.length === 0) {
      player.tabbes++;
    }
  }

  // Ta alla återstående byggen också
  game.builds.forEach(b => {
    player.takenCards.push(...b.cards);
  });
  game.builds = [];

  updateScores();
  render();

  alert(`🚤 BÅT! ${player.name} tar sista korten och får en tabbe.`);
  
  endGame();
}

function endGame() {
  updateScores();
  
  const results = game.players
    .map((p, i) => ({ ...p, index: i }))
    .sort((a, b) => b.score - a.score);

  let resultText = "🏆 SLUTRESULTAT 🏆\n\n";
  
  results.forEach((p, i) => {
    resultText += `${i + 1}. ${p.name}: ${p.score}p\n`;
    if (p.score > 100) {
      resultText += `   🥵 SENAP! (100+ poäng)\n`;
    }
    if (p.score > 200) {
      resultText += `   🍅 KETCHUP! (200+ poäng)\n`;
    }
  });

  const winner = results[results.length - 1];
  resultText += `\n👑 VINNARE: ${winner.name} med ${winner.score}p!`;

  alert(resultText);

  if (confirm("Vill du spela igen?")) {
    location.reload();
  }
}
