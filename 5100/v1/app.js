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
  const imageFit = item.imageFit === "cover" ? "cover" : "contain";
  return `
    <article class="education-item">
      ${
        item.image
          ? `<img class="education-item__image education-item__image--${imageFit}" src="${appPath(item.image)}" alt="" loading="eager" />`
          : ""
      }
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
  const inviteText = `我正在发起5100${recommendation.product.name}${groupTargetName(normalizedTarget)}拼卡，目标是${totalCards}张实体水卡（每张${cardBoxCount}箱起送），现在已认领${claimedCards}张，还差${remainingCards}张。建议2-${MAX_GROUP_RECEIVERS}人参与，凑满后由发起人统一确认收卡信息。`;

  return {
    groupId,
    targetPackageType: normalizedTarget,
    targetLabel: groupTargetName(normalizedTarget),
    title: `邀请${sceneName}一起拼${recommendation.product.name}${groupTargetName(normalizedTarget)}`,
    subtitle: `按实体水卡张数认领，建议2-${MAX_GROUP_RECEIVERS}人参与，凑满后统一确认收卡信息。`,
    targetPackage,
    totalCards,
    claimedCards,
    remainingCards,
    cardBoxCount,
    maxReceivers: MAX_GROUP_RECEIVERS,
    shippingMode: "发起人统一确认收卡信息",
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
      <p>${plan.targetPackage.label}共${plan.totalCards}张实体水卡，每张${plan.cardBoxCount}箱；整卡价 ${formatMoney(plan.targetPackage.price)}，约 ${formatMoney(plan.unitCardPrice)}/张。${plan.shippingMode}。</p>
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

function referencePriceItem({ label, name, price, volumeMl, bottleCount, note }) {
  const liters = (volumeMl * bottleCount) / 1000;
  return {
    label,
    name,
    boxPrice: `约${formatMoney(price)}`,
    bottlePrice: `约${formatUnitMoney(price / bottleCount, 1)}`,
    literPrice: `约${formatUnitMoney(price / liters, 1)}/L`,
    note,
  };
}

function competitorReferences(productId) {
  const sharedNote = "京东/天猫同规格或近规格公开价参考，平台活动价会实时变化，下单以店铺页面为准。";
  const references = {
    business: [
      referencePriceItem({
        label: "依云参考",
        name: "Evian 依云 330ml x 24瓶",
        price: 148,
        volumeMl: 330,
        bottleCount: 24,
        note: sharedNote,
      }),
      referencePriceItem({
        label: "斐济参考",
        name: "FIJI 斐泉 330ml x 24瓶",
        price: 168,
        volumeMl: 330,
        bottleCount: 24,
        note: sharedNote,
      }),
    ],
    classic: [
      referencePriceItem({
        label: "依云参考",
        name: "Evian 依云 500ml x 24瓶",
        price: 175,
        volumeMl: 500,
        bottleCount: 24,
        note: sharedNote,
      }),
      referencePriceItem({
        label: "斐济参考",
        name: "FIJI 斐泉 500ml x 24瓶",
        price: 224,
        volumeMl: 500,
        bottleCount: 24,
        note: sharedNote,
      }),
    ],
    family: [
      referencePriceItem({
        label: "依云参考",
        name: "Evian 依云 1.5L x 12瓶",
        price: 199,
        volumeMl: 1500,
        bottleCount: 12,
        note: sharedNote,
      }),
      referencePriceItem({
        label: "斐济参考",
        name: "FIJI 斐泉 1.5L x 12瓶",
        price: 289,
        volumeMl: 1500,
        bottleCount: 12,
        note: sharedNote,
      }),
    ],
    tea: [
      referencePriceItem({
        label: "依云大瓶参考",
        name: "Evian 依云 1.5L x 12瓶",
        price: 199,
        volumeMl: 1500,
        bottleCount: 12,
        note: "4L高端进口水同款较少，按高端进口大瓶近规格参考，下单以店铺页面为准。",
      }),
      referencePriceItem({
        label: "斐济大瓶参考",
        name: "FIJI 斐泉 1.5L x 12瓶",
        price: 289,
        volumeMl: 1500,
        bottleCount: 12,
        note: "4L高端进口水同款较少，按高端进口大瓶近规格参考，下单以店铺页面为准。",
      }),
    ],
  };

  return references[productId] || references.classic;
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
      literPrice: `${formatUnitMoney(unitLiterPrice, 1)}/L`,
      note: `${selected.label}折算价，按当前推荐规格与套餐计算；长期饮用建议重点看每升成本和兑换方式。`,
      highlight: true,
    },
    ...competitorReferences(recommendation.product.id),
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
  const product = recommendation.product;
  const productQuality = {
    business: {
      title: "330ml主打高端商务",
      body: "330ml适合高端商务、会议接待场景，小瓶更适合会议桌、客户来访和活动分发。",
    },
    classic: {
      title: "500ml适合日常及户外",
      body: "500ml是通用度最高的规格，适合办公室、户外饮用、会议和轻礼赠，单瓶容量好理解。",
    },
    family: {
      title: "1.5L更适合居家饮用",
      body: "1.5L适合餐桌、厨房和父母家常备，长期消耗更稳定，按箱兑换后更适合家庭复购。",
    },
    tea: {
      title: "4L切入泡茶煲汤",
      body: "4L定位泡茶、煲汤用水，适合茶台、茶室和高端会务，减少频繁开瓶，方便持续招待。",
    },
  };
  const sourceCard =
    product.id === "tea"
      ? {
          label: "水源",
          title: "雅拉香布雪山藏冰川天然水",
          body: "4L系列来自藏民族摇篮雅砻河谷源头，以适中矿化度切入泡茶、煲汤用水场景。",
        }
      : {
          label: "水源",
          title: "曲玛弄唯一水源地",
          body: "曲玛弄意为“水之谷”，水源位于念青唐古拉山脉南麓海拔约5100米处，来自冰川融水及大气降水经岩层过滤。",
        };
  const mineralCard =
    product.id === "tea"
      ? {
          label: "口感",
          title: "适中矿化度",
          body: "泡茶和煲汤更看重水感稳定、口感干净和不抢茶味，适合先用体验装在真实茶席验证。",
        }
      : {
          label: "矿物",
          title: "锂、锶、偏硅酸三矿水",
          body: "5100曲玛弄具备锂、锶、偏硅酸三项矿物质特征，三项均达到天然矿泉水界限指标。",
        };
  const processCard =
    product.id === "tea"
      ? {
          label: "阵营",
          title: "藏冰川天然水系列",
          body: "4L系列面向泡茶、煲汤用水场景，和旗舰曲玛弄系列共同承接不同饮用需求。",
        }
      : {
          label: "工艺",
          title: "UF超滤保留天然矿物质",
          body: "5100采用UF超滤膜分离技术，在保障净化的同时保留天然矿物质成分。",
        };
  const standardCard =
    product.id === "tea"
      ? {
          label: "场景",
          title: "泡茶、煲汤、高端招待",
          body: "这类场景更在意水感稳定和使用便利，4L大瓶减少频繁开瓶，适合茶室、茶台和餐饮接待。",
        }
      : {
          label: "标准",
          title: "GB8537饮用天然矿泉水",
          body: "可以通过瓶身产品标准号识别品类：GB8537对应饮用天然矿泉水，GB17323对应饮用纯净水。",
        };
  const items = [
    sourceCard,
    mineralCard,
    processCard,
    standardCard,
    {
      label: "规格",
      title: productQuality[product.id]?.title || "按场景选规格",
      body: productQuality[product.id]?.body || product.shortUse,
    },
    {
      label: "价格",
      title: `水卡单箱约${formatUnitMoney(boxPrice, 1)}`,
      body: "高端水不只看进口标签，也要看水源、标准、规格和长期复购成本。水卡能把每箱、每升成本算得更清楚。",
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
    family_drink: `${product.spec}适合居家长期饮用，覆盖餐桌、厨房和日常补水，先用${packageLabel}验证口感更稳妥。`,
    parents: `${product.spec}适合给父母家常备，后续用水卡按需兑换配送，重点是少搬水、长期喝得安心。`,
    office: `${product.spec}对应日常及户外饮用场景，放在办公室也适合茶水间、会议和客户来访。`,
    tea: `${product.spec}适合泡茶、煲汤用水场景，重点看水感稳定、出汤干净和开瓶便利。`,
    gift: `${product.spec}适合高端商务、会议接待场景，也适合客户、领导和节礼，体面又有实际使用价值。`,
    conference: `${product.spec}适合高端商务、会议接待和批量分发，建议先看水卡总价、单箱价和兑换节奏。`,
  };
  const priorityCopy = {
    value: "你在意性价比，所以这里会优先把单瓶、单箱、每升和水卡张数算清楚。",
    taste: "你在意口感，所以建议先用体验装真实试喝，再决定是否升级半吨卡或一吨卡。",
    delivery: "你在意配送，所以重点看水卡按需兑换，减少一次性囤货和搬运压力。",
    prestige: "你在意体面，所以重点看水源地、获奖背书、实物水卡和接待礼赠表达。",
  };
  return `${sceneCopy[recommendation.scenario] || `${product.spec}适合你的当前场景，可先选择${packageLabel}。`} ${priorityCopy[recommendation.priority.id] || ""}`;
}

function customerFaqs(recommendation) {
  const product = recommendation.product;
  const standardFaq =
    product.id === "tea"
      ? {
          title: "泡茶款和普通瓶装水有什么不同？",
          answer: "泡茶款重点看水感稳定、口感干净和不抢茶味，4L规格更适合茶台、煲汤和持续招待场景。",
        }
      : {
          title: "怎么看是不是天然矿泉水？",
          answer: "看瓶身标签的产品标准号。GB 8537对应饮用天然矿泉水，可用标准号快速识别水的品类。",
        };
  return [
    standardFaq,
    {
      title: "5100为什么定位高端？",
      answer:
        product.id === "tea"
          ? "4L系列面向泡茶、煲汤用水高端市场，重点是水源、矿化度、口感稳定和场景适配。"
          : "曲玛弄坚持唯一水源地、原地灌装，并采用UF超滤膜分离工艺保留天然矿物质，这些共同构成高端定位。",
    },
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
      answer: `可以发起拼卡计划，建议2-${MAX_GROUP_RECEIVERS}人按实体水卡张数认领；凑满后统一确认收卡信息，再进入小程序完成下单。`,
    },
  ];
}

function customerProofCards(recommendation) {
  const product = recommendation.product;
  const selected = recommendation.recommendedPackage;
  const sceneReason = {
    family_drink: {
      title: "家庭日饮这样选",
      body: "家庭长期喝水最怕买错规格和一次买太多。1.5L适合居家饮用，覆盖餐桌、厨房和日常补水，先用六箱建立口感和配送体验。",
      image: "/assets/manual/proof/family-scene.jpg",
      imageFit: "cover",
    },
    parents: {
      title: "给长辈更看重省心",
      body: "给父母家备水，重点不是一次堆很多箱，而是后续能按需兑换到家。家庭款1.5L更适合做长期常备水。",
      image: "/assets/manual/proof/family-scene.jpg",
      imageFit: "cover",
    },
    office: {
      title: "办公室更看重通用",
      body: "办公室既有员工日饮，也有会议和客户来访。500ml适合日常及户外饮用，通用度高，摆放、分发和控制消耗都更方便。",
      image: "/assets/manual/classic-full.jpg",
      imageFit: "contain",
    },
    tea: {
      title: "泡茶更看重水感稳定",
      body: "茶室和茶台用水，重点是口感、出汤和连续冲泡。4L适合泡茶、煲汤用水，适合茶席和高端招待。",
      image: "/assets/manual/tea.jpg",
      imageFit: "contain",
    },
    gift: {
      title: "商务礼赠要体面也要实用",
      body: "330ml主打高端商务、会议接待场景，适合会议桌、客户拜访和活动伴手礼，规格精致，分发容易。",
      image: "/assets/manual/business-full.jpg",
      imageFit: "contain",
    },
    conference: {
      title: "会务福利要先算总量",
      body: "企业批量用水要看人数、周期和每箱成本。商务款330ml适合会议与活动，水卡适合把长期消耗安排清楚。",
      image: "/assets/manual/business-full.jpg",
      imageFit: "contain",
    },
  };
  const priorityReason = {
    value: {
      title: "性价比看单箱和每升",
      body: `${selected.label}折算单箱约${formatUnitMoney(selected.unitBoxPrice, 1)}、每升约${formatUnitMoney(selected.price / selected.totalLiters, 1)}，比只看整卡总价更容易判断是否划算。`,
      image: product.image,
      imageFit: "contain",
    },
    taste: {
      title: "口感先用真实场景试",
      body: "水好不好喝，最好在家里、办公室或茶台真实试。先从体验装开始，喝过之后再决定是否升级长期水卡。",
      image: product.id === "tea" ? "/assets/manual/tea.jpg" : "/assets/manual/hero.jpg",
      imageFit: product.id === "tea" ? "contain" : "cover",
    },
    delivery: {
      title: "水卡适合按需兑换",
      body: "体验装先试喝，水卡后续按需兑换，不需要一次性把半吨或一吨全部堆在家里。",
      image: "/assets/manual/proof/exchange-compact.jpg",
      imageFit: "contain",
    },
    prestige: {
      title: "体面来自水源和背书",
      body:
        product.id === "tea"
          ? "4L泡茶款强调水感、规格和高端茶席场景，比普通桶装水更适合茶室、会务和客户招待。"
          : "曲玛弄唯一水源地、三矿水、地理标志和实体水卡，比普通箱装水更适合接待、礼赠和客户维护。",
      image: product.id === "tea" ? "/assets/manual/tea.jpg" : "/assets/manual/proof/awards.jpg",
      imageFit: "contain",
    },
  };
  const manualProof =
    product.id === "tea"
      ? {
          title: "源头与品控更安心",
          body: "好水适合长期喝，也适合用在茶台和餐饮场景。选泡茶款时，可以同时关注水源、口感和稳定供应。",
          image: "/assets/manual/proof/factory-uf.jpg",
          imageFit: "cover",
        }
      : {
          title: "曲玛弄的品质证据",
          body: "曲玛弄拥有地理标志产品保护、国家天然矿泉水5A级水源等背书，并具备锂、锶、偏硅酸三项矿物质特征。",
          image: "/assets/manual/proof/mineral-table.jpg",
          imageFit: "contain",
        };
  const sceneCard = sceneReason[recommendation.scenario] || {
    title: `${product.name}适合这个场景`,
    body: product.shortUse,
    image: product.image,
    imageFit: "contain",
  };

  return [
    sceneCard,
    priorityReason[recommendation.priority.id] || priorityReason.value,
    manualProof,
    {
      title: "从体验到水卡更自然",
      body: `${product.name}可以先用体验装降低第一次决策压力，确认合适后再升级半吨卡或一吨卡。`,
      image: "/assets/manual/proof/exchange-compact.jpg",
      imageFit: "contain",
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

function applyPreviewParams() {
  const params = getParams();
  const scenario = params.get("scenario");
  const priority = params.get("priority");
  const people = params.get("people");
  const enterprise = params.get("enterprise");

  if (scenario) {
    const input = [...form.querySelectorAll('input[name="scenario"]')].find((item) => item.value === scenario);
    if (input) {
      input.checked = true;
      document
        .querySelectorAll('input[name="scenario"]')
        .forEach((item) => item.closest(".choice")?.classList.toggle("is-selected", item === input));
    }
  }

  if (priority) {
    const input = [...form.querySelectorAll('input[name="priority"]')].find((item) => item.value === priority);
    if (input) {
      input.checked = true;
      document
        .querySelectorAll('input[name="priority"]')
        .forEach((item) => item.closest(".choice")?.classList.toggle("is-selected", item === input));
    }
  }

  if (people) {
    const next = Math.min(30, Math.max(1, Number(people) || 3));
    peopleInput.value = String(next);
  }

  if (enterprise === "1") {
    const checkbox = form.querySelector('input[name="hasEnterpriseResource"]');
    if (checkbox) checkbox.checked = true;
  }

  if (params.get("preview") === "1") {
    requestRecommendation(params.get("productId") || undefined);
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

applyPreviewParams();
