// State variables
let state = {
    items: [],
    transactions: [],
    companies: [],
    shop: {
        name: "DEESHMA STATIONERY",
        address: "2/179, East Street, Kallapalayam, Coimbatore - 641 201.",
        phone: "0422-225 2159, Mobile: 936393 2159",
        email: "deeshmastationery@gmail.com",
        msme: "UDYAM-TN-03-0205844",
        gstin: "33ALDPV4275A1ZA",
        bankName: "STATE BANK OF INDIA",
        bankBranch: "Chettipalayam Branch",
        bankAcc: "42936723322",
        bankIfsc: "SBIN0002208",
        upi: "deeshmastationery@okaxis",
        lowStockThreshold: 5
    }
};

let cart = [];
let activeTab = 'dashboard';
let selectedProductForStock = null;
let selectedProductForPrice = null;
let authToken = localStorage.getItem("deerash_shop_token") || "";

// Initialize the Application
document.addEventListener("DOMContentLoaded", async () => {
    await loadDatabase();
    bindEvents();
    renderAll();
    updateLiveDate();
    lucide.createIcons();
});

// Load data from localStorage
async function loadDatabase() {
    const loginScreen = document.getElementById("login-screen");
    if (!authToken) {
        if (loginScreen) loginScreen.classList.remove("hidden");
        return;
    }

    try {
        const response = await fetch('/api/state', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.status === 401) {
            authToken = "";
            localStorage.removeItem("deerash_shop_token");
            if (loginScreen) loginScreen.classList.remove("hidden");
            return;
        }

        const resData = await response.json();
        
        if (resData && resData.status === 'success' && resData.state) {
            state = resData.state;
            if (!state.shop) state.shop = {};
            if (!state.companies) state.companies = [];
            
            // Rebrand default migrations
            if (state.shop.name === "Deerash Shop") state.shop.name = "DEESHMA STATIONERY";
            if (state.shop.address === "123 Main Bazaar Road, Ground Floor, Business Hub") state.shop.address = "2/179, East Street, Kallapalayam, Coimbatore - 641 201.";
            if (state.shop.phone === "+91 98765 43210") state.shop.phone = "0422-225 2159, Mobile: 936393 2159";
            if (state.shop.gstin === "33AAAAA0000A1Z2") state.shop.gstin = "33ALDPV4275A1ZA";
            
            state.shop.name = state.shop.name || "DEESHMA STATIONERY";
            state.shop.address = state.shop.address || "2/179, East Street, Kallapalayam, Coimbatore - 641 201.";
            state.shop.phone = state.shop.phone || "0422-225 2159, Mobile: 936393 2159";
            state.shop.email = state.shop.email || "deeshmastationery@gmail.com";
            state.shop.msme = state.shop.msme || "UDYAM-TN-03-0205844";
            state.shop.gstin = state.shop.gstin || "33ALDPV4275A1ZA";
            state.shop.bankName = state.shop.bankName || "STATE BANK OF INDIA";
            state.shop.bankBranch = state.shop.bankBranch || "Chettipalayam Branch";
            state.shop.bankAcc = state.shop.bankAcc || "42936723322";
            state.shop.bankIfsc = state.shop.bankIfsc || "SBIN0002208";
            state.shop.upi = state.shop.upi || "deeshmastationery@okaxis";
            state.shop.lowStockThreshold = parseInt(state.shop.lowStockThreshold) || 5;

            // Migration: Ensure all items have an HSN code if missing
            if (state.items && Array.isArray(state.items)) {
                state.items.forEach(item => {
                    if (item.hsn === undefined || item.hsn === null) {
                        item.hsn = "0000";
                    }
                });
            }

            // Migration: Sanitize and sequence all existing transactions
            sanitizeInvoiceNumbers();
            if (loginScreen) loginScreen.classList.add("hidden");
        } else {
            console.log("No existing MongoDB state found. Initializing mock data...");
            initializeMockData();
            if (loginScreen) loginScreen.classList.add("hidden");
        }
    } catch (e) {
        console.error("Failed to load database from MongoDB, resetting.", e);
        initializeMockData();
        if (loginScreen) loginScreen.classList.add("hidden");
    }
}

// Sanitize invoice numbers to be in sequential order 1, 2, 3...
function sanitizeInvoiceNumbers() {
    if (!state.transactions || !Array.isArray(state.transactions)) {
        state.transactions = [];
        return;
    }
    let modified = false;
    // Sort transactions by timestamp ascending to determine correct order
    const sorted = [...state.transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    sorted.forEach((t, index) => {
        const expectedId = `${index + 1}`;
        if (t.id !== expectedId) {
            t.id = expectedId;
            // Also update deliveryNote if it matches the old ID, was empty, or is not a valid custom number
            if (!t.deliveryNote || isNaN(t.deliveryNote)) {
                t.deliveryNote = expectedId;
            }
            modified = true;
        }
    });

    if (modified) {
        saveDatabase();
    }
}

// Populate with rich mock data for first impressions
function initializeMockData() {
    state.items = [
        { id: "1", name: "Accounts note, 2Q with index", hsn: "9612", qty: 50, buyRate: 110.00, sellRate: 176.25, gstRate: 18 },
        { id: "2", name: "Box File, big, AJS", hsn: "4820", qty: 40, buyRate: 60.00, sellRate: 93.00, gstRate: 18 },
        { id: "3", name: "White Paper A4, 80gsm, Sprint plus", hsn: "4802", qty: 60, buyRate: 150.00, sellRate: 227.00, gstRate: 18 },
        { id: "4", name: "Ledger Paper A4, 90gsm, JK", hsn: "4802", qty: 20, buyRate: 220.00, sellRate: 340.00, gstRate: 18 },
        { id: "5", name: "Pen, Uniball, Blue & Orange", hsn: "9608", qty: 100, buyRate: 42.00, sellRate: 63.50, gstRate: 18 },
        { id: "6", name: "Permanent Marker, Blue", hsn: "9608", qty: 80, buyRate: 9.00, sellRate: 13.50, gstRate: 18 },
        { id: "7", name: "Paint Marker, Yellow & white", hsn: "9608", qty: 110, buyRate: 25.00, sellRate: 37.45, gstRate: 18 }
    ];
    state.transactions = [
        {
            id: "1",
            timestamp: new Date("2026-03-30T12:00:00Z").toISOString(),
            customerName: "M/s. Vidhya Technologies",
            customerPhone: "",
            customerAddress: "1/137 B, Annachi Thottam, Chinthamanipudur, Trichy Road, Coimbatore - 641 103.",
            customerGstin: "33 AGVPM2823N 1ZV",
            orderNo: "verbal order",
            orderDate: "29.03.2026",
            deliveryNote: "1",
            paymentTerms: "against delivery",
            dispatchMode: "collected by you",
            items: [
                { id: "1", name: "Accounts note, 2Q with index", hsn: "9612", qty: 3, sellRate: 176.25, gstRate: 18, taxableValue: 528.75, gstAmount: 95.18, total: 623.93 },
                { id: "2", name: "Box File, big, AJS", hsn: "4820", qty: 15, sellRate: 93.00, gstRate: 18, taxableValue: 1395.00, gstAmount: 251.10, total: 1646.10 },
                { id: "3", name: "White Paper A4, 80gsm, Sprint plus", hsn: "4802", qty: 10, sellRate: 227.00, gstRate: 18, taxableValue: 2270.00, gstAmount: 408.60, total: 2678.60 },
                { id: "4", name: "Ledger Paper A4, 90gsm, JK", hsn: "4802", qty: 2, sellRate: 340.00, gstRate: 18, taxableValue: 680.00, gstAmount: 122.40, total: 802.40 },
                { id: "5", name: "Pen, Uniball, Blue & Orange", hsn: "9608", qty: 2, sellRate: 63.50, gstRate: 18, taxableValue: 127.00, gstAmount: 22.86, total: 149.86 },
                { id: "6", name: "Permanent Marker, Blue", hsn: "9608", qty: 10, sellRate: 13.50, gstRate: 18, taxableValue: 135.00, gstAmount: 24.30, total: 159.30 },
                { id: "7", name: "Paint Marker, Yellow & white", hsn: "9608", qty: 20, sellRate: 37.45, gstRate: 18, taxableValue: 749.00, gstAmount: 134.82, total: 883.82 }
            ],
            subtotal: 5884.75,
            gstRateOverride: 18,
            gstAmount: 1059.25,
            grandTotal: 6944.00
        }
    ];
    state.companies = [
        {
            id: "1",
            name: "M/s. Vidhya Technologies",
            address: "1/137 B, Annachi Thottam, Chinthamanipudur, Trichy Road, Coimbatore - 641 103.",
            gstNumber: "33 AGVPM2823N 1ZV"
        },
        {
            id: "2",
            name: "Anand Stationery Supplies",
            address: "42, Cross Cut Road, Gandhipuram, Coimbatore - 641 012.",
            gstNumber: "33AABCA1234F1Z1"
        }
    ];
    saveDatabase();
}

// Save data to MongoDB backend
function saveDatabase() {
    if (!authToken) return;
    fetch('/api/state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ state })
    })
    .then(response => {
        if (response.status === 401) {
            authToken = "";
            localStorage.removeItem("deerash_shop_token");
            const loginScreen = document.getElementById("login-screen");
            if (loginScreen) loginScreen.classList.remove("hidden");
        }
        return response.json();
    })
    .then(data => {
        if (data && data.status !== 'success') {
            console.error("Failed to save database to MongoDB:", data.message);
        }
    })
    .catch(e => {
        console.error("Failed to save database to MongoDB:", e);
    });
}

