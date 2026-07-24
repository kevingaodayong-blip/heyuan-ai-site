const PRICE_POLICY = {
  version: "2026-07-24-v3",
  checkedAt: "2026-07-24T11:19:27+08:00",
  maxAgeHours: 168,
  rule: "公开成交价不得低于京东自营同款可比商业成交价；京东官方水卡折算价更高时取更高者；政府补贴不计入商业降价。",
  source: "2026-07-24 京东登录页核验；泡茶混装按当前4L与330ml官方水卡同权益折算",
};

const PACKAGE_TYPES = {
  single_card_6_boxes: {
    type: "single_card_6_boxes",
    label: "六箱卡",
    role: "第一次购买",
  },
  half_ton_card: {
    type: "half_ton_card",
    label: "半吨卡",
    role: "家庭或办公室长期饮用",
  },
  one_ton_card: {
    type: "one_ton_card",
    label: "一吨卡",
    role: "企业、多地址或大用量",
  },
};

const PRODUCTS = {
  business: {
    id: "business",
    name: "商务款",
    sku: "business-330ml",
    spec: "330ml × 24瓶/箱",
    image: "/assets/products/business-manual-original.jpg",
    scene: "会议、接待、活动用水",
    cardPriceFen: 57000,
    jdComparableCardFen: 54282,
    boxes: "6箱",
    boxCount: 6,
    liters: 47.52,
    vipBHalfTon: {
      priceFen: 370000,
      boxes: "66箱",
      boxCount: 66,
      cardCount: 11,
      liters: 522.72,
    },
    vipBOneTon: {
      priceFen: 680000,
      boxes: "132箱",
      boxCount: 132,
      cardCount: 22,
      liters: 1045.44,
    },
  },
  classic: {
    id: "classic",
    name: "经典款",
    sku: "classic-500ml",
    spec: "500ml × 24瓶/箱",
    image: "/assets/products/classic-manual-original.jpg",
    scene: "家庭日饮、办公室、轻礼赠",
    cardPriceFen: 78000,
    jdComparableCardFen: 74202,
    boxes: "6箱",
    boxCount: 6,
    liters: 72,
    vipBHalfTon: {
      priceFen: 315000,
      boxes: "42箱",
      boxCount: 42,
      cardCount: 7,
      liters: 504,
    },
    vipBOneTon: {
      priceFen: 580000,
      boxes: "84箱",
      boxCount: 84,
      cardCount: 14,
      liters: 1008,
    },
  },
  family: {
    id: "family",
    name: "家庭款",
    sku: "family-1500ml",
    spec: "1.5L × 12瓶/箱",
    image: "/assets/products/family-manual-original.jpg",
    scene: "家庭、父母、长期饮用",
    cardPriceFen: 68000,
    jdComparableCardFen: 64242,
    boxes: "6箱",
    boxCount: 6,
    liters: 108,
    vipBHalfTon: {
      priceFen: 310000,
      boxes: "30箱",
      boxCount: 30,
      cardCount: 5,
      liters: 540,
    },
    vipBOneTon: {
      priceFen: 570000,
      boxes: "60箱",
      boxCount: 60,
      cardCount: 10,
      liters: 1080,
    },
  },
  tea: {
    id: "tea",
    name: "泡茶款",
    sku: "tea-4l",
    spec: "4L × 4瓶/箱",
    image: "/assets/products/tea-manual-original.jpg",
    scene: "泡茶、茶室、高端会务",
    cardPriceFen: 53000,
    jdComparableCardFen: 50132,
    boxes: "5箱4L + 1箱330ml",
    boxCount: 6,
    liters: 87.92,
    vipBHalfTon: {
      priceFen: 265000,
      boxes: "30箱4L + 6箱330ml",
      boxCount: 36,
      cardCount: 6,
      liters: 527.52,
    },
    vipBOneTon: {
      priceFen: 480000,
      boxes: "60箱4L + 12箱330ml",
      boxCount: 72,
      cardCount: 12,
      liters: 1055.04,
    },
  },
};

