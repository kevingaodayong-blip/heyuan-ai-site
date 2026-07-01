const form = document.querySelector("#planForm");
const choices = [...document.querySelectorAll(".choice")];
const peopleInput = document.querySelector("#people");
const result = document.querySelector("#result");
const toast = document.querySelector("#toast");
const orderDialog = document.querySelector("#orderDialog");
const dialogMessage = document.querySelector("#dialogMessage");
const orderSummary = document.querySelector("#orderSummary");

let currentRecommendation = null;
let currentGroupPlan = null;

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
const API_BASE_PATH = BASE_PATH.endsWith("/v1") ? BASE_PATH.slice(0, -"/v1".length) : BASE_PATH;

function appPath(path) {
  if (!path || !path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}

function apiPath(path) {
  if (!path || !path.startsWith("/api/")) return appPath(path);
  return `${API_BASE_PATH}${path}`;
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
  const response = await fetch(apiPath(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function packageRoleText(type) {
  const roles = {
    trial_6_boxes: "适合先试口感和配送",
    half_ton_card: "适合家庭或办公室持续饮用",
    one_ton_card: "适合多人、多地址长期饮用",
  };
  return roles[type] || "按需选择";
}

function packageButtonText(type) {
  const labels = {
    trial_6_boxes: "选择六箱体验装",
    half_ton_card: "选择半吨卡",
    one_ton_card: "选择一吨卡",
  };
  return labels[type] || "选择这一项";
}

function packageCard(item, isRecommended) {
  return `
    <article class="package-card ${isRecommended ? "is-recommended" : ""}">
      <div class="package-card__top">
        <div>
          <strong>${item.label}</strong>
          <small>${packageRoleText(item.type)}</small>
        </div>
        ${isRecommended ? "<span>推荐</span>" : ""}
      </div>
      <div class="price-row">
        <strong>${formatMoney(item.price)}</strong>
        <del>${formatMoney(item.retailPrice)}</del>
      </div>
      <p>${item.boxes}，约省 ${formatMoney(item.savings)}，较参考价低 ${item.savingRate}%</p>
      <button class="package-button" type="button" data-package="${item.type}">
        ${packageButtonText(item.type)}
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

function groupTargetName(type) {
  return type === "one_ton_card" ? "一吨卡" : "半吨卡";
}

function groupScenarioName(scenario) {
  const names = {
    family_drink: "家庭亲友",
    parents: "父母亲友",
    office: "办公室同事",
    tea: "茶友",
    gift: "客户礼赠",
    conference: "会务团队",
  };
  return names[scenario] || "亲友";
}

function buildGroupMembers(recommendation, targetPackage) {
  const targetBoxes = targetPackage.boxCount;
  const scenario = recommendation.scenario;
  const templates = {
    family_drink: [
      ["我家", 0.22],
      ["父母家", 0.18],
      ["亲友", 0.18],
    ],
    parents: [
      ["我先认领", 0.2],
      ["父母家", 0.22],
      ["兄弟姐妹", 0.16],
    ],
    office: [
      ["行政先认领", 0.24],
      ["会议室", 0.18],
      ["部门同事", 0.2],
    ],
    tea: [
      ["茶席先用", 0.22],
      ["茶友A", 0.18],
      ["茶友B", 0.16],
    ],
    gift: [
      ["我先认领", 0.22],
      ["客户礼赠", 0.18],
      ["亲友补单", 0.16],
    ],
    conference: [
      ["会务先认领", 0.26],
      ["办公室", 0.2],
      ["活动备用", 0.16],
    ],
  };

  let claimedBoxes = 0;
  const members = (templates[scenario] || templates.family_drink).map(([name, ratio], index) => {
    const boxes = Math.max(1, Math.round(targetBoxes * ratio));
    claimedBoxes += boxes;
    return {
      name,
      boxes,
      role: index === 0 ? "发起人" : "已加入",
    };
  });

  const maxClaimed = Math.max(1, targetBoxes - Math.max(2, Math.round(targetBoxes * 0.18)));
  if (claimedBoxes > maxClaimed) {
    members[members.length - 1].boxes -= claimedBoxes - maxClaimed;
    claimedBoxes = maxClaimed;
  }

  return { members, claimedBoxes };
}

function buildGroupPlan(recommendation, targetPackageType) {
  const defaultTarget =
    recommendation.recommendedPackage?.type === "one_ton_card" ? "one_ton_card" : "half_ton_card";
  const normalizedTarget = ["half_ton_card", "one_ton_card"].includes(targetPackageType)
    ? targetPackageType
    : defaultTarget;
  const targetPackage = recommendation.packages.find((item) => item.type === normalizedTarget);
  const { members, claimedBoxes } = buildGroupMembers(recommendation, targetPackage);
  const remainingBoxes = Math.max(0, targetPackage.boxCount - claimedBoxes);
  const progress = Math.min(98, Math.round((claimedBoxes / targetPackage.boxCount) * 100));
  const unitPrice = Math.round(targetPackage.price / targetPackage.boxCount);
  const sceneName = groupScenarioName(recommendation.scenario);
  const groupId = `grp_${recommendation.id.slice(0, 8)}_${normalizedTarget}`;
  const inviteText = `我正在发起5100${recommendation.product.name}${groupTargetName(normalizedTarget)}凑单，目标是${targetPackage.boxes}，现在已凑${claimedBoxes}箱，还差${remainingBoxes}箱。适合${sceneName}一起按需配送，不改变原来的水卡规格，想一起试试的可以点进来参与。`;

  return {
    groupId,
    targetPackageType: normalizedTarget,
    targetLabel: groupTargetName(normalizedTarget),
    title: `邀请${sceneName}一起凑${recommendation.product.name}${groupTargetName(normalizedTarget)}`,
    subtitle: "先看看每家认领多少箱，凑满后按标准水卡兑换。",
    targetPackage,
    claimedBoxes,
    remainingBoxes,
    progress,
    unitPrice,
    members,
    inviteText,
    params: {
      group_id: groupId,
      group_mode: "group_order",
      group_target_card: normalizedTarget,
      group_target_product_id: recommendation.product.id,
      group_target_sku: recommendation.product.sku,
      group_claimed_boxes: claimedBoxes,
      group_remaining_boxes: remainingBoxes,
      inviter_id: "v1_user",
    },
  };
}

function groupOrderCard(plan) {
  return `
    <div class="group-order-card__head">
      <div>
        <span>拼单凑卡</span>
        <strong>${plan.title}</strong>
        <p>${plan.subtitle}</p>
      </div>
      <em>不改水卡张数</em>
    </div>

    <div class="group-target-switch" role="group" aria-label="选择拼单目标">
      <button class="${plan.targetPackageType === "half_ton_card" ? "is-active" : ""}" type="button" data-group-target="half_ton_card">
        凑半吨卡
      </button>
      <button class="${plan.targetPackageType === "one_ton_card" ? "is-active" : ""}" type="button" data-group-target="one_ton_card">
        凑一吨卡
      </button>
    </div>

    <div class="group-progress" aria-label="拼单进度">
      <div class="group-progress__top">
        <strong>已凑 ${plan.claimedBoxes}/${plan.targetPackage.boxCount}箱</strong>
        <span>还差 ${plan.remainingBoxes}箱</span>
      </div>
      <div class="group-progress__track">
        <span class="group-progress__bar" style="width: ${plan.progress}%"></span>
      </div>
      <p>${plan.targetPackage.label}保持原规格：${plan.targetPackage.boxes}，整卡价 ${formatMoney(plan.targetPackage.price)}，约 ${formatMoney(plan.unitPrice)}/箱。</p>
    </div>

    <div class="group-members">
      ${plan.members
        .map(
          (member) => `
            <div>
              <span>${member.role}</span>
              <strong>${member.name}</strong>
              <small>${member.boxes}箱</small>
            </div>
          `,
        )
        .join("")}
    </div>

    <div class="group-actions">
      <button class="package-button" id="groupParamsButton" type="button">确认拼单方案</button>
      <button class="small-action small-action--wide" id="copyGroupInviteButton" type="button">复制微信群邀请</button>
    </div>
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

function scenarioName(scenario) {
  const names = {
    family_drink: "家里长期喝",
    parents: "给父母长辈",
    office: "办公室接待",
    tea: "泡茶/茶室",
    gift: "商务送礼",
    conference: "企业福利/会务",
  };
  return names[scenario] || "日常饮水";
}

function customerTitle(recommendation) {
  return `${scenarioName(recommendation.scenario)}，建议先看「${recommendation.product.name}」`;
}

function customerReason(recommendation) {
  const product = recommendation.product;
  const packageLabel = recommendation.recommendedPackage.label;
  const sceneCopy = {
    family_drink: `${product.spec}更适合餐桌、厨房和日常补水；如果还没喝过，可以先从${packageLabel}开始。`,
    parents: `${product.spec}适合家里长期备水，后续可按需兑换配送，减少搬运和囤货压力。`,
    office: `${product.spec}适合会议、茶水间和来访接待，人数多时可直接看水卡。`,
    tea: `${product.spec}适合茶台、茶室和招待场景，建议先试泡茶口感。`,
    gift: `${product.spec}便于分发和携带，适合客户、领导和节礼场景。`,
    conference: `${product.spec}适合会务、福利和批量分发，建议优先看水卡总价。`,
  };
  return sceneCopy[recommendation.scenario] || `${product.spec}适合你的当前场景，可先选择${packageLabel}。`;
}

function customerFaqs(recommendation) {
  const product = recommendation.product;
  return [
    {
      title: "先买体验装还是水卡？",
      answer: `第一次喝${product.name}，建议先选六箱体验装；已经确定长期喝或多人共用，可以直接看半吨卡/一吨卡。`,
    },
    {
      title: "水卡会不会一次性送很多？",
      answer: "水卡用于后续兑换，可按需安排配送，适合家里、办公室或多个地址分次使用。",
    },
    {
      title: "价格在哪里最终确认？",
      answer: "点击选择后进入小程序确认页，价格、库存、支付和配送信息都会在下单前再次确认。",
    },
    {
      title: "可以和亲友一起买吗？",
      answer: "可以发起凑卡计划，大家按箱数认领，凑满后仍按半吨卡或一吨卡的标准规格兑换。",
    },
  ];
}

function customerProofCards(recommendation) {
  const product = recommendation.product;
  const sceneReason = {
    family_drink: "适合餐桌、厨房和日常补水，箱数消耗稳定。",
    parents: "适合给父母长期备水，可减少搬运，按需配送到家。",
    office: "适合会议室、茶水间和客户来访，规格更方便分发。",
    tea: "适合茶台和招待场景，先用小批量验证泡茶口感。",
    gift: "适合客户、领导和节礼，便携、体面，也更容易分送。",
    conference: "适合活动、福利和会务批量用水，先算总量更清楚。",
  };

  return [
    {
      title: `${product.name}适合这个场景`,
      body: sceneReason[recommendation.scenario] || product.shortUse,
      image: product.image,
    },
    {
      title: "5100米冰川水源",
      body: "来自西藏冰川水源，适合日常饮用、接待和礼赠场景。",
      image: "/assets/manual/hero.jpg",
    },
    {
      title: "可按需兑换配送",
      body: "体验装先试，水卡后续兑换，适合家庭、办公室和亲友共同使用。",
      image: "/assets/manual/exchange-benefits.jpg",
    },
  ];
}

function hasUsableOrderUrl(orderUrl) {
  if (!orderUrl) return false;
  try {
    const hostname = new URL(orderUrl).hostname;
    return !hostname.endsWith(["example", "com"].join("."));
  } catch {
    return false;
  }
}

function orderSummaryMarkup({ selectedPackage, recommendation, orderUrl, groupPlan }) {
  const canOpenOrder = hasUsableOrderUrl(orderUrl);
  const rows = [
    ["已选型号", `${recommendation.product.name} · ${recommendation.product.spec}`],
    ["购买方式", selectedPackage.label],
    ["预计价格", formatMoney(selectedPackage.price)],
  ];

  if (groupPlan) {
    rows.push(["拼单目标", `${groupPlan.targetLabel} · 已凑 ${groupPlan.claimedBoxes}箱`]);
    rows.push(["还差箱数", `${groupPlan.remainingBoxes}箱`]);
  }

  return `
    <div class="order-summary__rows">
      ${rows
        .map(
          ([label, value]) => `
            <div>
              <span>${label}</span>
              <strong>${value}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
    ${groupPlan ? `<p class="order-summary__invite">${groupPlan.inviteText}</p>` : ""}
    ${
      canOpenOrder
        ? `<a class="order-summary__link" href="${orderUrl}" rel="noreferrer">进入小程序后确认下单</a>`
        : `<div class="order-summary__pending">下单前会再次确认价格、库存和配送。</div>`
    }
  `;
}

function showOrderDialog({ selectedPackage, recommendation, data, groupPlan }) {
  dialogMessage.textContent = groupPlan
    ? "已为你整理好拼单方案，可先发给亲友确认认领箱数。"
    : "已为你整理好选择内容。";
  orderSummary.innerHTML = orderSummaryMarkup({
    selectedPackage,
    recommendation,
    orderUrl: data.orderUrl,
    groupPlan,
  });
  orderDialog.showModal();
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
        const selectedPackage =
          currentRecommendation.packages.find((item) => item.type === button.dataset.package) ||
          currentRecommendation.recommendedPackage;
        showOrderDialog({
          selectedPackage,
          recommendation: currentRecommendation,
          data,
        });
      } catch (error) {
        showToast(error.message);
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function copyTextToClipboard(text, successMessage) {
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    showToast(successMessage);
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

function bindGroupOrderButtons() {
  document.querySelectorAll("[data-group-target]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!currentRecommendation) return;
      renderGroupOrder(button.dataset.groupTarget);
    });
  });

  document.querySelector("#copyGroupInviteButton")?.addEventListener("click", async () => {
    await copyTextToClipboard(currentGroupPlan?.inviteText, "拼单邀请已复制，可以发微信群");
  });

  document.querySelector("#groupParamsButton")?.addEventListener("click", async () => {
    if (!currentRecommendation || !currentGroupPlan) return;
    const button = document.querySelector("#groupParamsButton");
    button.disabled = true;
    try {
      const data = await postJson("/api/order-link", {
        recommendation: currentRecommendation,
        packageType: currentGroupPlan.targetPackageType,
        productId: currentRecommendation.product.id,
        tier: currentRecommendation.tier.id,
        source: getSource(),
        groupOrder: currentGroupPlan.params,
      });
      showOrderDialog({
        selectedPackage: currentGroupPlan.targetPackage,
        recommendation: currentRecommendation,
        data,
        groupPlan: currentGroupPlan,
      });
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
  });
}

function renderGroupOrder(targetPackageType) {
  currentGroupPlan = buildGroupPlan(currentRecommendation, targetPackageType);
  document.querySelector("#groupOrderPanel").innerHTML = groupOrderCard(currentGroupPlan);
  bindGroupOrderButtons();
}

function renderRecommendation(recommendation) {
  currentRecommendation = recommendation;
  document.querySelector("#tierTag").textContent = "下单前确认价格";
  document.querySelector("#resultTitle").textContent = customerTitle(recommendation);
  document.querySelector("#resultReason").textContent = customerReason(recommendation);
  document.querySelector("#productName").textContent = recommendation.product.name;
  document.querySelector("#productSpec").textContent = recommendation.product.spec;
  document.querySelector("#productImage").src = appPath(recommendation.product.image);
  document.querySelector("#packageName").textContent = recommendation.recommendedPackage.label;
  document.querySelector("#packageRole").textContent = packageRoleText(recommendation.recommendedPackage.type);
  renderUsageInsight(recommendation.usageInsight);

  document.querySelector("#packageList").innerHTML = recommendation.packages
    .map((item) => packageCard(item, item.type === recommendation.recommendedPackage.type))
    .join("");

  renderGroupOrder();

  document.querySelector("#objectionList").innerHTML = customerFaqs(recommendation)
    .map(objectionCard)
    .join("");

  document.querySelector("#educationList").innerHTML = customerProofCards(recommendation)
    .map(educationCard)
    .join("");

  document.querySelector("#alternativeList").innerHTML = recommendation.alternatives
    .map(alternativeCard)
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
  button.querySelector("span").textContent = "正在生成建议";

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
