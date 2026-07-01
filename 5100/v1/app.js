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

const MAX_GROUP_RECEIVERS = 4;

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

function formatUnitMoney(value, digits = 1) {
  const number = Number(value || 0);
  const fixed = number.toFixed(digits);
  return `¥${fixed.replace(/\.0$/, "")}`;
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
  const unitBoxPrice = item.unitBoxPrice || item.price / Math.max(1, item.boxCount || 1);
  const unitBottlePrice = item.unitBottlePrice || item.price / Math.max(1, item.bottleCount || 1);
  const cardCount = item.cardCount || Math.max(1, Math.ceil((item.boxCount || 6) / 6));
  const cardMetricLabel = item.type === "trial_6_boxes" ? "发货" : "水卡";
  const cardLabel = item.type === "trial_6_boxes" ? "1组" : `${cardCount}张`;
  const deliveryUnitText =
    item.type === "trial_6_boxes"
      ? `${item.cardBoxCount || 6}箱起送`
      : `${item.cardBoxCount || 6}箱为1张起送水卡`;
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
      <div class="unit-price-grid" aria-label="${item.label}价格明细">
        <div>
          <span>单瓶约</span>
          <strong>${formatUnitMoney(unitBottlePrice, 2)}</strong>
        </div>
        <div>
          <span>单箱约</span>
          <strong>${formatUnitMoney(unitBoxPrice, 1)}</strong>
        </div>
        <div>
          <span>${cardMetricLabel}</span>
          <strong>${cardLabel}</strong>
        </div>
      </div>
      <p>${item.boxes}，${deliveryUnitText}，约省 ${formatMoney(item.savings)}，较参考价低 ${item.savingRate}%</p>
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
  const cardBoxCount = targetPackage.cardBoxCount || 6;
  const totalCards = targetPackage.cardCount || Math.max(1, Math.ceil(targetPackage.boxCount / cardBoxCount));
  const scenario = recommendation.scenario;
  const templates = {
    family_drink: [
      ["我家", 0.36],
      ["父母家", 0.24],
      ["亲友", 0.18],
    ],
    parents: [
      ["我先认领", 0.34],
      ["父母家", 0.26],
      ["兄弟姐妹", 0.18],
    ],
    office: [
      ["行政先认领", 0.34],
      ["会议室", 0.24],
      ["部门同事", 0.2],
    ],
    tea: [
      ["茶席先用", 0.34],
      ["茶友A", 0.24],
      ["茶友B", 0.18],
    ],
    gift: [
      ["我先认领", 0.34],
      ["客户礼赠", 0.24],
      ["亲友补单", 0.18],
    ],
    conference: [
      ["会务先认领", 0.36],
      ["办公室", 0.24],
      ["活动备用", 0.18],
    ],
  };

  let claimableCards = Math.max(1, totalCards - 1);
  let claimedCards = 0;
  const activeTemplate = templates[scenario] || templates.family_drink;
  const members = activeTemplate.map(([name, ratio], index) => {
    const minimumForRest = activeTemplate.length - index - 1;
    const suggestedCards = Math.max(1, Math.round(totalCards * ratio));
    const cards = Math.max(1, Math.min(suggestedCards, claimableCards - minimumForRest));
    claimableCards -= cards;
    claimedCards += cards;
    return {
      name,
      cards,
      boxes: cards * cardBoxCount,
      role: index === 0 ? "发起人" : "已加入",
    };
  });

  return { members, claimedCards };
}

