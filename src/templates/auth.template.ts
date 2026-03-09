export const getPasswordResetTemplate = (resetLink: string) => {
  const currentYear = new Date().getFullYear();

  const headerGreen = "#8CE000"; // darker header green
  const buttonGreen = "#7ED000"; // button green (slightly deeper)
  const linkGreen = "#6FB800"; // darker muted link green
  const linkBg = "#F3FFE0"; // soft tint background
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
<title>Password Reset</title>

<style>
  body { margin:0; padding:0; }
  table { border-collapse:collapse; }

  @media only screen and (max-width: 600px) {
    .container { width:100% !important; }
    .padding { padding:30px 24px !important; }
    .button { width:100% !important; text-align:center !important; }
  }
</style>
</head>

<body style="background-color:${bodyBg}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<div style="display:none; max-height:0; overflow:hidden; opacity:0;">
Reset your password for The California Pickle dashboard.
</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 20px;">
<tr>
<td align="center">

<table width="550" class="container" cellpadding="0" cellspacing="0" role="presentation"
style="width:550px; max-width:550px; background-color:#ffffff; border:3px solid ${black}; border-radius:10px; overflow:hidden;">

<!-- HEADER -->
<tr>
<td align="center" style="background-color:${headerGreen}; padding:32px 20px; border-bottom:3px solid ${black};">
  <img src="${logoUrl}" width="155" alt="The California Pickle Logo"
  style="display:block; max-width:100%; height:auto;" />
</td>
</tr>

<!-- BODY -->
<tr>
<td class="padding" style="padding:42px 40px;">

<h1 style="margin:0 0 22px; font-size:26px; font-weight:900; font-family:'Arial Black',Impact,sans-serif; text-transform:uppercase; color:#111827;">
Password Reset
</h1>

<p style="margin:0 0 30px; font-size:16px; line-height:24px; color:#4b5563;">
Hello Admin,<br><br>
We received a request to reset the password for your dashboard account.
If this was you, click the button below to set a new password.
</p>

<!-- BUTTON -->
<table cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="left">
  <a href="${resetLink}"
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
    ">
    Reset Password
  </a>
</td>
</tr>
</table>

<!-- RAW LINK -->
<p style="margin:38px 0 12px; font-size:14px; line-height:22px; color:#4b5563;">
Button not working? Copy and paste this link into your browser:
</p>

<p style="margin:0;">
<a href="${resetLink}"
style="
  display:inline-block;
  color:${linkGreen};
  background-color:${linkBg};
  font-size:13px;
  font-weight:700;
  text-decoration:underline;
  word-break:break-all;
  line-height:1.7;
  padding:5px 8px;
  border-radius:4px;
">
${resetLink}
</a>
</p>

<p style="margin:28px 0 0; font-size:12px; line-height:18px; font-style:italic; color:#6b7280;">
* This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
</p>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td align="center"
style="background-color:${black}; padding:26px 20px;">
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