// Bind Page Interactions
function bindEvents() {
    // --- Authentication Events ---
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById("login-username");
            const passwordInput = document.getElementById("login-password");
            const errorMsg = document.getElementById("login-error-msg");
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: usernameInput.value,
                        password: passwordInput.value
                    })
                });
                
                const data = await response.json();
                if (response.status === 200 && data.status === 'success') {
                    authToken = data.token;
                    localStorage.setItem("deerash_shop_token", authToken);
                    errorMsg.classList.add("hidden");
                    
                    // Clear inputs
                    usernameInput.value = "";
                    passwordInput.value = "";
                    
                    // Load and render
                    await loadDatabase();
                    renderAll();
                } else {
                    errorMsg.textContent = data.message || "Invalid username or password";
                    errorMsg.classList.remove("hidden");
                }
            } catch (err) {
                console.error("Login request failed:", err);
                errorMsg.textContent = "Unable to connect to authentication server.";
                errorMsg.classList.remove("hidden");
            }
        });
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            authToken = "";
            localStorage.removeItem("deerash_shop_token");
            window.location.reload();
        });
    }

    // Navigation Tab Switching
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabName = item.getAttribute("data-tab");
            switchTab(tabName);
        });
    });

    // --- Modal Closures ---
    document.querySelectorAll(".close-modal-btn, .modal-backdrop, .btn-outline[id^='cancel-']").forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (e.target === btn || btn.classList.contains("close-modal-btn") || btn.classList.contains("btn-outline")) {
                closeAllModals();
            }
        });
    });

    // --- Product CRUD Events ---
    document.getElementById("open-add-modal-btn").addEventListener("click", () => {
        openProductModal();
    });

    const buyInput = document.getElementById("product-form-buy");
    const sellInput = document.getElementById("product-form-sell");
    const previewMargin = document.getElementById("pricing-margin-preview");

    function updateFormMargin() {
        const buyVal = parseFloat(buyInput.value) || 0;
        const sellVal = parseFloat(sellInput.value) || 0;
        const profit = sellVal - buyVal;
        const marginPct = sellVal > 0 ? (profit / sellVal) * 100 : 0;
        
        previewMargin.textContent = `₹${profit.toFixed(2)} (${marginPct.toFixed(2)}%)`;
        if (profit < 0) {
            previewMargin.className = "text-rose";
        } else {
            previewMargin.className = "text-emerald";
        }
    }

    buyInput.addEventListener("input", updateFormMargin);
    sellInput.addEventListener("input", updateFormMargin);

    document.getElementById("product-form").addEventListener("submit", (e) => {
        e.preventDefault();
        saveProduct();
    });

    // --- Fast Stock Update Events ---
    document.querySelectorAll("input[name='stock-action']").forEach(radio => {
        radio.addEventListener("change", (e) => {
            document.querySelectorAll(".stock-action-selector label").forEach(label => {
                label.classList.remove("active-chip");
            });
            e.target.closest("label").classList.add("active-chip");
        });
    });

    document.getElementById("stock-form").addEventListener("submit", (e) => {
        e.preventDefault();
        submitStockUpdate();
    });

    // --- Fast Price Update Events ---
    const fastBuyInput = document.getElementById("price-buy-input");
    const fastSellInput = document.getElementById("price-sell-input");
    const fastMarginPreview = document.getElementById("price-margin-preview");

    function updateFastMargin() {
        const buyVal = parseFloat(fastBuyInput.value) || 0;
        const sellVal = parseFloat(fastSellInput.value) || 0;
        const profit = sellVal - buyVal;
        const marginPct = sellVal > 0 ? (profit / sellVal) * 100 : 0;
        
        fastMarginPreview.textContent = `₹${profit.toFixed(2)} (${marginPct.toFixed(2)}%)`;
        if (profit < 0) {
            fastMarginPreview.className = "text-rose";
        } else {
            fastMarginPreview.className = "text-emerald";
        }
    }

    fastBuyInput.addEventListener("input", updateFastMargin);
    fastSellInput.addEventListener("input", updateFastMargin);

    document.getElementById("price-form").addEventListener("submit", (e) => {
        e.preventDefault();
        submitPriceUpdate();
    });

    // --- Inventory Search & Filters ---
    document.getElementById("inventory-search-input").addEventListener("input", renderInventoryList);
    document.getElementById("inventory-stock-filter").addEventListener("change", renderInventoryList);

    // --- Billing / POS Actions ---
    const posSearchInput = document.getElementById("pos-search-input");
    const posSearchResults = document.getElementById("pos-search-results");
    const posSearchClear = document.getElementById("pos-search-clear");

    posSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query) {
            posSearchClear.style.display = "flex";
            const filtered = state.items.filter(item => 
                (item.name || '').toLowerCase().includes(query) || 
                (item.hsn || '').toString().toLowerCase().includes(query)
            );
            renderPOSDropdown(filtered);
        } else {
            hidePOSDropdown();
        }
    });

    posSearchClear.addEventListener("click", () => {
        posSearchInput.value = "";
        hidePOSDropdown();
    });

    // Hide dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!posSearchInput.contains(e.target) && !posSearchResults.contains(e.target)) {
            hidePOSDropdown();
        }
    });

    document.getElementById("clear-cart-btn").addEventListener("click", () => {
        cart = [];
        showToast("Cart cleared", "warning");
        renderCart();
    });

    // POS Bill recalculation on GST Override change
    document.getElementById("bill-gst-percentage").addEventListener("input", calculateBillTotals);

    // POS Checkout
    document.getElementById("checkout-btn").addEventListener("click", handleCheckout);

    // --- Transactions Search ---
    document.getElementById("transaction-search-input").addEventListener("input", renderTransactionsList);

    // --- Companies CRUD & Search Events ---
    const addCompBtn = document.getElementById("open-add-company-btn");
    if (addCompBtn) {
        addCompBtn.addEventListener("click", () => {
            openCompanyModal();
        });
    }

    const compForm = document.getElementById("company-form");
    if (compForm) {
        compForm.addEventListener("submit", (e) => {
            e.preventDefault();
            saveCompany();
        });
    }

    const compSearch = document.getElementById("company-search-input");
    if (compSearch) {
        compSearch.addEventListener("input", renderCompaniesList);
    }

    // Company dropdown selection change in POS Billing
    const compSelect = document.getElementById("bill-company-select");
    if (compSelect) {
        compSelect.addEventListener("change", (e) => {
            updateSelectedCompanyPreview();
        });
    }

    // --- Settings Forms & Configs ---
    document.getElementById("shop-details-form").addEventListener("submit", (e) => {
        e.preventDefault();
        state.shop.name = document.getElementById("shop-name").value;
        state.shop.address = document.getElementById("shop-address").value;
        state.shop.phone = document.getElementById("shop-phone").value;
        state.shop.email = document.getElementById("shop-email").value;
        state.shop.msme = document.getElementById("shop-msme").value;
        state.shop.gstin = document.getElementById("shop-gstin").value;
        state.shop.bankName = document.getElementById("shop-bank-name").value;
        state.shop.bankBranch = document.getElementById("shop-bank-branch").value;
        state.shop.bankAcc = document.getElementById("shop-bank-acc").value;
        state.shop.bankIfsc = document.getElementById("shop-bank-ifsc").value;
        state.shop.upi = document.getElementById("shop-upi").value;
        state.shop.lowStockThreshold = parseInt(document.getElementById("setting-low-stock-alert").value) || 5;
        saveDatabase();
        showToast("Shop settings saved successfully", "success");
        renderDashboard();
    });

    // Backup & Reset Actions
    document.getElementById("backup-export-btn").addEventListener("click", exportDatabase);
    document.getElementById("backup-import-file").addEventListener("change", importDatabase);
    document.getElementById("clear-database-btn").addEventListener("click", clearDatabase);

    // POS Custom Price Modal Events
    const posForm = document.getElementById("pos-billing-input-form");
    if (posForm) {
        posForm.addEventListener("submit", savePOSBillingInput);
    }
    const closePosModal = document.getElementById("close-pos-billing-modal");
    if (closePosModal) {
        closePosModal.addEventListener("click", closePOSBillingModal);
    }
    const cancelPosModal = document.getElementById("cancel-pos-billing-modal");
    if (cancelPosModal) {
        cancelPosModal.addEventListener("click", closePOSBillingModal);
    }
}

// Switch tabs and trigger correct renders
function switchTab(tabName) {
    activeTab = tabName;
    
    // Manage CSS classes on navbar
    document.querySelectorAll(".nav-item").forEach(item => {
        if (item.getAttribute("data-tab") === tabName) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Show appropriate screen tab
    document.querySelectorAll(".tab-content").forEach(content => {
        content.classList.remove("active-tab");
    });
    
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.add("active-tab");
    }

    // Set page headers
    const titleEl = document.getElementById("current-view-title");
    const descEl = document.getElementById("current-view-desc");
    
    switch (tabName) {
        case 'dashboard':
            titleEl.textContent = "Dashboard Overview";
            descEl.textContent = "Real-time statistics and summary of your store.";
            renderDashboard();
            break;
        case 'billing':
            titleEl.textContent = "Point of Sale (POS)";
            descEl.textContent = "Search products, set GST rate, print invoices.";
            renderCart();
            break;
        case 'inventory':
            titleEl.textContent = "Inventory Management";
            descEl.textContent = "Add products, update stock quantities, edit purchase & sell rates.";
            renderInventoryList();
            break;
        case 'transactions':
            titleEl.textContent = "Sales History / Receipts";
            descEl.textContent = "Track generated invoices and print receipts.";
            renderTransactionsList();
            break;
        case 'companies':
            titleEl.textContent = "Companies Management";
            descEl.textContent = "Add, edit, or delete companies to select during billing.";
            renderCompaniesList();
            break;
        case 'settings':
            titleEl.textContent = "Settings & Backups";
            descEl.textContent = "Configure store details, backup database, or wipe data.";
            loadSettingsForm();
            break;
    }
    lucide.createIcons();
}

// Master Render Function
function renderAll() {
    renderDashboard();
    renderInventoryList();
    renderCart();
    renderTransactionsList();
    loadSettingsForm();
    renderCompaniesList();
    renderCompanySelect();
}

// Update Live Date display
function updateLiveDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("live-date").textContent = new Date().toLocaleDateString("en-US", options);
}

