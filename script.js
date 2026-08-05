/*
  Replace the placeholder below with your deployed Cloudflare Worker URL.
  Example: https://loreal-advisor.your-name.workers.dev
*/
const WORKER_URL = "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE";

const STORAGE_KEY = "lorealSelectedProductIds";
const DIRECTION_KEY = "lorealTextDirection";

const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productCount = document.getElementById("productCount");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById(
  "selectedProductsList"
);
const clearSelectionsButton = document.getElementById("clearSelections");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendBtn");
const webSearchToggle = document.getElementById("webSearchToggle");
const directionToggle = document.getElementById("directionToggle");
const currentYear = document.getElementById("currentYear");

let allProducts = [];
let selectedIds = new Set(loadSavedSelectionIds());
let conversationHistory = [];
let routineGenerated = false;
let requestInProgress = false;

/* Load previously selected products from localStorage */
function loadSavedSelectionIds() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(saved)
      ? saved.map(Number).filter(Number.isFinite)
      : [];
  } catch (error) {
    console.warn("Could not read saved products:", error);
    return [];
  }
}

/* Save selected product IDs to localStorage */
function saveSelections() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...selectedIds])
  );
}

/* Protect product text before placing it inside HTML */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Get the complete product objects for selected products */
function getSelectedProducts() {
  return allProducts.filter((product) =>
    selectedIds.has(product.id)
  );
}

/* Make category names look cleaner */
function formatCategory(category) {
  return category.replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

/* Load products from products.json */
async function loadProducts() {
  productsContainer.innerHTML = `
    <div class="placeholder-message">
      Loading products…
    </div>
  `;

  try {
    const response = await fetch("products.json");

    if (!response.ok) {
      throw new Error(
        `Product file returned ${response.status}.`
      );
    }

    const data = await response.json();

    allProducts = Array.isArray(data.products)
      ? data.products
      : [];

    /*
      Remove saved IDs that no longer exist
      in the product data.
    */
    const validIds = new Set(
      allProducts.map((product) => product.id)
    );

    selectedIds = new Set(
      [...selectedIds].filter((id) => validIds.has(id))
    );

    saveSelections();
    renderProducts();
    renderSelectedProducts();
  } catch (error) {
    console.error(error);

    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Products could not be loaded. Run the project through
        Codespaces, Live Server, or another local web server
        instead of opening the HTML file directly.
      </div>
    `;
  } finally {
    productsContainer.setAttribute("aria-busy", "false");
  }
}

/* Apply both category and keyword filters */
function getFilteredProducts() {
  const selectedCategory = categoryFilter.value;
  const query = productSearch.value
    .trim()
    .toLowerCase();

  return allProducts.filter((product) => {
    const categoryMatches =
      !selectedCategory ||
      product.category === selectedCategory;

    const searchableText = [
      product.name,
      product.brand,
      product.category,
      product.description,
    ]
      .join(" ")
      .toLowerCase();

    const searchMatches =
      !query || searchableText.includes(query);

    return categoryMatches && searchMatches;
  });
}

/* Display product cards */
function renderProducts() {
  const products = getFilteredProducts();

  productCount.textContent =
    `${products.length} of ${allProducts.length} products`;

  if (!products.length) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products match those filters.
        Try another category or search term.
      </div>
    `;

    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedIds.has(product.id);

      return `
        <article
          class="product-card${isSelected ? " selected" : ""}"
          data-product-id="${product.id}"
          tabindex="0"
          role="button"
          aria-pressed="${isSelected}"
          aria-label="${
            isSelected ? "Unselect" : "Select"
          } ${escapeHtml(product.name)}"
        >
          <div class="product-image-wrap">
            <img
              src="${escapeHtml(product.image)}"
              alt="${escapeHtml(product.brand)}
              ${escapeHtml(product.name)}"
              loading="lazy"
            />

            <span
              class="selection-badge"
              aria-hidden="true"
            >
              <i class="fa-solid ${
                isSelected ? "fa-check" : "fa-plus"
              }"></i>
            </span>
          </div>

          <div class="product-info">
            <p class="product-brand">
              ${escapeHtml(product.brand)}
            </p>

            <h3>
              ${escapeHtml(product.name)}
            </h3>

            <p class="product-category">
              ${escapeHtml(
                formatCategory(product.category)
              )}
            </p>

            <button
              class="description-toggle"
              type="button"
              aria-expanded="false"
              aria-controls="description-${product.id}"
              data-description-toggle="${product.id}"
            >
              View description
            </button>

            <p
              id="description-${product.id}"
              class="product-description"
              hidden
            >
              ${escapeHtml(product.description)}
            </p>
          </div>
        </article>
      `;
    })
    .join("");
}

