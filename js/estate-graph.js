/* ==========================================================================
   KizunAPI — API Estate Graph (interactive)
   Renders the dependency chain API -> Endpoint -> Schema -> Field -> Consumer
   -> Repository -> Service -> Deployment -> Customer -> Business capability.

   Features
   - Scroll-in "the graph builds itself": layers trace in sequentially the
     first time the section enters the viewport (and on demand via Rebuild).
   - Path toggle: switch the lit dependency story between two demos
     (PaySprint Payments and Identity API). Each node declares which path(s)
     it belongs to; the active path lights its nodes and dims the rest.
   - Hover any node to spotlight it; click to pin its detail in the panel.

   No network, no deps. Operates only inside #graph.
   ========================================================================== */
(function (global) {
  'use strict';

  // Two demo stories. Each node lists the paths it belongs to.
  const PATHS = {
    payments: { label: 'PaySprint Payments', focus: 'fl_cref' },
    identity: { label: 'Identity API',       focus: 'fl_kyc'  }
  };

  // Layers top -> bottom. Each node: { id, label, paths:[...] }.
  const LAYERS = [
    { kind:'API', nodes:[
      { id:'api_pay', label:'PaySprint Payments', paths:['payments'] },
      { id:'api_idn', label:'Identity API',       paths:['identity'] }
    ]},
    { kind:'Endpoint', nodes:[
      { id:'ep_pay',  label:'POST /v2/payments', paths:['payments'] },
      { id:'ep_ref',  label:'POST /refunds',     paths:[] },
      { id:'ep_tok',  label:'POST /oauth/token', paths:['identity'] }
    ]},
    { kind:'Schema', nodes:[
      { id:'sc_pay', label:'PaymentRequest', paths:['payments'] },
      { id:'sc_tok', label:'TokenClaims',    paths:['identity'] }
    ]},
    { kind:'Field', nodes:[
      { id:'fl_cref', label:'customer_ref', paths:['payments'] },
      { id:'fl_amt',  label:'amount',       paths:[] },
      { id:'fl_kyc',  label:'kyc_status',   paths:['identity'] }
    ]},
    { kind:'Consumer', nodes:[
      { id:'cn_ck',  label:'checkout client', paths:['payments'] },
      { id:'cn_co',  label:'consult client',  paths:['payments'] },
      { id:'cn_ph',  label:'pharmacy client', paths:['payments'] },
      { id:'cn_lg',  label:'login client',    paths:['identity'] },
      { id:'cn_ss',  label:'session client',  paths:['identity'] }
    ]},
    { kind:'Repository', nodes:[
      { id:'rp_ck', label:'web-checkout',  paths:['payments'] },
      { id:'rp_co', label:'consult-svc',   paths:['payments'] },
      { id:'rp_ph', label:'pharmacy-svc',  paths:['payments'] },
      { id:'rp_au', label:'auth-gateway',  paths:['identity'] }
    ]},
    { kind:'Service', nodes:[
      { id:'sv_ck', label:'checkout-svc',    paths:['payments'] },
      { id:'sv_cb', label:'consult-billing', paths:['payments'] },
      { id:'sv_po', label:'pharmacy-orders', paths:['payments'] },
      { id:'sv_au', label:'auth-svc',        paths:['identity'] }
    ]},
    { kind:'Deployment', nodes:[
      { id:'dp_prod', label:'prod-ap-south-1', paths:['payments','identity'] }
    ]},
    { kind:'Customer', nodes:[
      { id:'cu_pay', label:'4 payment journeys', paths:['payments'] },
      { id:'cu_idn', label:'every signed-in user', paths:['identity'] }
    ]},
    { kind:'Capability', nodes:[
      { id:'bc_pay', label:'Checkout & payments', paths:['payments'] },
      { id:'bc_idn', label:'Authentication & KYC', paths:['identity'] }
    ]}
  ];

  const DETAIL = {
    // payments story
    api_pay: { k:'API', title:'PaySprint Payments', sub:'Third-party payments provider. Business-critical external dependency, continuously monitored for contract drift.',
      stats:[['Type','External · third-party'],['Endpoints tracked','14'],['Monitoring','live contract diff'],['Criticality','business-critical','warn']] },
    ep_pay: { k:'Endpoint', title:'POST /v2/payments', sub:'The call both checkout and consult-billing depend on. Target of the PaySprint v3 breaking change.',
      stats:[['Calls / day','412,000'],['p95 latency','240 ms'],['Breaking change','v2 → v3 detected','warn']] },
    ep_ref: { k:'Endpoint', title:'POST /refunds', sub:'Refund flow — unaffected by the v3 change.',
      stats:[['Calls / day','9,400'],['Status','stable','good']] },
    sc_pay: { k:'Schema', title:'PaymentRequest', sub:'Request contract for the payments endpoint. Where the removed field lived.',
      stats:[['Fields','11'],['Changed fields','1 removed, 1 added','warn'],['Versioned','yes']] },
    fl_cref:{ k:'Field', title:'customer_ref', sub:'The removed field. This is where the estate graph earns its keep — we know exactly who reads it in production, not just who could.',
      stats:[['Status','REMOVED in v3','warn'],['Consumers using it','3 of 6','warn'],['Prod reads / day','118,000'],['Blast radius','6 services · 11 call-sites','warn']] },
    fl_amt: { k:'Field', title:'amount', sub:'Unchanged across versions.', stats:[['Status','stable','good'],['Consumers','6']] },
    cn_ck:  { k:'Consumer', title:'checkout client', sub:'Reads customer_ref on every transaction. Highest-volume affected consumer.',
      stats:[['Reads / day','74,000'],['Owner','team-checkout'],['Risk','high','warn']] },
    cn_co:  { k:'Consumer', title:'consult client', sub:'Uses the field in the doctor-consultation billing path.',
      stats:[['Reads / day','29,000'],['Owner','team-health'],['Risk','high','warn']] },
    cn_ph:  { k:'Consumer', title:'pharmacy client', sub:'Uses the field in pharmacy checkout.',
      stats:[['Reads / day','15,000'],['Owner','team-pharmacy'],['Risk','high','warn']] },
    rp_ck:  { k:'Repository', title:'web-checkout', sub:'Repo holding the checkout call-sites. KizunAPI opens the migration PR here.',
      stats:[['Call-sites','5'],['Default branch','main'],['PR','auto-drafted','accent']] },
    rp_co:  { k:'Repository', title:'consult-svc', sub:'Consultation billing repository.', stats:[['Call-sites','3'],['PR','auto-drafted','accent']] },
    rp_ph:  { k:'Repository', title:'pharmacy-svc', sub:'Pharmacy orders repository.', stats:[['Call-sites','3'],['PR','auto-drafted','accent']] },
    sv_ck:  { k:'Service', title:'checkout-svc', sub:'Runtime service behind checkout. In the blast radius.',
      stats:[['Owner','team-checkout'],['SLO','99.95%'],['Impacted','yes','warn']] },
    sv_cb:  { k:'Service', title:'consult-billing', sub:'Runtime billing service for consultations.', stats:[['Owner','team-health'],['Impacted','yes','warn']] },
    sv_po:  { k:'Service', title:'pharmacy-orders', sub:'Runtime service for pharmacy orders.', stats:[['Owner','team-pharmacy'],['Impacted','yes','warn']] },
    cu_pay: { k:'Customer', title:'4 payment journeys', sub:'Real journeys that break if this change ships unhandled: checkout, consult, pharmacy, refunds reconciliation.',
      stats:[['Journeys affected','4'],['Txns / hr at risk','~1,240','warn'],['Revenue exposure','$180K','warn']] },
    bc_pay: { k:'Capability', title:'Checkout & payments', sub:'The business capability this whole chain powers — why a buried field change becomes a board-level outage.',
      stats:[['Capability','Revenue-generating','warn'],['Owner','VP Payments'],['Depends on','PaySprint v2 contract','warn']] },

    // identity story
    api_idn:{ k:'API', title:'Identity API', sub:'Internal auth and KYC service consumed across the estate. A change here ripples into every signed-in experience.',
      stats:[['Type','Internal · platform'],['Endpoints','9'],['Owner','platform-identity'],['Criticality','business-critical','warn']] },
    ep_tok: { k:'Endpoint', title:'POST /oauth/token', sub:'Issues tokens for every session. The claims schema is widely consumed.',
      stats:[['Calls / day','2,100,000'],['p95 latency','90 ms'],['Consumers','11']] },
    sc_tok: { k:'Schema', title:'TokenClaims', sub:'Claims returned on every token. kyc_status was recently promoted into it.',
      stats:[['Fields','8'],['Recent change','kyc_status added','accent'],['Versioned','yes']] },
    fl_kyc: { k:'Field', title:'kyc_status', sub:'A sensitive claim. The estate graph tracks exactly which consumers read it — critical for the PII-governance story.',
      stats:[['Classification','sensitive / PII','warn'],['Consumers reading it','2'],['Prod reads / day','960,000'],['Policy','redaction enforced','good']] },
    cn_lg:  { k:'Consumer', title:'login client', sub:'Reads kyc_status to gate regulated features at sign-in.',
      stats:[['Reads / day','620,000'],['Owner','team-identity'],['Risk','medium','accent']] },
    cn_ss:  { k:'Consumer', title:'session client', sub:'Caches claims for the duration of a session.',
      stats:[['Reads / day','340,000'],['Owner','team-identity'],['Risk','medium','accent']] },
    rp_au:  { k:'Repository', title:'auth-gateway', sub:'Repository for the auth gateway and claim handling.',
      stats:[['Call-sites','7'],['Default branch','main'],['Owner','platform-identity']] },
    sv_au:  { k:'Service', title:'auth-svc', sub:'Runtime auth service issuing and validating tokens.',
      stats:[['Owner','platform-identity'],['SLO','99.99%'],['Impacted','on claim change','accent']] },
    cu_idn: { k:'Customer', title:'every signed-in user', sub:'A claims change touches every authenticated session — the widest possible blast radius.',
      stats:[['Sessions / day','2.1M'],['Journeys affected','all signed-in','warn'],['Blast radius','platform-wide','warn']] },
    bc_idn: { k:'Capability', title:'Authentication & KYC', sub:'The capability underpinning every regulated feature and login in the product.',
      stats:[['Capability','Platform-critical','warn'],['Owner','VP Platform'],['Depends on','TokenClaims contract','warn']] },

    // shared
    dp_prod:{ k:'Deployment', title:'prod-ap-south-1', sub:'Shared production target for both stories. Canary rollout happens here during an Autopilot run.',
      stats:[['Region','ap-south-1'],['Strategy','canary → 100%'],['Auto-rollback','armed','good']] }
  };

  const TRAILS = {
    payments: '<b>PaySprint Payments</b> → POST /v2/payments → PaymentRequest → <b>customer_ref</b> → 3 consumers → 3 repos → <b>6 services</b> → prod-ap-south-1 → 4 journeys → <b>Checkout & payments</b>',
    identity: '<b>Identity API</b> → POST /oauth/token → TokenClaims → <b>kyc_status</b> → 2 consumers → auth-gateway → <b>auth-svc</b> → prod-ap-south-1 → every signed-in user → <b>Authentication & KYC</b>'
  };

  let activePath = 'payments';
  let built = false;

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function board() { return document.getElementById('egChain'); }

  function render() {
    const b = board();
    if (!b) return;
    b.innerHTML = '';
    const nodeEls = {};

    LAYERS.forEach((layer, li) => {
      const wrap = el('div', 'eg-layer');
      wrap.dataset.layer = li;
      const row = el('div', 'eg-nodes');
      layer.nodes.forEach(nd => {
        const node = el('div', 'eg-node');
        node.dataset.id = nd.id;
        node.dataset.paths = nd.paths.join(',');
        node.appendChild(el('span', 'kind', layer.kind));
        node.appendChild(el('span', 'label', nd.label));
        node.addEventListener('mouseenter', () => spotlight(nd.id));
        node.addEventListener('mouseleave', () => applyPath(activePath));
        node.addEventListener('click', () => { pin(nd.id); showDetail(nd.id); });
        nodeEls[nd.id] = node;
        row.appendChild(node);
      });
      wrap.appendChild(row);
      b.appendChild(wrap);
      if (li < LAYERS.length - 1) {
        const edge = el('div', 'eg-edge');
        edge.dataset.after = li;
        b.appendChild(edge);
      }
    });
    b._nodes = nodeEls;

    applyPath(activePath);
    showDetail(PATHS[activePath].focus);
  }

  // Light the active path's nodes/edges, dim the rest.
  function applyPath(pathKey) {
    const b = board();
    if (!b || !b._nodes) return;
    activePath = pathKey;
    Object.values(b._nodes).forEach(n => {
      const inPath = n.dataset.paths.split(',').indexOf(pathKey) !== -1;
      n.classList.toggle('lit', inPath);
      n.classList.toggle('dim', !inPath);
      n.classList.remove('selected');
    });
    const focus = PATHS[pathKey].focus;
    if (b._nodes[focus]) b._nodes[focus].classList.add('selected');
    b.querySelectorAll('.eg-edge').forEach(e => e.classList.add('lit'));
  }

  // Hover: emphasise one node (keep active path visible underneath).
  function spotlight(id) {
    const b = board();
    if (!b || !b._nodes) return;
    const n = b._nodes[id];
    if (!n) return;
    // If the hovered node is on the active path, nothing to change; else
    // briefly lift it so hovering off-path nodes still reveals their detail.
    if (n.dataset.paths.split(',').indexOf(activePath) === -1) {
      n.classList.remove('dim');
      n.classList.add('lit');
    }
  }

  function pin(id) {
    const b = board();
    if (!b || !b._nodes) return;
    Object.values(b._nodes).forEach(n => n.classList.remove('selected'));
    if (b._nodes[id]) b._nodes[id].classList.add('selected');
  }

  function showDetail(id) {
    const d = DETAIL[id];
    const panel = document.getElementById('egPanel');
    if (!d || !panel) return;
    const stats = d.stats.map(s => {
      const cls = s[2] ? ' ' + s[2] : '';
      return `<div class="eg-stat"><span class="sl">${s[0]}</span><span class="sv${cls}">${s[1]}</span></div>`;
    }).join('');
    panel.innerHTML =
      `<div class="pk">${d.k}</div>` +
      `<h3>${d.title}</h3>` +
      `<div class="psub">${d.sub}</div>` +
      `<div class="eg-stats">${stats}</div>` +
      `<div class="eg-path"><div class="ptitle">Lit dependency path · ${PATHS[activePath].label}</div>` +
      `<div class="ptrail">${TRAILS[activePath]}</div></div>`;
  }

  // Sequential "builds itself" reveal, layer by layer.
  function build() {
    const b = board();
    if (!b) return;
    const layers = [...b.querySelectorAll('.eg-layer')];
    const edges = [...b.querySelectorAll('.eg-edge')];
    // reset
    layers.forEach(l => l.classList.remove('shown'));
    edges.forEach(e => e.classList.remove('shown'));
    // reveal cadence
    layers.forEach((layer, i) => {
      setTimeout(() => {
        layer.classList.add('shown');
        if (edges[i]) edges[i].classList.add('shown');
      }, 160 + i * 170);
    });
  }

  function wireControls() {
    const toggle = document.getElementById('egToggle');
    if (toggle) {
      toggle.addEventListener('click', e => {
        const btn = e.target.closest('[data-path]');
        if (!btn) return;
        toggle.querySelectorAll('[data-path]').forEach(x => x.classList.remove('on'));
        btn.classList.add('on');
        applyPath(btn.dataset.path);
        showDetail(PATHS[btn.dataset.path].focus);
      });
    }
    const rebuild = document.getElementById('egRebuild');
    if (rebuild) rebuild.addEventListener('click', build);
  }

  function init() {
    render();
    wireControls();
    const section = document.getElementById('graph');
    if (!section) return;
    if ('IntersectionObserver' in global) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting && !built) {
            built = true;
            build();
            io.disconnect();
          }
        });
      }, { threshold: 0.25 });
      io.observe(section);
    } else {
      // no observer: just show everything
      board().querySelectorAll('.eg-layer,.eg-edge').forEach(x => x.classList.add('shown'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
