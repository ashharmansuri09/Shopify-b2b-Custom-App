// // // import { authenticate, unauthenticated } from '../shopify.server';

// // // const CORS_HEADERS = {
// // //   'Access-Control-Allow-Origin': '*',
// // //   'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
// // //   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
// // // };

// // // function jsonWithCors(data, init = {}) {
// // //   return Response.json(data, {
// // //     ...init,
// // //     headers: {
// // //       ...CORS_HEADERS,
// // //       ...(init.headers || {}),
// // //     },
// // //   });
// // // }

// // // export async function loader({ request }) {
// // //   if (request.method === 'OPTIONS') {
// // //     return new Response(null, { status: 204, headers: CORS_HEADERS });
// // //   }
// // //   return jsonWithCors({ status: 'B2B Register API Active' });
// // // }

// // // function decodeJwtPayload(authHeader) {
// // //   try {
// // //     if (!authHeader) return {};
// // //     const token = authHeader.replace(/^Bearer\s+/i, '');
// // //     const base64Url = token.split('.')[1];
// // //     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
// // //     return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
// // //   } catch {
// // //     return {};
// // //   }
// // // }

// // // export async function action({ request }) {
// // //   if (request.method === 'OPTIONS') {
// // //     return new Response(null, { status: 204, headers: CORS_HEADERS });
// // //   }

// // //   try {
// // //     let sessionToken = {};
// // //     try {
// // //       const authResult = await authenticate.public.customerAccount(request);
// // //       sessionToken = authResult.sessionToken || {};
// // //     } catch (authErr) {
// // //       console.warn('CustomerAccount auth fallback:', authErr.message);
// // //     }

// // //     const body = await request.json();
// // //     const {
// // //       accountType,
// // //       businessName,
// // //       gstNumber,
// // //       customerGid: clientCustomerGid,
// // //       customerEmail,
// // //     } = body;

// // //     if (accountType !== 'b2b') {
// // //       return jsonWithCors({ success: true, message: 'Retail account unchanged' });
// // //     }

// // //     const rawJwt = decodeJwtPayload(request.headers.get('Authorization'));

// // //     // Shop domain extract karein
// // //     const rawShop =
// // //       sessionToken?.dest ||
// // //       rawJwt?.dest ||
// // //       process.env.SHOP ||
// // //       'indore-b2b-wholesale-dev-cbzdierk.myshopify.com';
// // //     const shopDomain = rawShop.replace(/^https?:\/\//, '').replace(/\/$/, '');

// // //     const { admin } = await unauthenticated.admin(shopDomain);

// // //     // 1. Direct Token / Extension GID check
// // //     let rawId =
// // //       sessionToken?.sub ||
// // //       sessionToken?.customer_id ||
// // //       rawJwt?.sub ||
// // //       rawJwt?.customer_id ||
// // //       clientCustomerGid;

// // //     let customerGid = '';

// // //     if (rawId) {
// // //       customerGid = String(rawId).startsWith('gid://shopify/Customer/')
// // //         ? String(rawId)
// // //         : `gid://shopify/Customer/${String(rawId).replace(/\D/g, '')}`;
// // //     }

// // //     // 2. Fallback: Email se customer find karein (agar email token ya extension se aaya hai)
// // //     const emailToSearch = customerEmail || rawJwt?.email || sessionToken?.email;
// // //     if (!customerGid && emailToSearch) {
// // //       const emailLookup = await admin.graphql(
// // //         `#graphql
// // //         query findCustomerByEmail($query: String!) {
// // //           customers(first: 1, query: $query) {
// // //             edges {
// // //               node { id }
// // //             }
// // //           }
// // //         }`,
// // //         { variables: { query: `email:${emailToSearch}` } }
// // //       );
// // //       const emailData = await emailLookup.json();
// // //       customerGid = emailData.data?.customers?.edges?.[0]?.node?.id || '';
// // //     }

// // //     // 3. Fallback: Dev store active session customer (most recently updated customer)
// // //     if (!customerGid) {
// // //       const recentLookup = await admin.graphql(
// // //         `#graphql
// // //         query findRecentCustomer {
// // //           customers(first: 1, sortKey: UPDATED_AT, reverse: true) {
// // //             edges {
// // //               node { id email }
// // //             }
// // //           }
// // //         }`
// // //       );
// // //       const recentData = await recentLookup.json();
// // //       customerGid = recentData.data?.customers?.edges?.[0]?.node?.id || '';
// // //     }

