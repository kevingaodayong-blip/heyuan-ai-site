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
    subtitle: "演示版先模拟进度和邀请，不接真实多人支付。",
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
      inviter_id: "demo_user",
    },
  };
}

function groupOrderCard(plan) {
  return `
    <div class="group-order-card__head">
      <div>
        <span>拼单凑卡演示</span>
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
      <button class="package-button" id="groupParamsButton" type="button">查看凑单参数</button>
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

async function copyShareText() {
  await copyTextToClipboard(currentShareText, "话术已复制，可以发微信");
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
      dialogMessage.textContent = "演示版不会真实成交，以下是拼单凑卡入口后续可带给小程序的参数。";
      orderParams.textContent = JSON.stringify(
        {
          orderUrl: data.orderUrl,
          params: data.params,
          inviteText: currentGroupPlan.inviteText,
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
}

function renderGroupOrder(targetPackageType) {
  currentGroupPlan = buildGroupPlan(currentRecommendation, targetPackageType);
  document.querySelector("#groupOrderPanel").innerHTML = groupOrderCard(currentGroupPlan);
  bindGroupOrderButtons();
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

  renderGroupOrder();

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
