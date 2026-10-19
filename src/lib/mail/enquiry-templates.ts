import { siteConfig } from "@/lib/config";
import { PROPERTY_SIZE_LABELS, SERVICE_LABELS } from "@/lib/pricing";
import type { EnquiryFormData } from "@/lib/validations";

export interface EnquiryEmailContent {
  subject: string;
  html: string;
  text: string;
}

interface SummaryRow {
  label: string;
  value: string;
  href?: string;
}

const colours = {
  offwhite: "#f7f8f4",
  navy: "#102c43",
  blue: "#2457e8",
  lime: "#d6f28b",
  muted: "#687781",
  border: "#e3e8e6",
};
const font = "Arial, Helvetica, sans-serif";
const supportEmail = siteConfig.contact.email;
const supportPhone = siteConfig.contact.phone;
const supportPhoneHref = `tel:${supportPhone.replace(/\s/g, "")}`;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function escapeMultiline(value: string) {
  return escapeHtml(value.replace(/\r\n?/g, "\n")).replace(/\n/g, "<br />");
}

function singleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function preferredDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return singleLine(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function mailto(address: string, subject: string) {
  const recipient = encodeURIComponent(address).replace(/%40/g, "@");
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}`;
}

function summaryTable(rows: SummaryRow[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;table-layout:fixed;">
    ${rows.map(({ label, value, href }, index) => {
      const border = index ? `border-top:1px solid ${colours.border};` : "";
      const content = escapeMultiline(value);
      return `<tr>
        <td width="36%" valign="top" style="${border}padding:13px 16px 13px 0;font-family:${font};font-size:13px;line-height:20px;color:${colours.muted};">${escapeHtml(label)}</td>
        <td width="64%" valign="top" style="${border}padding:13px 0;font-family:${font};font-size:14px;line-height:20px;font-weight:600;color:${colours.navy};word-break:break-word;overflow-wrap:anywhere;">${href ? `<a href="${escapeHtml(href)}" style="color:${colours.blue};text-decoration:underline;">${content}</a>` : content}</td>
      </tr>`;
    }).join("")}
  </table>`;
}