// RENDER: Dashboard tab
function renderDashboard() {
    // Unique Products
    document.getElementById("stat-total-products").textContent = state.items.length;

    // Total Stock value (buying price sum)
    const stockVal = state.items.reduce((sum, item) => sum + (item.qty * item.buyRate), 0);
    document.getElementById("stat-stock-value").textContent = `₹${stockVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Potential profit (selling rate sum - buying rate sum)
    const potentialProfit = state.items.reduce((sum, item) => sum + (item.qty * (item.sellRate - item.buyRate)), 0);
    document.getElementById("stat-potential-profit").textContent = `₹${potentialProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Today's Sales
    const today = new Date().toDateString();
    const todaySales = state.transactions
        .filter(t => new Date(t.timestamp).toDateString() === today)
        .reduce((sum, t) => sum + t.grandTotal, 0);
    document.getElementById("stat-todays-sales").textContent = `₹${todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Low Stock Alerts
    const lowStockList = document.getElementById("low-stock-list");
    lowStockList.innerHTML = "";
    
    const lowStockItems = state.items.filter(item => item.qty <= state.shop.lowStockThreshold);
    
    if (lowStockItems.length === 0) {
        lowStockList.innerHTML = `<li class="empty-state">No low stock alerts</li>`;
    } else {
        lowStockItems.forEach(item => {
            const li = document.createElement("li");
            li.className = "low-stock-item";
            li.innerHTML = `
                <div class="low-stock-item-info">
                    <strong>${item.name}</strong>
                    <span>HSN: ${item.hsn}</span>
                </div>
                <span class="low-stock-item-qty">${item.qty} units left</span>
            `;
            lowStockList.appendChild(li);
        });
    }

    // Recent Transactions
    const recentTbody = document.getElementById("recent-sales-tbody");
    recentTbody.innerHTML = "";
    
    // Sort transactions reverse chronological
    const sortedTrans = [...state.transactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
    
    if (sortedTrans.length === 0) {
        recentTbody.innerHTML = `<tr class="empty-row"><td colspan="5">No recent sales records.</td></tr>`;
    } else {
        sortedTrans.forEach(t => {
            const tr = document.createElement("tr");
            const dateObj = new Date(t.timestamp);
            const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
            const itemCount = t.items.reduce((sum, i) => sum + i.qty, 0);
            
            tr.innerHTML = `
                <td><strong>${t.id}</strong></td>
                <td>${dateStr}</td>
                <td>${t.customerName || "Walk-in Customer"}</td>
                <td class="text-right">₹${t.grandTotal.toFixed(2)}</td>
                <td class="text-right">${t.gstRateOverride}%</td>
            `;
            recentTbody.appendChild(tr);
        });
    }
}

// RENDER: Inventory List Table
function renderInventoryList() {
    const tbody = document.getElementById("inventory-tbody");
    tbody.innerHTML = "";
    
    const searchQuery = document.getElementById("inventory-search-input").value.trim().toLowerCase();
    const stockFilter = document.getElementById("inventory-stock-filter").value;

    let filteredItems = state.items;

    // Apply text search by Name or HSN
    if (searchQuery) {
        filteredItems = filteredItems.filter(item => 
            (item.name || '').toLowerCase().includes(searchQuery) || 
            (item.hsn || '').toString().toLowerCase().includes(searchQuery)
        );
    }

    // Apply stock quantity filter
    if (stockFilter === "low") {
        filteredItems = filteredItems.filter(item => item.qty > 0 && item.qty <= state.shop.lowStockThreshold);
    } else if (stockFilter === "out") {
        filteredItems = filteredItems.filter(item => item.qty === 0);
    }

    // Sort alphabetically by product name
    filteredItems.sort((a, b) => a.name.localeCompare(b.name));

    if (filteredItems.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="8">No matching inventory items found.</td></tr>`;
        return;
    }

    filteredItems.forEach(item => {
        const profit = item.sellRate - item.buyRate;
        const profitPct = item.sellRate > 0 ? (profit / item.sellRate) * 100 : 0;
        
        let qtyClass = "";
        if (item.qty === 0) qtyClass = "text-rose font-bold";
        else if (item.qty <= state.shop.lowStockThreshold) qtyClass = "text-amber font-bold";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <strong>${item.name}</strong>
            </td>
            <td><code>${item.hsn}</code></td>
            <td class="text-right ${qtyClass}">${item.qty}</td>
            <td class="text-right">₹${item.buyRate.toFixed(2)}</td>
            <td class="text-right">₹${item.sellRate.toFixed(2)}</td>
            <td class="text-right">
                <span class="${profit >= 0 ? 'text-emerald' : 'text-rose'}">
                    ₹${profit.toFixed(2)} (${profitPct.toFixed(1)}%)
                </span>
            </td>
            <td class="text-right">${item.gstRate}%</td>
            <td class="text-center">
                <div class="action-cell">
                    <button class="btn btn-outline btn-sm btn-icon-only" title="Adjust Stock" onclick="openStockModal('${item.id}')">
                        <i data-lucide="hash"></i>
                    </button>
                    <button class="btn btn-outline btn-sm btn-icon-only" title="Edit Prices" onclick="openPriceModal('${item.id}')">
                        <i data-lucide="indian-rupee"></i>
                    </button>
                    <button class="btn btn-outline btn-sm btn-icon-only" title="Edit Product Details" onclick="openProductModal('${item.id}')">
                        <i data-lucide="edit"></i>
                    </button>
                    <button class="btn btn-danger-outline btn-sm btn-icon-only" title="Delete Product" onclick="deleteProduct('${item.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// RENDER: POS Search Dropdown
function renderPOSDropdown(itemsList) {
    const dropdown = document.getElementById("pos-search-results");
    dropdown.innerHTML = "";
    
    if (itemsList.length === 0) {
        dropdown.innerHTML = `<div class="empty-state">No matching products</div>`;
        dropdown.style.display = "block";
        return;
    }

    itemsList.slice(0, 10).forEach(item => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        
        let stockLabel = "";
        if (item.qty === 0) stockLabel = `<span class="auto-stock out-of-stock">Out of Stock</span>`;
        else if (item.qty <= state.shop.lowStockThreshold) stockLabel = `<span class="auto-stock low-stock">Low Stock (${item.qty})</span>`;
        else stockLabel = `<span class="auto-stock in-stock">In Stock (${item.qty})</span>`;

        div.innerHTML = `
            <div>
                <span class="auto-name">${item.name}</span>
                <span class="auto-hsn">HSN: ${item.hsn}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <strong>₹${item.sellRate.toFixed(2)}</strong>
                ${stockLabel}
            </div>
        `;
        div.addEventListener("click", () => {
            addProductToCart(item.id);
            hidePOSDropdown();
        });
        dropdown.appendChild(div);
    });
    
    dropdown.style.display = "block";
}

function hidePOSDropdown() {
    document.getElementById("pos-search-results").style.display = "none";
    document.getElementById("pos-search-clear").style.display = "none";
}

// Adding Items to POS Cart (triggers Custom Price Modal)
function addProductToCart(productId) {
    const companySelect = document.getElementById("bill-company-select");
    if (!companySelect || !companySelect.value) {
        showToast("Please select a company before adding products!", "error");
        return;
    }

    const product = state.items.find(item => item.id === productId);
    if (!product) return;

    if (product.qty <= 0) {
        showToast("Product is out of stock!", "error");
        return;
    }

    // Fetch buying price
    const buyRate = product.buyRate || 0;

    // Fetch selected company and check recent transactions
    const selectedCompany = state.companies.find(c => c.id === companySelect.value);
    let recentSellRate = null;
    if (selectedCompany && state.transactions && Array.isArray(state.transactions)) {
        // Sort a copy of transactions descending by timestamp (newest first)
        const sortedTx = [...state.transactions].sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
        });

        const compNameClean = selectedCompany.name.trim().toLowerCase();
        for (let tx of sortedTx) {
            if (tx.customerName && tx.customerName.trim().toLowerCase() === compNameClean) {
                const txItem = tx.items.find(item => item.id == productId);
                if (txItem) {
                    recentSellRate = txItem.sellRate;
                    break;
                }
            }
        }
    }

    // Populate modal fields
    document.getElementById("pos-billing-modal-product-id").value = productId;
    document.getElementById("pos-billing-modal-item-name").textContent = product.name;
    document.getElementById("pos-billing-modal-hsn").textContent = product.hsn;
    document.getElementById("pos-billing-modal-stock").textContent = product.qty;
    document.getElementById("pos-billing-modal-buy-price").textContent = `₹${buyRate.toFixed(2)}`;

    const recentSellEl = document.getElementById("pos-billing-modal-recent-sell");
    if (recentSellRate !== null) {
        recentSellEl.textContent = `₹${recentSellRate.toFixed(2)}`;
        recentSellEl.style.color = "var(--accent-indigo)";
        // Auto-fill price input with the most recent transaction price to speed up entry
        document.getElementById("pos-billing-modal-price-input").value = recentSellRate.toFixed(2);
    } else {
        recentSellEl.textContent = "₹0.00 (First time)";
        recentSellEl.style.color = "var(--text-muted)";
        // Auto-fill with inventory default selling price
        document.getElementById("pos-billing-modal-price-input").value = product.sellRate.toFixed(2);
    }

    // Set quantity
    document.getElementById("pos-billing-modal-qty-input").value = 1;
    document.getElementById("pos-billing-modal-qty-input").max = product.qty;

    // Open Modal
    const modal = document.getElementById("pos-billing-input-modal");
    if (modal) {
        modal.classList.add("modal-open");
    }
    
    // Clear search input and hide autocomplete
    const searchInput = document.getElementById("pos-search-input");
    if (searchInput) {
        searchInput.value = "";
    }
    hidePOSDropdown();

    setTimeout(() => {
        const priceInput = document.getElementById("pos-billing-modal-price-input");
        if (priceInput) priceInput.focus();
    }, 100);
}

// POS Custom Price Form Submission
function savePOSBillingInput(e) {
    if (e) e.preventDefault();
    const productId = document.getElementById("pos-billing-modal-product-id").value;
    const priceVal = parseFloat(document.getElementById("pos-billing-modal-price-input").value);
    const qtyVal = parseInt(document.getElementById("pos-billing-modal-qty-input").value) || 0;

    if (isNaN(priceVal) || priceVal < 0) {
        showToast("Please enter a valid price!", "error");
        return;
    }

    if (qtyVal <= 0) {
        showToast("Quantity must be at least 1!", "error");
        return;
    }

    const product = state.items.find(item => item.id === productId);
    if (!product) return;

    if (qtyVal > product.qty) {
        showToast(`Cannot exceed available stock of ${product.qty} units!`, "error");
        return;
    }

    // Add item to cart with customized rate and quantity!
    const cartItem = cart.find(i => i.productId === productId);
    if (cartItem) {
        if (cartItem.qty + qtyVal > product.qty) {
            showToast("Cannot exceed available stock!", "error");
            return;
        }
        cartItem.qty += qtyVal;
        cartItem.sellRate = priceVal; // Update to the custom price entered
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            hsn: product.hsn,
            qty: qtyVal,
            sellRate: priceVal,
            buyRate: product.buyRate,
            gstRate: product.gstRate
        });
    }

    // Update GST override if first item
    if (cart.length === 1) {
        const gstOverrideEl = document.getElementById("bill-gst-percentage");
        if (gstOverrideEl) {
            gstOverrideEl.value = product.gstRate;
        }
    }

    closePOSBillingModal();
    showToast(`Added ${product.name} to cart`, "success");
    renderCart();
}

