const PRODUCT_STORAGE_KEY = "paulas-minidonas-products";
const ORDER_STORAGE_KEY = "paulas-minidonas-orders";
const ADMIN_STORAGE_KEY = "paulas-minidonas-admins";
const ADMIN_SESSION_KEY = "paulas-minidonas-admin";
const productImages = {
  fresa: "img/WhatsApp Image 2026-11-16 at 19.43.25.jpeg",
  surtida: "img/WhatsApp Image 2026-11-16 at 19.43.24.jpeg",
  vainilla: "img/WhatsApp Image 2026-11-16 at 19.43.24 (1).jpeg",
  chocolate: "img/WhatsApp Image 2026-11-16 at 19.43.24 (2).jpeg"
};
const categoryNames = {
  fresa: "Fresa",
  surtida: "Surtida",
  vainilla: "Vainilla",
  chocolate: "Chocolate"
};
const statusNames = {
  pending: "Pendiente",
  preparing: "En preparación",
  delivered: "Entregado",
  cancelled: "Cancelado"
};
const defaultProducts = [
  { id: "fresa", name: "Brocheta x3", category: "fresa", description: "Glaseado de fresa, lluvia de colores y un toque de vainilla.", price: 4000, tag: "Fresa", image: productImages.fresa, available: true },
  { id: "fiesta", name: "Caja x9", category: "surtida", description: "Una cajita variada para probar nuestros favoritos de la casa.", price: 18000, tag: "Surtida", image: productImages.surtida, available: true },
  { id: "vainilla", name: "Caja x12", category: "vainilla", description: "Crema suave de vainilla, fruta fresca y flores comestibles.", price: 24000, tag: "Vainilla", image: productImages.vainilla, available: true },
  { id: "chocolate", name: "individual", category: "chocolate", description: "Baño de chocolate, chispitas crujientes y mucho cariño.", price: 1200, tag: "Chocolate", image: productImages.chocolate, available: true }
];
const initialAdmin = { id: "admin-paula", username: "paula", password: "admin123" };
const loginScreen = document.querySelector("#login-screen");
const adminApp = document.querySelector("#admin-app");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const loginHint = document.querySelector("#login-hint");
const toast = document.querySelector("#admin-toast");
const productsList = document.querySelector("#products-list");
const ordersList = document.querySelector("#orders-list");
const adminsList = document.querySelector("#admins-list");
const productDialog = document.querySelector("#product-dialog");
const productForm = document.querySelector("#product-form");
const newAdminDialog = document.querySelector("#new-admin-dialog");
const newAdminForm = document.querySelector("#new-admin-form");
const passwordDialog = document.querySelector("#password-dialog");
const passwordForm = document.querySelector("#password-form");
let toastTimer;
let activeView = "products";
let activeOrderFilter = "all";
let searchQuery = "";
let currentAdminId = null;
let passwordAdminId = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatPrice(value) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

function isValidProduct(product) {
  return product
    && typeof product.id === "string"
    && typeof product.name === "string"
    && typeof product.category === "string"
    && Object.hasOwn(categoryNames, product.category)
    && typeof product.description === "string"
    && Number.isFinite(product.price)
    && product.price >= 0
    && typeof product.available === "boolean";
}

function readProducts() {
  try {
    const stored = localStorage.getItem(PRODUCT_STORAGE_KEY);
    if (stored === null) return [...defaultProducts];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isValidProduct)) {
      throw new TypeError("El catálogo guardado tiene un formato no válido.");
    }
    return parsed;
  } catch (error) {
    console.error("No se pudo leer el catálogo guardado.", error);
    showToast("No pudimos cargar el catálogo guardado; se mostrarán los productos de ejemplo.");
    return [...defaultProducts];
  }
}

function saveProducts() {
  try {
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products));
    return true;
  } catch (error) {
    console.error("No se pudo guardar el catálogo.", error);
    showToast("No se pudieron guardar los cambios del catálogo.");
    return false;
  }
}

