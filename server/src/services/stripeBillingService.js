/**
 * Stripe billing — checkout, invoicing, webhooks, CRM/church billing_status sync.
 */
const Stripe = require('stripe');
const { getAppPool } = require('../config/db');
const onboarding = require('./onboardingService');

let _stripe = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

function isConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

function publicConfig() {
  return {
    enabled: isConfigured(),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    defaultPriceConfigured: !!process.env.STRIPE_DEFAULT_PRICE_ID,
  };
}

function omBaseUrl() {
  return (process.env.OM_PUBLIC_URL || 'https://orthodoxmetrics.com').replace(/\/$/, '');
}

function webhookSystemReq() {
  return { session: { user: { id: null, role: 'system' } } };
}

function resolvePriceId(override) {
  const priceId = override || process.env.STRIPE_DEFAULT_PRICE_ID;
  if (!priceId) throw new Error('No Stripe price configured (STRIPE_DEFAULT_PRICE_ID)');
  return priceId;
}

function extractOnboardingRequestId(obj) {
  if (!obj) return null;
  const meta = obj.metadata || {};
  if (meta.onboarding_request_id && String(meta.onboarding_request_id).startsWith('ONB_')) {
    return meta.onboarding_request_id;
  }
  return null;
}

async function getRequestOrThrow(onboardingRequestId) {
  const row = await onboarding.getByPublicId(onboardingRequestId);
  if (!row) throw new Error('Onboarding request not found');
  return row;
}

async function ensureStripeCustomer(request) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');

  if (request.stripe_customer_id) {
    return request.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: request.submitted_by_email,
    name: request.submitted_by_name,
    metadata: {
      onboarding_request_id: request.onboarding_request_id,
      parish_name: request.parish_name,
      crm_record_id: request.crm_record_id ? String(request.crm_record_id) : '',
      church_id: request.church_id ? String(request.church_id) : '',
    },
  });

  const pool = getAppPool();
  await pool.query(
    'UPDATE onboarding_requests SET stripe_customer_id = ?, updated_at = NOW() WHERE onboarding_request_id = ?',
    [customer.id, request.onboarding_request_id]
  );

  return customer.id;
}

async function syncCommercialStatuses(pool, request, billingStatus) {
  if (request.crm_record_id) {
    await pool.query(
      'UPDATE omai_crm_leads SET billing_status = ? WHERE id = ?',
      [billingStatus, request.crm_record_id]
    );
  }
  if (request.church_id) {
    const sets = ['billing_status = ?'];
    const params = [billingStatus];
    if (billingStatus === 'paid' || billingStatus === 'waived') {
      sets.push('paid_at = COALESCE(paid_at, NOW())');
      if (billingStatus === 'paid') {
        sets.push("client_status = CASE WHEN client_status IN ('directory','pre_onboarded','enrolling') THEN 'active_paid' ELSE client_status END");
      }
    }
    params.push(request.church_id);
    await pool.query(`UPDATE churches SET ${sets.join(', ')} WHERE id = ?`, params);
  }
}

async function markPaymentFromStripe(onboardingRequestId, paymentStatus, notes, metadata = {}) {
  const pool = getAppPool();
  const request = await onboarding.updatePayment(
    onboardingRequestId,
    paymentStatus,
    webhookSystemReq(),
    notes,
    { adminOverride: true }
  );

  const billingMap = {
    paid: 'paid',
    waived: 'waived',
    invoice_sent: 'invoice_sent',
    pending: 'payment_pending',
    failed: 'past_due',
    refunded: 'cancelled',
  };
  await syncCommercialStatuses(pool, request, billingMap[paymentStatus] || 'payment_pending');

  await onboarding.recordEvent(pool, onboardingRequestId, 'stripe_payment_synced', {
    notes,
    metadata,
  });

  return request;
}

