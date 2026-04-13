# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-13
**Commit:** 1879783
**Branch:** main

## OVERVIEW

Mai2-TouchTest — Web-based hardware test tool for maimai DX arcade cabinet peripherals (touch panel, LED controller, IO4 buttons). pnpm monorepo: Vue 3 + TypeScript + Vite, defineComponent + JSX.

## STRUCTURE

```
Mai2-TouchTest/
├── apps/
│   └── webtest/          # Main test application (Web Serial / WebHID)
│       ├── src/
│       │   ├── devices/  # Hardware drivers: touchSerial, ledSerial, io4
│       │   ├── components/ # Display (SVG touch map), ButtonRing, ConnectionPanel, LedControl
│       │   └── views/    # Single view: Index
│       └── dist/         # Built output
├── packages/
│   └── ui/               # @munet/ui shared component library (git submodule → MuNET-OSS/MuNET-UI)
└── pnpm-workspace.yaml   # Workspaces: apps/*, packages/*
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Touch panel protocol | `apps/webtest/src/devices/touchSerial.ts` | 9600 baud, `(` `)`-framed chunks, 7-byte touch bitmap |
| LED strip protocol | `apps/webtest/src/devices/ledSerial.ts` | 115200 baud, SYNC/ESCAPE framing, checksum packets |
| IO4 button input | `apps/webtest/src/devices/io4.ts` | WebHID, vendor 0x0CA3, joystick usage page |
| Touch zone SVG | `apps/webtest/src/components/Display/index.tsx` | 34-zone SVG (A1–A8, B1–B8, C1–C2, D1–D8, E1–E8) |
| Button ring overlay | `apps/webtest/src/components/ButtonRing/index.tsx` | 8 arcade button arc segments |
| Device connection UI | `apps/webtest/src/components/ConnectionPanel/index.tsx` | Touch / LED / IO4 connect/disconnect |
| LED color control | `apps/webtest/src/components/LedControl/index.tsx` | Top light, frame brightness, button LED colors |
| Theme init | `apps/webtest/src/main.ts` | `initThemeDefaults({ hue: 220 })`, DynamicLight |
| UI library | `packages/ui/` | See `packages/ui/AGENTS.md` for full docs |

## CONVENTIONS

- **No SFC**: All components use `defineComponent` + JSX (`.tsx`), zero `.vue` in app code (one in ui lib)
- **CSS**: CSS Modules (`.module.sass`) + UnoCSS utility classes, mixed freely
- **State**: Vue `ref`/`shallowRef` at module scope (no Pinia/Vuex)
- **Indent**: 2 spaces, LF, UTF-8 (`.editorconfig`)
- **Package manager**: pnpm 9.7.0 (corepack)
- **No linter**: No ESLint/Prettier configured
- **No tests**: No test framework, no test files
- **No CI/CD**: No GitHub Actions, Makefile, or Docker
- **Language**: UI text in Chinese (zh)

## ANTI-PATTERNS (THIS PROJECT)

- None found in comments. Codebase is clean of `DO NOT`/`NEVER`/`DEPRECATED` markers.

## UNIQUE STYLES

- **Auto-reconnect pattern**: All 3 device drivers persist port/device info to `localStorage` and attempt reconnection on mount via `tryAutoReconnect*()` functions
- **Serial protocol**: Touch uses ASCII-framed `{HALT}`, `{RSET}`, `{STAT}` commands; LED uses binary SYNC/ESCAPE byte-stuffing with checksums
- **HID**: IO4 uses raw HID reports with active-low button logic for player buttons
- **SVG touch map**: `Display` component is an inline SVG with 34 touch zone regions, toggled via CSS class

## COMMANDS

```bash
# Development (webtest app)
pnpm --filter @mai2-touchtest/webtest dev        # Vite dev server
pnpm --filter @mai2-touchtest/webtest dev:expose  # Dev with --host (LAN access)
pnpm --filter @mai2-touchtest/webtest build       # Production build

# UI library
pnpm --filter @munet/ui dev    # Watch mode build
pnpm --filter @munet/ui build  # Build + emit declarations
```

## NOTES

- `packages/ui` is a **git submodule** (`MuNET-OSS/MuNET-UI`). Has its own AGENTS.md — refer to it for component/theme docs.
- Web Serial API requires **HTTPS or localhost** and user gesture for `requestPort()`.
- WebHID API also requires user gesture for `requestDevice()`.
- Root `README.md` is a generic Vite+Vue template placeholder, not project-specific.
- One `@ts-ignore` exists in `LedControl/index.tsx` line 99 for Range component v-model binding.
