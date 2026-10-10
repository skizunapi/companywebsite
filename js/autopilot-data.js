/* ==========================================================================
   KizunAPI Autopilot — demo data
   The content for each lifecycle stage of the autonomous API change run.
   Pure data: edit the scenario here without touching the controller logic.
   Exposed on window.KizunAPI so autopilot.js can read it with no bundler.
   ========================================================================== */
(function (global) {
  'use strict';

  // Markup shown before a run starts and after a reset.
  const INTRO_HTML =
    '<h4>Ready when you are</h4>' +
    '<div class="sub">Press <b>Run next step</b> to begin. KizunAPI walks the whole ' +
    'change-management lifecycle for the PaySprint v3 breaking change — the real ' +
    'scenario from customer discovery.</div>' +
    '<div class="console">' +
      '<div class="l" style="animation-delay:.05s"><span class="t">[kizunapi]</span> knowledge graph loaded · 340 APIs · 1,880 endpoints · 12,400 field-level usages</div>' +
      '<div class="l" style="animation-delay:.35s"><span class="t">[kizunapi]</span> continuous contract monitor active on 22 external dependencies</div>' +
      '<div class="l ok" style="animation-delay:.7s"><span class="t">[kizunapi]</span> awaiting run command…</div>' +
    '</div>';

  // The 7 lifecycle stages. Each: { title, sub, html, status }.
  const STEPS = [
    {
      title: '1 · Detect the change',
      sub: 'The continuous contract monitor caught the PaySprint v3 diff the moment it went live — no incident, no Slack message needed.',
      html: `<div class="console"><div class="l"><span class="t">09:14:02</span> contract monitor · polling paysprint.io/openapi.json</div><div class="l warn"><span class="t">09:14:03</span> DRIFT DETECTED · spec hash changed 8fa2 → c19d</div><div class="l err"><span class="t">09:14:03</span> BREAKING · field removed: payments[].customer_ref</div><div class="l err"><span class="t">09:14:03</span> BREAKING · response code 200 → 402 on partial capture</div><div class="l ok"><span class="t">09:14:04</span> change event created · triggering Autopilot run</div></div>`,
      status: 'Change detected'
    },
    {
      title: '2 · Analyze what changed',
      sub: 'KizunAPI classifies the diff semantically — not just "the spec changed", but exactly which fields, which callers, and whether it is truly breaking.',
      html: `<div class="dcards"><div class="dcard"><h3 style="color:var(--r500)">2 breaking changes</h3><p><code>customer_ref</code> removed · partial-capture now returns 402.</p></div><div class="dcard"><h3 style="color:var(--o500)">1 additive change</h3><p>New nested <code>payer{}</code> object maps to the removed field.</p></div><div class="dcard"><h3 style="color:var(--g700)">Confidence 0.97</h3><p>Cross-checked against 30 days of real traffic samples.</p></div></div><div class="console" style="margin-top:18px"><div class="l"><span class="t">[analyze]</span> semantic diff · customer_ref → payer.id (rename+nest)</div><div class="l"><span class="t">[analyze]</span> migration strategy: field-remap + error-handling patch</div><div class="l ok"><span class="t">[analyze]</span> classified BREAKING · safe to auto-generate migration</div></div>`,
      status: 'Analysis complete'
    },
    {
      title: '3 · Map the blast radius',
      sub: 'The knowledge graph walks from the changed field to every consumer that actually touches it in production — not everyone who could, only those who do.',
      html: `<div class="graph"><div class="gnode hit"><span class="k">FIELD</span>payments[].customer_ref</div><div class="gedge hit"></div><div class="gnode hit"><span class="k">ENDPOINT</span>POST /v2/payments · PaySprint</div><div class="gedge hit"></div><div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center"><div class="gnode hit" style="min-width:150px"><span class="k">SERVICE</span>checkout-svc</div><div class="gnode hit" style="min-width:150px"><span class="k">SERVICE</span>consult-billing</div><div class="gnode hit" style="min-width:150px"><span class="k">SERVICE</span>pharmacy-orders</div><div class="gnode safe" style="min-width:150px"><span class="k">SERVICE</span>reporting-svc <span style="font-size:10px">(safe)</span></div></div></div><div class="console" style="margin-top:18px"><div class="l err"><span class="t">[graph]</span> 6 services · 11 call-sites use the removed field in production</div><div class="l warn"><span class="t">[graph]</span> 4 customer journeys affected · checkout, consult, pharmacy, refunds</div><div class="l ok"><span class="t">[graph]</span> 3 services touch the endpoint but NOT the field — excluded</div></div>`,
      status: 'Blast radius mapped'
    },
    {
      title: '4 · Generate the migration',
      sub: 'KizunAPI writes the code change for every affected call-site and opens PRs against each service — with the remap and the new 402 handling.',
      html: `<div class="pr"><div class="pr-head"><span class="badge">PR · auto</span> checkout-svc · migrate to PaySprint v3 · +18 −6 across 3 files</div><pre><span class="ctx">  const res = await paysprint.createPayment({</span>
<span class="del">-   customer_ref: order.customerId,</span>
<span class="ins">+   payer: { id: order.customerId, kyc_status: order.kyc ?? 'unverified' },</span>
<span class="ctx">    amount: order.total, currency: 'INR'</span>
<span class="ctx">  });</span>
<span class="ctx"> </span>
<span class="del">-  // assumed 200 on partial capture</span>
<span class="ins">+  if (res.status === 402) return handlePartialCapture(res); // v3 breaking change</span></pre></div><div class="console" style="margin-top:18px"><div class="l"><span class="t">[generate]</span> 6 PRs drafted · checkout-svc, consult-billing, pharmacy-orders +3</div><div class="l"><span class="t">[generate]</span> migration guide + changelog authored automatically</div><div class="l ok"><span class="t">[generate]</span> all PRs assigned to code owners for optional review</div></div>`,
      status: 'Migrations generated'
    },
    {
      title: '5 · Test the fix',
      sub: 'Every PR runs against contract tests built from real recorded traffic. Nothing merges until the new contract holds.',
      html: `<div class="tests" id="testbox"><div class="test" data-ms="212"><div class="tick">✓</div><div class="name">Contract test · v3 payer object accepted</div><div class="ms"></div></div><div class="test" data-ms="188"><div class="tick">✓</div><div class="name">Regression · checkout happy path (replayed traffic)</div><div class="ms"></div></div><div class="test" data-ms="240"><div class="tick">✓</div><div class="name">Edge · 402 partial-capture now handled</div><div class="ms"></div></div><div class="test" data-ms="156"><div class="tick">✓</div><div class="name">Regression · consult-billing invoice generation</div><div class="ms"></div></div><div class="test" data-ms="203"><div class="tick">✓</div><div class="name">Security · no PII leaked in payer.kyc_status</div><div class="ms"></div></div></div>`,
      status: 'All tests green'
    },
    {
      title: '6 · Deploy safely',
      sub: 'Merged PRs roll out through the customer\'s own CI/CD and gateway — canary first, with automatic rollback armed.',
      html: `<div class="console"><div class="l"><span class="t">[deploy]</span> merging 6 PRs · gated on green checks ✓</div><div class="l"><span class="t">[deploy]</span> canary · 5% traffic → checkout-svc v3</div><div class="l ok"><span class="t">[deploy]</span> canary healthy · error rate 0.00% · latency −4ms</div><div class="l"><span class="t">[deploy]</span> promoting to 100% across 6 services</div><div class="l ok"><span class="t">[deploy]</span> rollout complete · auto-rollback disarmed</div></div>`,
      status: 'Deployed via canary'
    },
    {
      title: '7 · Verify in production & retire the old contract',
      sub: 'KizunAPI confirms the fix against live traffic, updates the knowledge graph, and schedules the v2 dependency for retirement.',
      html: `<div class="verify-grid"><div class="vstat"><div class="num g">0</div><div class="lbl">failed transactions post-deploy</div></div><div class="vstat"><div class="num g">100%</div><div class="lbl">payments on v3 contract</div></div><div class="vstat"><div class="num g">11m</div><div class="lbl">detection → verified</div></div></div><div class="done-banner"><span style="font-size:22px">✓</span> Change handled autonomously. Knowledge graph updated · v2 dependency flagged for retirement · zero customer impact.</div>`,
      status: 'Verified · run complete'
    }
  ];

  global.KizunAPI = global.KizunAPI || {};
  global.KizunAPI.INTRO_HTML = INTRO_HTML;
  global.KizunAPI.STEPS = STEPS;
})(window);
