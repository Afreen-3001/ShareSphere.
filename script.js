const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const API = "api/";

let selectedRole = "Donor";
let authMode = "login";
let activeRequestItem = null;
let donations = [];
let toastTimer;

const categoryEmoji = {
  Food: "🥫",
  Clothes: "🧥",
  Books: "📚",
  Electronics: "🎧",
  "Home items": "🏠",
  Other: "🎁"
};

// ---------- API CONNECTION ----------

async function apiRequest(file, method = "GET", data = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" }
  };

  if (data !== null) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(API + file, options);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Something went wrong.");
  }

  return result;
}

// ---------- USER SESSION ----------

function getSession() {
  try {
    return JSON.parse(localStorage.getItem("sharesphere_session"));
  } catch {
    return null;
  }
}

function currentAccount() {
  return getSession();
}

function saveSession(user) {
  localStorage.setItem("sharesphere_session", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("sharesphere_session");
}

function updateHeader() {
  const account = currentAccount();

  $("#loginBtn").textContent = account ? "Log out" : "Log in";
  $("#joinBtn").textContent = account ? "My account" : "Join ShareSphere";
  $("#communityCount").textContent = "120+";
}

// ---------- TOAST AND DIALOGS ----------

function showToast(message) {
  const toast = $("#toast");
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

function openRoleDialog() {
  openDialog("roleDialog");
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

function openRegisterForRole(role) {
  selectedRole = role;
  openAuth("register", role);
}

// ---------- DONATIONS ----------

function displayCategory(category) {
  const categories = {
    food: "Food",
    clothes: "Clothes",
    books: "Books",
    electronics: "Electronics",
    "home items": "Home items",
    other: "Other"
  };

  return categories[String(category).toLowerCase()] || category;
}

async function loadDonations() {
  try {
    const result = await apiRequest("donations.php");

    donations = result.donations
      .filter(item => item.status === "available")
      .map(item => ({
        ...item,
        category: displayCategory(item.category),
        donor: item.donor_name || "Community donor",
        emoji: categoryEmoji[displayCategory(item.category)] || "🎁"
      }));

    renderDonations();
  } catch (error) {
    showToast("Could not load donations. Check XAMPP and MySQL.");
    console.error(error);
  }
}

function renderDonations() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const category = $("#categoryFilter").value;

  const items = donations.filter(item => {
    const matchesCategory =
      category === "All" || item.category === category;

    const searchableText =
      `${item.title} ${item.description} ${item.location} ${item.category} ${item.donor}`.toLowerCase();

    return matchesCategory && searchableText.includes(query);
  });

  $("#donationGrid").innerHTML = items.map(item => {
    const slug = item.category.toLowerCase().replaceAll(" ", "-");

    return `
      <article class="donation-card">
        <div class="item-art ${slug}">
          <span class="category-tag">${escapeHTML(item.category)}</span>
          <span aria-hidden="true">${item.emoji}</span>
        </div>

        <div class="item-body">
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.description)}</p>

          <div class="item-meta">
            <span>⌖ ${escapeHTML(item.location)}</span>
            <span>♡ ${escapeHTML(item.donor)}</span>
          </div>

          <button
            class="btn btn-primary request-button"
            data-item-id="${escapeHTML(item.id)}">
            Request item ↗
          </button>
        </div>
      </article>
    `;
  }).join("");

  $("#emptyState").classList.toggle("hidden", items.length > 0);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

// ---------- LOGIN AND LOGOUT ----------

function handleLoginClick() {
  if (currentAccount()) {
    clearSession();
    updateHeader();
    showToast("You have logged out.");
  } else {
    openAuth("login");
  }
}

$("#loginBtn").addEventListener("click", handleLoginClick);

$("#joinBtn").addEventListener("click", () => {
  if (currentAccount()) {
    showToast(`Signed in as ${currentAccount().name}.`);
  } else {
    openRoleDialog();
  }
});

// ---------- NAVIGATION ----------

$("#heroDonateBtn").addEventListener("click", () => {
  if (currentAccount()) {
    openDialog("donationDialog");
  } else {
    openRoleDialog();
  }
});

$("#allDonationsBtn").addEventListener("click", () => {
  if (currentAccount()) {
    openDialog("donationDialog");
  } else {
    openRoleDialog();
  }
});

$("#ctaJoinBtn").addEventListener("click", () => {
  if (currentAccount()) {
    openDialog("donationDialog");
  } else {
    openRoleDialog();
  }
});

$$("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    closeDialog(button.closest("dialog"));
  });
});