function buildGroupPlan(recommendation, targetPackageType) {
  const defaultTarget =
    recommendation.recommendedPackage?.type === "one_ton_card" ? "one_ton_card" : "half_ton_card";
  const normalizedTarget = ["half_ton_card", "one_ton_card"].includes(targetPackageType)
    ? targetPackageType
    : defaultTarget;
  const targetPackage = recommendation.packages.find((item) => item.type === normalizedTarget);
  const cardBoxCount = targetPackage.cardBoxCount || 6;
  const totalCards = targetPackage.cardCount || Math.max(1, Math.ceil(targetPackage.boxCount / cardBoxCount));
  const { members, claimedCards } = buildGroupMembers(recommendation, targetPackage);
  const remainingCards = Math.max(0, totalCards - claimedCards);
  const progress = Math.min(98, Math.round((claimedCards / totalCards) * 100));
  const unitCardPrice = targetPackage.unitCardPrice || targetPackage.price / totalCards;
  const sceneName = groupScenarioName(recommendation.scenario);
  const groupId = `grp_${recommendation.id.slice(0, 8)}_${normalizedTarget}`;
  const inviteText = `我正在发起5100${recommendation.product.name}${groupTargetName(normalizedTarget)}拼卡，目标是${totalCards}张实体水卡（每张${cardBoxCount}箱起送），现在已认领${claimedCards}张，还差${remainingCards}张。建议2-${MAX_GROUP_RECEIVERS}人参与，水卡默认统一寄给发起人，凑满后仍按标准水卡兑换。`;

  return {
    groupId,
    targetPackageType: normalizedTarget,
    targetLabel: groupTargetName(normalizedTarget),
    title: `邀请${sceneName}一起拼${recommendation.product.name}${groupTargetName(normalizedTarget)}`,
    subtitle: `按实体水卡张数认领，建议2-${MAX_GROUP_RECEIVERS}人参与，默认统一寄给发起人。`,
    targetPackage,
    totalCards,
    claimedCards,
    remainingCards,
    cardBoxCount,
    maxReceivers: MAX_GROUP_RECEIVERS,
    shippingMode: "水卡默认统一寄给发起人",
    progress,
    unitCardPrice,
    members,
    inviteText,
    params: {
      group_id: groupId,
      group_mode: "group_order",
      group_target_card: normalizedTarget,
      group_target_product_id: recommendation.product.id,
      group_target_sku: recommendation.product.sku,
      group_card_box_count: cardBoxCount,
      group_total_cards: totalCards,
      group_claimed_cards: claimedCards,
      group_remaining_cards: remainingCards,
      group_claimed_boxes: claimedCards * cardBoxCount,
      group_remaining_boxes: remainingCards * cardBoxCount,
      group_max_receivers: MAX_GROUP_RECEIVERS,
      group_shipping_mode: "leader_collects_cards",
      inviter_id: "v1_user",
    },
  };
}

function groupOrderCard(plan) {
  return `
    <div class="group-order-card__head">
      <div>
        <span>实体水卡拼卡</span>
        <strong>${plan.title}</strong>
        <p>${plan.subtitle}</p>
      </div>
      <em>最多${plan.maxReceivers}人</em>
    </div>

    <div class="group-target-switch" role="group" aria-label="选择拼卡目标">
      <button class="${plan.targetPackageType === "half_ton_card" ? "is-active" : ""}" type="button" data-group-target="half_ton_card">
        凑半吨卡
      </button>
      <button class="${plan.targetPackageType === "one_ton_card" ? "is-active" : ""}" type="button" data-group-target="one_ton_card">
        凑一吨卡
      </button>
    </div>

    <div class="group-progress" aria-label="拼卡进度">
      <div class="group-progress__top">
        <strong>已认领 ${plan.claimedCards}/${plan.totalCards}张</strong>
        <span>还差 ${plan.remainingCards}张</span>
      </div>
      <div class="group-progress__track">
        <span class="group-progress__bar" style="width: ${plan.progress}%"></span>
      </div>
      <p>${plan.targetPackage.label}共${plan.totalCards}张实体水卡，每张${plan.cardBoxCount}箱；整卡价 ${formatMoney(plan.targetPackage.price)}，约 ${formatMoney(plan.unitCardPrice)}/张。${plan.shippingMode}，避免多人分寄增加运费。</p>
    </div>

    <div class="group-members">
      ${plan.members
        .map(
          (member) => `
            <div>
              <span>${member.role}</span>
              <strong>${member.name}</strong>
              <small>${member.cards}张 · ${member.boxes}箱</small>
            </div>
          `,
        )
        .join("")}
    </div>

    <div class="group-actions">
      <button class="package-button" id="groupParamsButton" type="button">确认拼卡方案</button>
      <button class="small-action small-action--wide" id="copyGroupInviteButton" type="button">复制拼卡邀请</button>
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
      <p>${usage.sceneText}，约${usage.dailyNeed}L/天，折合${formatMoney(usage.monthlyCost)}/月；单箱约${formatUnitMoney(usage.perBoxPrice, 1)}。</p>
    </div>
    <div class="usage-chips">
      ${usage.chips.map((chip) => `<span>${chip}</span>`).join("")}
    </div>
  `;
}