function closePOSBillingModal() {
    const modal = document.getElementById("pos-billing-input-modal");
    if (modal) {
        modal.classList.remove("modal-open");
    }
}

// RENDER: POS Billing Cart Table
function renderCart() {
    const tbody = document.getElementById("cart-tbody");
    tbody.innerHTML = "";

    if (cart.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <div class="empty-cart-state">
                        <i data-lucide="shopping-cart" class="huge-icon"></i>
                        <p>Cart is empty. Search and select items above to start billing.</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById("bill-subtotal").textContent = "₹0.00";
        document.getElementById("bill-gst-amount").textContent = "₹0.00";
        document.getElementById("bill-grand-total").textContent = "₹0.00";
        return;
    }

    cart.forEach(item => {
        const product = state.items.find(p => p.id === item.productId);
        const maxStock = product ? product.qty : 0;
        
        // POS billing calculations
        const taxable = item.qty * item.sellRate;
        const taxVal = taxable * (item.gstRate / 100);
        const total = taxable + taxVal;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <strong>${item.name}</strong><br>
                <small class="text-muted">HSN: ${item.hsn}</small>
            </td>
            <td class="text-right">₹${item.sellRate.toFixed(2)}</td>
            <td class="text-center">
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateCartQty('${item.productId}', ${item.qty - 1})">-</button>
                    <span class="qty-val">${item.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty('${item.productId}', ${item.qty + 1}, ${maxStock})">+</button>
                </div>
            </td>
            <td class="text-right">₹${taxable.toFixed(2)}</td>
            <td class="text-right">${item.gstRate}%</td>
            <td class="text-right">₹${total.toFixed(2)}</td>
            <td class="text-center">
                <button class="btn btn-danger-outline btn-sm btn-icon-only" onclick="removeFromCart('${item.productId}')">
                    <i data-lucide="x"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    calculateBillTotals();
    lucide.createIcons();
}

function updateCartQty(productId, newQty, maxStock) {
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }
    if (maxStock !== undefined && newQty > maxStock) {
        showToast(`Only ${maxStock} units available in inventory!`, "warning");
        return;
    }

    const item = cart.find(i => i.productId === productId);
    if (item) {
        item.qty = newQty;
        renderCart();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId !== productId);
    showToast("Item removed from cart", "warning");
    renderCart();
}

// Calculate billing subtotals, custom GST, and Grand total
function calculateBillTotals() {
    if (cart.length === 0) return;

    // Subtotal is sum of Qty * SellRate
    const subtotal = cart.reduce((sum, item) => sum + (item.qty * item.sellRate), 0);
    
    // User overriding GST rate
    const gstRateOverride = parseFloat(document.getElementById("bill-gst-percentage").value) || 0;
    
    const gstAmount = subtotal * (gstRateOverride / 100);
    const grandTotal = subtotal + gstAmount;

    document.getElementById("bill-subtotal").textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById("bill-gst-amount").textContent = `₹${gstAmount.toFixed(2)}`;
    document.getElementById("bill-grand-total").textContent = `₹${grandTotal.toFixed(2)}`;
}

// Checkout and generate invoice/re-print
function handleCheckout() {
    if (cart.length === 0) {
        showToast("Cannot checkout empty cart!", "error");
        return;
    }

    // Verify stock availability once more
    for (let cartItem of cart) {
        const product = state.items.find(p => p.id === cartItem.productId);
        if (!product || product.qty < cartItem.qty) {
            showToast(`Insufficient stock for ${cartItem.name}! Please review.`, "error");
            return;
        }
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.qty * item.sellRate), 0);
    const gstRateOverride = parseFloat(document.getElementById("bill-gst-percentage").value) || 0;
    const gstAmount = subtotal * (gstRateOverride / 100);
    const grandTotal = subtotal + gstAmount;
    
    let customerName = "Walk-in Customer";
    let customerPhone = "";
    let customerAddress = "";
    let customerGstin = "";

    const companySelect = document.getElementById("bill-company-select");
    if (companySelect && companySelect.value) {
        const selectedCompany = state.companies.find(c => c.id === companySelect.value);
        if (selectedCompany) {
            customerName = selectedCompany.name;
            customerAddress = selectedCompany.address;
            customerGstin = selectedCompany.gstNumber || "";
        }
    }

    const orderNo = document.getElementById("bill-order-no").value.trim() || "verbal order";
    const orderDate = document.getElementById("bill-order-date").value.trim() || "";
    const deliveryNote = document.getElementById("bill-delivery-note").value.trim() || "";
    const paymentTerms = document.getElementById("bill-payment-terms").value.trim() || "against delivery";
    const dispatchMode = document.getElementById("bill-dispatch-mode").value.trim() || "collected by you";

    // Generate Invoice ID (use custom delivery note if number, else auto increment overall)
    let billNumber = deliveryNote;
    if (!billNumber || isNaN(billNumber)) {
        let maxInvoice = 0;
        state.transactions.forEach(t => {
            const num = parseInt(t.id, 10);
            if (!isNaN(num) && num > maxInvoice) {
                maxInvoice = num;
            }
        });
        billNumber = `${maxInvoice + 1}`;
    }

    const transaction = {
        uniqueId: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9),
        id: billNumber,
        timestamp: new Date().toISOString(),
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        customerGstin: customerGstin,
        orderNo: orderNo,
        orderDate: orderDate || new Date().toLocaleDateString("en-IN"),
        deliveryNote: deliveryNote || billNumber,
        paymentTerms: paymentTerms,
        dispatchMode: dispatchMode,
        items: cart.map(item => ({
            id: item.productId,
            name: item.name,
            hsn: item.hsn,
            qty: item.qty,
            sellRate: item.sellRate,
            gstRate: item.gstRate,
            taxableValue: item.qty * item.sellRate,
            gstAmount: (item.qty * item.sellRate) * (gstRateOverride / 100),
            total: (item.qty * item.sellRate) * (1 + gstRateOverride / 100)
        })),
        subtotal: subtotal,
        gstRateOverride: gstRateOverride,
        gstAmount: gstAmount,
        grandTotal: grandTotal
    };

    // Deduct Stock
    cart.forEach(cartItem => {
        const product = state.items.find(p => p.id === cartItem.productId);
        if (product) {
            product.qty -= cartItem.qty;
        }
    });

    // Save transaction
    state.transactions.push(transaction);
    saveDatabase();

    // Print Receipt
    printInvoice(transaction);

    // Reset checkout state
    cart = [];
    if (companySelect) {
        if (state.companies.length > 0) {
            companySelect.value = state.companies[0].id;
        } else {
            companySelect.value = "";
        }
        updateSelectedCompanyPreview();
    }
    
    showToast("Checkout completed & bill sent to printer!", "success");
    renderAll();
}

