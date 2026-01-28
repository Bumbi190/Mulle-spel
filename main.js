console.log("Mulle – Fängelseedition startar");

const status = document.createElement("p");
status.textContent = "Spelet är redo ✔️";
document.body.appendChild(status);

fetch('rules.json')
  .then(response => response.json())
  .then(rules => {
    console.log('Regler laddade:', rules);

    // ✅ Skapa kortleken EFTER att reglerna finns
    const deck = createDeck(rules.game.decks);
    console.log("Kortlek skapad:", deck.length); // ska vara 104

    // Här fortsätter vi med spelet
  })
  .catch(err => console.error('Kunde inte läsa regler:', err));

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

