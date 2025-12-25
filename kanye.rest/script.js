"use strict";

const API_URL = "https://api.kanye.rest";

// DOM Elements
const quoteText = document.getElementById("quoteText");
const getQuoteBtn = document.getElementById("getQuoteBtn");
const copyBtn = document.getElementById("copyBtn");
const shareBtn = document.getElementById("shareBtn");
const statusEl = document.getElementById("status");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");
const themeToggle = document.getElementById("themeToggle");
const historyBox = document.getElementById("historyBox");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const suggestedBox = document.getElementById("suggestedBox");
const suggestedList = document.getElementById("suggestedList");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const loadMoreText = document.getElementById("loadMoreText");
const loadMoreLoader = document.getElementById("loadMoreLoader");

let currentQuote = "";
let quoteHistory = [];
let suggestedQuotes = [];
const MAX_HISTORY = 10;
const INITIAL_SUGGESTED = 3;
const LOAD_MORE_COUNT = 3;

// Theme Management
function initTheme() {
  const saved = localStorage.getItem("kanye_theme");
  const theme = saved || "dark";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("kanye_theme", next);
  updateThemeIcon(next);
}

// UI State Management
function setLoading(isLoading) {
  getQuoteBtn.disabled = isLoading;
  
  if (isLoading) {
    btnText.classList.add("hidden");
    btnLoader.classList.remove("hidden");
  } else {
    btnText.classList.remove("hidden");
    btnLoader.classList.add("hidden");
  }
}

function showStatus(message, duration = 3000) {
  statusEl.textContent = message;
  statusEl.style.opacity = "1";
  
  setTimeout(() => {
    statusEl.style.opacity = "0";
  }, duration);
}

function enableActions() {
  copyBtn.disabled = false;
  shareBtn.disabled = false;
}

// Fetch Quote
async function fetchQuote() {
  try {
    setLoading(true);
    statusEl.textContent = "";
    
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.quote) {
      throw new Error("Invalid response format");
    }
    
    currentQuote = data.quote;
    displayQuote(currentQuote);
    addToHistory(currentQuote);
    enableActions();
    
    // Fetch suggested quotes if list is empty
    if (suggestedQuotes.length === 0) {
      await fetchSuggestedQuotes(INITIAL_SUGGESTED);
    }
    
  } catch (error) {
    console.error("Error fetching quote:", error);
    showStatus(`Failed to fetch quote: ${error.message}`);
    quoteText.textContent = "Failed to load quote. Please try again.";
  } finally {
    setLoading(false);
  }
}

// Fetch multiple quotes for suggestions
async function fetchSuggestedQuotes(count) {
  try {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(fetch(API_URL).then(res => res.json()));
    }
    
    const results = await Promise.all(promises);
    const newQuotes = results
      .filter(data => data.quote)
      .map(data => data.quote)
      .filter(quote => quote !== currentQuote && !suggestedQuotes.includes(quote));
    
    suggestedQuotes.push(...newQuotes);
    renderSuggestedQuotes();
    
  } catch (error) {
    console.error("Error fetching suggested quotes:", error);
  }
}

// Load more suggested quotes
async function loadMoreQuotes() {
  loadMoreBtn.disabled = true;
  loadMoreText.classList.add("hidden");
  loadMoreLoader.classList.remove("hidden");
  
  await fetchSuggestedQuotes(LOAD_MORE_COUNT);
  
  loadMoreBtn.disabled = false;
  loadMoreText.classList.remove("hidden");
  loadMoreLoader.classList.add("hidden");
}

// Render suggested quotes
function renderSuggestedQuotes() {
  if (suggestedQuotes.length === 0) {
    suggestedBox.classList.add("hidden");
    return;
  }
  
  suggestedBox.classList.remove("hidden");
  suggestedList.innerHTML = "";
  
  suggestedQuotes.forEach((quote, index) => {
    const card = document.createElement("div");
    card.className = "suggested-card";
    card.innerHTML = `
      <div class="suggested-number">${index + 1}</div>
      <p class="suggested-text">${quote}</p>
      <div class="suggested-actions">
        <button class="btn-icon" data-action="use" data-index="${index}" title="Use this quote">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button class="btn-icon" data-action="copy" data-index="${index}" title="Copy quote">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    `;
    
    suggestedList.appendChild(card);
  });
  
  // Add event listeners to action buttons
  document.querySelectorAll(".suggested-card .btn-icon").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const index = parseInt(btn.dataset.index);
      const quote = suggestedQuotes[index];
      
      if (action === "use") {
        currentQuote = quote;
        displayQuote(quote);
        addToHistory(quote);
        enableActions();
        showStatus("Quote loaded from suggestions");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (action === "copy") {
        navigator.clipboard.writeText(quote).then(() => {
          showStatus("✓ Copied to clipboard!");
        }).catch(() => {
          showStatus("Failed to copy");
        });
      }
    });
  });
}

