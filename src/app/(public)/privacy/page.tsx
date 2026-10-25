import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy · GRace Car Rental" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        GRace processes personal information under the Data Privacy Act of 2012 (Republic Act No. 10173). This draft lists
        what the app actually collects today; counsel and the Data Protection Officer finalise it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email, phone, address, city.</li>
        <li>Identity and licence details, and uploaded documents: government ID, selfie with ID, driver&apos;s licence, NBI clearance, business registration, OR/CR, insurance.</li>
        <li>Booking records, handoff photos, odometer and fuel readings, ratings and messages to support.</li>
        <li>Payment status from PayMongo. Card and e-wallet details stay with PayMongo; GRace never sees them.</li>
        <li>Login records (time and IP address) to prevent account takeover.</li>
      </ul>

      <h2>Why</h2>
      <ul>
        <li>To verify identities and vehicles before anyone books or lists.</li>
        <li>To run bookings, payments and payouts, and to resolve disputes.</li>
        <li>To meet legal, tax and law-enforcement obligations.</li>
      </ul>

      <h2>Who sees it</h2>
      <ul>
        <li>Verification documents: you and GRace reviewers only.</li>
        <li>The other party to a booking sees your name, and your phone number once the booking is paid.</li>
        <li>Service providers: PayMongo (payments) and our hosting provider.</li>
      </ul>

      <h2>Retention and your rights</h2>
      <p>
        Retention periods, the Data Protection Officer&apos;s contact details and how to exercise your rights (access, correction, erasure,
        objection, data portability) are <strong>to be completed</strong> before launch.
      </p>
    </LegalPage>
  );
}
