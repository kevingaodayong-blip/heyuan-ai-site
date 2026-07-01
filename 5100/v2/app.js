const form = document.querySelector("#smartForm");
const result = document.querySelector("#result");
const peopleInput = document.querySelector("#people");
const aiStatus = document.querySelector("#aiStatus");
const stickyBar = document.querySelector("#stickyBar");
const stickyProduct = document.querySelector("#stickyProduct");
const stickyPrice = document.querySelector("#stickyPrice");
const stickyCta = document.querySelector("#stickyCta");
const orderDialog = document.querySelector("#orderDialog");
const orderSummary = document.querySelector("#orderSummary");
const toast = document.querySelector("#toast");

let currentRecommendation = null;
let currentPackageType = null;
let debounceTimer = 0;

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
const API_BASE_PATH = BASE_PATH.replace(/\/v\d+$/, "");
const ASSET_BASE_PATH = BASE_PATH.replace(/\/v\d+$/, "/v1");

function apiPath(path) {
  return `${API_BASE_PATH}${path}`;
}

function assetPath(path) {
  if (!path) return "";
  if (path.startsWith("/assets/")) return `${ASSET_BASE_PATH}${path}`;
  if (path.startsWith("../")) return path;
  return path;
}

function formatMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUnit(value, digits = 1) {
  const fixed = Number(value || 0).toFixed(digits);
  return `¥${fixed.replace(/\.0$/, "")}`;
}

function getParams() {
  return new URLSearchParams(window.location.search);
}

function getTier() {
  return getParams().get("tier") || "vip_b";
}