// // //     if (!customerGid) {
// // //       return jsonWithCors(
// // //         { success: false, error: 'Store mein koi customer record nahi mila.' },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     // ACTIVE: Direct B2B tag add hoga
// // //     const tagToAdd = 'b2b';

// // //     // COMMENTED: Admin approval flow ke liye 'b2b-pending' use karein
// // //     // const tagToAdd = 'b2b-pending';

// // //     const response = await admin.graphql(
// // //       `#graphql
// // //       mutation addB2BTag($id: ID!, $tags: [String!]!, $note: String) {
// // //         tagsAdd(id: $id, tags: $tags) {
// // //           node { id }
// // //           userErrors { field message }
// // //         }
// // //         customerUpdate(input: { id: $id, note: $note }) {
// // //           customer { id tags }
// // //           userErrors { field message }
// // //         }
// // //       }`,
// // //       {
// // //         variables: {
// // //           id: customerGid,
// // //           tags: [tagToAdd],
// // //           note: `B2B Buyer | Firm: ${businessName} | GST: ${gstNumber}`,
// // //         },
// // //       }
// // //     );

// // //     const data = await response.json();
// // //     const errors = [
// // //       ...(data.data?.tagsAdd?.userErrors || []),
// // //       ...(data.data?.customerUpdate?.userErrors || []),
// // //     ];

// // //     if (errors.length > 0) {
// // //       return jsonWithCors({ success: false, error: errors[0].message }, { status: 400 });
// // //     }

// // //     return jsonWithCors({ success: true, appliedTag: tagToAdd, customerGid });
// // //   } catch (error) {
// // //     console.error('B2B Register Detailed Error:', error);
// // //     return jsonWithCors(
// // //       { success: false, error: error.message || 'Server error' },
// // //       { status: 500 }
// // //     );
// // //   }
// // // }

// // import { authenticate, unauthenticated } from '../shopify.server';

// // // 'b2b'         -> turant B2B access (testing)
// // // 'b2b-pending' -> admin approval ke baad hi 'b2b' lagega (production ke liye recommended)
// // const TAG_TO_ADD = 'b2b';

// // const MAX_LEN = 120;
// // const clean = (v) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_LEN);

// // export async function loader({ request }) {
// //   // Preflight (OPTIONS) aur token verify yahin handle ho jaata hai
// //   const { cors } = await authenticate.public.customerAccount(request);
// //   return cors(Response.json({ status: 'B2B Register API Active' }));
// // }

// // export async function action({ request }) {
// //   // Token verify fail hua to ye khud 401 Response throw karta hai
// //   const { sessionToken, cors } = await authenticate.public.customerAccount(request);

// //   try {
// //     // Customer ID aur shop sirf verified token se aate hain, body se nahi
// //     const customerGid = sessionToken?.sub;
// //     const shopDomain = String(sessionToken?.dest || '')
// //       .replace(/^https?:\/\//, '')
// //       .replace(/\/$/, '');

// //     if (!customerGid || !customerGid.startsWith('gid://shopify/Customer/') || !shopDomain) {
// //       return cors(
// //         Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
// //       );
// //     }

// //     const body = await request.json();
// //     const accountType = body?.accountType;

// //     if (accountType !== 'b2b') {
// //       return cors(Response.json({ success: true, message: 'Retail account unchanged' }));
// //     }

// //     const businessName = clean(body?.businessName);
// //     const gstNumber = clean(body?.gstNumber);

// //     if (!businessName || !gstNumber) {
// //       return cors(
// //         Response.json(
// //           { success: false, error: 'Business name aur GST number zaroori hai.' },
// //           { status: 400 }
// //         )
// //       );
// //     }

// //     const { admin } = await unauthenticated.admin(shopDomain);

// //     const response = await admin.graphql(
// //       `#graphql
// //       mutation addB2BTag($id: ID!, $tags: [String!]!, $note: String) {
// //         tagsAdd(id: $id, tags: $tags) {
// //           node { id }
// //           userErrors { field message }
// //         }
// //         customerUpdate(input: { id: $id, note: $note }) {
// //           customer { id tags }
// //           userErrors { field message }
// //         }
// //       }`,
// //       {
// //         variables: {
// //           id: customerGid,
// //           tags: [TAG_TO_ADD],
// //           note: `B2B Buyer | Firm: ${businessName} | GST: ${gstNumber}`,
// //         },
// //       }
// //     );