// Display Quote with Animation
function displayQuote(quote) {
  quoteText.style.opacity = "0";
  
  setTimeout(() => {
    quoteText.textContent = quote;
    quoteText.style.opacity = "1";
  }, 200);
}

// Copy to Clipboard
async function copyQuote() {
  if (!currentQuote) return;
  
  try {
    await navigator.clipboard.writeText(currentQuote);
    showStatus("✓ Copied to clipboard!");
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = currentQuote;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand("copy");
      showStatus("✓ Copied to clipboard!");
    } catch (err) {
      showStatus("Failed to copy");
    }
    
    document.body.removeChild(textArea);
  }
}

// Share Quote
async function shareQuote() {
  if (!currentQuote) return;
  
  const shareData = {
    title: "Kanye Quote",
    text: `"${currentQuote}" — Kanye West`,
  };
  
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      showStatus("✓ Shared successfully!");
    } else {
      // Fallback: copy to clipboard
      await copyQuote();
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Error sharing:", error);
      showStatus("Failed to share");
    }
  }
}

// History Management
function loadHistory() {
  const saved = localStorage.getItem("kanye_history");
  if (saved) {
    try {
      quoteHistory = JSON.parse(saved);
      renderHistory();
    } catch (e) {
      quoteHistory = [];
    }
  }
}

function addToHistory(quote) {
  // Avoid duplicates at the top
  if (quoteHistory[0] === quote) return;
  
  quoteHistory.unshift(quote);
  
  // Keep only MAX_HISTORY items
  if (quoteHistory.length > MAX_HISTORY) {
    quoteHistory = quoteHistory.slice(0, MAX_HISTORY);
  }
  
  localStorage.setItem("kanye_history", JSON.stringify(quoteHistory));
  renderHistory();
}

function renderHistory() {
  if (quoteHistory.length === 0) {
    historyBox.classList.add("hidden");
    return;
  }
  
  historyBox.classList.remove("hidden");
  historyList.innerHTML = "";
  
  quoteHistory.forEach((quote, index) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <span class="history-number">${index + 1}</span>
      <p class="history-quote">${quote}</p>
    `;
    
    item.addEventListener("click", () => {
      currentQuote = quote;
      displayQuote(quote);
      enableActions();
      showStatus("Quote loaded from history");
    });
    
    historyList.appendChild(item);
  });
}

function clearHistory() {
  if (confirm("Clear all quote history?")) {
    quoteHistory = [];
    localStorage.removeItem("kanye_history");
    historyBox.classList.add("hidden");
    showStatus("History cleared");
  }
}

// Event Listeners
getQuoteBtn.addEventListener("click", fetchQuote);
copyBtn.addEventListener("click", copyQuote);
shareBtn.addEventListener("click", shareQuote);
themeToggle.addEventListener("click", toggleTheme);
clearHistoryBtn.addEventListener("click", clearHistory);
loadMoreBtn.addEventListener("click", loadMoreQuotes);

// Keyboard Shortcuts
document.addEventListener("keydown", (e) => {
  // Space or Enter = new quote
  if ((e.key === " " || e.key === "Enter") && !getQuoteBtn.disabled && e.target === document.body) {
    e.preventDefault();
    fetchQuote();
  }
  
  // Ctrl/Cmd + C = copy
  if ((e.ctrlKey || e.metaKey) && e.key === "c" && currentQuote && e.target === document.body) {
    e.preventDefault();
    copyQuote();
  }
});

// Initialize
initTheme();
loadHistory();

// Auto-fetch first quote
fetchQuote();