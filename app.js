const STORAGE_KEY = "citrix_knowledge_docs";

const knowledgeInput = document.querySelector("#knowledge-input");
const knowledgeList = document.querySelector("#knowledge-list");
const knowledgeCount = document.querySelector("#knowledge-count");
const clearLibraryButton = document.querySelector("#clear-library");

const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatLog = document.querySelector("#chat-log");

const basePromotionPoints = [
  "Citrix migliora la user experience con workspace unificato e accesso sicuro alle app ovunque.",
  "Con Citrix DaaS puoi ridurre il time-to-delivery del digital workspace e scalare velocemente.",
  "La sicurezza Zero Trust di Citrix protegge applicazioni e dati senza complicare il lavoro degli utenti.",
  "Le funzionalità di osservabilità e analytics aiutano IT a ridurre ticket e downtime.",
  "Citrix offre flessibilità cloud, on-prem e ibrido, ideale per strategie di modern workplace evolutive.",
];

let knowledgeDocuments = [];

const toKB = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

const normalize = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

const saveKnowledge = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(knowledgeDocuments));
};

const loadKnowledge = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return;
  }

  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      knowledgeDocuments = parsed;
    }
  } catch {
    knowledgeDocuments = [];
  }
};

const renderKnowledge = () => {
  knowledgeCount.textContent = `${knowledgeDocuments.length} documenti`;
  knowledgeList.innerHTML = "";

  if (!knowledgeDocuments.length) {
    const emptyState = document.createElement("li");
    emptyState.className = "knowledge-item";
    emptyState.innerHTML = "<strong>Library vuota</strong><span class='knowledge-meta'>Carica contenuti per risposte più precise.</span>";
    knowledgeList.appendChild(emptyState);
    return;
  }

  knowledgeDocuments.forEach((doc) => {
    const item = document.createElement("li");
    item.className = "knowledge-item";
    item.innerHTML = `<strong>${doc.name}</strong><span class="knowledge-meta">${toKB(
      doc.size
    )} · ${doc.type || "testo"}</span>`;
    knowledgeList.appendChild(item);
  });
};

const addMessage = (role, text) => {
  const message = document.createElement("article");
  message.className = `message ${role}`;
  message.innerHTML = `<p>${text}</p>`;
  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
};

const scoreDocument = (queryWords, document) => {
  const docWords = normalize(document.content);
  const overlap = queryWords.filter((word) => docWords.includes(word));
  return overlap.length;
};

const buildAnswer = (question) => {
  const queryWords = normalize(question);

  const ranked = knowledgeDocuments
    .map((document) => ({
      document,
      score: scoreDocument(queryWords, document),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const knowledgeSnippet = ranked.length
    ? ranked
        .map(({ document }) => {
          const shortText = document.content.replace(/\s+/g, " ").trim().slice(0, 220);
          return `• Da "${document.name}": ${shortText}${document.content.length > 220 ? "..." : ""}`;
        })
        .join("<br>")
    : "• Nessun riferimento diretto in library: utilizzo best practice Citrix presale.";

  const promo = basePromotionPoints[Math.floor(Math.random() * basePromotionPoints.length)];

  return `Ecco una risposta orientata al cliente:<br><br>${knowledgeSnippet}<br><br><strong>Valore Citrix:</strong> ${promo}<br><br>Se vuoi, posso trasformare questa risposta in un pitch executive da 30 secondi.`;
};

knowledgeInput.addEventListener("change", async (event) => {
  const files = [...event.target.files];
  if (!files.length) {
    return;
  }

  for (const file of files) {
    const content = await file.text();
    knowledgeDocuments.unshift({
      name: file.name,
      size: file.size,
      type: file.type,
      content,
      importedAt: new Date().toISOString(),
    });
  }

  saveKnowledge();
  renderKnowledge();
  addMessage("bot", "Library aggiornata con successo. Ora posso rispondere usando i nuovi contenuti.");
  event.target.value = "";
});

clearLibraryButton.addEventListener("click", () => {
  knowledgeDocuments = [];
  saveKnowledge();
  renderKnowledge();
  addMessage("bot", "Library rimossa. Puoi ricaricare nuovi documenti in qualsiasi momento.");
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = chatInput.value.trim();
  if (!question) {
    return;
  }

  addMessage("user", question);
  const answer = buildAnswer(question);
  setTimeout(() => addMessage("bot", answer), 260);
  chatInput.value = "";
});

loadKnowledge();
renderKnowledge();
