import nodemailer from "nodemailer";

function getEmailConfig() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();

  if (!user || !pass) {
    throw new Error("Email service is not configured");
  }

  return { user, pass };
}

export async function sendBrandedPasswordResetEmail(params: {
  to: string;
  resetLink: string;
}) {
  const { user, pass } = getEmailConfig();
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://urologics.co.uk";
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: `"Urologics" <${user}>`,
    to: params.to,
    subject: "Reset your Urologics password",
    text: `Reset your Urologics password using this secure link: ${params.resetLink}`,
    html: `
      <div style="margin:0;background:#eefbff;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#071014;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid rgba(15,120,150,0.14);border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(15,120,150,0.14);">
          <div style="padding:28px 28px 18px;text-align:center;background:linear-gradient(135deg,#f0fdff,#ffffff);">
            <img src="${appUrl}/logo.webp" alt="Urologics" width="72" height="72" style="display:block;margin:0 auto 16px;border-radius:18px;object-fit:contain;" />
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:800;color:#0f7896;">Urologics</div>
            <h1 style="margin:10px 0 0;font-size:28px;line-height:1.15;letter-spacing:-0.04em;color:#071014;">Reset your password</h1>
          </div>
          <div style="padding:10px 28px 30px;">
            <p style="margin:0;color:rgba(7,16,20,0.68);font-size:15px;line-height:1.7;">We received a request to reset your Urologics account password. Use the secure button below to create a new password.</p>
            <a href="${params.resetLink}" style="display:block;margin:26px 0 18px;padding:16px 22px;border-radius:18px;background:#0f7896;color:#ffffff;text-align:center;text-decoration:none;font-weight:800;font-size:15px;">Reset password</a>
            <p style="margin:0;color:rgba(7,16,20,0.52);font-size:13px;line-height:1.7;">If you did not request this, you can safely ignore this email. For security, this link can expire.</p>
            <div style="margin-top:22px;padding:14px;border-radius:18px;background:#f4fbfd;color:rgba(7,16,20,0.55);font-size:12px;line-height:1.6;word-break:break-all;">
              Button not working? Copy and paste this link:<br />
              <a href="${params.resetLink}" style="color:#0f7896;">${params.resetLink}</a>
            </div>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(params: { to: string; name?: string | null }) {
  const { user, pass } = getEmailConfig();
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://urologics.co.uk";
  const learnerName = params.name?.trim() || "there";
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: `"Urologics" <${user}>`,
    to: params.to,
    subject: "Welcome to Urologics by Dr Ankit Goel",
    text: `Welcome to Urologics by Dr Ankit Goel.

The most trusted platform for FRCS Urology preparation and world's first app based FRCS Urology course.

We promise that you will enjoy your FRCS Urology preparation journey and everyday there will be something new here to discover and learn.

Wish you all the best!
Happy learning!!

Dr Ankit Goel
FRCS Urology (Gold Medal)
Founder Urologics and Mentor FRCS Urology

Visit Urologics: ${appUrl}`,
    html: `
      <div style="margin:0;background:#eefbff;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#071014;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid rgba(15,120,150,0.14);border-radius:30px;overflow:hidden;box-shadow:0 18px 50px rgba(15,120,150,0.14);">
          <div style="padding:30px 28px 20px;text-align:center;background:linear-gradient(135deg,#f0fdff,#ffffff);">
            <img src="${appUrl}/logo.webp" alt="Urologics" width="76" height="76" style="display:block;margin:0 auto 16px;border-radius:20px;object-fit:contain;" />
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:800;color:#0f7896;">Welcome to Urologics</div>
            <h1 style="margin:10px 0 0;font-size:30px;line-height:1.15;letter-spacing:-0.04em;color:#071014;">Welcome, ${learnerName}</h1>
          </div>
          <div style="padding:12px 30px 32px;">
            <p style="margin:0 0 18px;color:rgba(7,16,20,0.72);font-size:16px;line-height:1.75;font-weight:700;">Welcome to Urologics by Dr Ankit Goel.</p>
            <p style="margin:0 0 18px;color:rgba(7,16,20,0.68);font-size:15px;line-height:1.75;">The most trusted platform for FRCS Urology preparation and world's first app based FRCS Urology course.</p>
            <p style="margin:0 0 22px;color:rgba(7,16,20,0.68);font-size:15px;line-height:1.75;">We promise that you will enjoy your FRCS Urology preparation journey and everyday there will be something new here to discover and learn.</p>
            <a href="${appUrl}" style="display:block;margin:26px 0 22px;padding:16px 22px;border-radius:18px;background:#0f7896;color:#ffffff;text-align:center;text-decoration:none;font-weight:800;font-size:15px;">Open Urologics</a>
            <p style="margin:0;color:rgba(7,16,20,0.62);font-size:15px;line-height:1.75;">Wish you all the best!<br />Happy learning!!</p>
            <div style="margin-top:24px;border-top:1px solid rgba(15,120,150,0.14);padding-top:18px;color:rgba(7,16,20,0.72);font-size:14px;line-height:1.7;">
              <strong style="color:#071014;">Dr Ankit Goel</strong><br />
              FRCS Urology (Gold Medal)<br />
              Founder Urologics and Mentor FRCS Urology
            </div>
          </div>
        </div>
      </div>
    `,
  });
}
