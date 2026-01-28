import Stripe from 'stripe';

export async function onRequestPost(context) {
  const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);

  try {
    const { email, returnUrl } = await context.request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Find Customer by Email
    const customers = await stripe.customers.list({ 
      email: email, 
      limit: 1 
    });
    
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ error: "No active subscription found for this email." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const customerId = customers.data[0].id;

    // 2. Create Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || 'https://pelvic.health/dashboard',
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Stripe Portal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
