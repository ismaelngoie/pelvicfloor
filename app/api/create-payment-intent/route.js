import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    // 1. Create a Stripe Customer
    // (In a real app with a login, you would save this ID to your database so you don't create duplicates)
    const customer = await stripe.customers.create();

    // 2. Create the Subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        // 👇 PASTE YOUR STRIPE PRICE ID HERE (starts with price_... or plan_...)
        price: "price_1SuE0YQzE2JqQU13YdBWyFNC", 
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // 3. Send the Client Secret to the frontend
    return NextResponse.json({ 
      clientSecret: subscription.latest_invoice.payment_intent.client_secret 
    });

  } catch (error) {
    console.error("Stripe Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