// Print Bill UI formatter
function printInvoice(transaction) {
    const printSection = document.getElementById("print-section");
    const dateObj = new Date(transaction.timestamp);
    const formattedDate = dateObj.toLocaleDateString("en-IN", {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    // Helper to get unit name dynamically
    function getProductUnit(productName) {
        const name = (productName || "").toLowerCase();
        if (name.includes("paper") || name.includes("sprint plus") || name.includes("ream")) {
            return "reams";
        }
        return "nos.";
    }

    let itemsRows = "";
    transaction.items.forEach((item, index) => {
        const unit = getProductUnit(item.name);
        const itemGst = item.gstRate !== undefined ? item.gstRate : transaction.gstRateOverride;
        itemsRows += `
            <tr style="height: 24px; vertical-align: top;">
                <td style="text-align: center; border-right: 1px solid #000; padding: 4px;">${index + 1}</td>
                <td style="border-right: 1px solid #000; padding: 4px; text-align: left; font-weight: normal;">${item.name}</td>
                <td style="text-align: center; border-right: 1px solid #000; padding: 4px;">${item.hsn}</td>
                <td style="text-align: center; border-right: 1px solid #000; padding: 4px;">${itemGst}%</td>
                <td style="text-align: center; border-right: 1px solid #000; padding: 4px;">${item.qty} ${unit}</td>
                <td style="text-align: right; border-right: 1px solid #000; padding: 4px;">${item.sellRate.toFixed(2)}</td>
                <td style="text-align: right; padding: 4px;">${item.taxableValue.toFixed(2)}</td>
            </tr>
        `;
    });

    const minRows = 10;
    const itemsCount = transaction.items.length;
    if (itemsCount < minRows) {
        for (let i = itemsCount; i < minRows; i++) {
            itemsRows += `
                <tr style="height: 24px; vertical-align: top;">
                    <td style="text-align: center; border-right: 1px solid #000; padding: 4px;">&nbsp;</td>
                    <td style="border-right: 1px solid #000; padding: 4px; text-align: left; font-weight: normal;">&nbsp;</td>
                    <td style="text-align: center; border-right: 1px solid #000; padding: 4px;">&nbsp;</td>
                    <td style="text-align: center; border-right: 1px solid #000; padding: 4px;">&nbsp;</td>
                    <td style="text-align: center; border-right: 1px solid #000; padding: 4px;">&nbsp;</td>
                    <td style="text-align: right; border-right: 1px solid #000; padding: 4px;">&nbsp;</td>
                    <td style="text-align: right; padding: 4px;">&nbsp;</td>
                </tr>
            `;
        }
    }


    // Group calculations by GST rate for the tax break-up table
    const taxGroups = {};
    const standardRates = [0, 5, 12, 18, 28];
    standardRates.forEach(r => {
        taxGroups[r] = { taxable: 0, cgst: 0, sgst: 0 };
    });

    transaction.items.forEach(item => {
        const gstRate = item.gstRate !== undefined ? item.gstRate : transaction.gstRateOverride;
        if (taxGroups[gstRate] === undefined) {
            taxGroups[gstRate] = { taxable: 0, cgst: 0, sgst: 0 };
        }
        const taxableVal = item.taxableValue || (item.qty * item.sellRate);
        const cgstAmount = taxableVal * ((gstRate / 2) / 100);
        const sgstAmount = taxableVal * ((gstRate / 2) / 100);
        
        taxGroups[gstRate].taxable += taxableVal;
        taxGroups[gstRate].cgst += cgstAmount;
        taxGroups[gstRate].sgst += sgstAmount;
    });

    let taxTableRows = "";
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    
    // Sort descending so 18% (9%/9%) shows at the top, then 5%, then 0%
    const sortedRates = Object.keys(taxGroups).map(Number).sort((a, b) => b - a);
    sortedRates.forEach(rate => {
        const data = taxGroups[rate];
        // Display if there is taxable value, or if it is 18%, 5% or 0% to exactly match the PDF format
        if (data.taxable > 0 || rate === 18 || rate === 5 || rate === 0) {
            const halfRate = rate / 2;
            taxTableRows += `
                <tr style="height: 20px;">
                    <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px; text-align: right;">${data.taxable.toFixed(2)}</td>
                    <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px; text-align: center;">${halfRate}%</td>
                    <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px; text-align: right;">${data.cgst.toFixed(2)}</td>
                    <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px; text-align: center;">${halfRate}%</td>
                    <td style="border-bottom: 1px solid #000; padding: 3px; text-align: right;">${data.sgst.toFixed(2)}</td>
                </tr>
            `;
            totalTaxable += data.taxable;
            totalCGST += data.cgst;
            totalSGST += data.sgst;
        }
    });

    const calculatedTotal = transaction.subtotal + totalCGST + totalSGST;
    const roundedTotal = Math.round(calculatedTotal);
    const roundedOffValue = roundedTotal - calculatedTotal;

    const shopGstBlock = state.shop.gstin ? `<p style="margin:2px 0;"><strong>GSTIN :</strong> ${state.shop.gstin}</p>` : "";
    const shopMsmeBlock = state.shop.msme ? `<p style="margin:2px 0;"><strong>MSME :</strong> ${state.shop.msme}</p>` : "";
    const shopEmailBlock = state.shop.email ? `<p style="margin:2px 0;"><strong>E-mail :</strong> ${state.shop.email}</p>` : "";

    const customerGstinBlock = transaction.customerGstin ? `<p style="margin:2px 0;"><strong>GSTIN :</strong> ${transaction.customerGstin}</p>` : "";

    // Generate UPI URL for scan-to-pay
    const upiPayUrl = `upi://pay?pa=${state.shop.upi}&pn=${encodeURIComponent(state.shop.name)}&am=${roundedTotal.toFixed(2)}&cu=INR&tn=Invoice%20${transaction.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(upiPayUrl)}`;

    printSection.innerHTML = `
        <div style="font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #000; width: 100%; max-width: 800px; margin: 0 auto; padding: 10px; box-sizing: border-box; background-color: #fff; border: 1px solid #000;">
            
            <div style="text-align: center; font-weight: bold; font-size: 14px; letter-spacing: 1px; margin-bottom: 10px; text-transform: uppercase;">Tax Invoice</div>
            
            <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000; border-left: 1px solid #000; border-right: 1px solid #000; margin-bottom: 0;">
                <tr>
                    <td style="width: 50%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
                        <div style="display: flex; align-items: flex-start; gap: 10px;">
                            <img src="images/logo.jpg" alt="Logo" style="width: 44px; height: 44px; object-fit: contain;">
                            <div>
                                <h2 style="font-size: 13px; font-weight: bold; margin: 0 0 4px 0; font-family: 'Outfit', sans-serif;">${state.shop.name}</h2>
                                <p style="margin: 2px 0; font-size: 10px; color: #333;">${state.shop.address}</p>
                                <p style="margin: 2px 0;">Phone : ${state.shop.phone}</p>
                                ${shopEmailBlock}
                                ${shopMsmeBlock}
                                ${shopGstBlock}
                            </div>
                        </div>
                    </td>
                    <td style="width: 50%; padding: 0; vertical-align: top;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; width: 50%; font-size: 10px;">
                                    <span style="color: #555; font-size: 9px;">Invoice No.</span><br>
                                    <strong style="font-size: 11px;">${transaction.id}</strong>
                                </td>
                                <td style="border-bottom: 1px solid #000; padding: 4px; width: 50%; font-size: 10px;">
                                    <span style="color: #555; font-size: 9px;">Invoice Date</span><br>
                                    <strong style="font-size: 11px;">${formattedDate}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; font-size: 10px;">
                                    <span style="color: #555; font-size: 9px;">Delivery note No.</span><br>
                                    <strong>${transaction.deliveryNote || ""}</strong>
                                </td>
                                <td style="border-bottom: 1px solid #000; padding: 4px; font-size: 10px;">
                                    <span style="color: #555; font-size: 9px;">Date</span><br>
                                    <strong></strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; font-size: 10px;">
                                    <span style="color: #555; font-size: 9px;">Buyer's Order No.</span><br>
                                    <strong>${transaction.orderNo || ""}</strong>
                                </td>
                                <td style="border-bottom: 1px solid #000; padding: 4px; font-size: 10px;">
                                    <span style="color: #555; font-size: 9px;">Date</span><br>
                                    <strong>${transaction.orderDate || ""}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="border-right: 1px solid #000; padding: 4px; font-size: 10px;">
                                    <span style="color: #555; font-size: 9px;">Payment Terms</span><br>
                                    <strong>${transaction.paymentTerms || ""}</strong>
                                </td>
                                <td style="padding: 4px; font-size: 10px;">
                                    <span style="color: #555; font-size: 9px;">Mode of dispatch</span><br>
                                    <strong>${transaction.dispatchMode || ""}</strong>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
 
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
                <tr>
                    <td style="width: 50%; border-right: 1px solid #000; padding: 6px; vertical-align: top;">
                        <div style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 6px; font-size: 9px; text-transform: uppercase; color: #555;">Buyer Name & Address</div>
                        <p style="margin: 2px 0; font-weight: bold; font-size: 11px;">${transaction.customerName}</p>
                        <p style="margin: 2px 0; white-space: pre-line; line-height: 1.4;">${transaction.customerAddress || ""}</p>
                        ${transaction.customerPhone ? `<p style="margin: 2px 0;">Phone: ${transaction.customerPhone}</p>` : ""}
                        ${customerGstinBlock}
                    </td>
                    <td style="width: 50%; padding: 6px; vertical-align: top;">
                        <div style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 6px; font-size: 9px; text-transform: uppercase; color: #555;">Consignee Name & Address</div>
                        <p style="margin: 2px 0; font-weight: bold; font-size: 11px;">${transaction.customerName}</p>
                        <p style="margin: 2px 0; white-space: pre-line; line-height: 1.4;">${transaction.customerAddress || ""}</p>
                        ${transaction.customerPhone ? `<p style="margin: 2px 0;">Phone: ${transaction.customerPhone}</p>` : ""}
                        ${customerGstinBlock}
                    </td>
                </tr>
            </table>
 
            <table style="width: 100%; border-collapse: collapse; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000;">
                <thead>
                    <tr style="background-color: #f4f4f4; border-bottom: 1px solid #000;">
                        <th style="width: 5%; border-right: 1px solid #000; padding: 6px; text-align: center; font-size: 10px;">S.No.</th>
                        <th style="border-right: 1px solid #000; padding: 6px; text-align: left; font-size: 10px;">Description</th>
                        <th style="width: 12%; border-right: 1px solid #000; padding: 6px; text-align: center; font-size: 10px;">HSN code</th>
                        <th style="width: 10%; border-right: 1px solid #000; padding: 6px; text-align: center; font-size: 10px;">GST Rate</th>
                        <th style="width: 12%; border-right: 1px solid #000; padding: 6px; text-align: center; font-size: 10px;">Qty.</th>
                        <th style="width: 12%; border-right: 1px solid #000; padding: 6px; text-align: right; font-size: 10px;">Rate - ₹</th>
                        <th style="width: 15%; padding: 6px; text-align: right; font-size: 10px;">Amount - ₹</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                    <tr style="font-weight: bold; height: 26px;">
                        <td colspan="2" style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 6px; text-align: right;">Total</td>
                        <td style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 6px;"></td>
                        <td style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 6px;"></td>
                        <td style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 6px;"></td>
                        <td style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 6px;"></td>
                        <td style="text-align: right; border-top: 1px solid #000; padding: 6px;">${transaction.subtotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
 
            <!-- Bottom side-by-side section: Tax break-up on the left, Totals on the right (No dividing vertical line) -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                    <td style="width: 58%; vertical-align: top; padding: 0;">
                        <table style="width: 95%; border-collapse: collapse; text-align: center; border: 1px solid #000;">
                            <thead>
                                <tr style="background-color: #f4f4f4; font-weight: bold; border-bottom: 1px solid #000;">
                                    <th rowspan="2" style="border-right: 1px solid #000; padding: 3px; font-size: 9px; width: 30%;">Taxable Value</th>
                                    <th colspan="2" style="border-right: 1px solid #000; padding: 3px; font-size: 9px; width: 35%;">CGST</th>
                                    <th colspan="2" style="padding: 3px; font-size: 9px; width: 35%;">SGST</th>
                                </tr>
                                <tr style="background-color: #f4f4f4; font-weight: bold; border-bottom: 1px solid #000;">
                                    <th style="border-right: 1px solid #000; padding: 3px; font-size: 8px;">Rate</th>
                                    <th style="border-right: 1px solid #000; padding: 3px; font-size: 8px;">Amount</th>
                                    <th style="border-right: 1px solid #000; padding: 3px; font-size: 8px;">Rate</th>
                                    <th style="padding: 3px; font-size: 8px;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${taxTableRows}
                            </tbody>
                        </table>
                    </td>
                    
                    <td style="width: 42%; vertical-align: top; padding: 0;">
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-left: auto;">
                            <tr style="height: 20px;">
                                <td style="padding: 3px 6px; width: 60%; text-align: right; border-bottom: 1px solid #000; border-right: 1px solid #000;">Taxable Value</td>
                                <td style="padding: 3px 6px; width: 40%; text-align: right; border-bottom: 1px solid #000;">${transaction.subtotal.toFixed(2)}</td>
                            </tr>
                            <tr style="height: 20px;">
                                <td style="padding: 3px 6px; text-align: right; border-bottom: 1px solid #000; border-right: 1px solid #000;">C G S T</td>
                                <td style="padding: 3px 6px; text-align: right; border-bottom: 1px solid #000;">${totalCGST.toFixed(2)}</td>
                            </tr>
                            <tr style="height: 20px;">
                                <td style="padding: 3px 6px; text-align: right; border-bottom: 1px solid #000; border-right: 1px solid #000;">S G S T</td>
                                <td style="padding: 3px 6px; text-align: right; border-bottom: 1px solid #000;">${totalSGST.toFixed(2)}</td>
                            </tr>
                            <tr style="height: 20px;">
                                <td style="padding: 3px 6px; text-align: right; border-bottom: 1px solid #000; border-right: 1px solid #000;">Rounded off</td>
                                <td style="padding: 3px 6px; text-align: right; border-bottom: 1px solid #000;">${roundedOffValue.toFixed(2)}</td>
                            </tr>
                            <tr style="font-weight: bold; font-size: 11px; height: 26px; background-color: #f4f4f4;">
                                <td style="padding: 4px 6px; text-align: right; border-right: 1px solid #000;">Total Amount</td>
                                <td style="padding: 4px 6px; text-align: right; font-size: 12px; border: 2px solid #000;">₹ ${roundedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
 
            <!-- Rupees in words (No table borders, clean inline text as in the PDF) -->
            <div style="font-weight: bold; font-size: 11px; margin-top: 10px; margin-bottom: 15px; text-align: left;">
                Rupees ${numberToWords(roundedTotal)} Only
            </div>
 
            <!-- Footer section: Banker details (boxed), Scan to pay, Authorised Signatory (No vertical split lines) -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                    <!-- Banker Details Boxed -->
                    <td style="width: 50%; vertical-align: top; padding: 0;">
                        <div style="border: 1px solid #000; padding: 8px; font-size: 10px; width: 95%; box-sizing: border-box;">
                            <strong style="text-decoration: underline; font-size: 9px; display: block; margin-bottom: 4px; color: #555;">Our Banker's details</strong>
                            <p style="margin: 2px 0; font-size: 10px; font-weight: bold;">${state.shop.bankName}, ${state.shop.bankBranch}</p>
                            <p style="margin: 2px 0; font-size: 10px; font-weight: bold;">Account No. ${state.shop.bankAcc} / IFSC : ${state.shop.bankIfsc}</p>
                        </div>
                    </td>
                    
                    <!-- Scan to pay (Borderless) -->
                    <td style="width: 20%; text-align: center; vertical-align: top; padding: 0;">
                        <div style="font-weight: bold; font-size: 8px; margin-bottom: 4px; text-transform: uppercase; color: #555;">scan to pay</div>
                        <img src="images/qr.jpg" alt="UPI QR Code" style="width: 65px; height: 65px; object-fit: contain;">
                    </td>
                    
                    <!-- Signatory Column (Borderless) -->
                    <td style="width: 30%; text-align: center; vertical-align: top; padding: 0; height: 95px;">
                        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                            <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #555;">For ${state.shop.name}</div>
                            <div style="text-align: center; height: 45px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-top: 4px;">
                                <img src="images/signature.jpg" alt="Signature" style="max-height: 40px; max-width: 100%; object-fit: contain;">
                            </div>
                            <div style="font-size: 10px; font-weight: bold; text-align: center; text-transform: uppercase; margin-top: auto; padding-top: 4px; border-top: 1px solid #bbb;">Authorised Signatory</div>
                        </div>
                    </td>
                </tr>
            </table>
 
            <table style="width: 100%; font-size: 9px; margin-top: 5px;">
                <tr>
                    <td style="text-align: left; color: #444;">Certified that the particulars above are true and correct.</td>
                    <td style="text-align: center; font-weight: bold;">E & O.E.</td>
                    <td style="text-align: right; color: #444;">Sales under this invoice is subject to Coimbatore Jurisdiction only.</td>
                </tr>
            </table>
 
        </div>
    `;

    // Trigger Native Print Dialog once all images are fully loaded
    const images = printSection.querySelectorAll("img");
    let loadedCount = 0;
    const totalImages = images.length;

    if (totalImages === 0) {
        window.print();
    } else {
        images.forEach(img => {
            if (img.complete) {
                loadedCount++;
                if (loadedCount === totalImages) {
                    window.print();
                }
            } else {
                img.addEventListener("load", () => {
                    loadedCount++;
                    if (loadedCount === totalImages) {
                        window.print();
                    }
                });
                img.addEventListener("error", () => {
                    loadedCount++;
                    if (loadedCount === totalImages) {
                        window.print();
                    }
                });
            }
        });
    }
}

// Convert numbers to words (Indian system)
function numberToWords(num) {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    function numToWords(n) {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + numToWords(n % 100) : '');
        if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
        if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + numToWords(n % 100000) : '');
        return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + numToWords(n % 10000000) : '');
    }
    
    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);
    
    let words = "Rupees " + numToWords(integerPart);
    if (decimalPart > 0) {
        words += " and " + numToWords(decimalPart) + " Paise";
    }
    words += " Only";
    return words;
}

