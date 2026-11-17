const whatsappNumber = "573001234567";
const deliveryFee = 6000;
const freeDeliveryThreshold = 50000;
const productStorageKey = "paulas-minidonas-products";
const orderStorageKey = "paulas-minidonas-orders";
const productCategories = ["fresa", "surtida", "vainilla", "chocolate"];

const defaultProducts = [
  { id: "fresa", name: "Fresa Coqueta", category: "fresa", description: "Glaseado de fresa, lluvia de colores y un toque de vainilla.", price: 14000, tag: "Fresa", image: "img/WhatsApp Image 2026-11-16 at 19.43.25.jpeg", available: true },
  { id: "fiesta", name: "Fiesta de Sabores", category: "surtida", description: "Una cajita variada para probar nuestros favoritos de la casa.", price: 18000, tag: "Surtida", image: "img/WhatsApp Image 2026-11-16 at 19.43.24.jpeg", available: true },
  { id: "vainilla", name: "Dulce Arcoíris", category: "vainilla", description: "Crema suave de vainilla, fruta fresca y flores comestibles.", price: 16000, tag: "Vainilla", image: "img/WhatsApp Image 2026-11-16 at 19.43.24 (1).jpeg", available: true },
  { id: "chocolate", name: "Choco Chispas", category: "chocolate", description: "Baño de chocolate, chispitas crujientes y mucho cariño.", price: 16000, tag: "Chocolate", image: "img/WhatsApp Image 2026-11-16 at 19.43.24 (2).jpeg", available: true }
];

function loadProducts() {
  try {
    const stored = localStorage.getItem(productStorageKey);
    if (stored === null) return [...defaultProducts];
    const parsed = JSON.parse(stored);
    const valid = Array.isArray(parsed) && parsed.every((product) =>
      product
      && typeof product.id === "string"
      && typeof product.name === "string"
      && typeof product.category === "string"
      && productCategories.includes(product.category)
      && typeof product.description === "string"
      && Number.isFinite(product.price)
      && product.price >= 0
      && typeof product.tag === "string"
      && typeof product.image === "string"
      && typeof product.available === "boolean"
    );
    if (!valid) throw new TypeError("El catálogo guardado tiene un formato no válido.");
    return parsed;
  } catch (error) {
    console.error("No se pudo cargar el catálogo guardado.", error);
    return [...defaultProducts];
  }
}

const products = loadProducts();
const cart = new Map();
const productGrid = document.querySelector("#product-grid");
const checkoutPage = document.querySelector(".checkout-page");
const checkoutEmpty = document.querySelector("#checkout-empty");
const checkoutLayout = document.querySelector("#checkout-layout");
const checkoutItems = document.querySelector("#checkout-items");
const cartCount = document.querySelector(".cart-count");
const toast = document.querySelector(".toast");
const checkoutForm = document.querySelector("#checkout-form");
const paymentSimulationDialog = document.querySelector("#payment-simulation-dialog");
const simulationChoice = document.querySelector("#simulation-choice");
const simulationOutcome = document.querySelector("#simulation-outcome");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
let toastTimer;
let pendingCheckoutDetails = null;

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