$$("dialog").forEach(dialog => {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

$$("[data-role]").forEach(button => {
  button.addEventListener("click", () => {
    openRegisterForRole(button.dataset.role);
  });
});

$("#navLinks a").forEach(link => {
  link.addEventListener("click", () => {
    $("#navLinks").classList.remove("open");
    $("#menuToggle").setAttribute("aria-expanded", "false");
  });
});

$("#menuToggle").addEventListener("click", () => {
  const isOpen = $("#navLinks").classList.toggle("open");
  $("#menuToggle").setAttribute("aria-expanded", String(isOpen));
});

$("#searchInput").addEventListener("input", renderDonations);
$("#categoryFilter").addEventListener("change", renderDonations);

// ---------- SWITCH LOGIN / REGISTER AND REQUEST ITEM ----------

document.addEventListener("click", event => {
  const registerButton = event.target.closest("#switchToRegister");
  const loginButton = event.target.closest("#switchToLogin");

  if (registerButton) openAuth("register", selectedRole);
  if (loginButton) openAuth("login", selectedRole);

  const requestButton = event.target.closest(".request-button");

  if (requestButton) {
    const item = donations.find(
      donation => donation.id == requestButton.dataset.itemId
    );

    if (!item) {
      return showToast("This donation could not be found.");
    }

    const account = currentAccount();

    if (!account) {
      showToast("Please log in first.");
      openRoleDialog();
      return;
    }

    if (account.role !== "ngo") {
      showToast("Only NGO accounts can request donations.");
      return;
    }

    activeRequestItem = item;

    $("#requestItemName").textContent = `Request: ${item.title}`;
    $("#requesterName").value = account.name || "";
    $("#requesterEmail").value = account.email || "";

    openDialog("requestDialog");
  }
});

// ---------- REGISTER AND LOGIN FORM ----------

$("#authForm").addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("#email").value.trim().toLowerCase();
  const password = $("#password").value;

  try {
    if (authMode === "register") {
      const name = $("#fullName").value.trim();
      const organization = $("#orgName").value.trim();

      if (!name) {
        return showToast("Please enter your name.");
      }

      if (selectedRole === "NGO" && !organization) {
        return showToast("Please enter your organization name.");
      }

      if (password.length < 8) {
        return showToast("Password must contain at least 8 characters.");
      }

      const role = selectedRole.toLowerCase();

      await apiRequest("register.php", "POST", {
        name: name,
        email: email,
        password: password,
        role: role,
        organization_name: organization
      });

      // Log in after successful registration.
      const loginResult = await apiRequest("login.php", "POST", {
        email: email,
        password: password
      });

      saveSession(loginResult.user);

      closeDialog($("#authDialog"));
      updateHeader();

      showToast(`Welcome to ShareSphere, ${loginResult.user.name}!`);

    } else {
      const result = await apiRequest("login.php", "POST", {
        email: email,
        password: password
      });

      saveSession(result.user);

      closeDialog($("#authDialog"));
      updateHeader();

      showToast(`Welcome back, ${result.user.name}!`);
    }

  } catch (error) {
    showToast(error.message);
    console.error(error);
  }
});

// ---------- PUBLISH DONATION ----------

$("#donationForm").addEventListener("submit", async event => {
  event.preventDefault();

  const account = currentAccount();

  if (!account) {
    closeDialog($("#donationDialog"));
    return openRoleDialog();
  }

  const category = $("#itemCategory").value.toLowerCase();

  try {
    await apiRequest("donations.php", "POST", {
      donor_id: account.id,
      title: $("#itemTitle").value.trim(),
      category: category,
      description: $("#itemDescription").value.trim(),
      location: $("#itemLocation").value.trim(),
      quantity: "1",
      condition_status: "good"
    });

    $("#donationForm").reset();
    closeDialog($("#donationDialog"));

    $("#categoryFilter").value = "All";
    $("#searchInput").value = "";

    await loadDonations();

    showToast("Your donation has been saved to the database.");

    $("#donations").scrollIntoView({ behavior: "smooth" });

  } catch (error) {
    showToast(error.message);
    console.error(error);
  }
});

// ---------- REQUEST DONATION ----------

$("#requestForm").addEventListener("submit", async event => {
  event.preventDefault();

  const account = currentAccount();

  if (!account || !activeRequestItem) {
    return showToast("Please log in and select a donation.");
  }

  try {
    await apiRequest("requests.php", "POST", {
      donation_id: activeRequestItem.id,
      ngo_id: account.id,
      message: $("#requestMessage").value.trim()
    });

    $("#requestForm").reset();
    closeDialog($("#requestDialog"));

    activeRequestItem = null;

    await loadDonations();

    showToast("Your request has been saved to the database.");

  } catch (error) {
    showToast(error.message);
    console.error(error);
  }
});

// ---------- START WEBSITE ----------

$("#year").textContent = new Date().getFullYear();

updateHeader();
loadDonations();