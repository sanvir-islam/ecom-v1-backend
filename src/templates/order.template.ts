export const getOrderReceiptTemplate = (
  firstName: string,
  orderId: string,
  totalAmount: number,
  items: any[],
  shippingAddress: any,
  shippingCost: number = 0,
) => {
  const currentYear = new Date().getFullYear();
  const headerGreen = "#8CE000";
  const black = "#000000";
  const bodyBg = "#f3f4f6";
  const logoUrl =
    "https://res.cloudinary.com/dngag0zog/image/upload/pickle-logo_mp20aq.png";

  // Build the itemized table rows
  const itemsHtml = items
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
        <p style="margin: 0; font-weight: 700; color: #111827; font-size: 15px;">${item.name}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Size: ${item.sizeLabel} | Qty: ${item.quantity}</p>
      </td>
      <td align="right" style="padding: 16px 0; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #111827; font-size: 15px;">
        $${(item.priceAtPurchase * item.quantity).toFixed(2)}
      </td>
    </tr>
  `,
    )
    .join("");

  // Format the apartment/suite if it exists
  const aptString = shippingAddress.aptOrSuite ? `${shippingAddress.aptOrSuite}<br>` : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Order Confirmation</title>
</head>

<body style="background-color:${bodyBg}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; margin:0; padding:0;">

<div style="display:none; max-height:0; overflow:hidden; opacity:0;">
Your order from The California Pickle is confirmed! Order #${orderId}
</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 20px;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" role="presentation"
style="width:100%; max-width:600px; background-color:#ffffff; border:3px solid ${black}; border-radius:10px; overflow:hidden;">

<tr>
<td align="center" style="background-color:${headerGreen}; padding:32px 20px; border-bottom:3px solid ${black};">
  <img src="${logoUrl}" width="155" alt="The California Pickle" style="display:block; max-width:100%; height:auto;" />
</td>
</tr>

<tr>
<td style="padding:40px;">

<h1 style="margin:0 0 20px; font-size:28px; font-weight:900; font-family:'Arial Black',Impact,sans-serif; text-transform:uppercase; color:#111827;">
Order Confirmed!
</h1>

<p style="margin:0 0 35px; font-size:16px; line-height:24px; color:#4b5563;">
Yo ${firstName},<br><br>
Your payment is locked in. We're getting your gear ready to ship. Here is your official receipt:
</p>

<div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
  
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 24px; border-bottom: 2px dashed #e5e7eb; padding-bottom: 24px;">
    <tr>
      <td width="50%" valign="top">
        <p style="margin:0 0 8px; font-size:11px; font-weight: 800; color:#9ca3af; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
        <p style="margin:0; font-size:14px; font-weight: 700; color:#111827;">#${orderId.slice(-8).toUpperCase()}</p>
      </td>
      <td width="50%" valign="top" align="right">
        <p style="margin:0 0 8px; font-size:11px; font-weight: 800; color:#9ca3af; text-transform: uppercase; letter-spacing: 1px;">Shipping To</p>
        <p style="margin:0; font-size:14px; color:#4b5563; line-height: 1.6; text-align: right;">
          <strong>${shippingAddress.firstName} ${shippingAddress.lastName}</strong><br>
          ${shippingAddress.street}<br>
          ${aptString}
          ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
        </p>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 24px;">
    ${itemsHtml}
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="right" style="padding: 6px 0; font-size: 14px; color: #6b7280;">Subtotal:</td>
      <td align="right" width="110" style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">$${totalAmount.toFixed(2)}</td>
    </tr>
    <tr>
      <td align="right" style="padding: 6px 0; font-size: 14px; color: #6b7280;">Shipping:</td>
      <td align="right" width="110" style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">$${shippingCost.toFixed(2)}</td>
    </tr>
    <tr>
      <td align="right" style="padding: 16px 0 0; font-size: 18px; font-weight: 900; color: #111827; border-top: 2px solid #111827;">TOTAL PAID:</td>
      <td align="right" width="110" style="padding: 16px 0 0; font-size: 18px; font-weight: 900; color: #111827; border-top: 2px solid #111827;">$${(totalAmount + shippingCost).toFixed(2)}</td>
    </tr>
  </table>

</div>

<p style="margin:0; font-size:14px; line-height:22px; color:#4b5563; text-align: center;">
You'll receive another email with tracking info as soon as your order ships out. 
</p>

</td>
</tr>

<tr>
<td align="center" style="background-color:${black}; padding:26px 20px;">
<p style="margin:0; font-size:11px; color:#ffffff; font-family:'Arial Black',Impact,sans-serif; text-transform:uppercase; letter-spacing:1.5px;">
© ${currentYear} The California Pickle.<br>
All Rights Reserved.
</p>
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
  `;
};
