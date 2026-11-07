const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE = {
  accounts: "sharesphere_demo_accounts_v1",
  donations: "sharesphere_demo_donations_v1",
  session: "sharesphere_demo_session_v1",
  requests: "sharesphere_demo_requests_v1"
};

const starterDonations = [
  {
    id: "seed-1",
    title: "Fresh grocery bundle",
    category: "Food",
    description: "A small bundle of sealed pantry essentials for a household.",
    location: "Multan Cantt",
    donor: "Community donor",
    emoji: "🥫"
  },
  {
    id: "seed-2",
    title: "Warm winter clothes",
    category: "Clothes",
    description: "Clean, gently used sweaters and shawls ready for a new home.",
    location: "Mumtazabad, Multan",
    donor: "Community donor",
    emoji: "🧥"
  },
  {
    id: "seed-3",
    title: "School books bundle",
    category: "Books",
    description: "Useful school books and notebooks for students.",
    location: "Shah Rukn-e-Alam, Multan",
    donor: "Community donor",
    emoji: "📚"
  },
  {
    id: "seed-4",
    title: "Study headphones",
    category: "Electronics",
    description: "A working pair of headphones for study.",
    location: "Multan",
    donor: "Community donor",
    emoji: "🎧"
  },
  {
    id: "seed-5",
    title: "Kitchen essentials",
    category: "Home items",
    description: "Clean, reusable household items in good condition.",
    location: "Bosan Road, Multan",
    donor: "Community donor",
    emoji: "🍽️"
  },
  {
    id: "seed-6",
    title: "Art and craft supplies",
    category: "Other",
    description: "Paper, pencils, and craft materials for creative projects.",
    location: "Multan",
    donor: "Community donor",
    emoji: "🎨"
  }
];

const categoryEmoji = {
  Food: "🥫",
  Clothes: "🧥",
  Books: "📚",
  Electronics: "🎧",
  "Home items": "🏠",
  Other: "🎁"
};

let selectedRole = "Donor";
let authMode = "login";
let activeRequestItem = null;
let toastTimer;

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast("Could not save data in this browser.");
    return false;
  }
}

function getDonations() {
  const saved = readStore(STORAGE.donations, null);

  if (saved === null) {
    writeStore(STORAGE.donations, starterDonations);
    return [...starterDonations];
  }

  return Array.isArray(saved) ? saved : [...starterDonations];
}

function getSession() {
  return readStore(STORAGE.session, null);
}

