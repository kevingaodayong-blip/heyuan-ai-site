const ORDER_BASE_URL = "https://heyuan.ai/5100/order-preview";

const priceTiers = {
  dealer_a: { id: "dealer_a", name: "一级经销商A" },
  dealer_b: { id: "dealer_b", name: "二级经销商B" },
  vip_a: { id: "vip_a", name: "VIP A" },
  vip_b: { id: "vip_b", name: "VIP B" },
  vip_c: { id: "vip_c", name: "VIP C" },
  vip_d: { id: "vip_d", name: "VIP D" },
};

const products = {
  business: {
    id: "business",
    name: "商务款",
    sku: "business-330ml",
    spec: "330ml x 24瓶",
    shortUse: "会议、接待、活动用水",
    image: "/assets/manual/business.jpg",
    litersPerBox: 7.92,
    tonBoxes: 132,
    halfBoxes: 66,
    retail: { trial: 500, half: 5800, ton: 11000 },
    prices: {
      dealer_a: { half: 2800, ton: 5000 },
      dealer_b: { half: 3100, ton: 5600 },
      vip_a: { half: 3450, ton: 6300 },
      vip_b: { half: 3700, ton: 6800 },
      vip_c: { half: 3950, ton: 7300 },
      vip_d: { half: 4200, ton: 7800 },
    },
    trialOverride: { vip_b: 309 },
  },
  classic: {
    id: "classic",
    name: "经典款",
    sku: "classic-500ml",
    spec: "500ml x 24瓶",
    shortUse: "家庭日饮、办公室、轻礼赠",
    image: "/assets/manual/classic.jpg",
    litersPerBox: 12,
    tonBoxes: 84,
    halfBoxes: 42,
    retail: { trial: 714, half: 5250, ton: 10000 },
    prices: {
      dealer_a: { half: 2250, ton: 4000 },
      dealer_b: { half: 2500, ton: 4500 },
      vip_a: { half: 2900, ton: 5300 },
      vip_b: { half: 3150, ton: 5800 },
      vip_c: { half: 3400, ton: 6300 },
      vip_d: { half: 3650, ton: 6800 },
    },
    trialOverride: { vip_b: 498 },
  },
  family: {
    id: "family",
    name: "家庭款",
    sku: "family-1500ml",
    spec: "1.5L x 12瓶",
    shortUse: "家庭、父母、长期饮用",
    image: "/assets/manual/family.jpg",
    litersPerBox: 18,
    tonBoxes: 60,
    halfBoxes: 30,
    retail: { trial: 1000, half: 5250, ton: 10000 },
    prices: {
      dealer_a: { half: 2200, ton: 3900 },
      dealer_b: { half: 2400, ton: 4300 },
      vip_a: { half: 2850, ton: 5200 },
      vip_b: { half: 3100, ton: 5700 },
      vip_c: { half: 3350, ton: 6200 },
      vip_d: { half: 3600, ton: 6700 },
    },
    trialOverride: { vip_b: 538 },
  },
  tea: {
    id: "tea",
    name: "泡茶款",
    sku: "tea-4l",
    spec: "4L x 4瓶",
    shortUse: "泡茶、茶室、高端会务",
    image: "/assets/manual/tea.jpg",
    litersPerBox: 16,
    tonBoxes: 60,
    halfBoxes: 30,
    retail: { trial: 792, half: 4750, ton: 9000 },
    prices: {
      dealer_a: { half: 2100, ton: 3700 },
      dealer_b: { half: 2250, ton: 4000 },
      vip_a: { half: 2400, ton: 4300 },
      vip_b: { half: 2650, ton: 4800 },
      vip_c: { half: 2900, ton: 5300 },
      vip_d: { half: 3150, ton: 5800 },
    },
    trialOverride: { vip_b: 408 },
    giftText: "体验装为5箱4L，附赠1箱330ml；半吨/一吨卡按截图规则附赠。",
  },
};

const scenarioMap = {
  family_drink: { label: "家里长期喝", productId: "family", intent: "长期家庭饮水" },
  parents: { label: "给父母长辈", productId: "family", intent: "长辈健康饮水" },
  office: { label: "办公室接待", productId: "classic", intent: "办公室与员工福利" },
  tea: { label: "泡茶/茶室", productId: "tea", intent: "泡茶与高端会务" },
  gift: { label: "商务送礼", productId: "business", intent: "商务礼赠" },
  conference: { label: "企业福利/会务", productId: "business", intent: "企业批量用水" },
};

