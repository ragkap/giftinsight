import 'server-only';
import { Resend } from 'resend';
import { env } from './env';

let _client: Resend | null = null;
function client() {
  const key = env().RESEND_API_KEY;
  if (!key) return null;
  if (!_client) _client = new Resend(key);
  return _client;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const c = client();
  const from = env().EMAIL_FROM;
  if (!c) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email-skipped] RESEND_API_KEY missing.', { from, ...opts, html: opts.html.slice(0, 200) + '…' });
    }
    return { skipped: true as const };
  }
  const r = await c.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
  return { id: r.data?.id, error: r.error };
}

const ACCENT = '#24a9a7';
const BRAND_LOGO =
  'https://branding.smartkarma.com/assets/uploaded/sites/10/2021/03/smartkarma-primary-logo-full-colour-1000px.png';

function shell(body: string, preheader: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Smartkarma</title></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04),0 4px 12px rgba(0,0,0,.05);">
<tr><td style="height:4px;background:${ACCENT};line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:28px 36px 4px;">
<img src="${BRAND_LOGO}" alt="Smartkarma" height="26" style="display:block;height:26px;width:auto;border:0;" />
<div style="margin-top:10px;font-size:11px;letter-spacing:.18em;color:${ACCENT};font-weight:600;text-transform:uppercase;">Gift Insight</div>
</td></tr>
<tr><td style="padding:14px 36px 32px;font-size:15px;line-height:1.6;color:#1a1a1a;">${body}</td></tr>
<tr><td style="padding:0 36px 28px;font-size:12px;color:#737373;">
You're receiving this because you use Smartkarma Gift Insight. ·
<a href="https://www.smartkarma.com" style="color:#737373;">smartkarma.com</a>
</td></tr></table></td></tr></table></body></html>`;
}

export function readNotificationHtml(args: {
  gifterFirstName: string;
  recipientFirstName: string;
  recipientLastName: string;
  recipientEmail: string;
  insightTagline: string;
  appBaseUrl: string;
}) {
  const dashboardUrl = `${args.appBaseUrl.replace(/\/$/, '')}/app/analytics`;
  return shell(
    `<p style="margin:0 0 14px;">Hi ${esc(args.gifterFirstName)},</p>
     <p style="margin:0 0 14px;"><strong>${esc(args.recipientFirstName)} ${esc(args.recipientLastName)}</strong> just read the insight you gifted:</p>
     <p style="margin:0 0 18px;font-size:16px;font-weight:600;border-left:3px solid ${ACCENT};padding:6px 12px;background:#effaf9;border-radius:0 6px 6px 0;">${esc(args.insightTagline)}</p>
     <p style="margin:0;color:#525252;font-size:13px;">View opens and "thanks" responses on <a href="${esc(dashboardUrl)}" style="color:${ACCENT};font-weight:600;text-decoration:underline;">your dashboard</a>.</p>`,
    `${args.recipientFirstName} read the insight you gifted.`,
  );
}

export function proClientNotificationHtml(args: {
  gifterFirstName: string;
  recipientFirstName: string;
  recipientLastName: string;
  recipientEmail: string;
  insightTagline: string;
}) {
  return shell(
    `<p style="margin:0 0 14px;">Hi ${esc(args.gifterFirstName)},</p>
     <p style="margin:0 0 14px;">You gifted an insight to <strong>${esc(args.recipientFirstName)} ${esc(args.recipientLastName)}</strong>, but they're already a Smartkarma client — so we sent them straight to their Smartkarma account to read the full insight.</p>
     <p style="margin:0 0 18px;font-size:15px;font-weight:600;border-left:3px solid ${ACCENT};padding:6px 12px;background:#effaf9;border-radius:0 6px 6px 0;">${esc(args.insightTagline)}</p>
     <p style="margin:0;color:#525252;font-size:13px;">No view from this gift link was consumed.</p>`,
    `${args.recipientFirstName} is already a Smartkarma client.`,
  );
}

export function requestToAuthorHtml(args: {
  authorFirstName: string;
  gifterName: string;
  gifterCompany: string | null;
  appBaseUrl: string;
}) {
  const reviewUrl = `${args.appBaseUrl.replace(/\/$/, '')}/app/permissions`;
  const who = args.gifterCompany ? `${args.gifterName} (${args.gifterCompany})` : args.gifterName;
  return shell(
    `<p style="margin:0 0 14px;">Hi ${esc(args.authorFirstName)},</p>
     <p style="margin:0 0 16px;"><strong>${esc(who)}</strong> would like permission to gift your Smartkarma insights. Recipients of their gifts would read the full insight with no paywall — and you would not receive QVA for those reads.</p>

     <p style="margin:0 0 18px;">Review the request and approve or deny it on your permissions page.</p>

     <p style="margin:0 0 18px;">
       <a href="${esc(reviewUrl)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:10px;">Review request →</a>
     </p>

     <p style="margin:18px 0 0;font-size:13px;color:#525252;">
       Tip: approving a request adds them to your "People allowed to gift your insights" list. You can revoke any time.
     </p>`,
    `${args.gifterName} would like to gift your insights.`,
  );
}

export function permissionGrantedHtml(args: {
  granteeFirstName: string;
  grantorName: string;
  appBaseUrl: string;
  maxLinksPerMonth: number;
  maxViewsPerLink: number;
  expiryDays: number;
}) {
  const base = args.appBaseUrl.replace(/\/$/, '');
  const dashboard = `${base}/app`;
  const analytics = `${base}/app/analytics`;
  return shell(
    `<p style="margin:0 0 14px;">Hi ${esc(args.granteeFirstName)},</p>
     <p style="margin:0 0 16px;"><strong>${esc(args.grantorName)}</strong> has just allowed you to gift their Smartkarma insights — you can now share their full research with anyone, with no paywall on the recipient's side.</p>

     <p style="margin:0 0 22px;">
       <a href="${esc(dashboard)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;">Open Gift Insight →</a>
     </p>

     <p style="margin:18px 0 8px;font-size:13px;letter-spacing:.06em;color:${ACCENT};font-weight:700;text-transform:uppercase;">How it works</p>
     <ol style="margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.65;">
       <li>Sign in to <a href="${esc(dashboard)}" style="color:${ACCENT};">Gift Insight</a> with your existing Smartkarma credentials.</li>
       <li>Search any of <strong>${esc(args.grantorName)}</strong>'s published insights.</li>
       <li>Click <strong>Gift</strong> — a shareable link is copied to your clipboard. Drop it into Slack, email, or WhatsApp.</li>
       <li>The recipient enters their business email and reads the full insight. <strong>They don't need a Smartkarma account.</strong></li>
     </ol>

     <p style="margin:18px 0 8px;font-size:13px;letter-spacing:.06em;color:${ACCENT};font-weight:700;text-transform:uppercase;">What you can gift</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #d6f1ef;border-radius:10px;overflow:hidden;width:100%;font-size:14px;">
       <tr style="background:#effaf9;">
         <td style="padding:10px 14px;color:#1a1a1a;"><strong>${args.maxLinksPerMonth}</strong> gift links per month</td>
       </tr>
       <tr><td style="padding:10px 14px;border-top:1px solid #d6f1ef;"><strong>${args.maxViewsPerLink}</strong> recipient views per link</td></tr>
       <tr><td style="padding:10px 14px;border-top:1px solid #d6f1ef;"><strong>${args.expiryDays} days</strong> before each link expires</td></tr>
     </table>

     <p style="margin:18px 0 8px;font-size:13px;letter-spacing:.06em;color:${ACCENT};font-weight:700;text-transform:uppercase;">Stay in the loop</p>
     <ul style="margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.65;">
       <li>Your <a href="${esc(analytics)}" style="color:${ACCENT};font-weight:600;">dashboard</a> shows who's opened each gift, who said thanks, and your top readers.</li>
       <li>You'll get an email <strong>every time someone reads a gift you sent</strong> — easy to follow up the same hour.</li>
     </ul>

     <p style="margin:22px 0 0;padding:14px 16px;background:#fafafa;border-left:3px solid ${ACCENT};border-radius:0 6px 6px 0;font-size:13px;color:#525252;">
       <strong style="color:#1a1a1a;">Heads up:</strong> Gift Insight is currently in beta as a standalone product. It'll soon be fully integrated into the main Smartkarma platform.
     </p>`,
    `${args.grantorName} has allowed you to gift their Smartkarma insights.`,
  );
}

export function gifterWelcomeHtml(args: {
  firstName: string;
  appBaseUrl: string;
  maxLinksPerMonth: number;
  maxViewsPerLink: number;
  expiryDays: number;
}) {
  const dashboard = `${args.appBaseUrl.replace(/\/$/, '')}/app`;
  return shell(
    `<p style="margin:0 0 14px;">Hi ${esc(args.firstName)},</p>
     <p style="margin:0 0 14px;">Welcome to <strong>Smartkarma Gift Insight</strong> — the easiest way to share full Smartkarma insights with non-clients.</p>
     <p style="margin:0 0 18px;">Search any insight you're allowed to gift, hit <em>Gift</em>, and a shareable link is copied to your clipboard. Recipients open the link, enter their business email, and read the entire insight with no paywall.</p>

     <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border:1px solid #d6f1ef;border-radius:10px;overflow:hidden;width:100%;">
       <tr style="background:#effaf9;">
         <td style="padding:10px 14px;font-size:12px;color:${ACCENT};text-transform:uppercase;letter-spacing:.08em;font-weight:600;">Your monthly allowance</td>
       </tr>
       <tr><td style="padding:14px;font-size:14px;color:#1a1a1a;">
         <div style="margin-bottom:6px;"><strong>${args.maxLinksPerMonth}</strong> gift links per month</div>
         <div style="margin-bottom:6px;"><strong>${args.maxViewsPerLink}</strong> recipient views per link</div>
         <div><strong>${args.expiryDays} days</strong> before each link expires</div>
       </td></tr>
     </table>

     <p style="margin:0 0 14px;">
       <a href="${esc(dashboard)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;">Open Gift Insight →</a>
     </p>

     <p style="margin:0;color:#525252;font-size:13px;">Tip: you'll see who reads each gift and who says thanks on your dashboard.</p>`,
    `Welcome to Gift Insight — share full Smartkarma insights with non-clients.`,
  );
}

