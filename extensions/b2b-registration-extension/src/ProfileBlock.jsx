

// import '@shopify/ui-extensions/preact';
// import { render } from 'preact';
// import { useState } from 'preact/hooks';

// export default async () => {
//   render(<B2BRegistrationBlock />, document.body);
// };

// function B2BRegistrationBlock() {
//   const [accountType, setAccountType] = useState('retail');
//   const [businessName, setBusinessName] = useState('');
//   const [gstNumber, setGstNumber] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState(null);

//   // Apne running terminal ka current trycloudflare URL yahan rakhein
//   const APP_URL = 'https://purchase-backup-configuration-ideas.trycloudflare.com/api/b2b-register';

//   const handleSubmit = async () => {
//     if (accountType === 'retail') {
//       setStatus({ tone: 'info', message: 'Aapka account Retail mode par hai.' });
//       return;
//     }

//     if (!businessName.trim() || !gstNumber.trim()) {
//       setStatus({ tone: 'critical', message: 'Business Name aur GST Number (koi bhi test value) bharein.' });
//       return;
//     }

//     setLoading(true);
//     setStatus(null);

//     try {
//       const token = await shopify.sessionToken.get();

//       // Customer Account API se ID aur Email dono fetch karein
//       let customerGid = '';
//       let customerEmail = '';
//       try {
//         const customerRes = await fetch('shopify:customer-account/api/2026-10/graphql.json', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             query: 'query { customer { id emailAddress { emailAddress } } }',
//           }),
//         });
//         const customerJson = await customerRes.json();
//         customerGid = customerJson?.data?.customer?.id || '';
//         customerEmail = customerJson?.data?.customer?.emailAddress?.emailAddress || '';
//       } catch (e) {
//         console.warn('Customer Account GraphQL lookup fallback:', e);
//       }

//       const response = await fetch(APP_URL, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           token,
//           accountType,
//           businessName,
//           gstNumber,
//           customerGid,
//           customerEmail,
//         }),
//       });

//       const data = await response.json();

//       if (response.ok && data.success) {
//         setStatus({
//           tone: 'success',
//           message: 'B2B Wholesale account activate ho gaya hai! Ab store par wholesale prices dekh sakte hain.',
//         });
//       } else {
//         setStatus({
//           tone: 'critical',
//           message: data.error || 'Account update fail ho gaya.',
//         });
//       }
//     } catch (err) {
//       setStatus({
//         tone: 'critical',
//         message: `Network Error: ${err.message}`,
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <s-section heading="Account Type & Wholesale (B2B) Setup">
//       <s-stack direction="block" gap="base">
//         <s-text tone="subdued">
//           Bulk orders (Minimum 50 qty) aur wholesale pricing ke liye B2B select karein.
//         </s-text>

//         {status && (
//           <s-banner tone={status.tone}>
//             <s-text>{status.message}</s-text>
//           </s-banner>
//         )}

//         <s-select
//           label="Account Type Chunein"
//           value={accountType}
//           onChange={(e) => setAccountType(e.currentTarget.value)}
//         >
//           <s-option value="retail">Retail Customer (Normal)</s-option>
//           <s-option value="b2b">Wholesale / B2B Buyer</s-option>
//         </s-select>

//         {accountType === 'b2b' && (
//           <s-stack direction="block" gap="base">
//             <s-text-field
//               label="Business / Firm Name"
//               value={businessName}
//               onInput={(e) => setBusinessName(e.currentTarget.value)}
//               placeholder="e.g. Empire Exim Ujjain"
//             />
//             <s-text-field
//               label="GST Number (Testing: Koi bhi value daal sakte hain)"
//               value={gstNumber}
//               onInput={(e) => setGstNumber(e.currentTarget.value)}
//               placeholder="e.g. 8839223218"
//             />
//           </s-stack>
//         )}

//         <s-button variant="primary" loading={loading} onClick={handleSubmit}>
//           Save Account Preferences
//         </s-button>
//       </s-stack>
//     </s-section>
//   );
// }

import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState } from 'preact/hooks';

export default async () => {
  render(<B2BRegistrationBlock />, document.body);
};

// Har "shopify app dev" restart par terminal ka "Using URL" badalta hai.
// Sirf yahi base URL update karein (end mein /api/... na lagayein).
const APP_BASE_URL = 'https://shopify-b2b-custom-app.vercel.app';

function B2BRegistrationBlock() {
  const [accountType, setAccountType] = useState('retail');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async () => {
    if (accountType === 'retail') {
      setStatus({ tone: 'info', message: 'Aapka account Retail mode par hai.' });
      return;
    }

    if (!businessName.trim() || !gstNumber.trim()) {
      setStatus({ tone: 'critical', message: 'Business Name aur GST Number (koi bhi test value) bharein.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const token = await shopify.sessionToken.get();

      const response = await fetch(`${APP_BASE_URL}/api/b2b-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Backend isi token se customer verify karta hai
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountType,
          businessName: businessName.trim(),
          gstNumber: gstNumber.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        setStatus({
          tone: 'success',
          message: 'B2B Wholesale account activate ho gaya hai! Ab store par wholesale prices dekh sakte hain.',
        });
      } else {
        setStatus({
          tone: 'critical',
          message: data.error || `Account update fail ho gaya (HTTP ${response.status}).`,
        });
      }
    } catch (err) {
      setStatus({
        tone: 'critical',
        message: `Network Error: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <s-section heading="Account Type & Wholesale (B2B) Setup">
      <s-stack direction="block" gap="base">
        <s-text tone="subdued">
          Bulk orders (Minimum 50 qty) aur wholesale pricing ke liye B2B select karein.
        </s-text>

        {status && (
          <s-banner tone={status.tone}>
            <s-text>{status.message}</s-text>
          </s-banner>
        )}

        <s-select
          label="Account Type Chunein"
          value={accountType}
          onChange={(e) => setAccountType(e.currentTarget.value)}
        >
          <s-option value="retail">Retail Customer (Normal)</s-option>
          <s-option value="b2b">Wholesale / B2B Buyer</s-option>
        </s-select>

        {accountType === 'b2b' && (
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Business / Firm Name"
              value={businessName}
              onInput={(e) => setBusinessName(e.currentTarget.value)}
              placeholder="e.g. Empire Exim Ujjain"
            />
            <s-text-field
              label="GST Number (Testing: Koi bhi value daal sakte hain)"
              value={gstNumber}
              onInput={(e) => setGstNumber(e.currentTarget.value)}
              placeholder="e.g. 8839223218"
            />
          </s-stack>
        )}

        <s-button variant="primary" loading={loading} onClick={handleSubmit}>
          Save Account Preferences
        </s-button>
      </s-stack>
    </s-section>
  );
}