function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
    <tr><td align="center" bgcolor="${colours.blue}" style="background-color:${colours.blue};border-radius:28px;mso-padding-alt:15px 25px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:15px 25px;border:1px solid ${colours.blue};border-radius:28px;font-family:${font};font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;mso-padding-alt:0;">${escapeHtml(label)}&nbsp; &#8599;</a>
    </td></tr>
  </table>`;
}

function layout({ preview, eyebrow, heading, content, footer }: {
  preview: string;
  eyebrow: string;
  heading: string;
  content: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(heading)} | GoodyCleaning</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${colours.offwhite};font-family:${font};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colours.offwhite}" style="width:100%;border-collapse:collapse;background-color:${colours.offwhite};">
    <tr><td align="center" style="padding:28px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background-color:#ffffff;border:1px solid ${colours.border};border-radius:22px;">
        <tr><td height="5" bgcolor="${colours.lime}" style="height:5px;line-height:5px;font-size:1px;background-color:${colours.lime};border-radius:22px 22px 0 0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:24px 28px 23px;border-bottom:1px solid ${colours.border};">
          <img src="cid:goodycleaning-logo" alt="GoodyCleaning logo" width="120" height="80" style="display:block;width:120px;height:80px;margin:0 auto;border:0;outline:none;text-decoration:none;" />
          <p style="margin:6px 0 0;font-family:${font};font-size:18px;line-height:24px;font-weight:700;letter-spacing:-0.5px;color:${colours.navy};">GoodyCleaning</p>
          <p style="margin:3px 0 0;font-family:${font};font-size:11px;line-height:18px;color:${colours.muted};">Cleaner homes. Happier lives.</p>
        </td></tr>
        <tr><td style="padding:30px 28px 10px;">
          <p style="margin:0 0 12px;font-family:${font};font-size:10px;line-height:16px;font-weight:700;letter-spacing:1.8px;color:${colours.blue};text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
          <h1 style="margin:0;font-family:${font};font-size:30px;line-height:36px;font-weight:700;letter-spacing:-1px;color:${colours.navy};">${escapeHtml(heading)}</h1>
        </td></tr>
        <tr><td style="padding:10px 28px 32px;">${content}</td></tr>
        <tr><td bgcolor="${colours.navy}" style="padding:24px 28px;background-color:${colours.navy};border-radius:0 0 21px 21px;">
          <p style="margin:0 0 10px;font-family:${font};font-size:14px;line-height:21px;font-weight:700;color:${colours.lime};">More living. Less cleaning.</p>
          <p style="margin:0;font-family:${font};font-size:12px;line-height:22px;color:#e0e8ef;"><a href="mailto:${escapeHtml(supportEmail)}" style="color:#ffffff;text-decoration:underline;">${escapeHtml(supportEmail)}</a><br /><a href="${escapeHtml(supportPhoneHref)}" style="color:#ffffff;text-decoration:none;">${escapeHtml(supportPhone)}</a></p>
          <p style="margin:14px 0 0;font-family:${font};font-size:11px;line-height:18px;color:#b5c4d1;">${escapeHtml(footer)}</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildAdminEnquiryEmail(enquiry: EnquiryFormData): EnquiryEmailContent {
  const subject = "New GoodyCleaning enquiry";
  const rows: SummaryRow[] = [
    { label: "Name", value: enquiry.name },
    { label: "Email", value: enquiry.email, href: mailto(enquiry.email, "Your GoodyCleaning enquiry") },
    { label: "Phone", value: enquiry.phone, href: `tel:${enquiry.phone.replace(/[^+\d]/g, "")}` },
    { label: "Service", value: SERVICE_LABELS[enquiry.serviceType] },
    { label: "Property size", value: PROPERTY_SIZE_LABELS[enquiry.propertySize] },
    { label: "Postcode", value: enquiry.postcode || "Not supplied" },
    { label: "Preferred date", value: preferredDate(enquiry.preferredDate) || "Not supplied" },
  ];
  const message = enquiry.message || "Not supplied";
  const html = layout({
    preview: "A new cleaning enquiry is ready for your review.",
    eyebrow: "Ready for your review",
    heading: "New cleaning enquiry",
    content: `<p style="margin:0 0 22px;font-family:${font};font-size:15px;line-height:25px;color:${colours.muted};">A customer has asked for a tailored cleaning quote. Review their details and reply to discuss availability and next steps.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colours.offwhite}" style="width:100%;border-collapse:separate;background-color:${colours.offwhite};border:1px solid ${colours.border};border-radius:14px;">
        <tr><td style="padding:5px 18px;">${summaryTable(rows)}</td></tr>
      </table>
      <h2 style="margin:25px 0 10px;font-family:${font};font-size:15px;line-height:22px;font-weight:700;color:${colours.navy};">Additional details</h2>
      <p style="margin:0 0 25px;font-family:${font};font-size:14px;line-height:24px;color:${colours.muted};word-break:break-word;overflow-wrap:anywhere;">${escapeMultiline(message)}</p>
      ${button("Reply to customer", mailto(enquiry.email, "Your GoodyCleaning enquiry"))}
      <p style="margin:18px 0 0;font-family:${font};font-size:12px;line-height:20px;color:${colours.muted};">This is an enquiry, not a confirmed booking. Agree the quote, availability, and cleaning details with the customer.</p>`,
    footer: "GoodyCleaning · Internal enquiry notification",
  });
  const text = [
    "GOODYCLEANING",
    "New cleaning enquiry",
    "",
    ...rows.map(({ label, value }) => `${label}: ${value}`),
    "",
    "Additional details:",
    message,
    "",
    "This is an enquiry, not a confirmed booking. Agree the quote, availability, and cleaning details with the customer.",
    "",
    `Reply to customer: ${enquiry.email}`,
    "",
    "GoodyCleaning · Internal enquiry notification",
    `${supportEmail} | ${supportPhone}`,
  ].join("\n");

  return { subject, html, text };
}

export function buildCustomerAcknowledgementEmail(enquiry: EnquiryFormData): EnquiryEmailContent {
  const subject = "We've received your GoodyCleaning enquiry";
  const name = singleLine(enquiry.name);
  const rows: SummaryRow[] = [
    { label: "Service", value: SERVICE_LABELS[enquiry.serviceType] },
    { label: "Property size", value: PROPERTY_SIZE_LABELS[enquiry.propertySize] },
  ];
  if (enquiry.postcode) rows.push({ label: "Postcode", value: singleLine(enquiry.postcode) });
  const date = preferredDate(enquiry.preferredDate);
  if (date) rows.push({ label: "Preferred date", value: `${date} (to be confirmed)` });

  const acknowledgement = "We've received your cleaning enquiry. Our team will review your details and get back to you to discuss your quote, availability and next steps.";
  const bookingNote = "This is an enquiry acknowledgement. Your quote, availability, and cleaning date will be agreed with you before a booking is confirmed.";
  const html = layout({
    preview: "Thanks for getting in touch. Your cleaning enquiry is with our team.",
    eyebrow: "Thanks for getting in touch",
    heading: "A fresher space starts here.",
    content: `<p style="margin:0 0 14px;font-family:${font};font-size:16px;line-height:26px;font-weight:600;color:${colours.navy};">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 24px;font-family:${font};font-size:15px;line-height:25px;color:${colours.muted};">${escapeHtml(acknowledgement)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colours.offwhite}" style="width:100%;border-collapse:separate;background-color:${colours.offwhite};border:1px solid ${colours.border};border-radius:14px;">
        <tr><td style="padding:18px 18px 0;"><h2 style="margin:0;font-family:${font};font-size:14px;line-height:22px;font-weight:700;color:${colours.navy};">Your enquiry at a glance</h2></td></tr>
        <tr><td style="padding:5px 18px;">${summaryTable(rows)}</td></tr>
      </table>
      <p style="margin:18px 0 26px;font-family:${font};font-size:12px;line-height:21px;color:${colours.muted};">${escapeHtml(bookingNote)}</p>
      <h2 style="margin:0 0 9px;font-family:${font};font-size:17px;line-height:25px;font-weight:700;color:${colours.navy};">Anything else we should know?</h2>
      <p style="margin:0 0 18px;font-family:${font};font-size:14px;line-height:24px;color:${colours.muted};">Reply to this email or get in touch with our team. We&apos;re happy to help.</p>
      ${button("Email the GoodyCleaning team", mailto(supportEmail, "My GoodyCleaning enquiry"))}`,
    footer: "You received this acknowledgement because a cleaning enquiry was submitted with your email address.",
  });
  const text = [
    "GOODYCLEANING",
    "Cleaner homes. Happier lives.",
    "",
    `Hi ${name},`,
    "",
    acknowledgement,
    "",
    "YOUR ENQUIRY AT A GLANCE",
    ...rows.map(({ label, value }) => `${label}: ${value}`),
    "",
    bookingNote,
    "",
    "Anything else we should know?",
    `Reply to this email or contact ${supportEmail}.`,
    `Call ${supportPhone}.`,
    "",
    "More living. Less cleaning.",
    "GoodyCleaning",
    "",
    "You received this acknowledgement because a cleaning enquiry was submitted with your email address.",
  ].join("\n");

  return { subject, html, text };
}
