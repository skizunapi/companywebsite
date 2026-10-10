# KizunAPI — self-managing API control plane (MVP site)

Interactive MVP marketing + demo site. The logic from the original single-file
`kizunapi-site.html` is now split into separate, maintainable files.

## Structure

```
kizunapi/
├── index.html            # markup only (nav → hero → platform → autopilot → compare → footer)
├── css/
│   └── styles.css        # all styles: brand tokens, layout, components
├── js/
│   ├── autopilot-data.js # the demo's content — the 7 lifecycle stages + intro state (data only)
│   └── autopilot.js      # the controller — runStep() / resetDemo() and the UI state machine
└── README.md
```

### Why the JS is split into two files
- **`autopilot-data.js`** holds *what the demo says* — edit the PaySprint scenario,
  the console lines, the blast-radius graph, the PR diff, etc. here without touching
  any logic. It attaches `STEPS` and `INTRO_HTML` to `window.KizunAPI`.
- **`autopilot.js`** holds *how the demo behaves* — advancing the stepper, staggering
  the console/test animations, enabling/disabling buttons. It reads from `window.KizunAPI`
  and must load **after** the data file (the `<script>` order in `index.html` handles this).

## Running it

Because `index.html` references the CSS/JS via relative paths, open it over HTTP
(not `file://`) so the browser loads the linked files:

```bash
cd kizunapi
python3 -m http.server 8000     # or: npx serve .
# then open http://localhost:8000
```

## Fonts
The `Chip Display` / `Chip Text` / `Chip Mono` fonts are injected by the
render environment. Outside it, the CSS falls back to the system font stack, so the
layout stays intact — only the typeface differs.

## Note on the Canvas preview
The Canvas preview sandbox is network-isolated and works most reliably with a
**single self-contained** HTML file. For that reason the original
`../kizunapi-site.html` (everything inlined) is kept as the demoable artifact. This
`kizunapi/` folder is the split, repo-ready source you'd use in an actual project.
If you want, the two can be kept in sync, or a tiny build step can inline the split
files back into one on release.
