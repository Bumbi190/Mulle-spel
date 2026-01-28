console.log("Mulle – Fängelseedition startar");

// ===== UI STATUS =====
const status = document.createElement("p");
status.textContent = "Spelet är redo ✔️";
document.body.appendChild(status);

// ===== LÄS IN REGLER =====
fetch("rules.json")
  .then(response => response.json())
  .then(rules => {
  console.log("Regler laddade:", rules);

  // 1️⃣ SKAPA KORTLEK
  let deck = createDeck(rules.game.decks);
  console.log("Kortlek skapad:", deck.length);

  // 2️⃣ BLANDA
  shuffle(deck);
  console.log("Kortlek blandad");

  // 3️⃣ SKAPA SPELARE
  const players = createPlayers(4);
  console.log("Spelare skapade:", players);

  // 4️⃣ DELA UT KORT
  dealCards(deck, players, rules.game.startCards);
  console.log("Efter utdelning:", players);

  console.log("Kort kvar i leken:", deck.length);
});


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
  const players = [];

  for (let i = 1; i <= count; i++) {
    players.push({
      id: i,
      name: `Spelare ${i}`,
      hand: [],
      score: 0
    });
  }

  return players;
}

function dealCards(deck, players, cardsPerPlayer = 5) {
  for (let round = 0; round < cardsPerPlayer; round++) {
    for (const player of players) {
      player.hand.push(deck.pop());
    }
  }
}