function getSource() {
  return getParams().get("source") || "ai_pro_v2";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

async function postJson(url, payload) {
  const response = await fetch(apiPath(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function selectedValue(name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value;
}

function formPayload() {
  return {
    scenario: selectedValue("scenario"),
    priority: selectedValue("priority"),
    people: Number(peopleInput.value || 3),
    tier: getTier(),
    source: getSource(),
  };
}

function scenarioProof(recommendation) {
  const product = recommendation.product;
  const proofs = {
    family_drink: {
      title: "居家长期喝",
      body: "1.5L适合餐桌和厨房，家庭消耗稳定，先体验再升级水卡。",
      image: "/assets/manual/proof/family-scene.jpg",
    },
    parents: {
      title: "给长辈省心",
      body: "水卡按需兑换，少搬水，适合给父母家长期备水。",
      image: "/assets/manual/proof/exchange-compact.jpg",
    },
    office: {
      title: "办公室通用",
      body: "500ml适合茶水间、会议和来访接待，分发更方便。",
      image: "/assets/manual/classic-full.jpg",
    },
    tea: {
      title: "茶台水感稳定",
      body: "4L适合泡茶、煲汤和高端招待，减少频繁开瓶。",
      image: "/assets/manual/tea.jpg",
    },
    gift: {
      title: "商务体面",
      body: "330ml适合会议桌、客户拜访和活动伴手礼。",
      image: "/assets/manual/business-full.jpg",
    },
    conference: {
      title: "会务批量清楚",
      body: "按人数和周期算总量，用水卡管理更清晰。",
      image: "/assets/manual/business-full.jpg",
    },
  };
  return proofs[recommendation.scenario] || {
    title: product.name,
    body: product.shortUse,
    image: product.image,
  };
}

function priorityProof(recommendation) {
  const selected = recommendation.recommendedPackage;
  const product = recommendation.product;
  const proofs = {
    value: {
      title: "账算清楚再买",
      body: `单箱约${formatUnit(selected.unitBoxPrice, 1)}，每升约${formatUnit(selected.price / selected.totalLiters, 1)}，比只看总价更直观。`,
      image: product.image,
    },
    taste: {
      title: "先在真实场景试",
      body: "先用体验装试口感、试配送，合适后再升级半吨卡或一吨卡。",
      image: product.id === "tea" ? "/assets/manual/tea.jpg" : "/assets/manual/hero.jpg",
    },
    delivery: {
      title: "不用一次囤很多",
      body: "水卡按需兑换，适合家庭、办公室和长辈地址分次安排。",
      image: "/assets/manual/proof/exchange-compact.jpg",
    },
    prestige: {
      title: "有水源也有背书",
      body: product.id === "tea"
        ? "4L泡茶款适合茶室、会务和客户招待。"
        : "曲玛弄拥有地理标志、5A级水源等背书，适合接待和礼赠。",
      image: product.id === "tea" ? "/assets/manual/tea.jpg" : "/assets/manual/proof/awards.jpg",
    },
  };
  return proofs[recommendation.priority.id] || proofs.value;
}

function qualityProof(recommendation) {
  if (recommendation.product.id === "tea") {
    return {
      title: "源头与品控",
      body: "好水适合长期喝，也适合茶台和餐饮场景，重点看水感、稳定和供应。",
      image: "/assets/manual/proof/factory-uf.jpg",
    };
  }
  return {
    title: "三矿水品质证据",
    body: "锂、锶、偏硅酸三项矿物质特征清楚，和进口高端水对比不只看品牌。",
    image: "/assets/manual/proof/mineral-table.jpg",
  };
}

function packageRole(type) {
  return {
    trial_6_boxes: "先试口感和配送",
    half_ton_card: "确认长期喝后的稳妥选择",
    one_ton_card: "多人或长期复购更适合",
  }[type] || "按需选择";
}

function planCard(item, recommendedType) {
  const isRecommended = item.type === recommendedType;
  const unitLiter = item.price / Math.max(1, item.totalLiters);
  return `
    <article class="plan-card ${isRecommended ? "is-recommended" : ""}">
      <div class="plan-card__top">
        <div>
          <span>${packageRole(item.type)}</span>
          <strong>${item.label}</strong>
        </div>
        ${isRecommended ? "<span>AI首推</span>" : ""}
      </div>
      <div class="price">${formatMoney(item.price)}</div>
      <div class="unit-grid">
        <div><span>单瓶约</span><b>${formatUnit(item.unitBottlePrice, 2)}</b></div>
        <div><span>单箱约</span><b>${formatUnit(item.unitBoxPrice, 1)}</b></div>
        <div><span>每升约</span><b>${formatUnit(unitLiter, 1)}</b></div>
      </div>
      <p>${item.boxes}，约${item.totalLiters}L，水卡按每${item.cardBoxCount || 6}箱为一个兑换单位。</p>
      <button class="package-button" type="button" data-package="${item.type}">
        ${isRecommended ? "按AI推荐确认" : "选择这一项"}
      </button>
    </article>
  `;
}

function proofCard(item) {
  return `
    <article class="proof-card">
      <img src="${assetPath(item.image)}" alt="" loading="eager" />
      <div>
        <span>AI判断依据</span>
        <strong>${item.title}</strong>
        <p>${item.body}</p>
      </div>
    </article>
  `;
}

function priceCards(recommendation) {
  const pkg = recommendation.recommendedPackage;
  const liter = pkg.price / Math.max(1, pkg.totalLiters);
  const competitor = {
    business: [
      ["依云 330ml x 24瓶", 148, 7.92],
      ["FIJI 330ml x 24瓶", 168, 7.92],
    ],
    classic: [
      ["依云 500ml x 24瓶", 175, 12],
      ["FIJI 500ml x 24瓶", 224, 12],
    ],
    family: [
      ["依云 1.5L x 12瓶", 199, 18],
      ["FIJI 1.5L x 12瓶", 289, 18],
    ],
    tea: [
      ["依云 1.5L x 12瓶", 199, 18],
      ["FIJI 1.5L x 12瓶", 289, 18],
    ],
  }[recommendation.product.id] || [];

  const items = [
    {
      label: "5100当前推荐",
      name: `${recommendation.product.name} · ${recommendation.product.spec}`,
      box: formatUnit(pkg.unitBoxPrice, 1),
      liter: `${formatUnit(liter, 1)}/L`,
      highlight: true,
    },
    ...competitor.map(([name, price, liters]) => ({
      label: "高端水参考",
      name,
      box: `约${formatMoney(price)}`,
      liter: `约${formatUnit(price / liters, 1)}/L`,
    })),
  ];

  return items
    .map(
      (item) => `
        <article class="price-card ${item.highlight ? "is-highlight" : ""}">
          <div class="price-card__top">
            <div>
              <span>${item.label}</span>
              <strong>${item.name}</strong>
            </div>
          </div>
          <div class="unit-grid">
            <div><span>整箱</span><b>${item.box}</b></div>
            <div><span>每升</span><b>${item.liter}</b></div>
            <div><span>用途</span><b>${item.highlight ? "长期喝" : "参考价"}</b></div>
          </div>
        </article>
      `,
    )
    .join("");
}

function groupCard(recommendation) {
  const half = recommendation.packages.find((item) => item.type === "half_ton_card");
  const target = recommendation.recommendedPackage.type === "one_ton_card"
    ? recommendation.recommendedPackage
    : half;
  const totalCards = target.cardCount || Math.ceil(target.boxCount / 6);
  const claimed = Math.min(totalCards - 1, Math.max(2, Math.round(totalCards * 0.56)));
  const progress = Math.round((claimed / totalCards) * 100);
  return `
    <article class="group-card">
      <div class="group-card__top">
        <div>
          <span>亲友拼卡</span>
          <strong>${target.label}可按${totalCards}张实体水卡认领</strong>
        </div>
        <button class="small-button" type="button" id="copyInvite">复制邀请</button>
      </div>
      <p>建议2-4人参与，按水卡张数凑满，凑满后统一确认收卡信息。</p>
      <div class="group-progress">
        <div class="group-progress__bar"><span style="width:${progress}%"></span></div>
        <p>示例：已认领${claimed}/${totalCards}张，还差${Math.max(0, totalCards - claimed)}张。</p>
      </div>
    </article>
  `;
}

function renderRecommendation(recommendation) {
  currentRecommendation = recommendation;
  currentPackageType = recommendation.recommendedPackage.type;
  const product = recommendation.product;
  const pkg = recommendation.recommendedPackage;
  const proofs = [scenarioProof(recommendation), priorityProof(recommendation), qualityProof(recommendation)];

  result.innerHTML = `
    <div class="result-head">
      <p class="eyebrow">AI已生成</p>
      <h2>${recommendation.scenarioName}，建议选${product.name}</h2>
      <p>${customerReason(recommendation)}</p>
    </div>

    <div class="score-strip">
      <div><span>预计用量</span><strong>${recommendation.usageInsight.title.replace(pkg.label, "")}</strong></div>
      <div><span>日均测算</span><strong>${recommendation.usageInsight.dailyNeed}L/天</strong></div>
      <div><span>成交路径</span><strong>${pkg.label}</strong></div>
    </div>

    <article class="recommend-card">
      <img src="${assetPath(product.image)}" alt="" />
      <div class="recommend-card__body">
        <span>AI推荐型号</span>
        <h3>${product.name}</h3>
        <p>${product.spec}。${product.shortUse}。先看${pkg.label}，下单前可再次确认价格和配送。</p>
      </div>
    </article>

    <div class="section-title">
      <h3>AI推荐购买方式</h3>
      <span>从低门槛到长期喝</span>
    </div>
    <div class="plan-list">
      ${recommendation.packages.map((item) => planCard(item, pkg.type)).join("")}
    </div>

    <div class="section-title">
      <h3>为什么适合你</h3>
      <span>只看关键证据</span>
    </div>
    <div class="proof-grid">
      ${proofs.map(proofCard).join("")}
    </div>

    <div class="section-title">
      <h3>高端水价格对比</h3>
      <span>按当前规格看</span>
    </div>
    <div class="price-list">
      ${priceCards(recommendation)}
    </div>

    <div class="section-title">
      <h3>亲友拼卡</h3>
      <span>按实体水卡凑</span>
    </div>
    ${groupCard(recommendation)}
  `;

  stickyProduct.textContent = `${product.name} · ${pkg.label}`;
  stickyPrice.textContent = `${formatMoney(pkg.price)}，单箱约${formatUnit(pkg.unitBoxPrice, 1)}`;
  stickyBar.classList.remove("is-hidden");
  bindResultActions();
}

function customerReason(recommendation) {
  const product = recommendation.product;
  const pkg = recommendation.recommendedPackage;
  const scene = {
    family_drink: `${product.spec}适合居家长期喝，先用${pkg.label}降低首次决策压力。`,
    parents: `${product.spec}适合给父母家常备，重点是按需兑换、少搬水。`,
    office: `${product.spec}适合办公室茶水间、会议和客户来访。`,
    tea: `${product.spec}适合茶台、煲汤和高端招待，重点看水感稳定。`,
    gift: `${product.spec}适合商务接待和礼赠，体面也实用。`,
    conference: `${product.spec}适合会务和批量消耗，先算总量更清楚。`,
  }[recommendation.scenario] || product.shortUse;
  const priority = {
    value: "AI会优先把单箱、单瓶和每升成本算清楚。",
    taste: "AI会优先建议先试口感，再升级长期水卡。",
    delivery: "AI会优先强调按需兑换和分次配送。",
    prestige: "AI会优先展示水源、背书和礼赠表达。",
  }[recommendation.priority.id] || "";
  return `${scene} ${priority}`;
}

async function requestRecommendation({ scroll = false } = {}) {
  aiStatus.textContent = "AI计算中";
  try {
    const data = await postJson("/api/recommendation", formPayload());
    renderRecommendation(data.recommendation);
    aiStatus.textContent = "已匹配";
    if (scroll) result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    aiStatus.textContent = "请重试";
    showToast(error.message);
  }
}

function scheduleRecommendation() {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => requestRecommendation(), 260);
}

function bindResultActions() {
  document.querySelectorAll("[data-package]").forEach((button) => {
    button.addEventListener("click", () => confirmPackage(button.dataset.package));
  });

  document.querySelector("#copyInvite")?.addEventListener("click", async () => {
    if (!currentRecommendation) return;
    const text = `我正在看5100${currentRecommendation.product.name}拼卡，按实体水卡认领，适合2-4人一起凑。你要不要一起？`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("拼卡邀请已复制");
    } catch {
      showToast("可长按页面文字转发给亲友");
    }
  });
}

async function confirmPackage(packageType = currentPackageType) {
  if (!currentRecommendation) return;
  const selected =
    currentRecommendation.packages.find((item) => item.type === packageType) ||
    currentRecommendation.recommendedPackage;
  currentPackageType = selected.type;
  try {
    const data = await postJson("/api/order-link", {
      recommendation: currentRecommendation,
      packageType: selected.type,
      productId: currentRecommendation.product.id,
      tier: currentRecommendation.tier.id,
      source: getSource(),
    });
    orderSummary.innerHTML = `
      <div><span>推荐型号</span><strong>${currentRecommendation.product.name}</strong></div>
      <div><span>购买方式</span><strong>${selected.label}</strong></div>
      <div><span>预计价格</span><strong>${formatMoney(selected.price)}</strong></div>
      <div><span>下单说明</span><strong>${data.orderUrl ? "进入小程序确认" : "下单前再次确认"}</strong></div>
    `;
    orderDialog.showModal();
  } catch (error) {
    showToast(error.message);
  }
}

function syncActiveClass(groupSelector) {
  document.querySelectorAll(groupSelector).forEach((label) => {
    const input = label.querySelector("input");
    label.classList.toggle("is-active", input?.checked);
  });
}

document.querySelectorAll(".smart-chip input").forEach((input) => {
  input.addEventListener("change", () => {
    syncActiveClass(".smart-chip");
    scheduleRecommendation();
  });
});

document.querySelectorAll(".priority-pill input").forEach((input) => {
  input.addEventListener("change", () => {
    syncActiveClass(".priority-pill");
    scheduleRecommendation();
  });
});

document.querySelectorAll("[data-count]").forEach((button) => {
  button.addEventListener("click", () => {
    const next = Math.min(30, Math.max(1, Number(peopleInput.value || 1) + Number(button.dataset.count)));
    peopleInput.value = String(next);
    scheduleRecommendation();
  });
});

peopleInput.addEventListener("change", scheduleRecommendation);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  requestRecommendation({ scroll: true });
});

stickyCta.addEventListener("click", () => confirmPackage());

function applyUrlDefaults() {
  const params = getParams();
  const scenario = params.get("scenario");
  const priority = params.get("priority");
  const people = params.get("people");

  if (scenario) {
    const input = [...form.querySelectorAll('input[name="scenario"]')].find((item) => item.value === scenario);
    if (input) input.checked = true;
  }

  if (priority) {
    const input = [...form.querySelectorAll('input[name="priority"]')].find((item) => item.value === priority);
    if (input) input.checked = true;
  }

  if (people) {
    peopleInput.value = String(Math.min(30, Math.max(1, Number(people) || 3)));
  }

  syncActiveClass(".smart-chip");
  syncActiveClass(".priority-pill");
}

applyUrlDefaults();
requestRecommendation();