function currentAccount() {
  const session = getSession();

  if (!session) return null;

  return readStore(STORAGE.accounts, []).find(
    account => account.id === session.accountId
  ) || null;
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function openDialog(id) {
  const dialog = document.getElementById(id);

  if (dialog && !dialog.open) {
    dialog.showModal();
  }
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

function updateHeader() {
  const account = currentAccount();

  $("#loginBtn").textContent = account ? "Log out" : "Log in";
  $("#joinBtn").textContent = account ? "My account" : "Join ShareSphere";

  const accounts = readStore(STORAGE.accounts, []);
  $("#communityCount").textContent = `${120 + accounts.length}+`;
}

function renderDonations() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const category = $("#categoryFilter").value;

  const items = getDonations().filter(item => {
    const matchesCategory =
      category === "All" || item.category === category;

    const searchableText = [
      item.title,
      item.description,
      item.location,
      item.category,
      item.donor
    ].join(" ").toLowerCase();

    return matchesCategory && searchableText.includes(query);
  });

  $("#donationGrid").innerHTML = items.map(item => {
    const slug = item.category.toLowerCase().replaceAll(" ", "-");
    const emoji = item.emoji || categoryEmoji[item.category] || "🎁";

    return `
      <article class="donation-card">
        <div class="item-art ${slug}">
          <span class="category-tag">${escapeHTML(item.category)}</span>
          <span aria-hidden="true">${emoji}</span>
        </div>

        <div class="item-body">
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.description)}</p>

          <div class="item-meta">
            <span>⌖ ${escapeHTML(item.location)}</span>
            <span>♡ ${escapeHTML(item.donor || "Community donor")}</span>
          </div>

          <button
            class="btn btn-primary request-button"
            data-item-id="${escapeHTML(item.id)}"
          >
            Request item ↗
          </button>
        </div>
      </article>
    `;
  }).join("");

  $("#emptyState").classList.toggle("hidden", items.length > 0);
}

function openAuth(mode, role = selectedRole) {
  authMode = mode;
  selectedRole = role;

  const isRegister = mode === "register";

  $("#authKicker").textContent = isRegister
    ? `JOIN AS A ${role.toUpperCase()}`
    : "YOUR COMMUNITY ACCOUNT";

  $("#authTitle").textContent = isRegister
    ? "Create your account"
    : "Welcome back";

  $("#authDescription").textContent = isRegister
    ? "Join a community that believes in sharing."
    : "Log in to continue sharing.";

  $("#nameField").classList.toggle("hidden", !isRegister);

  $("#orgField").classList.toggle(
    "hidden",
    !(isRegister && role === "NGO")
  );

  $("#fullName").required = isRegister;
  $("#orgName").required = isRegister && role === "NGO";

  $("#password").autocomplete = isRegister
    ? "new-password"
    : "current-password";

  $("#authSubmit").textContent = isRegister
    ? "Create account"
    : "Log in";

  $("#authSwitch").innerHTML = isRegister
    ? 'Already have an account? <button type="button" id="switchToLogin">Log in</button>'
    : 'New to ShareSphere? <button type="button" id="switchToRegister">Create an account</button>';

  $("#authForm").reset();

  closeDialog($("#roleDialog"));
  openDialog("authDialog");
}

function updateAuthView() {
  const account = currentAccount();

  $("#loginBtn").textContent = account ? "Log out" : "Log in";
  $("#joinBtn").textContent = account ? "My account" : "Join ShareSphere";
}

function handleLoginClick() {
  if (currentAccount()) {
    writeStore(STORAGE.session, null);
    updateAuthView();
    showToast("You have logged out.");
  } else {
    openAuth("login");
  }
}

/* Header and navigation buttons */

$("#loginBtn").addEventListener("click", handleLoginClick);

$("#joinBtn").addEventListener("click", () => {
  if (currentAccount()) {
    showToast(`Signed in as ${currentAccount().name}.`);
  } else {
    openDialog("roleDialog");
  }
});

$("#heroDonateBtn").addEventListener("click", () => {
  currentAccount()
    ? openDialog("donationDialog")
    : openDialog("roleDialog");
});

$("#allDonationsBtn").addEventListener("click", () => {
  currentAccount()
    ? openDialog("donationDialog")
    : openDialog("roleDialog");
});

$("#ctaJoinBtn").addEventListener("click", () => {
  currentAccount()
    ? openDialog("donationDialog")
    : openDialog("roleDialog");
});

/* Close modal buttons */

$$("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    closeDialog(button.closest("dialog"));
  });
});

$$("dialog").forEach(dialog => {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) {
      closeDialog(dialog);
    }
  });
});

/* Donor and NGO role selection */

$$("[data-role]").forEach(button => {
  button.addEventListener("click", () => {
    openAuth("register", button.dataset.role);
  });
});

/* Mobile menu */

$("#menuToggle").addEventListener("click", () => {
  const isOpen = $("#navLinks").classList.toggle("open");

  $("#menuToggle").setAttribute(
    "aria-expanded",
    String(isOpen)
  );
});

$("#navLinks").querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    $("#navLinks").classList.remove("open");
    $("#menuToggle").setAttribute("aria-expanded", "false");
  });
});

/* Search and category filters */

$("#searchInput").addEventListener("input", renderDonations);
$("#categoryFilter").addEventListener("change", renderDonations);

/* Switch between login and registration */

document.addEventListener("click", event => {
  if (event.target.closest("#switchToRegister")) {
    openAuth("register", selectedRole);
  }

  if (event.target.closest("#switchToLogin")) {
    openAuth("login", selectedRole);
  }
});