const SCENARIOS = {
  family_drink: {
    label: "家里长期喝",
    productId: "family",
    reason: "家庭款的大包装更适合餐桌、厨房和日常补水。",
  },
  parents: {
    label: "给父母长辈",
    productId: "family",
    reason: "家庭款的大包装适合父母长辈在家长期饮用。",
  },
  office: {
    label: "办公室接待",
    productId: "classic",
    reason: "经典款适合会议室、茶水间和客户来访。",
  },
  tea: {
    label: "泡茶/茶室",
    productId: "tea",
    reason: "4L规格更适合茶台连续烧水和泡茶使用。",
  },
  gift: {
    label: "商务礼赠",
    productId: "business",
    reason: "商务款的小瓶规格便于会议、活动和客户礼赠。",
  },
  conference: {
    label: "企业福利/会务",
    productId: "business",
    reason: "商务款便于分发，更容易按场次核算和补货。",
  },
};

const PRIORITIES = {
  value: "三档总价、水卡张数和单卡成本均已列明，可直接比较。",
  taste: "如更看重口感，可先选择六箱卡；确认适合后再选择长期卡。",
  delivery: "每张水卡对应一次六箱配送，可按卡分次安排。",
  prestige: "用水源、规格与应用场景表达价值，不依赖公开低价。",
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function yuan(fen) {
  return Number((fen / 100).toFixed(2));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanText(value, maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

function getProduct(productId) {
  return PRODUCTS[productId] || PRODUCTS.family;
}

function getPriceFloorFen(product) {
  return product.jdComparableCardFen;
}

function getPriceStatus(now = new Date()) {
  const checkedAt = new Date(PRICE_POLICY.checkedAt);
  const nextReviewAt = new Date(
    checkedAt.getTime() + PRICE_POLICY.maxAgeHours * 60 * 60 * 1000,
  );
  const products = Object.values(PRODUCTS).map((product) => {
    const floorFen = getPriceFloorFen(product);
    return {
      productId: product.id,
      guarded: product.cardPriceFen >= floorFen,
      salePrice: yuan(product.cardPriceFen),
      floorPrice: yuan(floorFen),
    };
  });
  return {
    valid: now <= nextReviewAt && products.every((item) => item.guarded),
    checkedAt: checkedAt.toISOString(),
    nextReviewAt: nextReviewAt.toISOString(),
    rule: PRICE_POLICY.rule,
    source: PRICE_POLICY.source,
    products,
  };
}

function getProductPackage(product, packageType = "single_card_6_boxes") {
  const metadata = PACKAGE_TYPES[packageType] || PACKAGE_TYPES.single_card_6_boxes;
  const offer =
    packageType === "half_ton_card"
      ? product.vipBHalfTon
      : packageType === "one_ton_card"
        ? product.vipBOneTon
        : {
            priceFen: product.cardPriceFen,
            boxes: product.boxes,
            boxCount: product.boxCount,
            cardCount: 1,
            liters: product.liters,
          };

  return {
    ...metadata,
    price: yuan(offer.priceFen),
    priceFen: offer.priceFen,
    boxes: offer.boxes,
    boxCount: offer.boxCount,
    cardCount: offer.cardCount,
    liters: offer.liters,
    unitCardPrice: Number((yuan(offer.priceFen) / offer.cardCount).toFixed(2)),
    priceBasis: packageType === "single_card_6_boxes" ? "protected_public_card" : "vip_b_v1",
  };
}

function publicPackage(product, packageType) {
  const offer = getProductPackage(product, packageType);
  const { priceFen, ...publicOffer } = offer;
  return publicOffer;
}

function publicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    spec: product.spec,
    image: product.image,
    scene: product.scene,
    cardPrice: yuan(product.cardPriceFen),
    boxes: product.boxes,
    boxCount: product.boxCount,
    liters: product.liters,
    unitBoxPrice: Number((yuan(product.cardPriceFen) / product.boxCount).toFixed(2)),
    packages: Object.keys(PACKAGE_TYPES).map((packageType) =>
      publicPackage(product, packageType),
    ),
  };
}

function recommendPackageType(scenarioId, people) {
  if (["conference"].includes(scenarioId)) {
    return people >= 8 ? "one_ton_card" : "half_ton_card";
  }
  if (["office", "gift"].includes(scenarioId)) {
    if (people >= 8) return "one_ton_card";
    if (people >= 3) return "half_ton_card";
    return "single_card_6_boxes";
  }
  if (scenarioId === "tea") {
    if (people >= 6) return "one_ton_card";
    if (people >= 2) return "half_ton_card";
    return "single_card_6_boxes";
  }
  if (people >= 10) return "one_ton_card";
  if (people >= 5) return "half_ton_card";
  return "single_card_6_boxes";
}

function buildRecommendation(payload = {}) {
  const scenarioId = SCENARIOS[payload.scenario] ? payload.scenario : "family_drink";
  const scenario = SCENARIOS[scenarioId];
  const priority = PRIORITIES[payload.priority] || PRIORITIES.value;
  const product = getProduct(payload.productId || scenario.productId);
  const people = clampNumber(payload.people, 1, 50, 3);
  const packageType = recommendPackageType(scenarioId, people);
  const selectedPackage = publicPackage(product, packageType);
  const fit = product.id === scenario.productId ? "首选" : "备选";

  return {
    id: crypto.randomUUID(),
    scenario: scenarioId,
    scenarioName: scenario.label,
    people,
    fit,
    product: publicProduct(product),
    package: selectedPackage,
    headline: `${fit}：${product.name}${selectedPackage.label}`,
    reason: `${scenario.reason}${priority}`,
    usage: {
      cardCount: selectedPackage.cardCount,
      boxes: selectedPackage.boxes,
      unitCardPrice: selectedPackage.unitCardPrice,
      summary: `${selectedPackage.label}共${selectedPackage.cardCount}张水卡，每张对应一次六箱配送。`,
    },
    services: [
      "AI生成首月饮水与配送计划",
      "第3天口感回访提醒",
      "第7天按真实消耗给出续购建议",
      "需要时提供多地址配送规划",
    ],
    priceNotice: "公开成交价遵守京东同款价格保护规则；付款前显示订单号和收款说明，到账后人工下单发货。",
    alternatives: Object.values(PRODUCTS)
      .filter((item) => item.id !== product.id)
      .map(publicProduct),
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

function normalizeContact(value) {
  return cleanText(value, 64).replace(/\s+/g, "");
}

function validContact(value) {
  return /^1[3-9]\d{9}$/.test(value) || /^[a-zA-Z][-_a-zA-Z0-9]{5,31}$/.test(value);
}

function normalizePhone(value) {
  return cleanText(value, 24).replace(/\s+/g, "");
}

function validPhone(value) {
  return /^1[3-9]\d{9}$/.test(value);
}

function normalizeShippingText(value, maxLength) {
  return cleanText(value, maxLength).replace(/\s+/g, " ");
}

function maskPhone(value) {
  return validPhone(value) ? `${value.slice(0, 3)}****${value.slice(-4)}` : "未提供";
}

function getOrderStore(env) {
  return env.ORDERS?.put && env.ORDERS?.get ? env.ORDERS : null;
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(cleanText(value, 500));
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function safePaymentUrl(value) {
  const url = cleanText(value, 500);
  if (/^\/5100\/assets\/payment\/[a-zA-Z0-9._-]+$/.test(url)) return url;
  return safeHttpsUrl(url);
}

function getPaymentConfig(env) {
  const qrUrl = safePaymentUrl(env.PAYMENT_QR_URL);
  const receiver = cleanText(env.PAYMENT_RECEIVER_NAME, 80);
  const method = cleanText(env.PAYMENT_METHOD, 32) || "merchant_qr";
  return {
    enabled: Boolean(qrUrl && receiver),
    method,
    qrUrl,
    receiver,
    disclosure:
      method === "personal_wechat_qr"
        ? "当前由项目负责人个人微信代收。如需公司发票或对公付款，请暂勿支付，我们将根据已留手机号与你确认。"
        : "付款前请核对收款方名称；如名称不一致，请立即停止付款。",
  };
}

function hongKongDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  return `${value.year}${value.month}${value.day}`;
}

function createOrderId() {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `HY${hongKongDateKey()}${suffix}`;
}

function formatTelegramOrderNotification(event, order) {
  const paymentReported = event === "payment.reported";
  const internalTest = order.attribution?.source === "codex_internal_e2e";
  const campaign = cleanText(order.attribution?.campaign, 64);
  const lines = [
    internalTest
      ? paymentReported
        ? "【5100系统测试｜付款报备｜待人工核款】"
        : "【5100系统测试｜非真实订单】"
      : paymentReported
        ? "【5100付款报备｜待人工核款】"
        : "【5100新订单｜待付款】",
    `订单号：${order.id}`,
    `商品：${order.product.name} · ${order.product.packageLabel} · ${order.product.boxes}`,
    `金额：¥${order.product.amount}`,
    `客户：${order.customer.name}`,
    `手机：${maskPhone(order.customer.phone)}`,
    `地区：${order.customer.region}`,
    `来源：${order.attribution?.source || "direct"}${campaign ? ` / ${campaign}` : ""}`,
  ];

  if (paymentReported) {
    lines.push(
      "下一步：先核对实际到账，再到公司系统下单；不要仅凭本通知发货。",
    );
  } else {
    lines.push("下一步：等待客户报付；客户报付不等于实际到账。");
  }

  return lines.join("\n");
}

async function notifyOrder(env, event, order) {
  const telegramToken = cleanText(env.TELEGRAM_BOT_TOKEN, 500);
  const telegramChatId = cleanText(env.TELEGRAM_CHAT_ID, 80);
  const send = env.ORDER_NOTIFICATION_FETCH || fetch;

  if (telegramToken && telegramChatId) {
    const response = await send(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: formatTelegramOrderNotification(event, order),
        disable_web_page_preview: true,
        disable_notification: order.attribution?.source === "codex_internal_e2e",
      }),
    });
    if (!response.ok) throw new Error(`Telegram 订单通知失败：${response.status}`);
    const result = await response.json();
    if (!result?.ok) throw new Error("Telegram 订单通知未被接受。");
    return true;
  }

  const url = safeHttpsUrl(env.ORDER_WEBHOOK_URL || env.LEAD_WEBHOOK_URL);
  if (!url) return false;

  const token = cleanText(env.ORDER_WEBHOOK_TOKEN || env.LEAD_WEBHOOK_TOKEN, 500);
  const response = await send(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ event, order }),
  });
  if (!response.ok) throw new Error(`订单通知失败：${response.status}`);
  return true;
}