function comparisonCard(item) {
  return `
    <article class="comparison-card ${item.highlight ? "is-highlight" : ""}">
      <div class="comparison-card__top">
        <div>
          <span>${item.label}</span>
          <strong>${item.name}</strong>
        </div>
        ${item.highlight ? "<em>推荐</em>" : ""}
      </div>
      <div class="comparison-price">
        <div>
          <span>单箱约</span>
          <b>${item.boxPrice}</b>
        </div>
        <div>
          <span>单瓶约</span>
          <b>${item.bottlePrice}</b>
        </div>
        <div>
          <span>每升约</span>
          <b>${item.literPrice}</b>
        </div>
      </div>
      <p>${item.note}</p>
    </article>
  `;
}

function renderPriceComparison(recommendation) {
  const selected = recommendation.recommendedPackage;
  const unitBoxPrice = selected.unitBoxPrice || selected.price / Math.max(1, selected.boxCount);
  const unitBottlePrice = selected.unitBottlePrice || selected.price / Math.max(1, selected.bottleCount || 1);
  const unitLiterPrice = selected.price / Math.max(1, selected.totalLiters || 1);
  const items = [
    {
      label: "5100",
      name: `${recommendation.product.name} · ${recommendation.product.spec}`,
      boxPrice: formatUnitMoney(unitBoxPrice, 1),
      bottlePrice: formatUnitMoney(unitBottlePrice, 2),
      literPrice: formatUnitMoney(unitLiterPrice, 1),
      note: "高端冰川矿泉水定位，看每升成本更直观，适合长期家庭和办公饮用。",
      highlight: true,
    },
    {
      label: "进口高端水参考",
      name: "依云 Evian 500ml x 24瓶",
      boxPrice: "约¥108",
      bottlePrice: "约¥4.5",
      literPrice: "约¥9/L",
      note: "公开电商常见活动参考价，实际价格会随平台和促销变化。",
    },
    {
      label: "进口高端水参考",
      name: "FIJI 斐济 500ml x 24瓶",
      boxPrice: "约¥220+",
      bottlePrice: "约¥9+",
      literPrice: "约¥18+/L",
      note: "进口高端水参考价区间，跨境、地区和渠道差异较大。",
    },
  ];

  document.querySelector("#priceComparison").innerHTML = items.map(comparisonCard).join("");
}

function qualityCard(item) {
  return `
    <article class="quality-card">
      <span>${item.label}</span>
      <strong>${item.title}</strong>
      <p>${item.body}</p>
    </article>
  `;
}

function renderQualityList(recommendation) {
  const boxPrice = recommendation.recommendedPackage.unitBoxPrice || recommendation.recommendedPackage.price / recommendation.recommendedPackage.boxCount;
  const items = [
    {
      label: "水源",
      title: "5100米冰川矿泉水",
      body: "来自西藏高海拔冰川水源，适合高端饮用、接待和礼赠表达。",
    },
    {
      label: "指标",
      title: "锂、锶、偏硅酸",
      body: "同时具备多个容易被用户记住的天然矿物质指标，更容易讲清品质。",
    },
    {
      label: "口感",
      title: "低钠、弱碱、清冽",
      body: "定位高端日常饮水，不只讲进口标签，更看水源和长期饮用体验。",
    },
    {
      label: "价格",
      title: `水卡单箱约${formatUnitMoney(boxPrice, 1)}`,
      body: "和进口高端水同台比较，5100更适合家庭、办公室长期复购。",
    },
  ];

  document.querySelector("#qualityList").innerHTML = items.map(qualityCard).join("");
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
      answer: `可以发起拼卡计划，建议2-${MAX_GROUP_RECEIVERS}人按实体水卡张数认领；水卡默认统一寄给发起人，减少多人分寄带来的运费成本。`,
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
    rows.push(["拼卡目标", `${groupPlan.targetLabel} · 已认领 ${groupPlan.claimedCards}/${groupPlan.totalCards}张`]);
    rows.push(["还差水卡", `${groupPlan.remainingCards}张`]);
    rows.push(["收卡方式", `${groupPlan.shippingMode} · 最多${groupPlan.maxReceivers}人`]);
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
    ? "已为你整理好拼卡方案，可先发给亲友确认认领水卡张数。"
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
    await copyTextToClipboard(currentGroupPlan?.inviteText, "拼卡邀请已复制，可以发微信群");
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

  renderPriceComparison(recommendation);
  renderGroupOrder();
  renderQualityList(recommendation);

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