export function recipientLinkHtml(args: {
  recipientFirstName: string;
  gifterName: string;
  insightTagline: string;
  insightAuthor: string;
  giftLinkUrl: string;
  expiresAt: Date;
}) {
  const expiry = args.expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return shell(
    `<p style="margin:0 0 14px;">Hi ${esc(args.recipientFirstName)},</p>
     <p style="margin:0 0 14px;">Thanks for reading the insight <strong>${esc(args.gifterName)}</strong> gifted you. So you can come back to it whenever you like, here's your personal link:</p>

     <p style="margin:0 0 18px;font-size:16px;font-weight:600;border-left:3px solid ${ACCENT};padding:10px 14px;background:#effaf9;border-radius:0 8px 8px 0;">
       ${esc(args.insightTagline)}
       <span style="display:block;font-size:12px;font-weight:400;color:#525252;margin-top:4px;">by ${esc(args.insightAuthor)}</span>
     </p>

     <p style="margin:0 0 8px;">
       <a href="${esc(args.giftLinkUrl)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:10px;">Read the insight →</a>
     </p>

     <p style="margin:14px 0 6px;font-size:13px;color:#525252;">
       <strong style="color:#1a1a1a;">Heads up:</strong> this link expires on <strong>${esc(expiry)}</strong>.
     </p>
     <p style="margin:0 0 18px;font-size:13px;color:#525252;">
       Want full access to every insight on Smartkarma? Start a free 2-week trial from any page on the read view.
     </p>

     <p style="margin:24px 0 0;font-size:11px;color:#a3a3a3;word-break:break-all;">
       Direct link: <a href="${esc(args.giftLinkUrl)}" style="color:#a3a3a3;">${esc(args.giftLinkUrl)}</a>
     </p>`,
    `Your gifted insight from ${args.gifterName} — bookmark for later.`,
  );
}