function getSubtotal() {
  return [...cart.values()].reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

function renderProducts(filter = "todos") {
  const availableProducts = products.filter((product) => product.available);
  const visibleProducts = filter === "todos"
    ? availableProducts
    : availableProducts.filter((product) => product.category === filter);

  productGrid.innerHTML = visibleProducts.map((product) => `
    <article class="product-card">
      <div class="product-card__image">
        <img src="${escapeHtml(product.image)}" alt="Mini donas ${escapeHtml(product.name)}" loading="lazy">
        <span class="product-tag">${escapeHtml(product.tag)}</span>
      </div>
      <div class="product-card__details">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="product-card__bottom">
          <div class="product-price"><small>CAJA X6</small><strong>${formatPrice(product.price)}</strong></div>
          <button class="add-button" type="button" data-add="${escapeHtml(product.id)}" aria-label="Agregar ${escapeHtml(product.name)} al pedido"><span aria-hidden="true">＋</span> Agregar</button>
        </div>
      </div>
    </article>
  `).join("");
}

function renderCheckout() {
  const count = [...cart.values()].reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = getSubtotal();
  const shipping = subtotal === 0 || subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;

  cartCount.textContent = count;
  cartCount.hidden = count === 0;
  document.querySelector("[data-open-cart]").setAttribute("aria-label", `Mi pedido, ${count} ${count === 1 ? "producto" : "productos"}`);
  checkoutEmpty.hidden = cart.size > 0;
  checkoutLayout.hidden = cart.size === 0;

  if (cart.size === 0) return;

  checkoutItems.innerHTML = [...cart.values()].map(({ product, quantity }) => `
    <article class="checkout-item">
      <img src="${escapeHtml(product.image)}" alt="" loading="lazy">
      <div class="checkout-item__details">
        <h3>${escapeHtml(product.name)}</h3>
        <p>Caja x6 · ${escapeHtml(product.tag)}</p>
        <div class="quantity-control" aria-label="Cantidad de ${escapeHtml(product.name)}">
          <button type="button" data-quantity="${escapeHtml(product.id)}" data-change="-1" aria-label="Quitar una caja">−</button>
          <span>${quantity}</span>
          <button type="button" data-quantity="${escapeHtml(product.id)}" data-change="1" aria-label="Agregar una caja">+</button>
        </div>
      </div>
      <div class="checkout-item__amount">
        <strong>${formatPrice(product.price * quantity)}</strong>
        <button class="remove-item" type="button" data-remove="${escapeHtml(product.id)}" aria-label="Eliminar ${escapeHtml(product.name)}">Eliminar</button>
      </div>
    </article>
  `).join("");

  document.querySelector("#summary-subtotal").textContent = formatPrice(subtotal);
  document.querySelector("#summary-shipping").textContent = shipping === 0 ? "Gratis" : formatPrice(shipping);
  document.querySelector("#summary-total").textContent = formatPrice(subtotal + shipping);
  const remaining = Math.max(0, freeDeliveryThreshold - subtotal);
  document.querySelector("#shipping-message").textContent = remaining > 0
    ? `Agrega ${formatPrice(remaining)} más y tu envío será gratis.`
    : "¡Tu envío es gratis!";
}

function showCheckout() {
  renderCheckout();
  checkoutPage.hidden = false;
  document.body.classList.add("checkout-active");
  mainNav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menú");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hideCheckout() {
  checkoutPage.hidden = true;
  document.body.classList.remove("checkout-active");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function saveOrder(order) {
  try {
    const stored = localStorage.getItem(orderStorageKey);
    const orders = stored === null ? [] : JSON.parse(stored);
    if (!Array.isArray(orders)) throw new TypeError("Los pedidos guardados tienen un formato no válido.");
    orders.unshift(order);
    localStorage.setItem(orderStorageKey, JSON.stringify(orders));
    return true;
  } catch (error) {
    console.error("No se pudo guardar el pedido en el panel de administración.", error);
    showToast("No se pudo guardar el pedido en el panel; puedes enviarlo por WhatsApp.");
    return false;
  }
}

function createOrder(details, paymentStatus = null) {
  const subtotal = getSubtotal();
  const shipping = subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;

  return {
    id: `PMD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    customer: details.name,
    phone: details.phone,
    email: details.email,
    address: details.address,
    payment: details.payment,
    ...(paymentStatus ? { paymentStatus } : {}),
    total: subtotal + shipping,
    status: "pending",
    createdAt: new Date().toISOString(),
    items: [...cart.values()].map(({ product, quantity }) => ({
      name: product.name,
      quantity,
      price: product.price
    }))
  };
}

function createWhatsAppMessage(order) {
  const orderLines = order.items.map((item) =>
    `• ${item.name} x${item.quantity}: ${formatPrice(item.price * item.quantity)}`
  );
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = order.total - subtotal;

  return [
    "Hola, quiero confirmar este pedido:",
    ...orderLines,
    `Subtotal: ${formatPrice(subtotal)}`,
    `Envío: ${shipping === 0 ? "Gratis" : formatPrice(shipping)}`,
    `Total: ${formatPrice(order.total)}`,
    `Nombre: ${order.customer}`,
    `Teléfono: ${order.phone}`,
    `Dirección: ${order.address}`,
    `Pago: ${order.payment}`,
    ...(order.paymentStatus === "approved" ? ["Resultado de pago: aprobado (simulación académica)"] : [])
  ].join("\n");
}

function showSimulationOutcome(result, title, message, buttonLabel) {
  simulationChoice.hidden = true;
  simulationOutcome.hidden = false;
  simulationOutcome.dataset.result = result;
  simulationOutcome.className = `simulation-outcome simulation-outcome--${result}`;
  document.querySelector("#simulation-outcome-icon").textContent =
    result === "approved" ? "✓" : result === "declined" ? "×" : "!";
  document.querySelector("#simulation-outcome-title").textContent = title;
  document.querySelector("#simulation-outcome-message").textContent = message;
  document.querySelector("#simulation-finish").textContent = buttonLabel;
}

function handleSimulationResult(result) {
  if (!pendingCheckoutDetails) return;

  if (result === "declined") {
    showSimulationOutcome(
      "declined",
      "Pago rechazado",
      "La simulación rechazó el pago. No se realizó ningún cobro ni se creó un pedido.",
      "Volver al pedido"
    );
    return;
  }

  const order = createOrder(pendingCheckoutDetails, "approved");
  if (!saveOrder(order)) {
    showSimulationOutcome(
      "error",
      "No se pudo registrar el pedido",
      "El pago fue solo simulado: no se realizó ningún cobro y el pedido no quedó guardado. Inténtalo de nuevo.",
      "Volver al pedido"
    );
    return;
  }

  window.open(
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(createWhatsAppMessage(order))}`,
    "_blank",
    "noopener,noreferrer"
  );
  cart.clear();
  checkoutForm.reset();
  checkoutForm.querySelectorAll(".payment-option").forEach((option) => {
    option.classList.toggle("is-selected", option.querySelector("input").checked);
  });
  renderCheckout();
  showSimulationOutcome(
    "approved",
    "Pago aprobado (simulación)",
    `El pedido ${order.id} quedó registrado. No se realizó ningún cobro real.`,
    "Volver a la tienda"
  );
}

document.querySelector(".filter-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  document.querySelectorAll(".filter-chip").forEach((chip) => {
    const selected = chip === button;
    chip.classList.toggle("is-selected", selected);
    chip.setAttribute("aria-pressed", String(selected));
  });
  renderProducts(button.dataset.filter);
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;

  const product = products.find((item) => item.id === button.dataset.add);
  if (!product) return;

  const current = cart.get(product.id);
  cart.set(product.id, { product, quantity: (current?.quantity ?? 0) + 1 });
  renderCheckout();
  showToast(`${product.name} se agregó a tu pedido`);
});

