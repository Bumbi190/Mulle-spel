console.log("Mulle – Fängelseedition startar");

const status = document.createElement("p");
status.textContent = "Spelet är redo ✔️";
document.body.appendChild(status);

fetch('rules.json')
  .then(response => response.json())
  .then(rules => {
    console.log('Regler laddade:', rules);
    // Här kan du sätta upp spelet utifrån reglerna
  })
  .catch(err => console.error('Kunde inte läsa regler:', err));