async function createCheckoutSession(onboardingRequestId, options = {}) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');

  const request = await getRequestOrThrow(onboardingRequestId);
  if (['rejected', 'cancelled'].includes(request.status)) {
    throw new Error('Cannot bill a rejected or cancelled enrollment');
  }

  const customerId = await ensureStripeCustomer(request);
  const priceId = resolvePriceId(options.priceId);
  const base = omBaseUrl();
  const onb = encodeURIComponent(request.onboarding_request_id);

  const sessionParams = {
    customer: customerId,
    mode: options.mode || 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: options.successUrl || `${base}/enroll?payment=success&onb=${onb}`,
    cancel_url: options.cancelUrl || `${base}/enroll?payment=cancelled&onb=${onb}`,
    metadata: {
      onboarding_request_id: request.onboarding_request_id,
      crm_record_id: request.crm_record_id ? String(request.crm_record_id) : '',
      church_id: request.church_id ? String(request.church_id) : '',
    },
  };
  if (sessionParams.mode === 'payment') {
    sessionParams.payment_intent_data = {
      metadata: { onboarding_request_id: request.onboarding_request_id },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  const pool = getAppPool();
  await pool.query(
    'UPDATE onboarding_requests SET stripe_checkout_session_id = ?, updated_at = NOW() WHERE onboarding_request_id = ?',
    [session.id, request.onboarding_request_id]
  );

  if (request.status === 'reviewing' || request.status === 'submitted') {
    await onboarding.updateStatus(
      request.onboarding_request_id,
      'payment_pending',
      webhookSystemReq(),
      'Stripe checkout session created',
      { adminOverride: true }
    );
  }

  await onboarding.recordEvent(pool, request.onboarding_request_id, 'stripe_checkout_created', {
    metadata: { sessionId: session.id, url: session.url },
  });

  return { url: session.url, sessionId: session.id, customerId };
}

async function createAndSendInvoice(onboardingRequestId, options = {}) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');

  const request = await getRequestOrThrow(onboardingRequestId);
  const customerId = await ensureStripeCustomer(request);
  const priceId = resolvePriceId(options.priceId);
  const daysUntilDue = options.daysUntilDue ?? 30;

  await stripe.invoiceItems.create({
    customer: customerId,
    price: priceId,
    metadata: { onboarding_request_id: request.onboarding_request_id },
  });

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: 'send_invoice',
    days_until_due: daysUntilDue,
    metadata: {
      onboarding_request_id: request.onboarding_request_id,
      crm_record_id: request.crm_record_id ? String(request.crm_record_id) : '',
    },
  });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  const sent = await stripe.invoices.sendInvoice(finalized.id);

  await markPaymentFromStripe(
    request.onboarding_request_id,
    'invoice_sent',
    `Stripe invoice ${sent.id} sent`,
    { stripeInvoiceId: sent.id }
  );

  if (request.status === 'reviewing' || request.status === 'submitted') {
    await onboarding.updateStatus(
      request.onboarding_request_id,
      'payment_pending',
      webhookSystemReq(),
      'Stripe invoice sent',
      { adminOverride: true }
    );
  }

  const pool = getAppPool();
  await onboarding.recordEvent(pool, request.onboarding_request_id, 'stripe_invoice_sent', {
    metadata: { invoiceId: sent.id, hostedInvoiceUrl: sent.hosted_invoice_url },
  });

  return {
    invoiceId: sent.id,
    hostedInvoiceUrl: sent.hosted_invoice_url,
    customerId,
  };
}

async function createPortalSession(onboardingRequestId) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');

  const request = await getRequestOrThrow(onboardingRequestId);
  const customerId = await ensureStripeCustomer(request);
  const base = omBaseUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${base}/contact`,
  });

  return { url: session.url };
}

async function handleStripeEvent(event) {
  const pool = getAppPool();
  const obj = event.data?.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const onbId = extractOnboardingRequestId(obj);
      if (!onbId) break;
      if (obj.payment_status === 'paid' || obj.status === 'complete') {
        await markPaymentFromStripe(onbId, 'paid', `Stripe Checkout ${obj.id} completed`, {
          stripeSessionId: obj.id,
          eventType: event.type,
        });
      }
      break;
    }
    case 'invoice.paid': {
      const onbId = extractOnboardingRequestId(obj);
      if (!onbId) break;
      await markPaymentFromStripe(onbId, 'paid', `Stripe invoice ${obj.id} paid`, {
        stripeInvoiceId: obj.id,
        eventType: event.type,
      });
      break;
    }
    case 'invoice.sent':
    case 'invoice.finalized': {
      const onbId = extractOnboardingRequestId(obj);
      if (!onbId) break;
      if (obj.status === 'open' && event.type === 'invoice.finalized') {
        await markPaymentFromStripe(onbId, 'invoice_sent', `Stripe invoice ${obj.id} finalized`, {
          stripeInvoiceId: obj.id,
          eventType: event.type,
        });
      }
      break;
    }
    case 'invoice.payment_failed': {
      const onbId = extractOnboardingRequestId(obj);
      if (!onbId) break;
      await markPaymentFromStripe(onbId, 'failed', `Stripe invoice ${obj.id} payment failed`, {
        stripeInvoiceId: obj.id,
        eventType: event.type,
      });
      break;
    }
    default:
      break;
  }

  return pool;
}

async function webhookHandler(req, res) {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Stripe webhooks not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe] webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const pool = getAppPool();
  const [existing] = await pool.query('SELECT id FROM stripe_webhook_events WHERE id = ?', [event.id]);
  if (existing.length) {
    return res.json({ received: true, duplicate: true });
  }

  const onbId = extractOnboardingRequestId(event.data?.object);

  try {
    await handleStripeEvent(event);
    await pool.query(
      `INSERT INTO stripe_webhook_events (id, event_type, onboarding_request_id, payload_json)
       VALUES (?, ?, ?, ?)`,
      [event.id, event.type, onbId, JSON.stringify({ type: event.type, livemode: event.livemode })]
    );
  } catch (err) {
    console.error('[stripe] webhook handler error:', err);
    return res.status(500).json({ error: err.message });
  }

  res.json({ received: true });
}

module.exports = {
  getStripe,
  isConfigured,
  publicConfig,
  ensureStripeCustomer,
  createCheckoutSession,
  createAndSendInvoice,
  createPortalSession,
  markPaymentFromStripe,
  webhookHandler,
};
