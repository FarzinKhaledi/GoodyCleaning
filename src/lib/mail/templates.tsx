import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import { siteConfig } from "../config";
import { formatPrice } from "../utils";

const styles = {
  main: {
    backgroundColor: "#f6f9fc",
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "40px 20px",
    maxWidth: "560px",
    borderRadius: "8px",
  },
  heading: {
    color: "#0B1B3A",
    fontSize: "24px",
    fontWeight: "700",
    margin: "0 0 16px",
  },
  text: {
    color: "#334155",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 12px",
  },
  button: {
    backgroundColor: "#7EE1BF",
    color: "#0B1B3A",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "16px",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "12px 24px",
    marginTop: "16px",
  },
  footer: {
    color: "#64748b",
    fontSize: "12px",
    marginTop: "24px",
  },
};

interface QuoteDetails {
  name: string;
  email: string;
  phone: string;
  serviceType: string;
  propertySize: string;
  preferredDate?: string;
  message?: string;
}

export function AdminNewQuoteEmail({
  quote,
  adminUrl,
}: {
  quote: QuoteDetails & { id: string };
  adminUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>New quote request from {quote.name}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>New Quote Request</Heading>
          <Text style={styles.text}>
            A new cleaning quote request has been submitted and requires your
            review.
          </Text>
          <Text style={styles.text}>
            <strong>Name:</strong> {quote.name}
            <br />
            <strong>Email:</strong> {quote.email}
            <br />
            <strong>Phone:</strong> {quote.phone}
            <br />
            <strong>Service:</strong> {quote.serviceType}
            <br />
            <strong>Property:</strong> {quote.propertySize}
            <br />
            {quote.preferredDate && (
              <>
                <strong>Preferred date:</strong> {quote.preferredDate}
                <br />
              </>
            )}
            {quote.message && (
              <>
                <strong>Message:</strong> {quote.message}
              </>
            )}
          </Text>
          <Button style={styles.button} href={adminUrl}>
            Review in Admin Dashboard
          </Button>
          <Hr />
          <Text style={styles.footer}>{siteConfig.name} Admin Notification</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function QuoteReadyEmail({
  name,
  serviceType,
  priceCents,
  checkoutUrl,
}: {
  name: string;
  serviceType: string;
  priceCents: number;
  checkoutUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Your {siteConfig.name} quote is ready</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Your Quote is Ready</Heading>
          <Text style={styles.text}>Hi {name},</Text>
          <Text style={styles.text}>
            Thank you for requesting a quote for <strong>{serviceType}</strong>.
            We&apos;ve prepared your personalised quote:
          </Text>
          <Text style={{ ...styles.text, fontSize: "28px", fontWeight: "700", color: "#0B1B3A" }}>
            {formatPrice(priceCents)}
          </Text>
          <Text style={styles.text}>
            Click below to pay securely with card, Apple Pay, Google Pay, or
            Revolut Pay.
          </Text>
          <Button style={styles.button} href={checkoutUrl}>
            Pay Now
          </Button>
          <Hr />
          <Text style={styles.footer}>
            Questions? Contact us at {siteConfig.contact.email}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function BookingConfirmationEmail({
  name,
  serviceType,
  propertySize,
  amountCents,
  preferredDate,
}: {
  name: string;
  serviceType: string;
  propertySize: string;
  amountCents: number;
  preferredDate?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Booking confirmed with {siteConfig.name}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Booking Confirmed!</Heading>
          <Text style={styles.text}>Hi {name},</Text>
          <Text style={styles.text}>
            Your payment has been received and your cleaning is confirmed. Here
            are your booking details:
          </Text>
          <Text style={styles.text}>
            <strong>Service:</strong> {serviceType}
            <br />
            <strong>Property:</strong> {propertySize}
            <br />
            <strong>Amount paid:</strong> {formatPrice(amountCents)}
            <br />
            {preferredDate && (
              <>
                <strong>Preferred date:</strong> {preferredDate}
              </>
            )}
          </Text>
          <Text style={styles.text}>
            Our team will contact you shortly to confirm the exact time. We look
            forward to making your space sparkle!
          </Text>
          <Hr />
          <Text style={styles.footer}>
            {siteConfig.name} · {siteConfig.contact.phone}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function InternalPaymentAlertEmail({
  customerName,
  customerEmail,
  serviceType,
  amountCents,
  quoteId,
}: {
  customerName: string;
  customerEmail: string;
  serviceType: string;
  amountCents: number;
  quoteId: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Payment received from {customerName}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Payment Received</Heading>
          <Text style={styles.text}>
            <strong>Customer:</strong> {customerName} ({customerEmail})
            <br />
            <strong>Service:</strong> {serviceType}
            <br />
            <strong>Amount:</strong> {formatPrice(amountCents)}
            <br />
            <strong>Quote ID:</strong> {quoteId}
          </Text>
          <Button
            style={styles.button}
            href={`${siteConfig.url}/admin/quotes/${quoteId}`}
          >
            View Booking
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