/* Account registration and login */

$("#authForm").addEventListener("submit", event => {
  event.preventDefault();

  const email = $("#email").value.trim().toLowerCase();
  const password = $("#password").value;
  let accounts = readStore(STORAGE.accounts, []);

  if (authMode === "register") {
    const name = $("#fullName").value.trim();
    const orgName = $("#orgName").value.trim();

    if (!name) {
      showToast("Please enter your name.");
      return;
    }

    if (selectedRole === "NGO" && !orgName) {
      showToast("Please enter your organization name.");
      return;
    }

    if (accounts.some(account => account.email === email)) {
      showToast("This email already has an account. Please log in.");
      return;
    }

    const account = {
      id: `account-${Date.now()}`,
      name,
      orgName,
      email,
      password,
      role: selectedRole
    };

    accounts.push(account);

    if (!writeStore(STORAGE.accounts, accounts)) return;
    if (!writeStore(STORAGE.session, { accountId: account.id })) return;

    closeDialog($("#authDialog"));
    updateHeader();

    showToast(`Welcome to ShareSphere, ${name}!`);
    return;
  }

  const account = accounts.find(
    item => item.email === email && item.password === password
  );

  if (!account) {
    showToast("Incorrect details. Create an account first if you are new.");
    return;
  }

  writeStore(STORAGE.session, { accountId: account.id });

  closeDialog($("#authDialog"));
  updateHeader();

  showToast(`Welcome back, ${account.name}!`);
});

/* Publish a donation */

$("#donationForm").addEventListener("submit", event => {
  event.preventDefault();

  const account = currentAccount();

  if (!account) {
    closeDialog($("#donationDialog"));
    openDialog("roleDialog");
    showToast("Please join or log in before sharing an item.");
    return;
  }

  const category = $("#itemCategory").value;

  const item = {
    id: `item-${Date.now()}`,
    title: $("#itemTitle").value.trim(),
    category,
    description: $("#itemDescription").value.trim(),
    location: $("#itemLocation").value.trim(),
    donor: account.name || account.orgName || "Community member",
    emoji: categoryEmoji[category] || "🎁"
  };

  const items = getDonations();
  items.unshift(item);

  if (!writeStore(STORAGE.donations, items)) return;

  $("#donationForm").reset();
  closeDialog($("#donationDialog"));

  $("#searchInput").value = "";
  $("#categoryFilter").value = "All";

  renderDonations();

  showToast("Your item has been added to the donation listings.");

  $("#donations").scrollIntoView({ behavior: "smooth" });
});

/* Request a listed donation */

document.addEventListener("click", event => {
  const button = event.target.closest(".request-button");

  if (!button) return;

  const item = getDonations().find(
    donation => donation.id === button.dataset.itemId
  );

  if (!item) {
    showToast("This item could not be found.");
    return;
  }

  const account = currentAccount();

  if (!account) {
    showToast("Please log in or join to request an item.");
    openDialog("roleDialog");
    return;
  }

  activeRequestItem = item;

  $("#requestItemName").textContent = `Request: ${item.title}`;
  $("#requesterName").value = account.name || account.orgName || "";
  $("#requesterEmail").value = account.email || "";

  openDialog("requestDialog");
});

$("#requestForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!activeRequestItem) return;

  const requests = readStore(STORAGE.requests, []);

  requests.push({
    id: `request-${Date.now()}`,
    itemId: activeRequestItem.id,
    itemTitle: activeRequestItem.title,
    requester: $("#requesterName").value.trim(),
    email: $("#requesterEmail").value.trim(),
    message: $("#requestMessage").value.trim(),
    createdAt: new Date().toISOString()
  });

  if (!writeStore(STORAGE.requests, requests)) return;

  $("#requestForm").reset();
  closeDialog($("#requestDialog"));

  activeRequestItem = null;

  showToast("Your request has been saved in this browser.");
});

/* Start the website */

$("#year").textContent = new Date().getFullYear();

getDonations();
renderDonations();
updateHeader();