function isValidOrder(order) {
  return order
    && typeof order.id === "string"
    && typeof order.customer === "string"
    && Number.isFinite(order.total)
    && Object.hasOwn(statusNames, order.status)
    && typeof order.createdAt === "string"
    && Array.isArray(order.items)
    && (order.paymentStatus === undefined || ["approved", "declined"].includes(order.paymentStatus));
}

function readOrders() {
  try {
    const stored = localStorage.getItem(ORDER_STORAGE_KEY);
    if (stored === null) {
      localStorage.setItem(ORDER_STORAGE_KEY, "[]");
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isValidOrder)) {
      throw new TypeError("Los pedidos guardados tienen un formato no válido.");
    }
    const exampleOrderIds = new Set(["PMD-2508-A7K2", "PMD-2508-B3L8", "PMD-2507-C9M1"]);
    const cleanOrders = parsed.filter((order) => !exampleOrderIds.has(order.id));
    if (cleanOrders.length !== parsed.length) {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(cleanOrders));
    }
    return cleanOrders;
  } catch (error) {
    console.error("No se pudieron leer los pedidos guardados.", error);
    showToast("No pudimos cargar los pedidos guardados.");
    return [];
  }
}

function isValidAdmin(admin) {
  return admin
    && typeof admin.id === "string"
    && typeof admin.username === "string"
    && typeof admin.password === "string"
    && admin.password.length >= 8;
}

function readAdmins() {
  try {
    const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (stored === null) {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify([initialAdmin]));
      return [{ ...initialAdmin }];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isValidAdmin)) {
      throw new TypeError("La lista de administradores guardada no es válida.");
    }
    return parsed;
  } catch (error) {
    console.error("No se pudieron leer los administradores guardados.", error);
    showToast("No pudimos cargar las cuentas de administrador.");
    return [{ ...initialAdmin }];
  }
}

function saveAdmins() {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admins));
    return true;
  } catch (error) {
    console.error("No se pudieron guardar los administradores.", error);
    showToast("No se pudo guardar el cambio de administrador.");
    return false;
  }
}

function saveOrders() {
  try {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
    return true;
  } catch (error) {
    console.error("No se pudieron guardar los pedidos.", error);
    showToast("No se pudo guardar el cambio de estado.");
    return false;
  }
}

let products = readProducts();
let orders = readOrders();
let admins = readAdmins();

function renderLoginHint() {
  const defaultAccount = admins.find((admin) => admin.id === initialAdmin.id);
  loginHint.innerHTML = defaultAccount?.password === initialAdmin.password
    ? 'Acceso inicial: usuario <strong>paula</strong> · contraseña <strong>admin123</strong>. Cámbiala en Administradores.'
    : "Usa las credenciales actuales de una cuenta administradora.";
}

function renderStats() {
  document.querySelector('[data-stat="orders"]').textContent = orders.length;
  document.querySelector('[data-stat="pending"]').textContent = orders.filter((order) => order.status === "pending").length;
  document.querySelector('[data-stat="preparing"]').textContent = orders.filter((order) => order.status === "preparing").length;
  document.querySelector('[data-stat="products"]').textContent = products.filter((product) => product.available).length;
}

function renderProducts() {
  productsList.innerHTML = products.map((product) => `
    <tr>
      <td>
        <div class="product-cell">
          <img src="${escapeHtml(product.image || productImages[product.category])}" alt="" loading="lazy">
          <div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(categoryNames[product.category])} · Caja x6</small></div>
        </div>
      </td>
      <td>
        <label class="visually-hidden" for="price-${escapeHtml(product.id)}">Precio de ${escapeHtml(product.name)}</label>
        <div class="price-field"><span aria-hidden="true">$</span>
          <input class="price-input" id="price-${escapeHtml(product.id)}" type="number" min="0" step="500" value="${escapeHtml(product.price)}" data-price="${escapeHtml(product.id)}">
        </div>
      </td>
      <td>
        <label class="availability${product.available ? "" : " is-unavailable"}">
          <input type="checkbox" data-available="${escapeHtml(product.id)}" ${product.available ? "checked" : ""}>
          <span>${product.available ? "Disponible" : "Agotado"}</span>
        </label>
      </td>
      <td>
        <button class="delete-button" type="button" data-delete="${escapeHtml(product.id)}" aria-label="Eliminar ${escapeHtml(product.name)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3"></path></svg>
          Eliminar
        </button>
      </td>
    </tr>
  `).join("");
  document.querySelector("#products-empty").hidden = products.length > 0;
  renderStats();
}

