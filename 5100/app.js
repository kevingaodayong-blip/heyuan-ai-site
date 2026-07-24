const catalogGrid = document.querySelector("#catalogGrid");
const advisorForm = document.querySelector("#advisorForm");
const advisorResult = document.querySelector("#advisorResult");
const orderDialog = document.querySelector("#orderDialog");
const orderForm = document.querySelector("#orderForm");
const orderFields = document.querySelector("#orderFields");
const orderReceipt = document.querySelector("#orderReceipt");
const orderMessage = document.querySelector("#orderMessage");
const paymentReportButton = document.querySelector("#paymentReportButton");
const selectedProductSummary = document.querySelector("#selectedProductSummary");
const toast = document.querySelector("#toast");

let config = null;
let catalog = [];
let selectedProduct = null;
let selectedPackage = null;
let selectedScenario = "family_drink";
let currentOrder = null;

function getBasePath() {
  const script = [...document.scripts].find((item) =>
    new URL(item.src, window.location.href).pathname.endsWith("/app.js"),
  );
  if (!script) return "";
  const pathname = new URL(script.src, window.location.href).pathname;
  const base = pathname.slice(0, -"/app.js".length);
  return base === "/" ? "" : base;
}

const BASE_PATH = getBasePath();

function appPath(path) {
  if (!path?.startsWith("/")) return path;
  if (BASE_PATH && path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}

function money(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits,
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function queryValue(name, fallback = "") {
  return new URLSearchParams(window.location.search).get(name) || fallback;
}

function attribution() {
  return {
    source: queryValue("utm_source", queryValue("source", "direct")),
    campaign: queryValue("utm_campaign", queryValue("campaign", "")),
  };
}

function scenarioForProduct(productId) {
  return {
    business: "conference",
    classic: "office",
    family: "family_drink",
    tea: "tea",
  }[productId] || "family_drink";
}

function canOrderPackage(packageType) {
  if (!config?.manualOrderEnabled) return false;
  return packageType === "single_card_6_boxes" || config.vipBCheckoutEnabled;
}

async function requestJson(path, options = {}) {
  const response = await fetch(appPath(path), {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "请求失败，请稍后再试。");
  return payload;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function packageTag(offer) {
  return {
    single_card_6_boxes: "先体验",
    half_ton_card: "长期更省",
    one_ton_card: "每张最低",
  }[offer.type] || "";
}

function renderPackageOption(product, offer) {
  const enabled = canOrderPackage(offer.type);
  const unitPrice = money(offer.unitCardPrice, 2);
  const buttonText = enabled ? "选择" : offer.type === "single_card_6_boxes" ? "暂不可下单" : "待确认成交方式";

  return `
    <div class="package-option ${offer.type === "one_ton_card" ? "package-option--best" : ""}">
      <div class="package-option__name">
        <strong>${escapeHtml(offer.label)}</strong>
        <span>${escapeHtml(packageTag(offer))}</span>
      </div>
      <div class="package-option__value">
        <strong>${money(offer.price)}</strong>
        <small>${escapeHtml(String(offer.cardCount))}张水卡 · ${escapeHtml(offer.boxes)}</small>
        <small>折合每张 ${unitPrice}</small>
      </div>
      <button
        type="button"
        data-product="${escapeHtml(product.id)}"
        data-package="${escapeHtml(offer.type)}"
        ${enabled ? "" : "disabled"}
      >${escapeHtml(buttonText)}</button>
    </div>
  `;
}

function renderCatalog() {
  catalogGrid.innerHTML = catalog
    .map(
      (product) => `
        <article class="product-card product-card--${escapeHtml(product.id)}">
          <div class="product-card__image">
            <img
              src="${escapeHtml(appPath(product.image))}"
              alt="${escapeHtml(product.name)}完整瓶装与外箱产品图"
            />
          </div>
          <div class="product-card__body">
            <div>
              <p class="product-card__scene">${escapeHtml(product.scene)}</p>
              <h3>${escapeHtml(product.name)}</h3>
              <p class="product-card__spec">${escapeHtml(product.spec)}</p>
            </div>
            <div class="product-card__packages" aria-label="${escapeHtml(product.name)}购买量">
              ${product.packages.map((offer) => renderPackageOption(product, offer)).join("")}
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  catalogGrid.querySelectorAll("[data-product][data-package]").forEach((button) => {
    if (button.disabled) return;
    button.addEventListener("click", () => {
      selectedScenario = scenarioForProduct(button.dataset.product);
      openOrder(button.dataset.product, button.dataset.package);
    });
  });
}

function resetOrderDialog() {
  currentOrder = null;
  orderForm.reset();
  orderFields.classList.remove("is-hidden");
  orderReceipt.classList.add("is-hidden");
  document.querySelector("#paymentQrBlock").classList.add("is-hidden");
  document.querySelector("#paymentReportFields").classList.add("is-hidden");
  orderMessage.className = "form-message";
  orderMessage.textContent = "";
  paymentReportButton.disabled = false;
  paymentReportButton.querySelector("span").textContent = "我已付款，通知我们";
}

function renderSelectedProduct() {
  selectedProductSummary.innerHTML = `
    <div>
      <small>已选</small>
      <strong>${escapeHtml(selectedProduct.name)} · ${escapeHtml(selectedPackage.label)}</strong>
      <span>${escapeHtml(selectedProduct.spec)} · ${escapeHtml(selectedPackage.boxes)} · ${escapeHtml(String(selectedPackage.cardCount))}张水卡</span>
    </div>
    <b>${money(selectedPackage.price)}</b>
  `;
}

function openOrder(productId, packageType) {
  selectedProduct = catalog.find((item) => item.id === productId);
  selectedPackage = selectedProduct?.packages.find((item) => item.type === packageType);
  if (!selectedProduct || !selectedPackage || !canOrderPackage(packageType)) return;
  resetOrderDialog();
  renderSelectedProduct();
  orderDialog.showModal();
}

function renderAdvisorResult(recommendation) {
  const product = recommendation.product;
  const offer = recommendation.package;
  const enabled = canOrderPackage(offer.type);

  advisorResult.classList.remove("is-hidden");
  advisorResult.innerHTML = `
    <div>
      <small>AI 建议</small>
      <h3>${escapeHtml(product.name)} · ${escapeHtml(offer.label)}</h3>
      <p>${escapeHtml(recommendation.scenarioName)}，建议选择${escapeHtml(product.spec)}。${escapeHtml(offer.role)}。</p>
    </div>
    <div class="advisor-result__price">
      <strong>${money(offer.price)}</strong>
      <span>${escapeHtml(String(offer.cardCount))}张水卡 · ${escapeHtml(offer.boxes)}</span>
      <small>折合每张 ${money(offer.unitCardPrice, 2)}</small>
    </div>
    <button
      class="primary-button"
      type="button"
      data-advisor-product="${escapeHtml(product.id)}"
      data-advisor-package="${escapeHtml(offer.type)}"
      ${enabled ? "" : "disabled"}
    >
      <span>${enabled ? "选择这套方案" : "待确认成交方式"}</span>
      <span aria-hidden="true">→</span>
    </button>
  `;

  const button = advisorResult.querySelector("[data-advisor-product]");
  if (button && !button.disabled) {
    button.addEventListener("click", () =>
      openOrder(button.dataset.advisorProduct, button.dataset.advisorPackage),
    );
  }
}

async function submitAdvisor(event) {
  event.preventDefault();
  const fields = new FormData(advisorForm);
  const submitButton = advisorForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "正在生成建议…";

  try {
    const data = await requestJson("/api/recommendation", {
      method: "POST",
      body: JSON.stringify({
        scenario: fields.get("scenario"),
        people: fields.get("people"),
        priority: "value",
      }),
    });
    selectedScenario = data.recommendation.scenario;
    renderAdvisorResult(data.recommendation);
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "给我购水建议";
  }
}

function renderOrderReceipt(data, phone) {
  currentOrder = { ...data, phone };
  orderFields.classList.add("is-hidden");
  orderReceipt.classList.remove("is-hidden");
  document.querySelector("#orderId").textContent = data.orderId;
  document.querySelector("#orderAmount").textContent = money(data.amount);
  document.querySelector("#orderProduct").textContent =
    `${data.productName} · ${selectedPackage.boxes}`;
  document.querySelector("#paymentInstruction").textContent = data.payment.instruction;
  document.querySelector("#paymentDisclosure").textContent = data.payment.disclosure || "";

  const qrBlock = document.querySelector("#paymentQrBlock");
  const reportFields = document.querySelector("#paymentReportFields");
  if (data.payment.enabled) {
    document.querySelector("#paymentQr").src = data.payment.qrUrl;
    document.querySelector("#paymentQrLink").href = data.payment.qrUrl;
    document.querySelector("#paymentReceiver").textContent = data.payment.receiver;
    qrBlock.classList.remove("is-hidden");
    reportFields.classList.remove("is-hidden");
  } else {
    qrBlock.classList.add("is-hidden");
    reportFields.classList.add("is-hidden");
  }
}

async function submitOrder(event) {
  event.preventDefault();
  if (!selectedProduct || !selectedPackage) return;

  const fields = new FormData(orderForm);
  const phone = String(fields.get("phone") || "").replace(/\s+/g, "");
  const submitButton = document.querySelector("#orderSubmitButton");
  submitButton.disabled = true;
  orderMessage.className = "form-message";
  orderMessage.textContent = "正在提交订单…";

  try {
    const data = await requestJson("/api/manual-order", {
      method: "POST",
      body: JSON.stringify({
        name: fields.get("name"),
        phone,
        region: fields.get("region"),
        address: fields.get("address"),
        privacyConsent: fields.get("privacyConsent") === "on",
        productId: selectedProduct.id,
        packageType: selectedPackage.type,
        scenario: selectedScenario,
        ...attribution(),
      }),
    });
    renderOrderReceipt(data, phone);
    orderMessage.classList.add("is-success");
    orderMessage.textContent = data.message;
  } catch (error) {
    orderMessage.classList.add("is-error");
    orderMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
}

async function submitPaymentReport() {
  if (!currentOrder) return;

  paymentReportButton.disabled = true;
  orderMessage.className = "form-message";
  orderMessage.textContent = "正在发送付款通知…";

  try {
    const data = await requestJson("/api/payment-report", {
      method: "POST",
      body: JSON.stringify({
        orderId: currentOrder.orderId,
        phone: currentOrder.phone,
      }),
    });
    orderMessage.classList.add("is-success");
    orderMessage.textContent = data.message;
    paymentReportButton.querySelector("span").textContent = "已通知，请等待确认";
  } catch (error) {
    orderMessage.classList.add("is-error");
    orderMessage.textContent = error.message;
    paymentReportButton.disabled = false;
  }
}

async function initialize() {
  try {
    const [configPayload, catalogPayload] = await Promise.all([
      requestJson("/api/config"),
      requestJson("/api/catalog"),
    ]);
    config = configPayload;
    catalog = catalogPayload.products;
    renderCatalog();
  } catch (error) {
    showToast(`页面加载失败：${error.message}`);
  }
}

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => orderDialog.close());
});

advisorForm.addEventListener("submit", submitAdvisor);
orderForm.addEventListener("submit", submitOrder);
paymentReportButton.addEventListener("click", submitPaymentReport);
initialize();
