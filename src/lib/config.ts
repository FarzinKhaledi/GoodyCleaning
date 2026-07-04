export const siteConfig = {
  name: "Goodycleaning",
  tagline: "Cleaner homes. Happier lives.",
  description:
    "Professional cleaning services across the UK — deep cleaning, end of tenancy, and carpet cleaning with eco-friendly products.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  contact: {
    phone: "+44 20 7946 0958",
    email: "hello@goodycleaning.co.uk",
    address: "London, United Kingdom",
  },
  social: {
    facebook: "https://facebook.com/goodycleaning",
    instagram: "https://instagram.com/goodycleaning",
    twitter: "https://twitter.com/goodycleaning",
  },
  colors: {
    mint: "#7EE1BF",
    navy: "#0B1B3A",
    white: "#FFFFFF",
  },
} as const;
