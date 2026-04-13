/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");

// Store selected products with full data
let allProducts = [];
let conversationHistory = [];

// 1. Replace this with your actual Cloudflare Worker URL
const WORKER_URL = "https://loreal-chatbot-worker.wilkinsonmp.workers.dev";
/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;
// 1. Load from storage immediately
let selectedProducts = JSON.parse(localStorage.getItem("selectedLorealProducts")) || [];

// 2. Wrap your display logic to highlight saved items
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      if (products.length === 0) {
        productsContainer.innerHTML = `
            <div class="placeholder-message">
                No products found matching your search.
            </div>`;
        return;
    }
      // Check if this product was already in our saved list
      const isSelected = selectedProducts.some(p => p.id === product.id);
      
      return `
        <div class="product-card ${isSelected ? 'selected' : ''}" 
             data-product-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p class="brand">${product.brand}</p>
            <p class="description">${product.description}</p>
            <button class="learn-more-btn" onclick="openProductModal(...)">Learn More</button>
          </div>
        </div>
      `;
    })
    .join("");
    
    // ... keep your existing click handler logic below this ...
}
// Initialize selected products display
updateSelectedDisplay();

// Load all products on page load for reference
loadProducts().then(products => {
  allProducts = products;
});

/* Load product data from JSON file */
async function loadProducts() {
  try {
    const response = await fetch("products.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Could not load products.json`);
    }
    const data = await response.json();
    console.log("Products loaded:", data.products.length, "items");
    return data.products;
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML = `<p style="color: red; padding: 20px;">Error loading products: ${error.message}</p>`;
    return [];
  }
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-product-id="${product.id}" data-product-name="${product.name}" data-product-brand="${product.brand}" style="cursor: pointer;">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p class="brand">${product.brand}</p>
        <p class="description">${product.description}</p>
        <button class="learn-more-btn" onclick="openProductModal(  ${product.id},  '${product.name.replace(/'/g, "\\'")}',  '${product.brand.replace(/'/g, "\\'")}',  '${product.image}',  '${product.description.replace(/'/g, "\\'")}')">Learn More</button>
      </div>
    </div>
  `
    )
    .join("");
  
  // Add click handlers to product cards
  document.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", (e) => {
      // Don't trigger selection if clicking Learn More button
      if (e.target.closest(".learn-more-btn")) return;
      
      const productId = card.getAttribute("data-product-id");
      const product = allProducts.find(p => p.id === parseInt(productId));
      
      if (product) {
        toggleProductSelection(product);
        card.classList.toggle("selected");
        updateSelectedDisplay();
      }
    });
  });
}

/* Open product modal */
function openProductModal(id, name, brand, image, description) {
  const modal = document.getElementById("productModal");
  const modalImage = document.getElementById("modalProductImage");
  const modalName = document.getElementById("modalProductName");
  const modalBrand = document.getElementById("modalProductBrand");
  const modalDescription = document.getElementById("modalProductDescription");
  
  modalImage.src = image;
  modalImage.alt = name;
  modalName.textContent = name;
  modalBrand.textContent = brand;
  modalDescription.textContent = description;
  
  modal.style.display = "flex";
  
  // Update the action button to select this product
  const actionBtn = document.querySelector(".select-from-modal-btn");
  actionBtn.textContent = "Add to Selection";
  actionBtn.onclick = () => {
    const product = allProducts.find(p => p.id === parseInt(id));
    if (product) {
      toggleProductSelection(product);
      const card = document.querySelector(`[data-product-id="${id}"]`);
      if (card && !card.classList.contains("selected")) {
        card.classList.add("selected");
      }
      updateSelectedDisplay();
    }
    closeProductModal();
  };
}

/* Close product modal */
function closeProductModal() {
  const modal = document.getElementById("productModal");
  modal.style.display = "none";
}

/* Close modal if clicking outside */
window.addEventListener("click", (event) => {
  const modal = document.getElementById("productModal");
  if (event.target === modal) {
    closeProductModal();
  }
});

/* Toggle product selection */
function toggleProductSelection(product) {
  const existingIndex = selectedProducts.findIndex(p => p.id === product.id);
  
  if (existingIndex > -1) {
    selectedProducts.splice(existingIndex, 1);
  } else {
    selectedProducts.push(product);
  }

  // SAVE TO LOCAL STORAGE
  localStorage.setItem("selectedLorealProducts", JSON.stringify(selectedProducts));
}

/* Update the selected products display */
function updateSelectedDisplay() {
  const selectedCountElement = document.querySelector('.selected-products h2');
  const count = selectedProducts.length;
  
  if (selectedCountElement) {
    selectedCountElement.textContent = `Selected Products (${count})`;
  }
  
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = '<p style="color: #999;">No products selected</p>';
  } else {
    selectedProductsList.innerHTML = selectedProducts
      .map(product => `
        <div class="selected-product-item">
          <span>${product.name} (${product.brand})</span>
          <button class="remove-btn" onclick="removeSelectedProduct('${product.id}')">×</button>
        </div>
      `)
      .join("");
  }
}

const searchInput = document.getElementById("productSearch");

// Function to handle both category and text search
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;

    const filteredProducts = allProducts.filter((product) => {
        // Check if category matches (if one is selected)
        const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
        
        // Check if name or description contains the search term
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                              product.description.toLowerCase().includes(searchTerm);

        return matchesCategory && matchesSearch;
    });

    displayProducts(filteredProducts);
}

// Listen for typing in the search box
searchInput.addEventListener("input", applyFilters);

// Listen for changes in the dropdown
categoryFilter.addEventListener("change", applyFilters);

function removeSelectedProduct(id) {
  // 1. Filter out the item
  selectedProducts = selectedProducts.filter(p => p.id !== parseInt(id));
  
  // 2. Save the new, shorter list to localStorage
  localStorage.setItem("selectedLorealProducts", JSON.stringify(selectedProducts));

  // 3. Visually un-highlight the card if it's currently on screen
  const card = document.querySelector(`[data-product-id="${id}"]`);
  if (card) {
    card.classList.remove("selected");
  }

  // 4. Refresh the "Selected Products" sidebar
  updateSelectedDisplay();
}


const historyModal = document.getElementById("historyModal");
const historyContent = document.getElementById("historyContent");
const historyBtn = document.getElementById("historyBtn");

// Function to save chat to LocalStorage
function saveToHistory(role, text) {
    let history = JSON.parse(localStorage.getItem("chatHistory")) || [];
    history.push({ role, text, timestamp: new Date().toLocaleString() });
    localStorage.setItem("chatHistory", JSON.stringify(history));
}

// Function to open Modal
historyBtn.onclick = () => {
    const history = JSON.parse(localStorage.getItem("chatHistory")) || [];
    historyModal.style.display = "flex";
    
    if (history.length === 0) {
        historyContent.innerHTML = "<p style='text-align:center; padding:20px;'>No history found.</p>";
    } else {
        historyContent.innerHTML = history.map(item => `
            <div class="history-item">
                <strong>${item.role === 'user' ? 'YOU' : 'AI'} - ${item.timestamp}</strong>
                <p>${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}</p>
            </div>
        `).join('');
    }
};
function clearAllSelections() {
  // 1. Wipe the array
  selectedProducts = [];

  // 2. Wipe the storage
  localStorage.removeItem("selectedLorealProducts");

  // 3. Remove highlights from all visible cards
  document.querySelectorAll(".product-card").forEach(card => {
    card.classList.remove("selected");
  });

  // 4. Update the UI
  updateSelectedDisplay();
}

// Attach the event listener (put this with your other listeners)
document.getElementById("clearAllBtn")?.addEventListener("click", clearAllSelections);
// Close Modal
function closeHistory() {
    historyModal.style.display = "none";
}

// Clear History
function clearHistory() {
    localStorage.removeItem("chatHistory");
    closeHistory();
}

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userText = userInput.value;
    if (!userText) return;

    userInput.value = "";

    // 1. Add User message to UI
    chatWindow.innerHTML += `<div class="msg user"><strong>You:</strong> ${userText}</div>`;
    
    // 2. Add User message to the History Array
    conversationHistory.push({ role: "user", content: userText });

    // Scroll and show loading
    chatWindow.scrollTop = chatWindow.scrollHeight;
    const loadingMsg = document.createElement("div");
    loadingMsg.className = "msg ai";
    loadingMsg.textContent = "AI is thinking...";
    chatWindow.appendChild(loadingMsg);

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                // SEND THE FULL HISTORY + SYSTEM PROMPT
                messages: [
                    { 
                      
                        role: "system", 
                             content: `You are a L'Oréal Prestige Beauty Concierge. 
        1. You provide advice EXCLUSIVELY on skincare, haircare, makeup, and fragrance.
        2. If a routine was previously generated, prioritize those specific products in your follow-up answers.
        3. Use a sophisticated, helpful, and professional tone.
        4. If the user asks about unrelated topics, politely redirect back to beauty.
        5.Please act as a Senior Beauty Consultant. Analyze these selected products and write a comprehensive 'Masterclass' routine. Go into great detail for each step and include a 'Pro Tip' section for each category.`
                    },
                    ...conversationHistory // Spreads the history into the request
                    
                ],
                max_tokens: 1000 // Ensure a long response as requested
            }),
        });

        const data = await response.json();
        chatWindow.removeChild(loadingMsg);

        if (data.choices && data.choices[0]) {
            const aiText = data.choices[0].message.content;

            // 3. Add AI response to UI
            chatWindow.innerHTML += `<div class="msg ai"><strong>AI:</strong> ${aiText}</div>`;
            
            // 4. Add AI response to the History Array so it remembers next time
            conversationHistory.push({ role: "assistant", content: aiText });

            // Save to your existing localStorage history function
            saveToHistory("ai", aiText);
        }
    } catch (error) {
        console.error("Error:", error);
        loadingMsg.textContent = "I'm having trouble connecting. Please try again.";
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
});




/* Handle "Generate Routine" button */
document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generateRoutine");
  if (generateBtn) {
    generateBtn.addEventListener("click", generateRoutine);
  }
});

async function generateRoutine() {
  // Check if products are selected
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `
      <div class="msg ai" style="color: #FF003B; font-weight: bold;">
        <strong>Please select at least one product before generating a routine!</strong>
      </div>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }

  // Format product data for the routine
  const productsList = selectedProducts.map(product => 
    `• ${product.name} (${product.brand}) - ${product.category}\n  ${product.description}`
  ).join("\n\n");

  const routinePrompt = `Based on the following L'Oréal products that the user has selected, create a personalized beauty routine. Provide specific steps and tips for using these products effectively together.\n\nSelected Products:\n${productsList}`;

  // Add user's routine request to chat
  chatWindow.innerHTML += `
    <div class="msg user">
      <strong>You:</strong> Generate my personalized routine with these products
    </div>
  `;

  // Show loading message
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "msg ai";
  loadingMsg.textContent = "AI is creating your personalized routine...";
  chatWindow.appendChild(loadingMsg);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Make request to OpenAI API
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a L'Oréal beauty expert. Create personalized, step-by-step beauty routines using L'Oréal products. Be specific about the order of application, frequency of use, and tips for best results. Format your response clearly with numbered steps."
          },
          { role: "user", content: routinePrompt }
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Remove loading message
    chatWindow.removeChild(loadingMsg);

    // Get AI response
    const aiText = data.choices[0].message.content;

    // Add routine to chat window
    chatWindow.innerHTML += `
      <div class="msg ai">
        <strong>Your Personalized Routine:</strong><br>
        ${aiText.replace(/\n/g, "<br>")}
      </div>
    `;

    // Save to history
    saveToHistory("user", "Generate my personalized routine with selected products");
    saveToHistory("ai", aiText);

    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    console.error("Error generating routine:", error);
    if (loadingMsg && loadingMsg.parentNode === chatWindow) {
      chatWindow.removeChild(loadingMsg);
    }
    chatWindow.innerHTML += `
      <div class="msg ai" style="color: #FF003B;">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}
