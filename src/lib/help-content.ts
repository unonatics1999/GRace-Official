// The help center's articles. They're shown on /help and are the only source the AI assistant
// answers from, so keep them accurate: when a policy changes, change it here.
// Policies the owner hasn't decided yet say so explicitly instead of guessing.

export type HelpArticle = { id: string; category: string; question: string; answer: string };

export const HELP_CATEGORIES = ["Booking a car", "With a driver", "Self-drive", "Payments", "Listing your car", "Your account"] as const;

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "how-booking-works",
    category: "Booking a car",
    question: "How does booking work?",
    answer:
      "Pick a car and your dates, choose self-drive or with driver, and send a request. The owner approves it, then you pay online to confirm. At pick-up and return, one side photographs the car and records the odometer and fuel, and the other side confirms the checklist.",
  },
  {
    id: "how-long-approval",
    category: "Booking a car",
    question: "How long does the owner take to approve?",
    answer:
      "Most owners reply within a few hours. You'll see the status on the booking page under My trips. You aren't charged anything until the owner approves and you pay.",
  },
  {
    id: "payment-window",
    category: "Booking a car",
    question: "How long do I have to pay after approval?",
    answer:
      "24 hours after the owner approves, and never later than midnight before your pick-up day. If you don't pay in time, the dates are released and the booking expires.",
  },
  {
    id: "cancel",
    category: "Booking a car",
    question: "Can I cancel a booking? Will I get a refund?",
    answer:
      "You can cancel from the booking page any time before pick-up. If you hadn't paid yet, nothing is charged. If you had paid, GRace refunds it to your original payment method, usually within 5–10 business days. Detailed cancellation fees are still being finalised; contact support for a specific case.",
  },
  {
    id: "who-drives",
    category: "With a driver",
    question: "Who drives when I book with a driver?",
    answer:
      "The car's owner or their approved driver. Every driver holds an LTO Professional licence and has an NBI clearance on file, and you can see their rating and years of experience on the listing before you book.",
  },
  {
    id: "driver-no-id",
    category: "With a driver",
    question: "Do I need an ID to book with a driver?",
    answer:
      "No. Booking with a driver only needs your mobile number, so the driver can reach you. IDs are only needed for self-drive.",
  },
  {
    id: "driver-costs",
    category: "With a driver",
    question: "Who pays for fuel, tolls, parking and the driver's meals?",
    answer:
      "The price covers the car and the driver's daily rate. Fuel, tolls, parking, and the driver's meals and lodging on overnight trips are agreed with the owner for now. Put your itinerary in the booking note so the owner can tell you before approving.",
  },
  {
    id: "self-drive-requirements",
    category: "Self-drive",
    question: "What do I need for self-drive?",
    answer:
      "A verified ID and a driver's licence that's valid through your return date. Go to Account → Verify your identity, enter your ID and licence details and upload a photo of your ID. GRace checks it within one business day.",
  },
  {
    id: "which-ids",
    category: "Self-drive",
    question: "Which IDs are accepted?",
    answer: "PhilSys National ID, passport, driver's licence, UMID, SSS ID, Postal ID or PRC ID. Businesses upload their DTI, SEC or CDA registration and mayor's permit instead.",
  },
  {
    id: "damage",
    category: "Self-drive",
    question: "What if the car gets damaged?",
    answer:
      "The photo checklist at pick-up and return records the car's condition, and both sides confirm it. If something's wrong, report it on the booking page (Something wrong?) and GRace support steps in; the owner's payout is held until it's resolved. Deposit and insurance rules are still being finalised.",
  },
  {
    id: "payment-methods",
    category: "Payments",
    question: "How can I pay?",
    answer: "Online through PayMongo: GCash, Maya, credit or debit card, and QR Ph. Your booking is confirmed as soon as the payment goes through. GRace never sees your card or e-wallet details.",
  },
  {
    id: "fees",
    category: "Payments",
    question: "What fees does GRace charge?",
    answer:
      "Renters pay a service fee shown in the price breakdown before you book (currently 10%). Owners pay a commission from each booking that gets lower as their driver rating goes up.",
  },
  {
    id: "list-car",
    category: "Listing your car",
    question: "How do I list my car?",
    answer:
      "Sign up as a car owner (or choose List your car from your account). Add the car's details, at least 3 photos, your LTO OR and CR and CTPL insurance, and the days it's available. Verify your ID, then submit for review. GRace approves listings within one business day.",
  },
  {
    id: "car-rules",
    category: "Listing your car",
    question: "Which cars can be listed?",
    answer: "Cars 10 years old or newer, with current LTO registration and CTPL insurance. The listing pauses automatically if either lapses.",
  },
  {
    id: "drive-own-car",
    category: "Listing your car",
    question: "Can I drive my own car for renters?",
    answer:
      "Yes. Apply under Driver with your LTO Professional licence (2+ years' experience) and NBI clearance. Once approved, renters can book your car with you as the driver and you earn the driver fee too.",
  },
  {
    id: "payouts",
    category: "Listing your car",
    question: "When do I get paid?",
    answer:
      "After the return checklist is confirmed, your earnings (car and driver fees minus GRace's commission) go into the weekly payout to the GCash or bank account in your payout details. A payout is held while a reported issue is open.",
  },
  {
    id: "commission-tiers",
    category: "Listing your car",
    question: "How does the rating discount on commission work?",
    answer:
      "Each car category has a base commission. Drivers rated 4.0★ with 3+ rated trips get 2 points off, 4.5★ with 5+ trips get 4 points off, and 4.8★ with 10+ trips get 6 points off. Your current tier is on the Driver page.",
  },
  {
    id: "change-password",
    category: "Your account",
    question: "How do I change my email or password?",
    answer: "Open the menu at the top right and choose Email & password. You'll need your current password to save changes.",
  },
  {
    id: "renter-to-owner",
    category: "Your account",
    question: "Can one account rent and list cars?",
    answer: "Yes. Renters can choose List your car at any time; your trips stay in the same account.",
  },
];

/** Plain-text knowledge base for the assistant's system prompt. Stable order, so it caches. */
export function helpKnowledgeBase(): string {
  return HELP_ARTICLES.map((a) => `## ${a.question}\n(${a.category})\n${a.answer}`).join("\n\n");
}

/** Simple keyword search for the help page and the no-AI fallback. */
export function searchHelp(query: string, limit = 3): HelpArticle[] {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  if (words.length === 0) return [];
  return HELP_ARTICLES.map((a) => {
    const text = `${a.question} ${a.answer} ${a.category}`.toLowerCase();
    return { a, score: words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0) };
  })
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((r) => r.a);
}
