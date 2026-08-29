import nodemailer from "nodemailer";

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let cachedTransporterUser = "";

function getEmailConfig() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();

  if (!user || !pass) {
    throw new Error("Email service is not configured");
  }

  return { user, pass };
}

function createEmailTransporter() {
  const { user, pass } = getEmailConfig();

  if (!cachedTransporter || cachedTransporterUser !== user) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
    cachedTransporterUser = user;
  }

  return {
    user,
    transporter: cachedTransporter,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendBrandedPasswordResetEmail(params: {
  to: string;
  resetLink: string;
}) {
  const { user, transporter } = createEmailTransporter();
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://urologics.co.uk";

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
  const { user, transporter } = createEmailTransporter();
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://urologics.co.uk";
  const learnerName = params.name?.trim() || "there";

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

export async function sendCourseAssignedEmail(params: {
  to: string;
  name?: string | null;
  courseName: string;
}) {
  const { user, transporter } = createEmailTransporter();
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://urologics.co.uk";
  const memberName = params.name?.trim() || "Member";
  const courseName = params.courseName.replace(/\r?\n/g, " ").trim() || "your course";
  const safeName = escapeHtml(memberName);
  const safeCourseName = escapeHtml(courseName);

  await transporter.sendMail({
    from: `"Urologics" <${user}>`,
    to: params.to,
    subject: `You have been assigned to ${courseName}`,
    text: `Dear ${memberName},

You have been assigned to ${courseName}

Visit Urologics: ${appUrl}

Dr Ankit Goel
FRCS Urology (Gold Medal)
Founder Urologics and Mentor FRCS Urology`,
    html: `
      <div style="margin:0;background:#eefbff;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#071014;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid rgba(15,120,150,0.14);border-radius:30px;overflow:hidden;box-shadow:0 18px 50px rgba(15,120,150,0.14);">
          <div style="padding:30px 28px 20px;text-align:center;background:linear-gradient(135deg,#f0fdff,#ffffff);">
            <img src="${appUrl}/logo.webp" alt="Urologics" width="76" height="76" style="display:block;margin:0 auto 16px;border-radius:20px;object-fit:contain;" />
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:800;color:#0f7896;">Course Access Assigned</div>
          </div>
          <div style="padding:18px 30px 32px;">
            <p style="margin:0 0 18px;color:rgba(7,16,20,0.72);font-size:16px;line-height:1.75;">Dear ${safeName},</p>
            <h1 style="margin:0 0 18px;font-size:28px;line-height:1.25;letter-spacing:-0.035em;color:#071014;">You have been assigned to ${safeCourseName}</h1>
            <p style="margin:0;color:rgba(7,16,20,0.68);font-size:15px;line-height:1.75;">Your Urologics course access is now active. You can open the platform and start learning from your assigned course.</p>
            <a href="${appUrl}/web" style="display:block;margin:28px 0 24px;padding:16px 22px;border-radius:18px;background:#0f7896;color:#ffffff;text-align:center;text-decoration:none;font-weight:800;font-size:15px;">Open Urologics Platform</a>
            <div style="border-top:1px solid rgba(15,120,150,0.14);padding-top:18px;color:rgba(7,16,20,0.72);font-size:14px;line-height:1.7;">
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

export async function sendAnnouncementEmail(params: {
  to: string;
  name?: string | null;
  title: string;
  description: string;
}) {
  const { user, transporter } = createEmailTransporter();
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://urologics.co.uk";
  const memberName = params.name?.trim() || "Member";
  const safeName = escapeHtml(memberName);
  const safeTitle = escapeHtml(params.title);
  const safeDescription = escapeHtml(params.description).replace(/\r?\n/g, "<br />");

  await transporter.sendMail({
    from: `"Urologics" <${user}>`,
    to: params.to,
    subject: "Urologics Announcement 📣",
    text: `Dear ${memberName},

${params.title}

${params.description}

Visit Urologics: ${appUrl}

Dr Ankit Goel
FRCS Urology (Gold Medal)
Founder Urologics and Mentor FRCS Urology`,
    html: `
      <div style="margin:0;background:#eefbff;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#071014;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid rgba(15,120,150,0.14);border-radius:30px;overflow:hidden;box-shadow:0 18px 50px rgba(15,120,150,0.14);">
          <div style="padding:30px 28px 20px;text-align:center;background:linear-gradient(135deg,#f0fdff,#ffffff);">
            <img src="${appUrl}/logo.webp" alt="Urologics" width="76" height="76" style="display:block;margin:0 auto 16px;border-radius:20px;object-fit:contain;" />
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:800;color:#0f7896;">Urologics Announcement &#128227;</div>
          </div>
          <div style="padding:18px 30px 32px;">
            <p style="margin:0 0 20px;color:rgba(7,16,20,0.72);font-size:16px;line-height:1.75;">Dear ${safeName},</p>
            <h1 style="margin:0 0 18px;font-size:26px;line-height:1.3;letter-spacing:-0.035em;color:#071014;">${safeTitle}</h1>
            <div style="margin:0;color:rgba(7,16,20,0.68);font-size:15px;line-height:1.8;">${safeDescription}</div>
            <a href="${appUrl}" style="display:block;margin:28px 0 24px;padding:16px 22px;border-radius:18px;background:#0f7896;color:#ffffff;text-align:center;text-decoration:none;font-weight:800;font-size:15px;">Visit Urologics</a>
            <div style="border-top:1px solid rgba(15,120,150,0.14);padding-top:18px;color:rgba(7,16,20,0.72);font-size:14px;line-height:1.7;">
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

export async function sendPaymentQueryConfirmationEmail(params: {
  to: string;
  name?: string | null;
  queryId: string;
  query: string;
  planName: string;
  couponName?: string | null;
}) {
  const { user, transporter } = createEmailTransporter();
  const requesterName = params.name?.trim() || "there";
  const safeName = escapeHtml(requesterName);
  const safePlanName = escapeHtml(params.planName);
  const safeCouponName = escapeHtml(params.couponName?.trim() || "Not provided");
  const safeQuery = escapeHtml(params.query).replace(/\r?\n/g, "<br />");
  const safeQueryId = escapeHtml(params.queryId);

  await transporter.sendMail({
    from: `"Urologics" <${user}>`,
    to: params.to,
    subject: `Payment query received - ${params.queryId}`,
    text: `Dear ${requesterName},

Your payment query has been raised successfully.

Reference: ${params.queryId}
Plan: ${params.planName}
Coupon: ${params.couponName?.trim() || "Not provided"}
Query: ${params.query}

Our team will review it and contact you using this email address.

Urologics Support`,
    html: `
      <div style="margin:0;background:#eefbff;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#071014;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid rgba(15,120,150,0.14);border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(15,120,150,0.14);">
          <div style="padding:28px;background:linear-gradient(135deg,#f0fdff,#ffffff);text-align:center;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:800;color:#0f7896;">Urologics Support</div>
            <h1 style="margin:10px 0 0;font-size:28px;color:#071014;">Payment query received</h1>
          </div>
          <div style="padding:24px 30px 32px;">
            <p style="font-size:16px;line-height:1.7;">Dear ${safeName},</p>
            <p style="font-size:15px;line-height:1.7;color:rgba(7,16,20,0.68);">Your query has been raised successfully. Our team will review it and contact you by email.</p>
            <div style="margin:22px 0;padding:18px;border-radius:18px;background:#f4fbfd;font-size:14px;line-height:1.8;">
              <strong>Reference:</strong> ${safeQueryId}<br />
              <strong>Plan:</strong> ${safePlanName}<br />
              <strong>Coupon:</strong> ${safeCouponName}<br />
              <strong>Query:</strong><br />${safeQuery}
            </div>
            <p style="font-size:14px;color:rgba(7,16,20,0.58);">Please keep the reference number for future communication.</p>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendCouponCheckoutFollowUpEmail(params: {
  to: string;
  name?: string | null;
  planName: string;
  couponName?: string | null;
  checkoutUrl: string;
}) {
  const { user, transporter } = createEmailTransporter();
  const requesterName = params.name?.trim() || "there";
  const safeName = escapeHtml(requesterName);
  const safePlanName = escapeHtml(params.planName);
  const safeCouponName = escapeHtml(params.couponName?.trim() || "Not provided");
  const safeCheckoutUrl = escapeHtml(params.checkoutUrl);

  await transporter.sendMail({
    from: `"Urologics" <${user}>`,
    to: params.to,
    subject: `Continue your ${params.planName} checkout on Urologics`,
    text: `Dear ${requesterName},

We are sorry that the coupon didn't work. Please try it on our website.

Plan: ${params.planName}
Coupon: ${params.couponName?.trim() || "Not provided"}

Continue checkout: ${params.checkoutUrl}

If you are not signed in, you will be asked to log in before continuing to the course checkout page.

Urologics Support`,
    html: `
      <div style="margin:0;background:#eefbff;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#071014;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid rgba(15,120,150,0.14);border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(15,120,150,0.14);">
          <div style="padding:28px;background:linear-gradient(135deg,#f0fdff,#ffffff);text-align:center;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:800;color:#0f7896;">Urologics Support</div>
            <h1 style="margin:10px 0 0;font-size:27px;color:#071014;">Continue on our website</h1>
          </div>
          <div style="padding:24px 30px 32px;">
            <p style="font-size:16px;line-height:1.7;">Dear ${safeName},</p>
            <p style="font-size:16px;line-height:1.7;color:rgba(7,16,20,0.72);">We are sorry that the coupon didn't work. Please try it on our website.</p>
            <div style="margin:20px 0;padding:16px;border-radius:18px;background:#f4fbfd;font-size:14px;line-height:1.8;">
              <strong>Plan:</strong> ${safePlanName}<br />
              <strong>Coupon:</strong> ${safeCouponName}
            </div>
            <a href="${safeCheckoutUrl}" style="display:block;margin:24px 0;padding:16px 22px;border-radius:18px;background:#0f7896;color:#ffffff;text-align:center;text-decoration:none;font-weight:800;font-size:15px;">Open course checkout</a>
            <p style="font-size:13px;line-height:1.7;color:rgba(7,16,20,0.55);">If you are not signed in, we will ask you to log in before opening the checkout page.</p>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendPurchaseConfirmationEmail(params: {
  to: string;
  name?: string | null;
  courseName: string;
  planName: string;
  amount: number;
  currency: string;
  orderReference: string;
  captureReference: string;
  purchaseDate: Date;
  accessEndsAt: Date;
}) {
  const { user, transporter } = createEmailTransporter();
  const name = params.name?.trim() || "Member";
  const firstName = name.split(/\s+/)[0] || "Member";
  const amount = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(params.amount);
  const purchased = params.purchaseDate.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/London" });
  const expires = params.accessEndsAt.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/London" });
  const appUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://urologics.co.uk").replace(/\/$/, "");
  const courseUrl = `${appUrl}/web`;
  const safeFirstName = escapeHtml(firstName);
  const safeCourseName = escapeHtml(params.courseName);
  const safePlanName = escapeHtml(params.planName);
  const safeAmount = escapeHtml(amount);
  const safePurchased = escapeHtml(purchased);
  const safeExpires = escapeHtml(expires);
  const safeOrderReference = escapeHtml(params.orderReference);
  const safeCourseUrl = escapeHtml(courseUrl);
  const safeLogoUrl = escapeHtml(`${appUrl}/logo.webp`);
  await transporter.sendMail({
    from: `"Urologics" <${user}>`, to: params.to,
    subject: `Purchase confirmed — ${params.courseName}`,
    text: `Hi ${firstName},\n\nThank you for your purchase. Your payment has been successfully confirmed and your course access is now active.\n\nPURCHASE DETAILS\nCourse: ${params.courseName}\nPlan: ${params.planName}\nAmount paid: £${amount} GBP\nPurchase date: ${purchased}\nAccess valid until: ${expires}\n\nPAYMENT REFERENCE\nOrder ID: ${params.orderReference}\nPayment status: Confirmed\n\nYou can now sign in to Urologics and continue your course.\n\nAccess Your Course: ${courseUrl}\n\nIf you have any questions regarding your purchase or course access, simply reply to this email and our team will be happy to help.\n\nBest regards,\nUrologics Team\n\nThis is an automated purchase confirmation. Please keep this email for your records.`,
    html: `
      <div style="margin:0;background:#eaf8fc;padding:36px 14px;font-family:Arial,Helvetica,sans-serif;color:#071014;">
        <div style="max-width:620px;margin:0 auto;overflow:hidden;border:1px solid rgba(15,120,150,0.14);border-radius:28px;background:#ffffff;box-shadow:0 20px 60px rgba(15,120,150,0.14);">
          <div style="padding:30px 32px;text-align:center;background:linear-gradient(135deg,#e9fbff 0%,#ffffff 100%);border-bottom:1px solid rgba(15,120,150,0.12);">
            <img src="${safeLogoUrl}" alt="Urologics" width="72" height="72" style="display:block;margin:0 auto 14px;border-radius:18px;object-fit:contain;" />
            <div style="font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#0f7896;">Payment confirmed</div>
            <h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;letter-spacing:-0.04em;color:#071014;">Your course access is active</h1>
          </div>
          <div style="padding:30px 32px 34px;">
            <p style="margin:0 0 16px;font-size:17px;font-weight:700;line-height:1.6;">Hi ${safeFirstName},</p>
            <p style="margin:0;color:rgba(7,16,20,0.68);font-size:15px;line-height:1.8;">Thank you for your purchase. Your payment has been successfully confirmed and your course access is now active.</p>

            <div style="margin-top:26px;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#0f7896;">Purchase details</div>
            <div style="margin-top:10px;border:1px solid rgba(15,120,150,0.12);border-radius:20px;background:#f5fcfe;padding:18px 20px;font-size:14px;line-height:1.9;">
              <div><strong>Course:</strong> ${safeCourseName}</div>
              <div><strong>Plan:</strong> ${safePlanName}</div>
              <div><strong>Amount paid:</strong> £${safeAmount} GBP</div>
              <div><strong>Purchase date:</strong> ${safePurchased}</div>
              <div><strong>Access valid until:</strong> ${safeExpires}</div>
            </div>

            <div style="margin-top:24px;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#0f7896;">Payment reference</div>
            <div style="margin-top:10px;border-radius:18px;background:#071014;padding:17px 20px;color:#ffffff;font-size:14px;line-height:1.9;">
              <div><strong>Order ID:</strong> ${safeOrderReference}</div>
              <div><strong>Payment status:</strong> <span style="color:#7ce6b2;">Confirmed</span></div>
            </div>

            <p style="margin:26px 0 0;color:rgba(7,16,20,0.68);font-size:15px;line-height:1.8;">You can now sign in to Urologics and continue your course.</p>
            <a href="${safeCourseUrl}" style="display:block;margin:20px 0 26px;padding:16px 24px;border-radius:999px;background:linear-gradient(135deg,#0f7896,#1294ba);color:#ffffff;text-align:center;text-decoration:none;font-size:15px;font-weight:800;box-shadow:0 10px 26px rgba(15,120,150,0.25);">Access Your Course</a>
            <p style="margin:0;color:rgba(7,16,20,0.66);font-size:14px;line-height:1.8;">If you have any questions regarding your purchase or course access, simply reply to this email and our team will be happy to help.</p>
            <p style="margin:22px 0 0;font-size:14px;line-height:1.7;">Best regards,<br><strong>Urologics Team</strong></p>
            <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(15,120,150,0.12);color:rgba(7,16,20,0.48);font-size:12px;font-style:italic;line-height:1.7;">This is an automated purchase confirmation. Please keep this email for your records.</div>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendPlanMaterialRequestConfirmationEmail(params: {
  to: string;
  name?: string | null;
  planName: string;
  requestedCourseMaterial: string;
  requestId: string;
}) {
  const { user, transporter } = createEmailTransporter();
  const name = params.name?.trim() || "Member";
  await transporter.sendMail({
    from: `"Urologics" <${user}>`,
    to: params.to,
    subject: `We received your ${params.planName} request`,
    text: `Dear ${name},\n\nPurchase for ${params.planName} is not available right now. We have added you to the priority list and recorded the course material you need.\n\nRequested material: ${params.requestedCourseMaterial}\nReference: ${params.requestId}\n\nWe will contact you when a suitable course becomes available.\n\nUrologics Support`,
    html: `<div style="font-family:Arial,sans-serif;background:#eefbff;padding:28px"><div style="max-width:600px;margin:auto;background:white;border-radius:24px;padding:30px"><h1 style="color:#071014">Your request is on our list</h1><p>Dear ${escapeHtml(name)},</p><p>Purchase for <strong>${escapeHtml(params.planName)}</strong> is not available right now. We have added you to our priority list.</p><div style="background:#f4fbfd;border-radius:16px;padding:18px;line-height:1.8"><strong>Course material requested:</strong><br>${escapeHtml(params.requestedCourseMaterial).replace(/\r?\n/g, "<br>")}<br><br><strong>Reference:</strong> ${escapeHtml(params.requestId)}</div><p>We will contact you when a suitable course becomes available.</p></div></div>`,
  });
}