// RENDER: Transactions/Sales Tab Table
function renderTransactionsList() {
    const tbody = document.getElementById("transactions-tbody");
    tbody.innerHTML = "";

    const searchQuery = document.getElementById("transaction-search-input").value.trim().toLowerCase();
    let filteredList = state.transactions;

    if (searchQuery) {
        filteredList = filteredList.filter(t => 
            t.id.toLowerCase().includes(searchQuery) ||
            t.customerName.toLowerCase().includes(searchQuery)
        );
    }

    // Sort by date newest first
    filteredList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="8">No sales transactions available.</td></tr>`;
        return;
    }

    filteredList.forEach(t => {
        const dateObj = new Date(t.timestamp);
        const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${t.id}</strong></td>
            <td>${dateStr}</td>
            <td>${t.customerName}</td>
            <td class="text-right">₹${t.subtotal.toFixed(2)}</td>
            <td class="text-right">${t.gstRateOverride}%</td>
            <td class="text-right">₹${t.gstAmount.toFixed(2)}</td>
            <td class="text-right"><strong>₹${t.grandTotal.toFixed(2)}</strong></td>
            <td class="text-center">
                <div class="action-cell">
                    <button class="btn btn-outline btn-sm" onclick="reprintInvoice('${t.uniqueId || t.id}')">
                        <i data-lucide="printer"></i> Reprint
                    </button>
                    <button class="btn btn-outline btn-sm" title="Convert to Excel" onclick="exportSingleInvoiceToExcel('${t.uniqueId || t.id}')">
                        <i data-lucide="file-spreadsheet"></i> Excel
                    </button>
                    <button class="btn btn-danger-outline btn-sm btn-icon-only" onclick="deleteTransaction('${t.uniqueId || t.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function reprintInvoice(uniqueId) {
    const trans = state.transactions.find(t => (t.uniqueId === uniqueId || t.id === uniqueId));
    if (trans) {
        printInvoice(trans);
        showToast(`Reprinting invoice ${trans.id}`, "success");
    }
}

function deleteTransaction(uniqueId) {
    const trans = state.transactions.find(t => (t.uniqueId === uniqueId || t.id === uniqueId));
    if (trans) {
        if (confirm(`Are you sure you want to delete invoice ${trans.id}? This action cannot be undone.`)) {
            state.transactions = state.transactions.filter(t => (t.uniqueId !== uniqueId && t.id !== uniqueId));
            saveDatabase();
            showToast(`Invoice ${trans.id} deleted`, "warning");
            renderAll();
        }
    }
}

// RENDER: Load settings screen input elements
function loadSettingsForm() {
    document.getElementById("shop-name").value = state.shop.name;
    document.getElementById("shop-address").value = state.shop.address;
    document.getElementById("shop-phone").value = state.shop.phone;
    document.getElementById("shop-email").value = state.shop.email || "";
    document.getElementById("shop-msme").value = state.shop.msme || "";
    document.getElementById("shop-gstin").value = state.shop.gstin;
    
    document.getElementById("shop-bank-name").value = state.shop.bankName || "";
    document.getElementById("shop-bank-branch").value = state.shop.bankBranch || "";
    document.getElementById("shop-bank-acc").value = state.shop.bankAcc || "";
    document.getElementById("shop-bank-ifsc").value = state.shop.bankIfsc || "";
    document.getElementById("shop-upi").value = state.shop.upi || "";

    document.getElementById("setting-low-stock-alert").value = state.shop.lowStockThreshold;
}

// Close all active dialog modals
function closeAllModals() {
    document.querySelectorAll(".modal-backdrop").forEach(el => {
        el.classList.remove("modal-open");
    });
    selectedProductForStock = null;
    selectedProductForPrice = null;
}

// Open modal: Add/Edit Product details
function openProductModal(productId = null) {
    const modal = document.getElementById("product-modal");
    const form = document.getElementById("product-form");
    const title = document.getElementById("product-modal-title");

    form.reset();
    document.getElementById("pricing-margin-preview").textContent = "₹0.00 (0.00%)";

    if (productId) {
        title.textContent = "Edit Product Details";
        const item = state.items.find(i => i.id === productId);
        if (item) {
            document.getElementById("product-id").value = item.id;
            document.getElementById("product-form-name").value = item.name;
            document.getElementById("product-form-hsn").value = item.hsn;
            document.getElementById("product-form-qty").value = item.qty;
            document.getElementById("product-form-gst").value = item.gstRate;
            document.getElementById("product-form-buy").value = item.buyRate;
            document.getElementById("product-form-sell").value = item.sellRate;
            
            // Trigger calculation
            const profit = item.sellRate - item.buyRate;
            const marginPct = item.sellRate > 0 ? (profit / item.sellRate) * 100 : 0;
            const marginEl = document.getElementById("pricing-margin-preview");
            marginEl.textContent = `₹${profit.toFixed(2)} (${marginPct.toFixed(2)}%)`;
            marginEl.className = profit < 0 ? "text-rose" : "text-emerald";
        }
    } else {
        title.textContent = "Add New Product";
        document.getElementById("product-id").value = "";
    }

    modal.classList.add("modal-open");
    document.getElementById("product-form-name").focus();
}

function saveProduct() {
    const id = document.getElementById("product-id").value;
    const name = document.getElementById("product-form-name").value.trim();
    const hsn = document.getElementById("product-form-hsn").value.trim();
    const qty = parseInt(document.getElementById("product-form-qty").value) || 0;
    const gstRate = parseFloat(document.getElementById("product-form-gst").value) || 0;
    const buyRate = parseFloat(document.getElementById("product-form-buy").value) || 0;
    const sellRate = parseFloat(document.getElementById("product-form-sell").value) || 0;

    if (id) {
        // Edit existing
        const item = state.items.find(i => i.id === id);
        if (item) {
            item.name = name;
            item.hsn = hsn;
            item.qty = qty;
            item.gstRate = gstRate;
            item.buyRate = buyRate;
            item.sellRate = sellRate;
            showToast("Product updated successfully", "success");
        }
    } else {
        // Add new
        const newProduct = {
            id: Date.now().toString(),
            name, hsn, qty, buyRate, sellRate, gstRate
        };
        state.items.push(newProduct);
        showToast("Product added to inventory", "success");
    }

    saveDatabase();
    closeAllModals();
    renderAll();
}

function deleteProduct(productId) {
    const item = state.items.find(i => i.id === productId);
    if (item) {
        if (confirm(`Are you sure you want to delete ${item.name} from the inventory?`)) {
            state.items = state.items.filter(i => i.id !== productId);
            saveDatabase();
            showToast("Product deleted from inventory", "warning");
            renderAll();
        }
    }
}

// Open modal: Update Stock Level (Quick action)
function openStockModal(productId) {
    const modal = document.getElementById("stock-modal");
    const item = state.items.find(i => i.id === productId);
    if (item) {
        selectedProductForStock = item;
        document.getElementById("stock-item-id").value = item.id;
        document.getElementById("stock-modal-item-name").textContent = item.name;
        document.getElementById("stock-modal-item-qty").textContent = item.qty;
        document.getElementById("stock-qty-input").value = 5;
        modal.classList.add("modal-open");
    }
}

function submitStockUpdate() {
    if (!selectedProductForStock) return;
    
    const qtyInputVal = parseInt(document.getElementById("stock-qty-input").value) || 0;
    const action = document.querySelector("input[name='stock-action']:checked").value;
    
    const item = state.items.find(i => i.id === selectedProductForStock.id);
    if (item) {
        if (action === "add") {
            item.qty += qtyInputVal;
            showToast(`Added ${qtyInputVal} units of stock to ${item.name}`, "success");
        } else if (action === "reduce") {
            if (item.qty < qtyInputVal) {
                showToast(`Cannot deduct ${qtyInputVal} units. Only ${item.qty} units available!`, "error");
                return;
            }
            item.qty -= qtyInputVal;
            showToast(`Reduced ${qtyInputVal} units of stock from ${item.name}`, "warning");
        } else if (action === "set") {
            item.qty = qtyInputVal;
            showToast(`Set stock to ${qtyInputVal} units for ${item.name}`, "success");
        }
        saveDatabase();
        closeAllModals();
        renderAll();
    }
}

// Open modal: Edit Prices (Quick action)
function openPriceModal(productId) {
    const modal = document.getElementById("price-modal");
    const item = state.items.find(i => i.id === productId);
    if (item) {
        selectedProductForPrice = item;
        document.getElementById("price-item-id").value = item.id;
        document.getElementById("price-modal-item-name").textContent = item.name;
        document.getElementById("price-buy-input").value = item.buyRate;
        document.getElementById("price-sell-input").value = item.sellRate;
        
        // Calculate original profit margin
        const profit = item.sellRate - item.buyRate;
        const marginPct = item.sellRate > 0 ? (profit / item.sellRate) * 100 : 0;
        const previewEl = document.getElementById("price-margin-preview");
        previewEl.textContent = `₹${profit.toFixed(2)} (${marginPct.toFixed(2)}%)`;
        previewEl.className = profit < 0 ? "text-rose" : "text-emerald";

        modal.classList.add("modal-open");
    }
}

function submitPriceUpdate() {
    if (!selectedProductForPrice) return;
    
    const buyVal = parseFloat(document.getElementById("price-buy-input").value) || 0;
    const sellVal = parseFloat(document.getElementById("price-sell-input").value) || 0;

    const item = state.items.find(i => i.id === selectedProductForPrice.id);
    if (item) {
        item.buyRate = buyVal;
        item.sellRate = sellVal;
        
        saveDatabase();
        closeAllModals();
        showToast(`Updated rates for ${item.name}`, "success");
        renderAll();
    }
}

// Backup & Database management utils
function exportDatabase() {
    const jsonStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(jsonStr);
    
    const exportFileDefaultName = `deerash_shop_backup_${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast("Database exported successfully", "success");
}

function importDatabase(event) {
    const input = event.target;
    const reader = new FileReader();
    
    reader.onload = function() {
        try {
            const importedState = JSON.parse(reader.result);
            // Rough schema validation
            if (importedState.items && Array.isArray(importedState.items)) {
                state = importedState;
                if (!state.companies) state.companies = [];
                saveDatabase();
                showToast("Database restored successfully!", "success");
                renderAll();
                closeAllModals();
            } else {
                showToast("Invalid backup file structure!", "error");
            }
        } catch (e) {
            showToast("Failed to parse JSON file", "error");
        }
    };
    
    if (input.files && input.files[0]) {
        reader.readAsText(input.files[0]);
    }
}

function clearDatabase() {
    if (confirm("WARNING: Are you sure you want to wipe all store settings, inventory items, and transaction history? This cannot be undone.")) {
        localStorage.removeItem("deerash_shop_db");
        state = {
            items: [],
            transactions: [],
            companies: [],
            shop: {
                name: "DEESHMA STATIONERY",
                address: "2/179, East Street, Kallapalayam, Coimbatore - 641 201.",
                phone: "0422-225 2159, Mobile: 936393 2159",
                email: "deeshmastationery@gmail.com",
                msme: "UDYAM-TN-03-0205844",
                gstin: "33ALDPV4275A1ZA",
                bankName: "STATE BANK OF INDIA",
                bankBranch: "Chettipalayam Branch",
                bankAcc: "42936723322",
                bankIfsc: "SBIN0002208",
                upi: "deeshmastationery@okaxis",
                lowStockThreshold: 5
            }
        };
        showToast("Database wiped. App reset to defaults.", "warning");
        renderAll();
    }
}

// Toast alerts system helper
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconName = "check-circle";
    if (type === "error") iconName = "alert-circle";
    else if (type === "warning") iconName = "alert-triangle";
    
    toast.innerHTML = `
        <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
        <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.add("fadeOut");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ==========================================
// COMPANIES CRUD & BILLING INTEGRATION LOGIC
// ==========================================

// RENDER: Companies Tab list
function renderCompaniesList() {
    const tbody = document.getElementById("companies-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchQuery = document.getElementById("company-search-input").value.trim().toLowerCase();
    let filteredList = state.companies || [];

    if (searchQuery) {
        filteredList = filteredList.filter(c => 
            (c.name || "").toLowerCase().includes(searchQuery) ||
            (c.gstNumber || "").toLowerCase().includes(searchQuery) ||
            (c.address || "").toLowerCase().includes(searchQuery)
        );
    }

    // Sort alphabetically by company name
    filteredList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No matching companies found. Click "Add New Company" to register.</td></tr>`;
        return;
    }

    filteredList.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong class="clickable-company-name" onclick="showCompanyHistory('${c.id}')" title="Click to view history">${c.name}</strong></td>
            <td>${c.address || '<span class="text-muted">N/A</span>'}</td>
            <td><code>${c.gstNumber || '<span class="text-muted">N/A</span>'}</code></td>
            <td class="text-center">
                <div class="action-cell">
                    <button class="btn btn-outline btn-sm btn-icon-only" title="Edit Company" onclick="openCompanyModal('${c.id}')">
                        <i data-lucide="edit"></i>
                    </button>
                    <button class="btn btn-danger-outline btn-sm btn-icon-only" title="Delete Company" onclick="deleteCompany('${c.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// Open modal: Add/Edit Company