export function trialInterestHtml(args: {
  recipientFirstName: string;
  recipientLastName: string;
  recipientEmail: string;
  gifterName: string;
  insightTagline: string;
  appBaseUrl: string;
}) {
  return shell(
    `<p style="margin:0 0 14px;font-weight:600;">Trial signup intent — Gift Insight</p>
     <p style="margin:0 0 14px;"><strong>${esc(args.recipientFirstName)} ${esc(args.recipientLastName)}</strong> just clicked <em>Start free trial</em> while reading a gifted insight.</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;font-size:14px;color:#1a1a1a;border-collapse:collapse;">
       <tr><td style="padding:6px 12px 6px 0;color:#737373;">Insight</td><td style="padding:6px 0;">${esc(args.insightTagline)}</td></tr>
       <tr><td style="padding:6px 12px 6px 0;color:#737373;">Gifted by</td><td style="padding:6px 0;">${esc(args.gifterName)}</td></tr>
     </table>
     <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;width:100%;">
       <tr><td style="background:${ACCENT};border-radius:12px;padding:18px 22px;text-align:left;color:#ffffff;">
         <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;opacity:.9;">Action</div>
         <div style="font-size:18px;font-weight:700;line-height:1.35;margin-top:4px;">Set up their trial and reach out with a warm touch within the next 30 minutes.</div>
       </td></tr>
     </table>`,
    `${args.recipientFirstName} clicked Start free trial.`,
  );
}

export function thanksToAuthorHtml(args: {
  authorFirstName: string;
  gifterFirstName: string;
  gifterLastName: string;
  recipientFirstName: string;
  recipientLastName: string;
  insightTagline: string;
}) {
  return shell(
    `<p style="margin:0 0 14px;">Hi ${esc(args.authorFirstName)},</p>
     <p style="margin:0 0 14px;">Good news — <strong>${esc(args.gifterFirstName)} ${esc(args.gifterLastName)}</strong> gifted your insight:</p>
     <p style="margin:0 0 18px;font-size:16px;font-weight:600;border-left:3px solid ${ACCENT};padding:6px 12px;background:#effaf9;border-radius:0 6px 6px 0;">${esc(args.insightTagline)}</p>
     <p style="margin:0 0 14px;"><strong>${esc(args.recipientFirstName)} ${esc(args.recipientLastName)}</strong> read it and responded with thanks.</p>`,
    `${args.recipientFirstName} thanked you for "${args.insightTagline}".`,
  );
}

function esc(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