// //     const data = await response.json();

// //     if (data.errors) {
// //       console.error('B2B Register GraphQL errors:', JSON.stringify(data.errors));
// //       return cors(
// //         Response.json({ success: false, error: 'Shopify request failed' }, { status: 502 })
// //       );
// //     }

// //     const userErrors = [
// //       ...(data.data?.tagsAdd?.userErrors || []),
// //       ...(data.data?.customerUpdate?.userErrors || []),
// //     ];

// //     if (userErrors.length > 0) {
// //       return cors(
// //         Response.json({ success: false, error: userErrors[0].message }, { status: 400 })
// //       );
// //     }

// //     return cors(Response.json({ success: true, appliedTag: TAG_TO_ADD }));
// //   } catch (error) {
// //     // Auth ke thrown Response ko aage jaane do
// //     if (error instanceof Response) throw error;
// //     console.error('B2B Register Error:', error);
// //     return cors(Response.json({ success: false, error: 'Server error' }, { status: 500 }));
// //   }
// // }
// import { unauthenticated } from '../shopify.server';

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
//   'Access-Control-Allow-Headers': 'Content-Type',
// };

// export async function loader({ request }) {
//   if (request.method === 'OPTIONS') {
//     return new Response(null, { status: 204, headers: corsHeaders });
//   }
//   return Response.json({ status: 'B2B Order API Ready' }, { headers: corsHeaders });
// }

// export async function action({ request }) {
//   if (request.method === 'OPTIONS') {
//     return new Response(null, { status: 204, headers: corsHeaders });
//   }

//   try {
//     const body = await request.json();
//     const { shop, customerId, variantId, quantity, orderType, targetPrice, notes } = body;

//     if (!customerId) {
//       return Response.json(
//         { success: false, error: 'Unauthorized: B2B customer login required' },
//         { status: 403, headers: corsHeaders }
//       );
//     }

//     const { admin } = await unauthenticated.admin(shop);

//     // Sirf ProductVariant aur Metafields query karein (no Protected Customer Data query)
//     const verifyQuery = await admin.graphql(
//       `#graphql
//       query verifyVariant($variantId: ID!) {
//         productVariant(id: $variantId) {
//           id
//           price
//           product {
//             title
//             wholesalePrice: metafield(namespace: "custom", key: "wholesale_price") { value }
//             wholesaleMoq: metafield(namespace: "custom", key: "wholesale_moq") { value }
//           }
//         }
//       }`,
//       {
//         variables: {
//           variantId: `gid://shopify/ProductVariant/${variantId}`,
//         },
//       }
//     );

//     const verifyData = await verifyQuery.json();
//     const variant = verifyData.data?.productVariant;

//     if (!variant) {
//       return Response.json(
//         { success: false, error: 'Product variant nahi mila.' },
//         { status: 404, headers: corsHeaders }
//       );
//     }

//     const moq = parseInt(variant.product.wholesaleMoq?.value || '50', 10);
//     if (quantity < moq) {
//       return Response.json(
//         { success: false, error: `Minimum quantity ${moq} honi chahiye.` },
//         { status: 400, headers: corsHeaders }
//       );
//     }

//     const wholesalePrice = variant.product.wholesalePrice?.value || variant.price;
//     const originalPrice = parseFloat(variant.price);
//     const discountPerUnit = Math.max(0, originalPrice - parseFloat(wholesalePrice));

//     const draftOrderInput = {
//       purchasingEntity: {
//         customerId: `gid://shopify/Customer/${customerId}`,
//       },
//       tags: orderType === 'quote' ? ['b2b-quote-request'] : ['b2b-bulk-order'],
//       note:
//         orderType === 'quote'
//           ? `B2B QUOTE REQUEST | Target Price: ₹${targetPrice || 'N/A'} | Notes: ${notes || ''}`
//           : `B2B Bulk Wholesale Order (${quantity} units)`,
//       lineItems: [
//         {
//           variantId: variant.id,
//           quantity: parseInt(quantity, 10),
//           ...(orderType === 'bulk' && discountPerUnit > 0
//             ? {
//                 appliedDiscount: {
//                   title: 'B2B Wholesale Price',
//                   value: discountPerUnit,
//                   valueType: 'FIXED_AMOUNT',
//                 },
//               }
//             : {}),
//         },
//       ],
//     };

