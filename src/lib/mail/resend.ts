import { Resend } from "resend";
import { siteConfig } from "@/lib/config";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const from = process.env.MAIL_FROM ?? "Goodycleaning <onboarding@resend.dev>";
const adminEmail = process.env.ADMIN_EMAIL ?? siteConfig.contact.email;

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
}) {
  if (!resend) {
    console.log(`[Email stub] To: ${to}, Subject: ${subject}`);
    return { id: "stub" };
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    react,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export { adminEmail };