async function persistLead(env, lead) {
  const results = [];

  if (env.LEADS?.put) {
    await env.LEADS.put(`lead:${lead.id}`, JSON.stringify(lead), {
      expirationTtl: 60 * 60 * 24 * 90,
    });
    results.push("kv");
  }

  if (env.LEAD_WEBHOOK_URL) {
    const response = await fetch(env.LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.LEAD_WEBHOOK_TOKEN
          ? { authorization: `Bearer ${env.LEAD_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(lead),
    });
    if (!response.ok) throw new Error(`线索通知失败：${response.status}`);
    results.push("webhook");
  }

  return results;
}

async function createLead(request, env) {
  const payload = await request.json();
  const contact = normalizeContact(payload.contact);
  if (!validContact(contact)) {
    return json({ error: "请填写有效手机号或微信号。", code: "INVALID_CONTACT" }, 400);
  }
  if (payload.privacyConsent !== true) {
    return json({ error: "请先同意仅将联系方式用于本次购卡服务。", code: "CONSENT_REQUIRED" }, 400);
  }

  const product = getProduct(payload.productId);
  const lead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    contact,
    name: cleanText(payload.name, 24),
    city: cleanText(payload.city, 32),
    productId: product.id,
    sku: product.sku,
    cardPrice: yuan(product.cardPriceFen),
    scenario: SCENARIOS[payload.scenario] ? payload.scenario : "family_drink",
    recommendationId: cleanText(payload.recommendationId, 64),
    source: cleanText(payload.source, 64) || "direct",
    campaign: cleanText(payload.campaign, 64),
    status: "new",
  };

  const channels = await persistLead(env, lead);
  if (channels.length === 0) {
    return json(
      {
        error: "内测版尚未接通线索接收账号，提交未保存。",
        code: "LEAD_STORAGE_NOT_CONFIGURED",
      },
      503,
    );
  }

  return json(
    {
      ok: true,
      leadId: lead.id,
      message: "已收到购卡申请，购买入口将通过你留下的联系方式发送。",
    },
    201,
  );
}

async function createManualOrder(request, env) {
  const payload = await request.json();
  const phone = normalizePhone(payload.phone);
  if (!validPhone(phone)) {
    return json({ error: "请填写有效的中国大陆手机号。", code: "INVALID_PHONE" }, 400);
  }
  if (payload.privacyConsent !== true) {
    return json({ error: "请先同意仅将信息用于购卡、付款确认和配送。", code: "CONSENT_REQUIRED" }, 400);
  }

  const name = cleanText(payload.name, 24);
  if (!name) {
    return json({ error: "请填写收货人称呼。", code: "NAME_REQUIRED" }, 400);
  }

  const region = normalizeShippingText(payload.region, 64);
  const address = normalizeShippingText(payload.address, 160);
  if (region.length < 4 || address.length < 5) {
    return json(
      { error: "请填写省、市、区及详细收货地址。", code: "SHIPPING_ADDRESS_REQUIRED" },
      400,
    );
  }

  const product = getProduct(payload.productId);
  const packageType = cleanText(payload.packageType, 32) || "single_card_6_boxes";
  if (!PACKAGE_TYPES[packageType]) {
    return json({ error: "请选择有效的购买量。", code: "INVALID_PACKAGE_TYPE" }, 400);
  }
  if (packageType !== "single_card_6_boxes" && env.VIP_B_CHECKOUT_ENABLED !== "true") {
    return json(
      {
        error: "半吨卡和一吨卡当前只在内部候选中开放，公开成交方式确认后再启用。",
        code: "VIP_B_CHECKOUT_NOT_APPROVED",
      },
      409,
    );
  }
  const selectedPackage = getProductPackage(product, packageType);
  const priceStatus = getPriceStatus();
  const itemStatus = priceStatus.products.find((item) => item.productId === product.id);
  if (!priceStatus.valid) {
    return json(
      { error: "价格基准需要重新核验，系统已自动暂停收款。", code: "PRICE_REVIEW_REQUIRED" },
      409,
    );
  }
  if (!itemStatus?.guarded) {
    return json(
      { error: "当前价格需要重新确认，暂时无法收款，请稍后再试。", code: "PRICE_GUARD_BLOCKED" },
      409,
    );
  }

  const store = getOrderStore(env);
  if (!store) {
    return json(
      { error: "订单存储尚未配置，本次提交未保存。", code: "ORDER_STORAGE_NOT_CONFIGURED" },
      503,
    );
  }

  const order = {
    id: createOrderId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "awaiting_payment",
    customer: {
      name,
      phone,
      region,
      address,
    },
    product: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      spec: product.spec,
      packageType: selectedPackage.type,
      packageLabel: selectedPackage.label,
      boxes: selectedPackage.boxes,
      boxCount: selectedPackage.boxCount,
      cardCount: selectedPackage.cardCount,
      liters: selectedPackage.liters,
      unitCardPrice: selectedPackage.unitCardPrice,
      priceBasis: selectedPackage.priceBasis,
      quantity: 1,
      amount: selectedPackage.price,
      currency: "CNY",
    },
    fulfillment: {
      mode: "manual_company_order",
      shippingDetails: "collected_at_order",
    },
    payment: {
      status: "awaiting_payment",
      reportedAt: "",
    },
    attribution: {
      scenario: SCENARIOS[payload.scenario] ? payload.scenario : "family_drink",
      recommendationId: cleanText(payload.recommendationId, 64),
      source: cleanText(payload.source, 64) || "direct",
      campaign: cleanText(payload.campaign, 64),
    },
    privacyConsentAt: new Date().toISOString(),
  };

  await store.put(`order:${order.id}`, JSON.stringify(order), {
    expirationTtl: 60 * 60 * 24 * 365,
  });

  let notificationSent = false;
  try {
    notificationSent = await notifyOrder(env, "order.created", order);
  } catch {
    notificationSent = false;
  }

  const payment = getPaymentConfig(env);
  return json(
    {
      ok: true,
      orderId: order.id,
      status: order.status,
      amount: order.product.amount,
      currency: order.product.currency,
      productName: `${order.product.name}${order.product.packageLabel}`,
      payment: payment.enabled
        ? {
            enabled: true,
            method: payment.method,
            qrUrl: payment.qrUrl,
            receiver: payment.receiver,
            instruction: `付款前请核对收款方“${payment.receiver}”，并保留付款记录。`,
            disclosure: payment.disclosure,
          }
        : {
            enabled: false,
            method: "manual_contact",
            instruction: "订单已保存，收款方式确认后将通过你留下的联系方式发送。",
            disclosure: "",
          },
      notificationSent,
      message: payment.enabled
        ? "订单已保存。请核对订单号和收款方后付款，到账确认后安排配送。"
        : "订单已保存。收款方式确认后将通过你留下的联系方式发送。",
    },
    201,
  );
}

async function submitPaymentReport(request, env) {
  const payload = await request.json();
  const orderId = cleanText(payload.orderId, 40).toUpperCase();
  const phone = normalizePhone(payload.phone);

  if (!/^HY\d{8}[A-F0-9]{8}$/.test(orderId) || !validPhone(phone)) {
    return json({ error: "订单号或手机号不完整。", code: "INVALID_PAYMENT_REPORT" }, 400);
  }

  const store = getOrderStore(env);
  if (!store) {
    return json({ error: "订单存储尚未配置。", code: "ORDER_STORAGE_NOT_CONFIGURED" }, 503);
  }

  const raw = await store.get(`order:${orderId}`);
  if (!raw) {
    return json({ error: "没有找到对应订单。", code: "ORDER_NOT_FOUND" }, 404);
  }

  const order = JSON.parse(raw);
  if (order.customer?.phone !== phone) {
    return json({ error: "手机号与订单不匹配。", code: "ORDER_PHONE_MISMATCH" }, 403);
  }

  const now = new Date().toISOString();
  order.updatedAt = now;
  order.status = "payment_reported";
  order.payment = {
    status: "reported_not_verified",
    reportedAt: now,
  };

  await store.put(`order:${order.id}`, JSON.stringify(order), {
    expirationTtl: 60 * 60 * 24 * 365,
  });

  let notificationSent = false;
  try {
    notificationSent = await notifyOrder(env, "payment.reported", order);
  } catch {
    notificationSent = false;
  }

  return json({
    ok: true,
    orderId: order.id,
    status: order.status,
    notificationSent,
    message: "付款通知已收到，无需再填写资料。到账确认后安排配送。",
  });
}

async function createOrderLink(request, env) {
  const payload = await request.json();
  const product = getProduct(payload.productId);
  const priceStatus = getPriceStatus();
  const itemStatus = priceStatus.products.find((item) => item.productId === product.id);

  if (!priceStatus.valid) {
    return json(
      { error: "价格基准需要重新核验，系统已自动暂停下单。", code: "PRICE_REVIEW_REQUIRED" },
      409,
    );
  }
  if (!itemStatus?.guarded) {
    return json(
      { error: "当前价格需要重新确认，暂时无法下单，请稍后再试。", code: "PRICE_GUARD_BLOCKED" },
      409,
    );
  }
  if (!env.ORDER_BASE_URL) {
    return json(
      { error: "真实购买入口尚未配置。", code: "CHECKOUT_NOT_CONFIGURED" },
      503,
    );
  }

  const params = {
    channel: "heyuan_ai",
    source: cleanText(payload.source, 64) || "direct",
    campaign: cleanText(payload.campaign, 64),
    product_id: product.id,
    sku: product.sku,
    package_type: "single_card_6_boxes",
    quantity: 1,
    sale_price: yuan(product.cardPriceFen),
    recommendation_id: cleanText(payload.recommendationId, 64),
  };
  return json({
    ok: true,
    orderUrl: appendParams(env.ORDER_BASE_URL, params),
    miniProgramAppId: env.MINI_PROGRAM_APP_ID || "",
    params,
  });
}

async function handleApi(request, env, pathname) {
  if (pathname === "/5100/api/config" && request.method === "GET") {
    const priceStatus = getPriceStatus();
    return json({
      service: "5100-ai-first-order",
      release: "launch-candidate",
      checkoutEnabled: Boolean(getOrderStore(env)) && priceStatus.valid,
      orderMode: "manual_payment_manual_fulfillment",
      manualOrderEnabled: Boolean(getOrderStore(env)) && priceStatus.valid,
      vipBCheckoutEnabled: env.VIP_B_CHECKOUT_ENABLED === "true",
      paymentEnabled: getPaymentConfig(env).enabled,
      orderNotificationEnabled: Boolean(
        (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) ||
          safeHttpsUrl(env.ORDER_WEBHOOK_URL || env.LEAD_WEBHOOK_URL),
      ),
      leadCaptureEnabled: Boolean(env.LEADS?.put || env.LEAD_WEBHOOK_URL),
      miniProgramAppId: env.MINI_PROGRAM_APP_ID || "",
      pricePolicy: {
        valid: priceStatus.valid,
        checkedAt: priceStatus.checkedAt,
        nextReviewAt: priceStatus.nextReviewAt,
        rule: priceStatus.rule,
      },
    });
  }

  if (pathname === "/5100/api/catalog" && request.method === "GET") {
    return json({ products: Object.values(PRODUCTS).map(publicProduct) });
  }

  if (pathname === "/5100/api/price-status" && request.method === "GET") {
    return json(getPriceStatus());
  }

  if (pathname === "/5100/api/recommendation" && request.method === "POST") {
    try {
      return json({ recommendation: buildRecommendation(await request.json()) });
    } catch (error) {
      return json({ error: error.message || "无法生成建议。" }, 400);
    }
  }

  if (pathname === "/5100/api/lead" && request.method === "POST") {
    try {
      return await createLead(request, env);
    } catch (error) {
      return json({ error: error.message || "提交失败，请稍后再试。" }, 500);
    }
  }

  if (pathname === "/5100/api/manual-order" && request.method === "POST") {
    try {
      return await createManualOrder(request, env);
    } catch (error) {
      return json({ error: error.message || "订单提交失败，请稍后再试。" }, 500);
    }
  }

  if (pathname === "/5100/api/payment-report" && request.method === "POST") {
    try {
      return await submitPaymentReport(request, env);
    } catch (error) {
      return json({ error: error.message || "报付信息提交失败，请稍后再试。" }, 500);
    }
  }

  if (pathname === "/5100/api/order-link" && request.method === "POST") {
    try {
      return await createOrderLink(request, env);
    } catch (error) {
      return json({ error: error.message || "暂时无法打开购买入口。" }, 400);
    }
  }

  return json({ error: "API endpoint not found" }, 404);
}

async function fetchAsset(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/5100") {
    url.pathname = "/5100/";
    const response = Response.redirect(url.toString(), 308);
    const headers = new Headers(response.headers);
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    return new Response(response.body, { status: response.status, headers });
  }
  if (url.pathname === "/5100/") {
    url.pathname = "/5100/index.html";
    const response = await env.ASSETS.fetch(new Request(url, request));
    const headers = new Headers(response.headers);
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    return new Response(response.body, { status: response.status, headers });
  }
  if (!url.pathname.startsWith("/5100/")) {
    return env.ASSETS.fetch(request);
  }
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/5100/health") {
      return json({
        ok: true,
        time: new Date().toISOString(),
        runtime: "cloudflare-worker",
        release: "launch-candidate",
      });
    }
    if (url.pathname.startsWith("/5100/api/")) {
      return handleApi(request, env, url.pathname);
    }
    return fetchAsset(request, env);
  },
};
