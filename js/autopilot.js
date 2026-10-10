/* ==========================================================================
   KizunAPI Autopilot — demo controller
   Drives the step-through lifecycle UI. Reads scenario content from
   window.KizunAPI (autopilot-data.js, which must load first).
   Exposes runStep() and resetDemo() globally for the inline onclick handlers.
   ========================================================================== */
(function (global) {
  'use strict';

  const DATA = global.KizunAPI || {};
  const STEPS = DATA.STEPS || [];
  const INTRO_HTML = DATA.INTRO_HTML || '';

  const state = { step: -1, running: false };

  // DOM references (resolved on init, after DOMContentLoaded).
  let stepper, stage, nextBtn, resetBtn, statusDot, statusText, hint;

  function cacheDom() {
    stepper    = document.getElementById('stepper');
    stage      = document.getElementById('stage');
    nextBtn    = document.getElementById('nextBtn');
    resetBtn   = document.getElementById('resetBtn');
    statusDot  = document.getElementById('statusDot');
    statusText = document.getElementById('statusText');
    hint       = document.getElementById('hint');
  }

  function runStep() {
    if (state.running) return;
    const i = state.step + 1;
    if (i >= STEPS.length) return;

    state.step = i;
    state.running = true;
    const s = STEPS[i];

    // Advance the stepper: everything before i is done, i is active.
    [...stepper.children].forEach((el, idx) => {
      el.classList.remove('active', 'done');
      if (idx < i) el.classList.add('done');
      else if (idx === i) el.classList.add('active');
    });

    statusDot.classList.add('live');
    statusText.textContent = 'Running · ' + s.title.split('·')[1].trim();
    nextBtn.disabled = true;
    nextBtn.textContent = 'Working…';
    resetBtn.disabled = false;

    stage.innerHTML = `<h4>${s.title}</h4><div class="sub">${s.sub}</div>${s.html}`;

    // Stagger console line fade-ins.
    const c = stage.querySelector('.console');
    if (c) {
      [...c.querySelectorAll('.l')].forEach((l, k) => {
        l.style.animationDelay = (k * 0.45) + 's';
      });
    }

    // Stagger test rows (step 5).
    const tb = document.getElementById('testbox');
    if (tb) {
      [...tb.children].forEach((t, k) => {
        t.style.opacity = 0;
        setTimeout(() => {
          t.style.transition = 'opacity .3s';
          t.style.opacity = 1;
          t.classList.add('pass');
          t.querySelector('.ms').textContent = t.dataset.ms + 'ms';
        }, k * 350);
      });
    }

    // How long this stage "runs" before re-enabling the button.
    const dur = c
      ? Math.max(1600, c.querySelectorAll('.l').length * 480)
      : (tb ? tb.children.length * 380 + 300 : 1400);

    setTimeout(() => {
      state.running = false;
      statusDot.classList.remove('live');
      statusText.textContent = s.status;
      if (i === STEPS.length - 1) {
        nextBtn.textContent = 'Run complete';
        nextBtn.disabled = true;
        hint.textContent = 'Autonomous run finished in 11 minutes · 0 customer impact';
      } else {
        nextBtn.disabled = false;
        nextBtn.textContent = 'Run next step';
        hint.textContent = `Stage ${i + 1} of ${STEPS.length} done · continue`;
      }
    }, dur);
  }

  function resetDemo() {
    state.step = -1;
    state.running = false;
    [...stepper.children].forEach(el => el.classList.remove('active', 'done'));
    statusDot.classList.remove('live');
    statusText.textContent = 'Idle — ready to run';
    nextBtn.disabled = false;
    nextBtn.textContent = 'Run next step';
    resetBtn.disabled = true;
    hint.textContent = 'Autonomous lifecycle · 7 stages';
    stage.innerHTML = INTRO_HTML;
  }

  // Expose for the inline onclick handlers in index.html.
  global.runStep = runStep;
  global.resetDemo = resetDemo;

  // Initialise once the DOM is ready (script is loaded at end of body, but
  // guard anyway so load order is not fragile).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cacheDom);
  } else {
    cacheDom();
  }
})(window);
