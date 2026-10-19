export const siteConfig = {
  name: "GoodyCleaning",
  logo: "/GoodyCleaning-logo.webp",
  tagline: "Cleaner homes. Happier lives.",
  description:
    "Deep cleaning, end of tenancy, and carpet cleaning for homes and workspaces. Contact GoodyCleaning for a tailored quote.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://goodycleaning.co.uk").replace(/\/+$/, ""),
  goodyVan: {
    name: "GoodyVan",
    url: "https://goodyvan.co.uk/?utm_source=goodycleaning&utm_medium=referral&utm_campaign=moving_services",
    cleaningPage: "https://goodyvan.co.uk/services/cleaning",
  },
  booking: {
    instantEnabled: process.env.NEXT_PUBLIC_INSTANT_BOOKING_ENABLED === "true",
  },
  contact: {
    phone: "0800 001 6171",
    mobile: "07771 114041",
    mobileE164: "+447771114041",
    email: "support@goodyvan.com",
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