function formatOrderDate(date) {
  const orderDate = new Date(date);
  if (Number.isNaN(orderDate.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(orderDate);
}

function renderOrders() {
  const search = searchQuery.trim().toLocaleLowerCase("es");
  const visibleOrders = orders.filter((order) => {
    const matchesStatus = activeOrderFilter === "all" || order.status === activeOrderFilter;
    const searchTarget = `${order.id} ${order.customer} ${order.phone || ""}`.toLocaleLowerCase("es");
    return matchesStatus && searchTarget.includes(search);
  });

  ordersList.innerHTML = visibleOrders.map((order) => {
    const items = order.items.map((item) => `${escapeHtml(item.name)} ×${escapeHtml(item.quantity)}`).join(", ");
    const statusOptions = Object.entries(statusNames).map(([value, name]) =>
      `<option value="${value}" ${order.status === value ? "selected" : ""}>${name}</option>`
    ).join("");

    return `
      <article class="order-card">
        <div class="order-card__top">
          <div><p class="order-code">${escapeHtml(order.id)}</p><p class="order-date">${escapeHtml(formatOrderDate(order.createdAt))}</p></div>
          <label><span class="visually-hidden">Estado de ${escapeHtml(order.id)}</span>
            <select class="status-select" data-order-status="${escapeHtml(order.id)}">${statusOptions}</select>
          </label>
        </div>
        <div class="order-card__details">
          <div>
            <p class="order-card__customer">${escapeHtml(order.customer)}</p>
            <p class="order-card__items">${items || "Sin detalle de productos"}</p>
          </div>
          <strong class="order-card__total">${formatPrice(order.total)}</strong>
        </div>
        <div class="order-card__footer">
          <span>${escapeHtml(order.phone || "Teléfono no indicado")}</span>
          <span>${escapeHtml(order.address || "Dirección no indicada")}</span>
          <span>Pago: ${escapeHtml(order.payment || "Por confirmar")}</span>
          ${order.paymentStatus === "approved" ? '<span class="payment-status-badge">Pago aprobado (simulación)</span>' : ""}
          <button class="order-card__delete" type="button" data-delete-order="${escapeHtml(order.id)}" aria-label="Eliminar pedido ${escapeHtml(order.id)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3"></path></svg>
            Eliminar pedido
          </button>
        </div>
      </article>
    `;
  }).join("");
  const emptyMessage = document.querySelector("#orders-empty");
  emptyMessage.textContent = orders.length === 0
    ? "Todavía no hay pedidos."
    : "No encontramos pedidos con esos filtros.";
  emptyMessage.hidden = visibleOrders.length > 0;
  renderStats();
}

function renderAdmins() {
  adminsList.innerHTML = admins.map((admin) => `
    <tr>
      <td>
        <div class="admin-account">
          <span class="admin-avatar" aria-hidden="true">${escapeHtml(admin.username.slice(0, 2))}</span>
          <div>${escapeHtml(admin.username)}${admin.id === currentAdminId ? '<small class="admin-role">Tu cuenta</small>' : '<small class="admin-role">Administrador</small>'}</div>
        </div>
      </td>
      <td>
        <div class="admin-actions">
          <button class="admin-action-button" type="button" data-change-password="${escapeHtml(admin.id)}">Cambiar contraseña</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function setView(view) {
  activeView = view;
  const pageTitles = { products: "Productos", orders: "Pedidos", admins: "Administradores" };
  document.querySelector("#page-title").textContent = pageTitles[view];
  document.querySelector("#products-view").hidden = view !== "products";
  document.querySelector("#orders-view").hidden = view !== "orders";
  document.querySelector("#admins-view").hidden = view !== "admins";
  document.querySelector("#new-product-button").hidden = view !== "products";
  document.querySelector("#new-admin-button").hidden = view !== "admins";
  document.querySelectorAll("[data-view]").forEach((button) => {
    const selected = button.dataset.view === view;
    button.classList.toggle("is-active", selected);
    if (selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (view === "orders") renderOrders();
  if (view === "admins") renderAdmins();
}

function showAdmin() {
  loginScreen.hidden = true;
  adminApp.hidden = false;
  renderProducts();
  renderOrders();
  setView(activeView);
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = String(formData.get("username")).trim();
  const password = String(formData.get("password"));
  const admin = admins.find((account) =>
    account.username.toLocaleLowerCase("es") === username.toLocaleLowerCase("es")
    && account.password === password
  );
  if (!admin) {
    loginError.textContent = "Usuario o contraseña incorrectos.";
    loginError.hidden = false;
    return;
  }

  try {
    sessionStorage.setItem(ADMIN_SESSION_KEY, admin.id);
  } catch (error) {
    console.error("No se pudo guardar la sesión de demostración.", error);
  }
  currentAdminId = admin.id;
  loginError.hidden = true;
  showAdmin();
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelector("#logout-button").addEventListener("click", () => {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch (error) {
    console.error("No se pudo cerrar la sesión de demostración.", error);
  }
  adminApp.hidden = true;
  loginScreen.hidden = false;
  loginForm.reset();
  loginError.hidden = true;
  currentAdminId = null;
});

document.querySelector("#new-product-button").addEventListener("click", () => {
  productForm.reset();
  productDialog.showModal();
  productForm.elements.name.focus();
});

function closeProductDialog() {
  productDialog.close();
}

document.querySelector("#close-product-dialog").addEventListener("click", closeProductDialog);
document.querySelector("#cancel-product").addEventListener("click", closeProductDialog);

document.querySelector("#new-admin-button").addEventListener("click", () => {
  newAdminForm.reset();
  newAdminDialog.showModal();
  newAdminForm.elements.username.focus();
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.closeDialog).close();
  });
});

newAdminForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!newAdminForm.reportValidity()) return;

  const formData = new FormData(newAdminForm);
  const username = String(formData.get("username")).trim();
  const password = String(formData.get("password"));
  const confirmPassword = String(formData.get("confirmPassword"));
  if (password !== confirmPassword) {
    showToast("Las contraseñas no coinciden.");
    return;
  }
  if (admins.some((admin) => admin.username.toLocaleLowerCase("es") === username.toLocaleLowerCase("es"))) {
    showToast("Ese nombre de usuario ya está en uso.");
    return;
  }

  const admin = { id: createId("admin"), username, password };
  admins.push(admin);
  if (!saveAdmins()) {
    admins.pop();
    return;
  }
  renderAdmins();
  newAdminDialog.close();
  showToast("Administrador creado.");
});

adminsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-change-password]");
  if (!button) return;
  const admin = admins.find((item) => item.id === button.dataset.changePassword);
  if (!admin) return;

  passwordAdminId = admin.id;
  passwordForm.reset();
  document.querySelector("#password-dialog-title").textContent = `Cambiar contraseña de ${admin.username}`;
  passwordDialog.showModal();
  passwordForm.elements.password.focus();
});

passwordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!passwordForm.reportValidity()) return;

  const formData = new FormData(passwordForm);
  const password = String(formData.get("password"));
  const confirmPassword = String(formData.get("confirmPassword"));
  if (password !== confirmPassword) {
    showToast("Las contraseñas no coinciden.");
    return;
  }
  const admin = admins.find((item) => item.id === passwordAdminId);
  if (!admin) {
    showToast("No encontramos esa cuenta de administrador.");
    passwordDialog.close();
    return;
  }

  const previousPassword = admin.password;
  admin.password = password;
  if (!saveAdmins()) {
    admin.password = previousPassword;
    return;
  }
  passwordDialog.close();
  passwordAdminId = null;
  showToast("Contraseña actualizada.");
  renderLoginHint();
});

productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!productForm.reportValidity()) return;

  const formData = new FormData(productForm);
  const category = String(formData.get("category"));
  const product = {
    id: createId("product"),
    name: String(formData.get("name")).trim(),
    category,
    description: String(formData.get("description")).trim(),
    price: Number(formData.get("price")),
    tag: categoryNames[category],
    image: productImages[category],
    available: true
  };
  if (!isValidProduct(product)) {
    showToast("Revisa los datos del producto e inténtalo de nuevo.");
    return;
  }

  products.push(product);
  if (!saveProducts()) {
    products.pop();
    renderProducts();
    return;
  }
  renderProducts();
  closeProductDialog();
  showToast("Producto agregado al catálogo.");
});

productsList.addEventListener("change", (event) => {
  const priceInput = event.target.closest("[data-price]");
  const availabilityInput = event.target.closest("[data-available]");
  if (!priceInput && !availabilityInput) return;

  const id = (priceInput || availabilityInput).dataset.price || (priceInput || availabilityInput).dataset.available;
  const product = products.find((item) => item.id === id);
  if (!product) return;

  let saved;
  if (priceInput) {
    const price = Number(priceInput.value);
    if (!Number.isFinite(price) || price < 0) {
      priceInput.value = product.price;
      showToast("Ingresa un precio válido.");
      return;
    }
    const previousPrice = product.price;
    product.price = price;
    saved = saveProducts();
    if (!saved) product.price = previousPrice;
  } else {
    const previousAvailability = product.available;
    product.available = availabilityInput.checked;
    saved = saveProducts();
    if (!saved) product.available = previousAvailability;
  }

  renderProducts();
  if (saved) showToast("Cambios guardados.");
});

productsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  const product = products.find((item) => item.id === button.dataset.delete);
  if (!product || !window.confirm(`¿Eliminar "${product.name}" del catálogo?`)) return;

  const previousProducts = products;
  products = products.filter((item) => item.id !== product.id);
  if (!saveProducts()) {
    products = previousProducts;
    renderProducts();
    return;
  }
  renderProducts();
  showToast("Producto eliminado.");
});

document.querySelector(".order-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-order-filter]");
  if (!button) return;
  activeOrderFilter = button.dataset.orderFilter;
  document.querySelectorAll("[data-order-filter]").forEach((filterButton) => {
    const selected = filterButton === button;
    filterButton.classList.toggle("is-selected", selected);
    filterButton.setAttribute("aria-pressed", String(selected));
  });
  renderOrders();
});

document.querySelector("#order-search").addEventListener("input", (event) => {
  searchQuery = event.target.value;
  renderOrders();
});

ordersList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-order]");
  if (!button) return;
  const order = orders.find((item) => item.id === button.dataset.deleteOrder);
  if (!order || !window.confirm(`¿Eliminar el pedido ${order.id}? Esta acción no se puede deshacer.`)) return;

  const previousOrders = orders;
  orders = orders.filter((item) => item.id !== order.id);
  if (!saveOrders()) {
    orders = previousOrders;
    renderOrders();
    return;
  }
  renderOrders();
  showToast("Pedido eliminado.");
});

ordersList.addEventListener("change", (event) => {
  const select = event.target.closest("[data-order-status]");
  if (!select || !Object.hasOwn(statusNames, select.value)) return;
  const order = orders.find((item) => item.id === select.dataset.orderStatus);
  if (!order) return;
  const previousStatus = order.status;
  order.status = select.value;
  if (!saveOrders()) {
    order.status = previousStatus;
    renderOrders();
    return;
  }
  renderOrders();
  showToast("Estado del pedido actualizado.");
});

try {
  const savedAdminId = sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (admins.some((admin) => admin.id === savedAdminId)) {
    currentAdminId = savedAdminId;
    showAdmin();
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
} catch (error) {
  console.error("No se pudo recuperar la sesión de demostración.", error);
}
renderLoginHint();