const priorityMap = {
  value: { id: "value", label: "先看性价比", hook: "重点解释每箱价差、体验门槛和长期兑换成本。" },
  taste: { id: "taste", label: "先试口感", hook: "先让用户用六箱验证口感，再自然升级水卡。" },
  delivery: { id: "delivery", label: "担心配送", hook: "突出按需兑换、分次配送、多地址灵活使用。" },
  prestige: { id: "prestige", label: "重视体面", hook: "强调水源、证书、礼赠和商务接待的表达感。" },
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function money(value) {
  return Math.round(Number(value || 0));
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getTier(tierId) {
  return priceTiers[tierId] || priceTiers.vip_b;
}

function getProduct(productId) {
  return products[productId] || products.family;
}

function getPriority(priorityId) {
  return priorityMap[priorityId] || priorityMap.value;
}

function trialPrice(product, tierId) {
  if (product.trialOverride?.[tierId]) return product.trialOverride[tierId];
  return money((product.prices[tierId].ton / product.tonBoxes) * 6);
}

function packageFor(product, tierId, type) {
  const tierPrices = product.prices[tierId] || product.prices.vip_b;
  const trialMainBoxes = product.id === "tea" ? 5 : 6;
  const packages = {
    trial_6_boxes: {
      type: "trial_6_boxes",
      label: "六箱体验装",
      price: trialPrice(product, tierId),
      retailPrice: product.retail.trial,
      boxes: product.id === "tea" ? "5箱4L + 赠1箱330ml" : "6箱",
      boxCount: trialMainBoxes,
      totalLiters: money(product.litersPerBox * trialMainBoxes),
      cta: "先买六箱体验装",
      role: "低门槛体验",
    },
    half_ton_card: {
      type: "half_ton_card",
      label: "半吨卡",
      price: tierPrices.half,
      retailPrice: product.retail.half,
      boxes: product.id === "tea" ? `${product.halfBoxes}箱4L + 赠6箱330ml` : `${product.halfBoxes}箱`,
      boxCount: product.halfBoxes,
      totalLiters: money(product.litersPerBox * product.halfBoxes),
      cta: "购买半吨卡",
      role: "确认场景后进阶",
    },
    one_ton_card: {
      type: "one_ton_card",
      label: "一吨卡",
      price: tierPrices.ton,
      retailPrice: product.retail.ton,
      boxes: product.id === "tea" ? `${product.tonBoxes}箱4L + 赠12箱330ml` : `${product.tonBoxes}箱`,
      boxCount: product.tonBoxes,
      totalLiters: money(product.litersPerBox * product.tonBoxes),
      cta: "购买一吨卡",
      role: "长期饮用主成交",
    },
  };
  return packages[type];
}

function productPackages(product, tierId) {
  return ["trial_6_boxes", "half_ton_card", "one_ton_card"]
    .map((type) => packageFor(product, tierId, type))
    .map((item) => ({
      ...item,
      savings: money(item.retailPrice - item.price),
      savingRate: Math.max(0, Math.round(((item.retailPrice - item.price) / item.retailPrice) * 100)),
    }));
}

function recommendPackageType({ people, hasEnterpriseResource, scenario }) {
  if (hasEnterpriseResource || ["office", "gift", "conference", "tea"].includes(scenario)) {
    return people >= 6 ? "one_ton_card" : "half_ton_card";
  }
  if (people >= 5) return "half_ton_card";
  return "trial_6_boxes";
}

function dailyLiterNeed(scenario, people) {
  const perPerson = {
    family_drink: 1.1,
    parents: 1,
    office: 0.55,
    tea: 0.75,
    gift: 0.35,
    conference: 0.65,
  }[scenario] || 1;
  return Math.max(0.8, people * perPerson);
}

function buildUsageInsight(product, selectedPackage, scenario, people) {
  const dailyNeed = dailyLiterNeed(scenario, people);
  const estimatedDays = Math.max(3, Math.round(selectedPackage.totalLiters / dailyNeed));
  const monthlyCost = Math.max(1, money((selectedPackage.price / estimatedDays) * 30));
  const costPerLiter = Number((selectedPackage.price / selectedPackage.totalLiters).toFixed(1));
  return {
    title: `${selectedPackage.label}够用约${estimatedDays}天`,
    sceneText:
      scenario === "gift"
        ? "按礼赠/客户维护节奏折算"
        : scenario === "conference"
          ? "按会务与办公室综合消耗折算"
          : `按${people}人日常饮用折算`,
    dailyNeed: Number(dailyNeed.toFixed(1)),
    estimatedDays,
    monthlyCost,
    costPerLiter,
    perBoxPrice: Number((selectedPackage.price / selectedPackage.boxCount).toFixed(1)),
    chips: [
      `${selectedPackage.boxes}`,
      `约${selectedPackage.totalLiters}L`,
      `约${formatNumber(costPerLiter)}元/L`,
      `折合${formatNumber(monthlyCost)}元/月`,
    ],
  };
}

function buildObjectionCards({ priority, scenario, product, selectedPackage }) {
  const cards = {
    value: {
      title: "觉得贵怎么办",
      answer: `先不推大卡，用${selectedPackage.label}把单次决策变小；同时把参考价差和每箱价讲清楚，用户更容易理解贵在哪里、省在哪里。`,
    },
    taste: {
      title: "担心口感不适合",
      answer: `把首次目标改成试喝反馈，不要求马上买长期卡。${product.name}适配${product.shortUse}，体验后再升级更自然。`,
    },
    delivery: {
      title: "担心囤货和搬运",
      answer: "强调水卡按需兑换、分次配送，可给家里、办公室或长辈地址拆分，不需要一次性堆在家里。",
    },
    prestige: {
      title: "送礼怕不够体面",
      answer: "优先讲5100米水源、矿物质记忆点和实物水卡，比单纯送几箱水更像一份长期关怀。",
    },
  };
  const scenarioCard =
    scenario === "tea"
      ? { title: "泡茶用户为什么先试4L", answer: "泡茶场景最看口感和稳定性，4L更适合茶台持续使用，体验装能让茶友先用真实茶汤判断。" }
      : scenario === "office" || scenario === "conference"
        ? { title: "企业用户为什么看半吨卡", answer: "办公室和会务有稳定消耗，半吨卡比单次采购更容易建立供水关系，同时比一吨卡首单压力更低。" }
        : { title: "家庭用户为什么先体验", answer: "家庭饮水是习惯型消费，先用六箱建立口感和配送体验，比一上来推一吨更顺。" };

  return [cards[priority.id], scenarioCard, cards.delivery].filter(
    (item, index, list) => list.findIndex((current) => current.title === item.title) === index,
  );
}

function buildEducationCards(product, scenario) {
  const sceneCards = {
    family_drink: [
      ["先解决喝不完", "从六箱体验装开始，不急着让用户买一吨，降低首次心理门槛。", "/assets/manual/purchase-card.jpg"],
      ["长期饮水理由", "家庭款1.5L适合餐桌、厨房和日常补水，更容易形成复购。", "/assets/manual/family.jpg"],
    ],
    parents: [
      ["给父母的理由更自然", "按需送到家，减少搬运，健康关怀比单纯卖货更容易被接受。", "/assets/manual/child-family.jpg"],
      ["实物兑换更安心", "每六箱起免费配送，按需兑换，比一次性囤货更容易接受。", "/assets/manual/exchange-benefits.jpg"],
    ],
    office: [
      ["办公室有稳定消耗", "经典款500ml适合会议室、茶水间、客户接待，使用场景清晰。", "/assets/manual/classic.jpg"],
      ["半吨卡更容易成交", "先从半吨卡建立供应关系，再推动一吨卡复购。", "/assets/manual/half-ton-golf.jpg"],
    ],
    tea: [
      ["泡茶款需要场景教育", "用茶席、口感和矿物质解释价值，比直接讲价格更有效。", "/assets/manual/tea.jpg"],
      ["体验装最适合试茶", "5箱4L加赠330ml，适合先做茶台体验。", "/assets/manual/purchase-card.jpg"],
    ],
    gift: [
      ["礼赠讲究体面和实用", "商务款330ml便于分发，适合客户、领导、活动伴手礼。", "/assets/manual/business.jpg"],
      ["从体验到批量", "先体验，再用半吨/一吨卡解决节礼和客户维护。", "/assets/manual/exchange-benefits.jpg"],
    ],
    conference: [
      ["企业福利要算总账", "商务款按箱分发，会议、福利、活动场景都能承接。", "/assets/manual/business.jpg"],
      ["AI替代销售解释", "把规格、箱数、价差和配送一次讲清，减少人工教育成本。", "/assets/manual/exchange-benefits.jpg"],
    ],
  };
  return [
    ...(sceneCards[scenario] || sceneCards.family_drink),
    ["价格等级来自二维码", "客户扫码后的价格由分享二维码绑定的价格等级决定，演示默认展示VIP B。", ""],
    ["下单页最终确认", "演示版只生成参数，真实价格、库存和支付由小程序下单页确认。", ""],
  ].map(([title, body, image]) => ({ title, body, image }));
}

function buildDeliveryPlan(product, packageType, scenario) {
  if (packageType === "trial_6_boxes") {
    return [
      {
        title: "先用六箱验证口感",
        body:
          product.id === "tea"
            ? "泡茶款体验装适合先放到茶台或办公室，验证口感和接待反馈。"
            : "六箱刚好达到电商起发认知，用户不用一次承担半吨/一吨决策。",
      },
    ];
  }
  const isTon = packageType === "one_ton_card";
  const totalRounds = isTon ? 12 : 6;
  const homeRounds = scenario === "office" || scenario === "conference" ? 2 : Math.ceil(totalRounds / 2);
  const officeRounds = scenario === "office" || scenario === "conference" ? totalRounds - 2 : 2;
  const giftRounds = Math.max(0, totalRounds - homeRounds - officeRounds);
  return [
    { title: "家庭/自用", body: `${homeRounds}次配送，覆盖日常饮水。` },
    { title: "办公室/会务", body: `${officeRounds}次配送，覆盖接待、茶水间或会议。` },
    { title: "长辈/客户", body: giftRounds > 0 ? `${giftRounds}次配送，可拆分到不同地址。` : "可随时改成赠礼地址。" },
  ];
}

function calculateLeadScore({ scenario, packageType, people, hasEnterpriseResource }) {
  let score = 52;
  if (["office", "gift", "conference", "tea"].includes(scenario)) score += 12;
  if (packageType === "half_ton_card") score += 10;
  if (packageType === "one_ton_card") score += 18;
  if (people >= 5) score += 7;
  if (hasEnterpriseResource) score += 9;
  return Math.min(98, score);
}

function buildConversionSignals({ scenario, selectedPackage, leadScore, people, priority }) {
  return {
    score: leadScore,
    stage: leadScore >= 85 ? "高意向，可直接引导下单" : leadScore >= 70 ? "中高意向，先推体验或半吨卡" : "教育期，先让用户试喝",
    tags: [scenarioMap[scenario].label, `${people}人`, selectedPackage.label, priority.label],
    nextAction:
      selectedPackage.type === "trial_6_boxes"
        ? "成交后第3天追问口感，第7天推荐半吨卡。"
        : selectedPackage.type === "half_ton_card"
          ? "确认首批配送地址，后续按消耗提醒续卡。"
          : "适合绑定长期服务，提前设计分次配送计划。",
  };
}

function buildFollowUpKit({ scenario, product, selectedPackage, usageInsight, priority }) {
  const sceneName = scenarioMap[scenario].label;
  const proofLine =
    priority.id === "prestige"
      ? "这款可以把5100米冰川水源、矿物质和实物水卡一起讲清楚，送礼和接待更有表达感。"
      : priority.id === "delivery"
        ? "水卡可以按需兑换、分次配送，后面家里、办公室、长辈地址都可以灵活安排。"
        : "先试口感和配送体验，确认合适后再升级半吨卡或一吨卡。";
  return {
    title: "分销商跟进话术",
    shareText: `我刚用5100 AI饮水顾问按「${sceneName}」测了一下，比较适合先看${product.name}。\n${selectedPackage.label}是${selectedPackage.boxes}，AI估算约可覆盖${usageInsight.estimatedDays}天，先体验不需要一次囤太多。\n${proofLine}`,
    internalNote: `线索重点：${priority.hook}`,
    callScript: `先问使用场景和预计人数，再用${selectedPackage.label}承接，不要一开始要求注册。`,
  };
}

function buildAiEnablements() {
  return [
    { title: "扫码识别价格等级", body: "同一页面按二维码带入VIP/经销商价，避免人工解释价格体系。" },
    { title: "按场景露出说明书", body: "用户选家庭、泡茶、办公后，只展示相关水源、规格和配送证据。" },
    { title: "线索热度评分", body: "把人数、场景、套餐选择转成分数，销售优先跟进高意向用户。" },
    { title: "成交话术生成", body: "自动生成适合转发微信的解释文案，降低分销商培训成本。" },
  ];
}

function buildRecommendation(payload) {
  const scenario = scenarioMap[payload.scenario] ? payload.scenario : "family_drink";
  const tier = getTier(payload.tier);
  const priority = getPriority(payload.priority);
  const scenarioConfig = scenarioMap[scenario];
  const product = getProduct(payload.productId || scenarioConfig.productId);
  const people = clampNumber(payload.people, 1, 30, 3);
  const hasEnterpriseResource = Boolean(payload.hasEnterpriseResource);
  const recommendedPackageType = recommendPackageType({ people, hasEnterpriseResource, scenario });
  const packages = productPackages(product, tier.id);
  const recommendedPackage = packages.find((item) => item.type === recommendedPackageType);
  const usageInsight = buildUsageInsight(product, recommendedPackage, scenario, people);
  const leadScore = calculateLeadScore({ scenario, packageType: recommendedPackageType, people, hasEnterpriseResource });
  const conversionSignals = buildConversionSignals({ scenario, selectedPackage: recommendedPackage, leadScore, people, priority });

  return {
    id: crypto.randomUUID(),
    demoMode: true,
    scenario,
    scenarioName: scenarioConfig.label,
    intent: scenarioConfig.intent,
    priority,
    tier,
    people,
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      spec: product.spec,
      shortUse: product.shortUse,
      image: product.image,
      giftText: product.giftText || "",
    },
    headline: `AI建议：${scenarioConfig.label}优先看「${product.name}」`,
    reason: `${priority.hook} AI会先降低首次决策压力，再按明确场景引导半吨卡或一吨卡。`,
    recommendedPackage,
    packages,
    usageInsight,
    objectionCards: buildObjectionCards({ priority, scenario, product, selectedPackage: recommendedPackage }),
    conversionSignals,
    followUpKit: buildFollowUpKit({ scenario, product, selectedPackage: recommendedPackage, usageInsight, priority }),
    aiEnablements: buildAiEnablements(),
    alternatives: Object.values(products).map((item) => ({
      id: item.id,
      name: item.name,
      spec: item.spec,
      shortUse: item.shortUse,
      image: item.image,
      trialPrice: trialPrice(item, tier.id),
      halfPrice: item.prices[tier.id].half,
      tonPrice: item.prices[tier.id].ton,
    })),
    deliveryPlan: buildDeliveryPlan(product, recommendedPackageType, scenario),
    educationCards: buildEducationCards(product, scenario),
    leadScore,
  };
}

function appendParams(baseUrl, params) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function handleApi(request, pathname) {
  if (pathname === "/5100/api/config" && request.method === "GET") {
    return json({
      service: "5100-ai-conversion-gateway",
      demoMode: true,
      defaultTier: "vip_b",
      orderBaseUrlConfigured: false,
      miniProgramAppId: "",
      tiers: Object.values(priceTiers),
    });
  }

  if (pathname === "/5100/api/recommendation" && request.method === "POST") {
    try {
      const payload = await request.json();
      return json({ recommendation: buildRecommendation(payload) });
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (pathname === "/5100/api/order-link" && request.method === "POST") {
    try {
      const payload = await request.json();
      const recommendation = payload.recommendation || buildRecommendation(payload);
      const packageType = payload.packageType || recommendation.recommendedPackage?.type || "trial_6_boxes";
      const product = getProduct(payload.productId || recommendation.product?.id);
      const tier = getTier(payload.tier || recommendation.tier?.id);
      const selectedPackage = packageFor(product, tier.id, packageType);
      const groupOrder = payload.groupOrder || {};
      const params = {
        channel: "ai_h5_beta",
        appid: "",
        tier: tier.id,
        tier_name: tier.name,
        scenario: recommendation.scenario,
        sku: product.sku,
        product_id: product.id,
        package_type: packageType,
        package_label: selectedPackage.label,
        priority: recommendation.priority?.id || payload.priority || "value",
        plan_id: recommendation.id,
        lead_score: recommendation.leadScore,
        source: payload.source || "h5",
        group_id: groupOrder.group_id,
        group_mode: groupOrder.group_mode || "solo",
        group_target_card: groupOrder.group_target_card,
        group_target_product_id: groupOrder.group_target_product_id,
        group_target_sku: groupOrder.group_target_sku,
        group_claimed_boxes: groupOrder.group_claimed_boxes,
        group_remaining_boxes: groupOrder.group_remaining_boxes,
        inviter_id: groupOrder.inviter_id,
      };
      return json({
        demoMode: true,
        orderUrl: appendParams(ORDER_BASE_URL, params),
        params,
        message: "演示版不会真实成交，以下参数用于后续连接小程序下单接口。",
      });
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  if (pathname === "/5100/api/lead" && request.method === "POST") {
    return json({ ok: true });
  }

  return json({ error: "API endpoint not found" }, 404);
}

async function fetchAsset(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/5100") {
    url.pathname = "/5100/";
    return Response.redirect(url.toString(), 308);
  }
  if (url.pathname === "/5100/") {
    url.pathname = "/5100/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  }
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/5100/health") {
      return json({ ok: true, time: new Date().toISOString(), runtime: "cloudflare-worker" });
    }
    if (url.pathname.startsWith("/5100/api/")) {
      return handleApi(request, url.pathname);
    }
    return fetchAsset(request, env);
  },
};
