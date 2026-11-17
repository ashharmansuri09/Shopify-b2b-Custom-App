import { unauthenticated } from '../shopify.server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Money JSON string ('{"amount":"450.00","currency_code":"USD"}') ya Number/Decimal dono ko parse karta hai
function parseWholesalePrice(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return null;
  if (typeof rawValue === 'number') return Number.isFinite(rawValue) ? rawValue : null;

  const str = String(rawValue).trim();
  if (str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str);
      const amount = parseFloat(parsed.amount);
      return Number.isFinite(amount) ? amount : null;
    } catch {
      return null;
    }
  }

  const num = parseFloat(str);
  return Number.isFinite(num) ? num : null;
}

export async function loader({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return Response.json({ status: 'B2B Order API Ready' }, { headers: corsHeaders });
}

export async function action({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const {
      shop,
      customerId,
      variantId,
      quantity,
      items,
      orderType = 'bulk',
      targetPrice,
      notes,
    } = body;

    if (!shop || !customerId) {
      return Response.json(
        { success: false, error: 'Unauthorized: B2B customer login aur shop domain zaroori hai.' },
        { status: 403, headers: corsHeaders }
      );
    }

    // 1. Single Product (variantId + quantity) aur Full Cart (items array) dono ko normalize karein
    const rawItems =
      Array.isArray(items) && items.length > 0
        ? items
        : variantId && quantity
          ? [{ variantId, quantity }]
          : [];

    if (rawItems.length === 0) {
      return Response.json(
        { success: false, error: 'Order ke liye koi product item nahi mila.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Duplicate variants merge karein
    const mergedMap = new Map();
    for (const item of rawItems) {
      const cleanId = String(item.variantId).replace(/\D/g, '');
      const qty = parseInt(item.quantity, 10) || 0;
      if (!cleanId || qty <= 0) continue;
      mergedMap.set(cleanId, (mergedMap.get(cleanId) || 0) + qty);
    }

    const normalizedItems = Array.from(mergedMap.entries()).map(([id, qty]) => ({
      variantId: id,
      quantity: qty,
    }));

    if (normalizedItems.length === 0) {
      return Response.json(
        { success: false, error: 'Valid variant ID aur quantity provide karein.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { admin } = await unauthenticated.admin(shop);

    // 2. Shop currency + Variant inventory, policy aur custom.wholesale_price metafields fetch karein
    const variantGids = normalizedItems.map(
      (item) => `gid://shopify/ProductVariant/${item.variantId}`
    );

    const verifyQuery = await admin.graphql(
      `#graphql
      query verifyVariants($ids: [ID!]!) {
        shop {
          currencyCode
        }
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            price
            inventoryQuantity
            inventoryPolicy
            variantWholesale: metafield(namespace: "custom", key: "wholesale_price") {
              value
            }
            product {
              title
              productWholesale: metafield(namespace: "custom", key: "wholesale_price") {
                value
              }
              wholesaleMoq: metafield(namespace: "custom", key: "wholesale_moq") {
                value
              }
            }
          }
        }
      }`,
      { variables: { ids: variantGids } }
    );

    const verifyData = await verifyQuery.json();
    const shopCurrency = verifyData.data?.shop?.currencyCode || 'USD';

    const variantLookup = new Map();
    for (const node of verifyData.data?.nodes || []) {
      if (node?.id) {
        variantLookup.set(node.id, node);
      }
    }

    // 3. MOQ + Available Inventory validate karein aur lineItems mein priceOverride set karein
    const lineItems = [];
    let totalUnits = 0;

    for (const item of normalizedItems) {
      const fullGid = `gid://shopify/ProductVariant/${item.variantId}`;
      const variant = variantLookup.get(fullGid);

      if (!variant) {
        return Response.json(
          { success: false, error: `Product variant (${item.variantId}) store mein nahi mila.` },
          { status: 404, headers: corsHeaders }
        );
      }

      const moq = parseInt(variant.product?.wholesaleMoq?.value || '50', 10);
      if (orderType !== 'quote' && item.quantity < moq) {
        return Response.json(
          {
            success: false,
            error: `"${variant.product.title}" ke liye minimum order quantity (MOQ) ${moq} units honi chahiye.`,
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Server-side Inventory Guard (jab inventoryPolicy 'DENY' ho)
      if (
        orderType !== 'quote' &&
        variant.inventoryPolicy === 'DENY' &&
        typeof variant.inventoryQuantity === 'number' &&
        item.quantity > variant.inventoryQuantity
      ) {
        return Response.json(
          {
            success: false,
            error: `"${variant.product.title}" ka sirf ${variant.inventoryQuantity} stock available hai. Aap ${item.quantity} units order nahi kar sakte.`,
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Variant-level custom.wholesale_price ko priority dein, warna Product-level fallback lein
      const wholesalePrice =
        parseWholesalePrice(variant.variantWholesale?.value) ??
        parseWholesalePrice(variant.product?.productWholesale?.value);

      totalUnits += item.quantity;

      lineItems.push({
        variantId: variant.id,
        quantity: item.quantity,
        ...(orderType === 'bulk' && wholesalePrice !== null
          ? {
              priceOverride: {
                amount: wholesalePrice.toFixed(2),
                currencyCode: shopCurrency,
              },
            }
          : {}),
      });
    }

    // 4. Draft Order create karein
    const cleanCustomerId = String(customerId).replace(/\D/g, '');
    const draftOrderInput = {
      purchasingEntity: {
        customerId: `gid://shopify/Customer/${cleanCustomerId}`,
      },
      tags: orderType === 'quote' ? ['b2b-quote-request'] : ['b2b-bulk-order'],
      note:
        orderType === 'quote'
          ? `B2B QUOTE REQUEST | Target Price: ₹${targetPrice || 'N/A'} | Notes: ${notes || ''}`
          : `B2B Bulk Wholesale Order (${lineItems.length} item(s), ${totalUnits} total units)`,
      lineItems,
    };

    const draftResponse = await admin.graphql(
      `#graphql
      mutation createB2BDraftOrder($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            invoiceUrl
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { input: draftOrderInput } }
    );

    const draftData = await draftResponse.json();
    const draftOrder = draftData.data?.draftOrderCreate?.draftOrder;

    if (!draftOrder) {
      const errMsg =
        draftData.data?.draftOrderCreate?.userErrors?.[0]?.message ||
        'Draft order create nahi ho paya.';
      return Response.json({ success: false, error: errMsg }, { status: 400, headers: corsHeaders });
    }

    return Response.json(
      {
        success: true,
        orderName: draftOrder.name,
        checkoutUrl: draftOrder.invoiceUrl,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('B2B Order Error:', error);
    return Response.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}