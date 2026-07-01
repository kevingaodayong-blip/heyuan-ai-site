const form = document.querySelector("#planForm");
const choices = [...document.querySelectorAll(".choice")];
const peopleInput = document.querySelector("#people");
const result = document.querySelector("#result");
const toast = document.querySelector("#toast");
const orderDialog = document.querySelector("#orderDialog");
const orderParams = document.querySelector("#orderParams");
const dialogMessage = document.querySelector("#dialogMessage");
const copyShareButton = document.querySelector("#copyShareButton");

let currentRecommendation = null;
let currentShareText = "";

function getBasePath() {
  const appScript = [...document.scripts].find((script) =>
    new URL(script.src, window.location.href).pathname.endsWith("/app.js"),
  );
  if (!appScript) return "";
  const scriptPath = new URL(appScript.src, window.location.href).pathname;
  const basePath = scriptPath.slice(0, -"/app.js".length);
  return basePath === "/" ? "" : basePath;
}

const BASE_PATH = getBasePath();

function appPath(path) {
  if (!path || !path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}

function formatMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function getParams() {
  return new URLSearchParams(window.location.search);
}

function getSource() {
  const params = getParams();
  return params.get("source") || params.get("utm_source") || "direct_qr";
}

function getTier() {
  return getParams().get("tier") || "vip_b";
}

async function postJson(url, payload) {
  const response = await fetch(appPath(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function packageCard(item, isRecommended) {
  return `
    <article class="package-card ${isRecommended ? "is-recommended" : ""}">
      <div class="package-card__top">
        <div>
          <strong>${item.label}</strong>
          <small>${item.role}</small>
        </div>
        ${isRecommended ? "<span>AI推荐</span>" : ""}
      </div>
      <div class="price-row">
        <strong>${formatMoney(item.price)}</strong>
        <del>${formatMoney(item.retailPrice)}</del>
      </div>
      <p>${item.boxes}，约省 ${formatMoney(item.savings)}，较参考价低 ${item.savingRate}%</p>
      <button class="package-button" type="button" data-package="${item.type}">
        ${item.cta}
      </button>
    </article>
  `;
}

function educationCard(item) {
  return `
    <article class="education-item">
      ${item.image ? `<img src="${appPath(item.image)}" alt="" loading="lazy" />` : ""}
      <strong>${item.title}</strong>
      <p>${item.body}</p>
    </article>
  `;
}

function objectionCard(item) {
  return `
    <article class="objection-card">
      <strong>${item.title}</strong>
      <p>${item.answer}</p>
    </article>
  `;
}

function enablementCard(item) {
  return `
    <article class="enablement-card">
      <strong>${item.title}</strong>
      <p>${item.body}</p>
    </article>
  `;
}

function alternativeCard(item) {
  return `
    <button class="alternative-card" type="button" data-product="${item.id}">
      <img src="${appPath(item.image)}" alt="" loading="lazy" />
      <span>
        <strong>${item.name}</strong>
        <span>${item.spec}</span>
        <small>体验 ${formatMoney(item.trialPrice)} · 半吨 ${formatMoney(item.halfPrice)} · 一吨 ${formatMoney(item.tonPrice)}</small>
      </span>
    </button>
  `;
}

function renderSignals(signals) {
  document.querySelector("#signalPanel").innerHTML = `
    <div>
      <span>客户热度</span>
      <strong>${signals.score}/100</strong>
    </div>
    <div>
      <span>AI判断</span>
      <strong class="metric-copy">${signals.stage}</strong>
    </div>
    <div>
      <span>下一步</span>
      <strong class="metric-copy">${signals.nextAction}</strong>
    </div>
  `;
}

function renderUsageInsight(usage) {
  document.querySelector("#usageInsight").innerHTML = `
    <div>
      <span>测算结论</span>
      <strong>${usage.title}</strong>
      <p>${usage.sceneText}，约${usage.dailyNeed}L/天，折合${formatMoney(usage.monthlyCost)}/月。</p>
    </div>
    <div class="usage-chips">
      ${usage.chips.map((chip) => `<span>${chip}</span>`).join("")}
    </div>
  `;
}

function bindPackageButtons() {
  document.querySelectorAll("[data-package]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!currentRecommendation) return;
      button.disabled = true;
      try {
        const data = await postJson("/api/order-link", {
          recommendation: currentRecommendation,
          packageType: button.dataset.package,
          productId: currentRecommendation.product.id,
          tier: currentRecommendation.tier.id,
          source: getSource(),
        });
        dialogMessage.textContent = data.message;
        orderParams.textContent = JSON.stringify(
          {
            orderUrl: data.orderUrl,
            params: data.params,
          },
          null,
          2,
        );
        orderDialog.showModal();
      } catch (error) {
        showToast(error.message);
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function copyShareText() {
  if (!currentShareText) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(currentShareText);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = currentShareText;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    showToast("话术已复制，可以发微信");
  } catch {
    showToast("复制失败，请长按文字复制");
  }
}

function bindAlternativeButtons() {
  document.querySelectorAll("[data-product]").forEach((button) => {
    button.addEventListener("click", () => {
      requestRecommendation(button.dataset.product);
    });
  });
}

function renderRecommendation(recommendation) {
  currentRecommendation = recommendation;
  document.querySelector("#tierTag").textContent = `${recommendation.tier.name} 演示价`;
  document.querySelector("#resultTitle").textContent = recommendation.headline;
  document.querySelector("#resultReason").textContent = recommendation.reason;
  document.querySelector("#productName").textContent = recommendation.product.name;
  document.querySelector("#productSpec").textContent = recommendation.product.spec;
  document.querySelector("#productImage").src = appPath(recommendation.product.image);
  document.querySelector("#packageName").textContent = recommendation.recommendedPackage.label;
  document.querySelector("#packageRole").textContent = recommendation.recommendedPackage.role;
  renderSignals(recommendation.conversionSignals);
  renderUsageInsight(recommendation.usageInsight);

  document.querySelector("#packageList").innerHTML = recommendation.packages
    .map((item) => packageCard(item, item.type === recommendation.recommendedPackage.type))
    .join("");

  document.querySelector("#objectionList").innerHTML = recommendation.objectionCards
    .map(objectionCard)
    .join("");

  currentShareText = recommendation.followUpKit.shareText;
  document.querySelector("#followTitle").textContent = recommendation.followUpKit.title;
  document.querySelector("#followShareText").textContent = recommendation.followUpKit.shareText;
  document.querySelector("#followInternalNote").textContent = recommendation.followUpKit.internalNote;
  document.querySelector("#followCallScript").textContent = recommendation.followUpKit.callScript;

  document.querySelector("#educationList").innerHTML = recommendation.educationCards
    .map(educationCard)
    .join("");

  document.querySelector("#alternativeList").innerHTML = recommendation.alternatives
    .map(alternativeCard)
    .join("");

  document.querySelector("#enablementList").innerHTML = recommendation.aiEnablements
    .map(enablementCard)
    .join("");

  bindPackageButtons();
  bindAlternativeButtons();
  result.classList.remove("is-hidden");
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function requestRecommendation(productId) {
  const formData = new FormData(form);
  const payload = {
    scenario: formData.get("scenario"),
    people: Number(formData.get("people") || 3),
    priority: formData.get("priority") || "value",
    hasEnterpriseResource: formData.get("hasEnterpriseResource") === "on",
    productId,
    tier: getTier(),
    source: getSource(),
  };

  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.querySelector("span").textContent = "AI 正在生成建议";

  try {
    const data = await postJson("/api/recommendation", payload);
    renderRecommendation(data.recommendation);
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = "生成购买建议";
  }
}

choices.forEach((choice) => {
  choice.addEventListener("click", () => {
    const input = choice.querySelector("input[type='radio']");
    if (!input) return;
    document
      .querySelectorAll(`input[name="${input.name}"]`)
      .forEach((item) => item.closest(".choice")?.classList.remove("is-selected"));
    choice.classList.add("is-selected");
  });
});

document.querySelectorAll("[data-counter]").forEach((button) => {
  button.addEventListener("click", () => {
    const step = Number(button.dataset.counter);
    const next = Math.min(30, Math.max(1, Number(peopleInput.value || 1) + step));
    peopleInput.value = String(next);
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  requestRecommendation();
});

copyShareButton.addEventListener("click", copyShareText);