checkoutItems.addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove]");

  if (removeButton) {
    cart.delete(removeButton.dataset.remove);
    renderCheckout();
    return;
  }
  if (!quantityButton) return;

  const id = quantityButton.dataset.quantity;
  const item = cart.get(id);
  if (!item) return;

  const quantity = item.quantity + Number(quantityButton.dataset.change);
  if (quantity <= 0) cart.delete(id);
  else cart.set(id, { ...item, quantity });
  renderCheckout();
});

document.querySelector("[data-open-cart]").addEventListener("click", showCheckout);
document.querySelectorAll("[data-continue]").forEach((link) => {
  link.addEventListener("click", hideCheckout);
});

document.querySelectorAll(".main-nav a, .brand[href]").forEach((link) => {
  link.addEventListener("click", hideCheckout);
});

checkoutForm.addEventListener("change", (event) => {
  if (event.target.name !== "payment") return;
  document.querySelectorAll(".payment-option").forEach((option) => {
    option.classList.toggle("is-selected", option.contains(event.target));
  });
});

checkoutForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (cart.size === 0 || !checkoutForm.reportValidity()) return;

  const formData = new FormData(checkoutForm);
  const details = {
    name: String(formData.get("name")).trim(),
    phone: String(formData.get("phone")).trim(),
    email: String(formData.get("email")).trim(),
    address: String(formData.get("address")).trim(),
    payment: String(formData.get("payment"))
  };

  if (details.payment === "Tarjeta (simulación)") {
    pendingCheckoutDetails = details;
    document.querySelector("#simulation-total").textContent =
      formatPrice(getSubtotal() + (getSubtotal() >= freeDeliveryThreshold ? 0 : deliveryFee));
    simulationChoice.hidden = false;
    simulationOutcome.hidden = true;
    paymentSimulationDialog.showModal();
    return;
  }

  const order = createOrder(details);
  saveOrder(order);
  window.open(
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(createWhatsAppMessage(order))}`,
    "_blank",
    "noopener,noreferrer"
  );
});

paymentSimulationDialog.addEventListener("click", (event) => {
  const resultButton = event.target.closest("[data-simulation-result]");
  if (resultButton) {
    handleSimulationResult(resultButton.dataset.simulationResult);
    return;
  }
  if (event.target.closest("[data-close-simulation]")) paymentSimulationDialog.close();
});

document.querySelector("#simulation-finish").addEventListener("click", () => {
  if (simulationOutcome.dataset.result === "approved") hideCheckout();
  paymentSimulationDialog.close();
});

paymentSimulationDialog.addEventListener("close", () => {
  pendingCheckoutDetails = null;
  simulationChoice.hidden = false;
  simulationOutcome.hidden = true;
  simulationOutcome.className = "simulation-outcome";
  delete simulationOutcome.dataset.result;
});

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
});
mainNav.addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  mainNav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menú");
});

document.querySelector("#year").textContent = new Date().getFullYear();
renderProducts();
renderCheckout();
