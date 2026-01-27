import Stripe from 'stripe';

export async function onRequestPost(context) {
  // Use the secret key from Cloudflare environment variables
  const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);

  try {
    // 1. Create a Customer
    const customer = await stripe.customers.create();

    // 2. Create the Subscription (Using your specific Price ID)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: "price_1SuE0YQzE2JqQU13YdBWyFNC", // Your Price ID
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // 3. Return the Client Secret
    return new Response(JSON.stringify({ 
      clientSecret: subscription.latest_invoice.payment_intent.client_secret 
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
