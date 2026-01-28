import Stripe from 'stripe';

export async function onRequestPost(context) {
  const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);

  try {
    const { email } = await context.request.json();
    if (!email) return new Response("Email required", { status: 400 });

    // 1. Find Customer
    const customers = await stripe.customers.list({ email: email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ isPremium: false, error: "No account found." }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const customer = customers.data[0];

    // 2. Check for Active Subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active', // Only look for active subs
      limit: 1
    });

    // Also check for 'trialing' if you offer trials
    const trialing = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'trialing',
      limit: 1
    });

    const hasActiveSub = subscriptions.data.length > 0 || trialing.data.length > 0;

    return new Response(JSON.stringify({ 
      isPremium: hasActiveSub,
      customerName: customer.name // Optional: Send back their name to personalize
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
