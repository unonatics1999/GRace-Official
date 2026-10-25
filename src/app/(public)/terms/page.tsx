import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms · GRace Car Rental" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>These terms describe how GRace works. The headings below are the points counsel needs to finalise.</p>

      <h2>1. What GRace is</h2>
      <p>GRace is a marketplace connecting vehicle owners (&ldquo;hosts&rdquo;) with people and businesses who rent them (&ldquo;renters&rdquo;), with or without the owner as driver. GRace is not the owner of listed vehicles.</p>

      <h2>2. Accounts and verification</h2>
      <ul>
        <li>You must be 21 or older and provide accurate identity or business registration details.</li>
        <li>Self-drive renters must hold a valid Philippine driver&apos;s licence, or an accepted foreign licence, for the vehicle class.</li>
        <li>Drivers for hire must hold an LTO Professional licence and keep an NBI clearance on file.</li>
      </ul>

      <h2>3. Listings</h2>
      <ul>
        <li>Hosts must have the right to rent the vehicle, keep its LTO registration and CTPL insurance valid, and keep it roadworthy.</li>
        <li>Listings are reviewed before going live and may be hidden if they break these terms.</li>
      </ul>

      <h2>4. Bookings, payment and cancellation</h2>
      <ul>
        <li>A request becomes a booking when the host approves and the renter pays through GRace&apos;s payment partner.</li>
        <li>GRace charges renters a service fee and takes a commission from the host, both shown before you confirm.</li>
        <li>Cancellation and refund rules: <strong>to be defined</strong> (e.g. full refund up to 48 hours before pick-up).</li>
      </ul>

      <h2>5. During the rental</h2>
      <ul>
        <li>Both parties complete the photo checklist at pick-up and return.</li>
        <li>Fuel, tolls, parking, traffic violations and the driver&apos;s meals and lodging: <strong>responsibility to be defined</strong>.</li>
        <li>Damage, accidents and insurance claims: <strong>process to be defined with the insurer</strong>.</li>
      </ul>

      <h2>6. Disputes</h2>
      <p>Report problems in the booking. GRace may hold a host&apos;s payout while a dispute is open.</p>

      <h2>7. Liability, governing law</h2>
      <p>To be completed by counsel. Philippine law applies.</p>
    </LegalPage>
  );
}
