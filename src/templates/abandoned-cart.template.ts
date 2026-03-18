export const getAbandonedCartTemplate = (
  firstName: string,
  items: any[],
  total: number,
  resumeUrl: string,
  shippingCost: number = 0,
) => {
  const currentYear = new Date().getFullYear();
  const headerGreen = "#8CE000";
  const buttonGreen = "#7ED000";
  const black = "#000000";
  const bodyBg = "#f3f4f6";
  const logoUrl =
    "https://res.cloudinary.com/dngag0zog/image/upload/pickle-logo_mp20aq.png";

  const itemsHtml = items
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 14px 0; border-bottom: 1px solid #e5e7eb;">
        <p style="margin: 0; font-weight: 700; color: #111827; font-size: 15px;">${item.name}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Size: ${item.sizeLabel} | Qty: ${item.quantity}</p>
      </td>
      <td align="right" style="padding: 14px 0; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #111827; font-size: 15px;">
        $${(item.priceAtPurchase * item.quantity).toFixed(2)}
      </td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>You Left Something Behind</title>
<style>
  body { margin:0; padding:0; }
  table { border-collapse:collapse; }
  @media only screen and (max-width: 600px) {
    .container { width:100% !important; }
    .padding { padding:30px 24px !important; }
    .button { width:100% !important; text-align:center !important; display:block !important; }
  }
</style>
</head>

<body style="background-color:${bodyBg}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; margin:0; padding:0;">

<div style="display:none; max-height:0; overflow:hidden; opacity:0;">
You left something in your cart — your order is still waiting.
</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 20px;">
<tr>
<td align="center">

<table width="600" class="container" cellpadding="0" cellspacing="0" role="presentation"
style="width:100%; max-width:600px; background-color:#ffffff; border:3px solid ${black}; border-radius:10px; overflow:hidden;">

<!-- HEADER -->
<tr>
<td align="center" style="background-color:${headerGreen}; padding:32px 20px; border-bottom:3px solid ${black};">
  <img src="${logoUrl}" width="155" alt="The California Pickle" style="display:block; max-width:100%; height:auto;" />
</td>
</tr>

<!-- BODY -->
<tr>
<td class="padding" style="padding:40px;">

<h1 style="margin:0 0 20px; font-size:26px; font-weight:900; font-family:'Arial Black',Impact,sans-serif; text-transform:uppercase; color:#111827;">
You Left Something Behind
</h1>

<p style="margin:0 0 30px; font-size:16px; line-height:26px; color:#4b5563;">
Yo ${firstName},<br><br>
You got close — your order is still sitting there waiting on you. Your cart is reserved but the clock's ticking. Lock in your gear before it's gone.
</p>

<!-- CART ITEMS -->
<div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">

  <p style="margin:0 0 16px; font-size:11px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:1px;">Your Cart</p>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 20px;">
    ${itemsHtml}
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    ${shippingCost > 0 ? `
    <tr>
      <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Shipping</td>
      <td align="right" style="padding: 6px 0; font-size: 13px; color: #111827; font-weight: 700;">$${shippingCost.toFixed(2)}</td>
    </tr>` : ""}
    <tr>
      <td style="padding: 12px 0 0; font-size: 17px; font-weight: 900; color: #111827; border-top: 2px solid #111827; font-family:'Arial Black',Impact,sans-serif; text-transform:uppercase;">
        Total:
      </td>
      <td align="right" style="padding: 12px 0 0; font-size: 17px; font-weight: 900; color: #111827; border-top: 2px solid #111827;">
        $${(total + shippingCost).toFixed(2)}
      </td>
    </tr>
  </table>

</div>

<!-- CTA BUTTON -->
<table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 30px;">
<tr>
<td>
  <a href="${resumeUrl}"
    class="button"
    style="
      display:inline-block;
      padding:16px 38px;
      background-color:${buttonGreen};
      border:3px solid ${black};
      color:#111827;
      font-size:16px;
      font-weight:900;
      font-family:'Arial Black',Impact,sans-serif;
      text-transform:uppercase;
      text-decoration:none;
      letter-spacing:0.5px;
      border-radius:4px;
    ">
    Complete My Order
  </a>
</td>
</tr>
</table>

<p style="margin:0; font-size:13px; line-height:20px; color:#9ca3af; font-style:italic;">
* Clicking the button above checks availability before redirecting you to payment. If the item has sold out, you will be notified immediately.
</p>

</td>
</tr>

<!-- FOOTER -->
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