/* Display selected products */
function renderSelectedProducts() {
  const selectedProducts = getSelectedProducts();

  if (!selectedProducts.length) {
    selectedProductsList.innerHTML = `
      <p class="selected-empty">
        Nothing selected yet. Click any product card
        to add it to your routine.
      </p>
    `;
  } else {
    selectedProductsList.innerHTML = selectedProducts
      .map(
        (product) => `
          <div class="selected-chip">
            <span>
              ${escapeHtml(product.brand)}
              ·
              ${escapeHtml(product.name)}
            </span>

            <button
              class="remove-selected"
              type="button"
              data-remove-id="${product.id}"
              aria-label="Remove ${escapeHtml(product.name)}"
            >
              <i
                class="fa-solid fa-xmark"
                aria-hidden="true"
              ></i>
            </button>
          </div>
        `
      )
      .join("");
  }

  clearSelectionsButton.disabled =
    selectedProducts.length === 0;

  generateRoutineButton.disabled =
    selectedProducts.length === 0 ||
    requestInProgress;
}

/* Select or unselect a product */
function toggleProduct(productId) {
  if (selectedIds.has(productId)) {
    selectedIds.delete(productId);
  } else {
    selectedIds.add(productId);
  }

  saveSelections();
  renderProducts();
  renderSelectedProducts();
}

/* Open or close a product description */
function toggleDescription(button) {
  const descriptionId =
    button.getAttribute("aria-controls");

  const description =
    document.getElementById(descriptionId);

  const isExpanded =
    button.getAttribute("aria-expanded") === "true";

  button.setAttribute(
    "aria-expanded",
    String(!isExpanded)
  );

  button.textContent = isExpanded
    ? "View description"
    : "Hide description";

  description.hidden = isExpanded;
}

/* Add a message to the chat window */
function appendMessage(role, text, citations = []) {
  const message = document.createElement("div");

  message.className =
    `message ${role}-message`;

  const label = document.createElement("div");
  label.className = "message-label";

  label.textContent =
    role === "user"
      ? "You"
      : "L'Oréal Advisor";

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  message.append(label, paragraph);

  const safeCitations = Array.isArray(citations)
    ? citations.filter(
        (citation) =>
          citation &&
          /^https?:\/\//i.test(citation.url || "")
      )
    : [];

  if (safeCitations.length) {
    const sources = document.createElement("div");
    sources.className = "message-sources";

    safeCitations
      .slice(0, 6)
      .forEach((citation, index) => {
        const link = document.createElement("a");

        link.href = citation.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        link.textContent =
          citation.title || `Source ${index + 1}`;

        sources.append(link);
      });

    message.append(sources);
  }

  chatWindow.append(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return message;
}

/* Display animated typing dots */
function showTypingIndicator() {
  const message = document.createElement("div");

  message.className =
    "message assistant-message";

  message.id = "typingIndicator";

  message.innerHTML = `
    <div class="message-label">
      L'Oréal Advisor
    </div>

    <div
      class="typing-dots"
      aria-label="Advisor is typing"
    >
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  chatWindow.append(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Remove typing animation */
function removeTypingIndicator() {
  document
    .getElementById("typingIndicator")
    ?.remove();
}

/* Check whether the Worker URL was added */
function isWorkerConfigured() {
  return (
    WORKER_URL.startsWith("https://") &&
    !WORKER_URL.includes(
      "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE"
    )
  );
}

/* Enable or disable controls during an API request */
function setRequestState(isLoading) {
  requestInProgress = isLoading;

  generateRoutineButton.disabled =
    isLoading || selectedIds.size === 0;

  clearSelectionsButton.disabled =
    isLoading || selectedIds.size === 0;

  userInput.disabled =
    isLoading || !routineGenerated;

  sendButton.disabled =
    isLoading || !routineGenerated;

  const buttonLabel =
    generateRoutineButton.querySelector("span");

  buttonLabel.textContent = isLoading
    ? "Building Your Routine…"
    : "Generate My Routine";
}

/* Send data to the Cloudflare Worker */
async function callWorker(payload) {
  if (!isWorkerConfigured()) {
    throw new Error(
      "Add your deployed Cloudflare Worker URL " +
      "to WORKER_URL near the top of script.js."
    );
  }

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error(
      "The Worker returned an unreadable response."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Request failed with status ${response.status}.`
    );
  }

  if (!data.reply) {
    throw new Error(
      "The Worker response did not include a reply."
    );
  }

  return data;
}

