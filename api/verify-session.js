// api/verify-session.js
// Verifies a Stripe session after redirect and confirms payment succeeded

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: "Missing session_id" });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid" || session.status === "complete") {
      return res.status(200).json({
        unlocked: true,
        customerId: session.customer,
        email: session.customer_details?.email,
      });
    }

    return res.status(200).json({ unlocked: false });
  } catch (err) {
    console.error("Stripe verify error:", err);
    return res.status(500).json({ error: "Could not verify session" });
  }
}