//     const draftResponse = await admin.graphql(
//       `#graphql
//       mutation createB2BDraftOrder($input: DraftOrderInput!) {
//         draftOrderCreate(input: $input) {
//           draftOrder {
//             id
//             name
//             invoiceUrl
//           }
//           userErrors { field message }
//         }
//       }`,
//       { variables: { input: draftOrderInput } }
//     );

//     const draftData = await draftResponse.json();
//     const draftOrder = draftData.data?.draftOrderCreate?.draftOrder;

//     if (!draftOrder) {
//       const errMsg =
//         draftData.data?.draftOrderCreate?.userErrors?.[0]?.message ||
//         'Draft order create nahi ho paya';
//       return Response.json({ success: false, error: errMsg }, { status: 400, headers: corsHeaders });
//     }

//     return Response.json(
//       {
//         success: true,
//         orderName: draftOrder.name,
//         checkoutUrl: draftOrder.invoiceUrl,
//       },
//       { headers: corsHeaders }
//     );
//   } catch (error) {
//     console.error('B2B Order Error:', error);
//     return Response.json(
//       { success: false, error: error.message || 'Server error' },
//       { status: 500, headers: corsHeaders }
//     );
//   }
// }

import { authenticate, unauthenticated } from '../shopify.server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonWithCors(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init.headers || {}),
    },
  });
}

function decodeJwtPayload(authHeader) {
  try {
    if (!authHeader) return {};
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const base64Url = token.split('.')[1];
    if (!base64Url) return {};
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

export async function loader({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return jsonWithCors({ status: 'B2B Register API Active' });
}

export async function action({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    let sessionToken = {};
    try {
      const authResult = await authenticate.public.customerAccount(request);
      sessionToken = authResult.sessionToken || {};
    } catch (authErr) {
      console.warn('CustomerAccount auth fallback:', authErr.message);
    }

    const body = await request.json();
    const { accountType, businessName, gstNumber } = body;

    if (accountType !== 'b2b') {
      return jsonWithCors({ success: true, message: 'Retail account unchanged' });
    }

    if (!businessName?.trim() || !gstNumber?.trim()) {
      return jsonWithCors(
        { success: false, error: 'Business Name aur GST Number zaroori hai.' },
        { status: 400 }
      );
    }

    const rawJwt = decodeJwtPayload(request.headers.get('Authorization'));

    // Shop domain extract karein
    const rawShop =
      sessionToken?.dest ||
      rawJwt?.dest ||
      process.env.SHOP ||
      'indore-b2b-wholesale-dev-cbzdierk.myshopify.com';
    const shopDomain = String(rawShop).replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Customer GID extract karein
    const rawId =
      sessionToken?.sub ||
      sessionToken?.customer_id ||
      rawJwt?.sub ||
      rawJwt?.customer_id;

    if (!rawId) {
      return jsonWithCors(
        { success: false, error: 'Customer session verify nahi ho paya.' },
        { status: 401 }
      );
    }

    const customerGid = String(rawId).startsWith('gid://shopify/Customer/')
      ? String(rawId)
      : `gid://shopify/Customer/${String(rawId).replace(/\D/g, '')}`;

    const { admin } = await unauthenticated.admin(shopDomain);

    const response = await admin.graphql(
      `#graphql
      mutation addB2BTag($id: ID!, $tags: [String!]!, $note: String) {
        tagsAdd(id: $id, tags: $tags) {
          node { id }
          userErrors { field message }
        }
        customerUpdate(input: { id: $id, note: $note }) {
          customer { id tags }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          id: customerGid,
          tags: ['b2b'],
          note: `B2B Buyer | Firm: ${businessName.trim()} | GST: ${gstNumber.trim()}`,
        },
      }
    );

    const data = await response.json();
    const errors = [
      ...(data.data?.tagsAdd?.userErrors || []),
      ...(data.data?.customerUpdate?.userErrors || []),
    ];

    if (errors.length > 0) {
      return jsonWithCors({ success: false, error: errors[0].message }, { status: 400 });
    }

    return jsonWithCors({
      success: true,
      appliedTag: 'b2b',
      customerGid,
    });
  } catch (error) {
    console.error('B2B Register Error:', error);
    return jsonWithCors(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}