/* Generate an AI routine */
async function generateRoutine() {
  const selectedProducts = getSelectedProducts();

  if (
    !selectedProducts.length ||
    requestInProgress
  ) {
    return;
  }

  const routinePrompt =
    `Create a personalized routine using these ` +
    `selected products: ${selectedProducts
      .map(
        (product) =>
          `${product.brand} ${product.name}`
      )
      .join(", ")}.`;

  appendMessage("user", routinePrompt);
  setRequestState(true);
  showTypingIndicator();

  try {
    const data = await callWorker({
      action: "generate_routine",
      selectedProducts,
      messages: conversationHistory,
      webSearch: webSearchToggle.checked,
    });

    conversationHistory = [
      {
        role: "user",
        content: routinePrompt,
      },
      {
        role: "assistant",
        content: data.reply,
      },
    ];

    routineGenerated = true;

    appendMessage(
      "assistant",
      data.reply,
      data.citations
    );

    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  } catch (error) {
    appendMessage(
      "assistant",
      `I couldn't generate the routine. ${error.message}`
    );
  } finally {
    removeTypingIndicator();
    setRequestState(false);
  }
}

/* Send a follow-up question */
async function sendFollowUp(messageText) {
  if (
    !routineGenerated ||
    requestInProgress
  ) {
    return;
  }

  appendMessage("user", messageText);

  conversationHistory.push({
    role: "user",
    content: messageText,
  });

  setRequestState(true);
  showTypingIndicator();

  try {
    const data = await callWorker({
      action: "chat",
      selectedProducts: getSelectedProducts(),
      messages: conversationHistory,
      webSearch: webSearchToggle.checked,
    });

    conversationHistory.push({
      role: "assistant",
      content: data.reply,
    });

    appendMessage(
      "assistant",
      data.reply,
      data.citations
    );
  } catch (error) {
    conversationHistory.pop();

    appendMessage(
      "assistant",
      `I couldn't answer that question. ${error.message}`
    );
  } finally {
    removeTypingIndicator();
    setRequestState(false);
    userInput.focus();
  }
}

/* Product card click handling */
productsContainer.addEventListener(
  "click",
  (event) => {
    const descriptionButton = event.target.closest(
      "[data-description-toggle]"
    );

    if (descriptionButton) {
      event.stopPropagation();
      toggleDescription(descriptionButton);
      return;
    }

    const card = event.target.closest(
      "[data-product-id]"
    );

    if (card) {
      toggleProduct(
        Number(card.dataset.productId)
      );
    }
  }
);

/* Allow keyboard product selection */
productsContainer.addEventListener(
  "keydown",
  (event) => {
    if (
      event.target.closest(
        "[data-description-toggle]"
      )
    ) {
      return;
    }

    const card = event.target.closest(
      "[data-product-id]"
    );

    if (
      card &&
      (event.key === "Enter" ||
        event.key === " ")
    ) {
      event.preventDefault();

      toggleProduct(
        Number(card.dataset.productId)
      );
    }
  }
);

/* Remove products from the selected list */
selectedProductsList.addEventListener(
  "click",
  (event) => {
    const removeButton = event.target.closest(
      "[data-remove-id]"
    );

    if (removeButton) {
      toggleProduct(
        Number(removeButton.dataset.removeId)
      );
    }
  }
);

/* Category filtering */
categoryFilter.addEventListener(
  "change",
  renderProducts
);

/* Product keyword search */
productSearch.addEventListener(
  "input",
  renderProducts
);

/* Generate routine button */
generateRoutineButton.addEventListener(
  "click",
  generateRoutine
);

/* Clear all selected products */
clearSelectionsButton.addEventListener(
  "click",
  () => {
    selectedIds.clear();
    saveSelections();
    renderProducts();
    renderSelectedProducts();
  }
);

/* Follow-up chat submission */
chatForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    const messageText =
      userInput.value.trim();

    if (!messageText) {
      return;
    }

    userInput.value = "";
    sendFollowUp(messageText);
  }
);

/* Change between left-to-right and right-to-left layouts */
directionToggle.addEventListener(
  "click",
  () => {
    const nextDirection =
      document.documentElement.dir === "rtl"
        ? "ltr"
        : "rtl";

    document.documentElement.dir =
      nextDirection;

    localStorage.setItem(
      DIRECTION_KEY,
      nextDirection
    );

    directionToggle.querySelector(
      "span"
    ).textContent =
      nextDirection === "rtl"
        ? "LTR layout"
        : "RTL layout";
  }
);

/* Restore the saved layout direction */
function initializeDirection() {
  const savedDirection =
    localStorage.getItem(DIRECTION_KEY);

  const direction =
    savedDirection === "rtl"
      ? "rtl"
      : "ltr";

  document.documentElement.dir = direction;

  directionToggle.querySelector(
    "span"
  ).textContent =
    direction === "rtl"
      ? "LTR layout"
      : "RTL layout";
}

/* Start the application */
currentYear.textContent =
  new Date().getFullYear();

initializeDirection();
loadProducts();