function openCompanyModal(companyId = null) {
    const modal = document.getElementById("company-modal");
    const form = document.getElementById("company-form");
    const title = document.getElementById("company-modal-title");

    form.reset();

    if (companyId) {
        title.textContent = "Edit Company Details";
        const company = state.companies.find(c => c.id === companyId);
        if (company) {
            document.getElementById("company-id").value = company.id;
            document.getElementById("company-form-name").value = company.name;
            document.getElementById("company-form-gst").value = company.gstNumber || "";
            document.getElementById("company-form-address").value = company.address;
        }
    } else {
        title.textContent = "Add New Company";
        document.getElementById("company-id").value = "";
    }

    modal.classList.add("modal-open");
    document.getElementById("company-form-name").focus();
}

// Save Company (Create/Update)
function saveCompany() {
    const id = document.getElementById("company-id").value;
    const name = document.getElementById("company-form-name").value.trim();
    const gstNumber = document.getElementById("company-form-gst").value.trim().toUpperCase();
    const address = document.getElementById("company-form-address").value.trim();

    if (!name || !address) {
        showToast("Please fill all required fields", "error");
        return;
    }

    if (id) {
        // Edit existing
        const company = state.companies.find(c => c.id === id);
        if (company) {
            company.name = name;
            company.gstNumber = gstNumber;
            company.address = address;
            showToast("Company updated successfully", "success");
        }
    } else {
        // Add new
        const newCompany = {
            id: Date.now().toString(),
            name,
            gstNumber,
            address
        };
        state.companies.push(newCompany);
        showToast("Company added successfully", "success");
    }

    saveDatabase();
    closeAllModals();
    renderAll();
}

// Delete Company
function deleteCompany(companyId) {
    const company = state.companies.find(c => c.id === companyId);
    if (company) {
        if (confirm(`Are you sure you want to delete company "${company.name}"?`)) {
            state.companies = state.companies.filter(c => c.id !== companyId);
            saveDatabase();
            showToast("Company deleted", "warning");
            renderAll();
        }
    }
}

// RENDER: POS Company Selector Select Options
function renderCompanySelect() {
    const select = document.getElementById("bill-company-select");
    if (!select) return;
    
    // Save current selection to restore if possible
    const currentVal = select.value;
    
    select.innerHTML = '<option value="">-- Select Billing Company --</option>';
    
    const sorted = [...(state.companies || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    sorted.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.name;
        select.appendChild(option);
    });
    
    // Set first company by default if nothing selected yet and list has companies
    if (currentVal && sorted.some(c => c.id === currentVal)) {
        select.value = currentVal;
    } else if (sorted.length > 0) {
        // Auto-select first company
        select.value = sorted[0].id;
    }
    
    updateSelectedCompanyPreview();
}

