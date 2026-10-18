import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const helper = await readFile(new URL("public/marketing-consent.js", root), "utf8");
const checkout = (await readFile(new URL("lib/checkout.js", root), "utf8"))
  .replaceAll('"./pricing"', JSON.stringify(new URL("lib/pricing.js", root).href))
  .replace('import { marketingAttributionForCheckout } from "./marketingConsent";', "")
  .replace('"../public/clarity-gate.js"', JSON.stringify(new URL("public/clarity-gate.js", root).href));
let instance = 0;
async function fixture({ eligible = true, denied = false, path = "/diastasis-recti", registryFailure = false } = {}) {
  const saved = denied ? { v: 1, consentId: "eb942c3a-a51c-4a04-822a-e79384423f11", decidedAt: Date.now(), analytics: false, advertising: false, matching: false } : null;
  // Execute the real browser helper and shared checkout together with only
  // storage/network boundaries substituted. No Stripe or Meta requests occur.
  const setup = `
    const values = new Map(${JSON.stringify(saved ? [["pelvi.privacy.v1", JSON.stringify(saved)]] : [])});
    const requests = [];
    const navigator = {};
    const document = {cookie:'', location:{hostname:'pelvi.health'}};
    const window = {localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},
      location:{hostname:'pelvi.health',pathname:${JSON.stringify(path)},search:'?fbclid=IwAR_opaqueClickIdentifier1234'},dispatchEvent(){}};
    async function fetch(url, options) {
      const body = options?.body ? JSON.parse(options.body) : null;
      requests.push({url,body});
      if(url==='/api/marketing-config') return Response.json({automaticMeasurement:{eligible:${eligible},basis:'automatic'}});
      if(url==='/api/marketing-consent') return ${registryFailure ? 'Response.json({}, {status:503})' : 'Response.json({ok:true,effective:{advertising:body.advertising,matching:false},decidedAt:body.decidedAt})'};
      if(url==='/api/create-payment-intent') return Response.json({clientSecret:'pi_example_secret_example'});
      throw Error('Unexpected request');
    }
    export const harness = {requests,values,window};
  `;
  return import(`data:text/javascript;base64,${Buffer.from(setup + helper + checkout + `\n// instance ${++instance}`).toString("base64")}`);
}

test("a fresh direct landing checkout registers automatic measurement before requesting payment", async () => {
  const api = await fixture();
  const result = await api.createSubscriptionIntent({ email: "buyer@example.com", attemptKey: "same-attempt" });
  assert.equal(result.ok, true);
  assert.deepEqual(api.harness.requests.map(item => item.url), ["/api/marketing-config", "/api/marketing-consent", "/api/create-payment-intent"]);
  const marketing = api.harness.requests[2].body.marketing;
  assert.equal(marketing.basis, "automatic");
  assert.equal(marketing.advertising, true);
  assert.equal(marketing.matching, false);
  assert.match(marketing.fbc, /IwAR_opaqueClickIdentifier1234$/);
  assert.equal(api.harness.requests[2].body.attemptKey, "same-attempt");
  assert.doesNotMatch(JSON.stringify(marketing), /buyer@example|diastasis|goalId|clientSecret/);
});

test("unavailable tracking, saved opt-outs and private routes cannot block checkout or attach attribution", async () => {
  for (const options of [{ eligible: false }, { registryFailure: true }, { denied: true }, { path: "/app" }]) {
    const api = await fixture(options);
    assert.equal((await api.createSubscriptionIntent({ email: "buyer@example.com" })).ok, true);
    const payment = api.harness.requests.find(item => item.url === "/api/create-payment-intent");
    assert.equal(payment.body.marketing, undefined);
    if (options.denied || options.path) assert.equal(api.harness.requests.length, 1);
  }
});

test("an explicitly omitted attribution bypasses bootstrap and invalid email makes no network requests", async () => {
  const api = await fixture();
  assert.equal((await api.createSubscriptionIntent({ email: "invalid" })).code, "invalid_email");
  assert.deepEqual(api.harness.requests, []);
  assert.equal((await api.createSubscriptionIntent({ email: "buyer@example.com", marketing: null })).ok, true);
  assert.deepEqual(api.harness.requests.map(item => item.url), ["/api/create-payment-intent"]);
});
