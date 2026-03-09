export const getShippingTemplate = (
  firstName: string,
  orderId: string,
  trackingNumber: string,
  trackingUrl: string,
  carrier: string,
) => {
  const currentYear = new Date().getFullYear();
  const headerGreen = "#8CE000";
  const buttonGreen = "#7ED000";
  const black = "#000000";
  const bodyBg = "#f3f4f6";
  const logoUrl =
    "https://res.cloudinary.com/dngag0zog/image/upload/pickle-logo_mp20aq.png";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your Order Shipped</title>
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
Your order is on the way — track it here.
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
Your Order Shipped!
</h1>

<p style="margin:0 0 30px; font-size:16px; line-height:26px; color:#4b5563;">
Yo ${firstName},<br><br>
Your California Pickle order is on the move. Here's everything you need to track it down.
</p>

<!-- TRACKING CARD -->
<div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td width="50%" valign="top">
        <p style="margin:0 0 6px; font-size:11px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:1px;">Order ID</p>
        <p style="margin:0; font-size:14px; font-weight:700; color:#111827;">#${orderId.slice(-8).toUpperCase()}</p>
      </td>
      <td width="50%" valign="top" align="right">
        <p style="margin:0 0 6px; font-size:11px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:1px;">Carrier</p>
        <p style="margin:0; font-size:14px; font-weight:700; color:#111827;">${carrier}</p>
      </td>
    </tr>
  </table>

  <div style="border-top: 1px solid #e5e7eb; margin: 20px 0;"></div>

  <p style="margin:0 0 6px; font-size:11px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:1px;">Tracking Number</p>
  <p style="margin:0 0 20px; font-size:18px; font-weight:900; color:#111827; font-family:'Arial Black',Impact,sans-serif; letter-spacing:1px;">${trackingNumber}</p>

  <!-- TRACK BUTTON -->
  <table cellpadding="0" cellspacing="0" role="presentation">
  <tr>
  <td>
    <a href="${trackingUrl}"
      class="button"
      style="
        display:inline-block;
        padding:14px 32px;
        background-color:${buttonGreen};
        border:3px solid ${black};
        color:#111827;
        font-size:15px;
        font-weight:900;
        font-family:'Arial Black',Impact,sans-serif;
        text-transform:uppercase;
        text-decoration:none;
        letter-spacing:0.5px;
        border-radius:4px;
      ">
      Track My Order
    </a>
  </td>
  </tr>
  </table>

</div>

<p style="margin:0; font-size:14px; line-height:22px; color:#4b5563; text-align:center;">
Can't click the button? Copy and paste this into your browser:<br>
<span style="font-size:12px; color:#6b7280; word-break:break-all;">${trackingUrl}</span>
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