// Update the preview panel in Billing screen
function updateSelectedCompanyPreview() {
    const select = document.getElementById("bill-company-select");
    const nameEl = document.getElementById("bill-company-name-display");
    const gstEl = document.getElementById("bill-company-gst-display");
    const addressEl = document.getElementById("bill-company-address-display");
    const deliveryNoteInput = document.getElementById("bill-delivery-note");
    
    if (!select || !nameEl) return;
    
    // Always calculate next sequential invoice number overall
    let maxInvoice = 0;
    if (state.transactions && Array.isArray(state.transactions)) {
        state.transactions.forEach(t => {
            const num = parseInt(t.id, 10);
            if (!isNaN(num) && num > maxInvoice) {
                maxInvoice = num;
            }
        });
    }
    if (deliveryNoteInput) {
        deliveryNoteInput.placeholder = `Next: ${maxInvoice + 1}`;
    }

    const companyId = select.value;
    if (companyId) {
        const company = state.companies.find(c => c.id === companyId);
        if (company) {
            nameEl.textContent = company.name;
            gstEl.textContent = company.gstNumber || "N/A";
            addressEl.textContent = company.address;
            return;
        }
    }
    
    nameEl.textContent = "No Company Selected";
    gstEl.textContent = "N/A";
    addressEl.textContent = "N/A";
}

// Open modal: Company Transaction History
function showCompanyHistory(companyId) {
    const company = state.companies.find(c => c.id === companyId);
    if (!company) return;

    // Set company details in UI
    document.getElementById("history-company-name").textContent = company.name;
    document.getElementById("history-company-gst").textContent = `GSTIN: ${company.gstNumber || "N/A"}`;
    document.getElementById("history-company-address").textContent = `Address: ${company.address}`;

    // Filter transactions for this company
    const companyTransactions = state.transactions.filter(t => t.customerName === company.name);
    
    // Sort transactions reverse chronological (newest first)
    companyTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Stats
    const totalOrders = companyTransactions.length;
    const totalValue = companyTransactions.reduce((sum, t) => sum + t.grandTotal, 0);

    document.getElementById("history-stat-orders").textContent = totalOrders;
    document.getElementById("history-stat-value").textContent = `₹${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Render table rows
    const tbody = document.getElementById("company-history-tbody");
    tbody.innerHTML = "";

    if (companyTransactions.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No purchase records found for this company.</td></tr>`;
    } else {
        companyTransactions.forEach(t => {
            const dateObj = new Date(t.timestamp);
            const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${t.id}</strong></td>
                <td>${dateStr}</td>
                <td class="text-right">₹${t.subtotal.toFixed(2)}</td>
                <td class="text-right">${t.gstRateOverride}%</td>
                <td class="text-right">₹${t.gstAmount.toFixed(2)}</td>
                <td class="text-right"><strong>₹${t.grandTotal.toFixed(2)}</strong></td>
                <td class="text-center">
                    <div class="action-cell" style="justify-content: center; gap: 4px;">
                        <button class="btn btn-outline btn-sm btn-icon-only" title="Reprint Invoice" onclick="reprintInvoiceFromHistory('${t.uniqueId || t.id}')">
                            <i data-lucide="printer"></i>
                        </button>
                        <button class="btn btn-outline btn-sm btn-icon-only" title="Convert to Excel" onclick="exportSingleInvoiceToExcel('${t.uniqueId || t.id}')">
                            <i data-lucide="file-spreadsheet"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Open modal
    const modal = document.getElementById("company-history-modal");
    modal.classList.add("modal-open");
    
    // Create lucide icons for table
    lucide.createIcons();
}

function reprintInvoiceFromHistory(uniqueId) {
    reprintInvoice(uniqueId);
}

// Convert Sales History to Excel sheet
function exportTransactionsToExcel() {
    const searchQuery = document.getElementById("transaction-search-input").value.trim().toLowerCase();
    let filteredList = state.transactions || [];

    if (searchQuery) {
        filteredList = filteredList.filter(t => 
            t.id.toLowerCase().includes(searchQuery) ||
            t.customerName.toLowerCase().includes(searchQuery)
        );
    }

    // Sort by Invoice No ascending
    const exportList = [...filteredList].sort((a, b) => {
        const numA = parseInt(a.id, 10);
        const numB = parseInt(b.id, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        return new Date(a.timestamp) - new Date(b.timestamp);
    });

    if (exportList.length === 0) {
        showToast("No sales transactions to export!", "warning");
        return;
    }

    // Map columns for Excel
    const rows = exportList.map(t => {
        const dateObj = new Date(t.timestamp);
        const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
        
        const itemsSummary = t.items.map(item => `${item.name} (${item.qty} x ₹${item.sellRate})`).join(", ");

        return {
            "Invoice No": t.id,
            "Date & Time": dateStr,
            "Customer Name": t.customerName,
            "Customer Phone": t.customerPhone || "N/A",
            "Customer GSTIN": t.customerGstin || "N/A",
            "Items Summary": itemsSummary,
            "Subtotal (₹)": parseFloat(t.subtotal.toFixed(2)),
            "GST Rate (%)": t.gstRateOverride,
            "GST Amount (₹)": parseFloat(t.gstAmount.toFixed(2)),
            "Grand Total (₹)": parseFloat(t.grandTotal.toFixed(2))
        };
    });

    generateExcel(rows);
}

function generateExcel(rows) {
    try {
        if (typeof XLSX === 'undefined') {
            showToast("Excel exporter library is not loaded.", "error");
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sales History");

        // Auto-fit column widths
        const maxKeys = Object.keys(rows[0]);
        const wscols = maxKeys.map(key => {
            let maxLen = key.length;
            rows.forEach(row => {
                const val = row[key] ? row[key].toString() : "";
                if (val.length > maxLen) {
                    maxLen = val.length;
                }
            });
            return { wch: maxLen + 3 };
        });
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `Sales_History_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast("Excel exported successfully!", "success");
    } catch (error) {
        console.error("Excel export error:", error);
        showToast("Error exporting Excel file.", "error");
    }
}

// Function to export a single transaction/bill to a formatted Excel file
function exportSingleInvoiceToExcel(uniqueId) {
    const t = state.transactions.find(trans => (trans.uniqueId === uniqueId || trans.id === uniqueId));
    if (!t) {
        showToast("Invoice not found!", "error");
        return;
    }

    const dateObj = new Date(t.timestamp);
    const formattedDate = dateObj.toLocaleDateString("en-IN", {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const cgstRate = t.gstRateOverride / 2;
    const sgstRate = t.gstRateOverride / 2;
    const cgstAmount = t.subtotal * (cgstRate / 100);
    const sgstAmount = t.subtotal * (sgstRate / 100);
    const grandTotalRounded = Math.round(t.grandTotal);
    const roundOff = grandTotalRounded - t.grandTotal;

    const data = [
        ["TAX INVOICE", "", "", "", "", "", "", "", ""],
        [],
        ["SHOP DETAILS", "", "", "", "INVOICE DETAILS", "", "", "", ""],
        ["Shop Name:", state.shop.name, "", "", "Invoice No:", t.id, "", "", ""],
        ["Address:", state.shop.address, "", "", "Invoice Date:", formattedDate, "", "", ""],
        ["Phone:", state.shop.phone, "", "", "Delivery Note No:", t.deliveryNote || "", "", "", ""],
        ["GSTIN:", state.shop.gstin || "N/A", "", "", "Order No & Date:", `${t.orderNo || ""} / ${t.orderDate || ""}`, "", "", ""],
        ["MSME:", state.shop.msme || "N/A", "", "", "Payment Terms:", t.paymentTerms || "", "", "", ""],
        ["Email:", state.shop.email || "N/A", "", "", "Mode of Dispatch:", t.dispatchMode || "", "", "", ""],
        [],
        ["BUYER DETAILS", "", "", "", "CONSIGNEE DETAILS", "", "", "", ""],
        ["Name:", t.customerName, "", "", "Name:", t.customerName, "", "", ""],
        ["Address:", t.customerAddress || "N/A", "", "", "Address:", t.customerAddress || "N/A", "", "", ""],
        ["GSTIN:", t.customerGstin || "N/A", "", "", "GSTIN:", t.customerGstin || "N/A", "", "", ""],
        [],
        ["S.No.", "Description", "HSN Code", "GST Rate", "Qty", "Rate (₹)", "Taxable Value (₹)", "GST Amount (₹)", "Total (₹)"]
    ];

    // Add items
    t.items.forEach((item, index) => {
        data.push([
            index + 1,
            item.name,
            item.hsn,
            `${item.gstRate || t.gstRateOverride}%`,
            item.qty,
            parseFloat(item.sellRate.toFixed(2)),
            parseFloat((item.qty * item.sellRate).toFixed(2)),
            parseFloat(item.gstAmount.toFixed(2)),
            parseFloat(item.total.toFixed(2))
        ]);
    });

    // Add summary rows
    data.push([]);
    data.push(["", "", "", "", "", "Subtotal:", parseFloat(t.subtotal.toFixed(2)), "", ""]);
    data.push(["", "", "", "", "", `CGST (${cgstRate}%):`, parseFloat(cgstAmount.toFixed(2)), "", ""]);
    data.push(["", "", "", "", "", `SGST (${sgstRate}%):`, parseFloat(sgstAmount.toFixed(2)), "", ""]);
    if (Math.abs(roundOff) > 0.001) {
        data.push(["", "", "", "", "", "Round Off:", parseFloat(roundOff.toFixed(2)), "", ""]);
    }
    data.push(["", "", "", "", "", "Grand Total:", parseFloat(grandTotalRounded.toFixed(2)), "", ""]);

    try {
        if (typeof XLSX === 'undefined') {
            showToast("Excel exporter library is not loaded.", "error");
            return;
        }

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        
        // Setup merges to match section headers
        worksheet["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title Header
            { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }, // Shop Details Header
            { s: { r: 2, c: 4 }, e: { r: 2, c: 6 } }, // Invoice Details Header
            { s: { r: 10, c: 0 }, e: { r: 10, c: 2 } }, // Buyer Details Header
            { s: { r: 10, c: 4 }, e: { r: 10, c: 6 } }  // Consignee Details Header
        ];

        // Specify column widths
        const wscols = [
            { wch: 10 },  // S.No / Label
            { wch: 35 },  // Description / Name
            { wch: 12 },  // HSN Code
            { wch: 10 },  // GST Rate
            { wch: 8 },   // Qty
            { wch: 15 },  // Rate / Summary Title
            { wch: 18 },  // Taxable Value / Summary Val
            { wch: 15 },  // GST Amount
            { wch: 15 }   // Total
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Invoice ${t.id}`);

        XLSX.writeFile(workbook, `Invoice_${t.id}.xlsx`);
        showToast(`Invoice ${t.id} exported to Excel!`, "success");
    } catch (error) {
        console.error("Excel single export error:", error);
        showToast("Error exporting invoice to Excel.", "error");
    }
}

