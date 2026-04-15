# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-15
**Commit:** 0ea0e79
**Branch:** main

## OVERVIEW

Mai2-TouchTest — Web-based hardware test tool for maimai DX arcade cabinet peripherals (touch panel, LED controller, buttons). Supports 3 device modes: IO4, ADX/NDX, Maimoller. pnpm monorepo: Vue 3 + TypeScript + Vite, defineComponent + JSX.

## STRUCTURE

```
Mai2-TouchTest/
├── apps/
│   └── webtest/              # Main test application (Web Serial / WebHID)
│       ├── src/
│       │   ├── devices/      # Hardware drivers + provider abstraction
│       │   │   └── providers/ # TestDeviceProvider implementations per mode
│       │   ├── components/   # Display, ButtonRing, ConnectionPanel, LedControl
│       │   └── views/        # Single view: Index
│       └── dist/             # Built output
├── packages/
│   └── ui/                   # @munet/ui shared component library (git submodule → MuNET-OSS/MuNET-UI)
└── pnpm-workspace.yaml       # Workspaces: apps/*, packages/*
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Device mode switching | `apps/webtest/src/devices/deviceMode.ts` | 3 modes: io4, adx, maimoller; persisted via `useStorage` |
| Provider interface | `apps/webtest/src/devices/providers/types.ts` | `TestDeviceProvider` — touch, buttons, lighting, connections, lifecycle |
| Add new device mode | `apps/webtest/src/devices/providers/` | Implement `TestDeviceProvider`, register in `deviceMode.ts` |
| Touch panel protocol | `apps/webtest/src/devices/touchSerial.ts` | 9600 baud, `(` `)`-framed chunks, 7-byte touch bitmap |
| LED strip protocol | `apps/webtest/src/devices/ledSerial.ts` | 115200 baud, SYNC/ESCAPE framing, checksum packets |
| IO4 button input | `apps/webtest/src/devices/io4.ts` | WebHID, vendor 0x0CA3, joystick usage page |
| ADX/NDX button input | `apps/webtest/src/devices/adxHid.ts` | WebHID, VID 0x2E3C, per-byte digital buttons |
| Maimoller all-in-one | `apps/webtest/src/devices/maimollerHid.ts` | WebHID, VID 0x0E8F PID 0x1224; touch + buttons + LED in one device |
| Touch zone SVG | `apps/webtest/src/components/Display/index.tsx` | 34-zone SVG (A1–A8, B1–B8, C1–C2, D1–D8, E1–E8) |
| Button ring overlay | `apps/webtest/src/components/ButtonRing/index.tsx` | 8 arcade button arc segments |
| Device connection UI | `apps/webtest/src/components/ConnectionPanel/index.tsx` | Mode selector + per-connection connect/disconnect buttons |
| LED color control | `apps/webtest/src/components/LedControl/index.tsx` | Top light, frame brightness, button LED colors (via provider) |
| Theme init | `apps/webtest/src/main.ts` | `initThemeDefaults({ hue: 220 })`, DynamicLight |
| UI library | `packages/ui/` | See `packages/ui/AGENTS.md` for full docs |

## CONVENTIONS

- **No SFC**: All components use `defineComponent` + JSX (`.tsx`), zero `.vue` in app code
- **CSS**: CSS Modules (`.module.sass`) + UnoCSS utility classes, mixed freely
- **State**: Vue `ref`/`shallowRef` at module scope (no Pinia/Vuex); `useStorage` for persisted state
- **Indent**: 2 spaces, LF, UTF-8 (`.editorconfig`)
- **Import alias**: `@` → `./src` (tsconfig + vite)
- **Package manager**: pnpm 9.7.0 (corepack)
- **No linter**: No ESLint/Prettier configured
- **No tests**: No test framework, no test files
- **No CI/CD**: No GitHub Actions, Makefile, or Docker
- **Language**: UI text in Chinese (zh)

## ANTI-PATTERNS (THIS PROJECT)

- Three `@ts-ignore` in codebase: `LedControl/index.tsx` (Range v-model), `packages/ui` Section + TaskManager (vue/TransitionGroup type issues)

## UNIQUE STYLES

- **Provider pattern**: `TestDeviceProvider` interface abstracts touch/buttons/lighting/connections per device mode. Components consume `activeDevice` computed ref, never raw drivers directly.
- **Device mode transitions**: `deviceMode.ts` handles disconnect/reconnect lifecycle when switching between modes (serial modes share touch+LED, maimoller is standalone)
- **Presented vs Exclusive connections**: Serial modes share touch+LED ("presented") but have exclusive button device; maimoller owns all connections exclusively
- **Auto-reconnect pattern**: All device drivers persist state to `localStorage` and attempt reconnection on mount via `tryAutoReconnect*()` functions
- **Serial protocol**: Touch uses ASCII-framed `{HALT}`, `{RSET}`, `{STAT}` commands; LED uses binary SYNC/ESCAPE byte-stuffing with checksums
- **HID protocols**: IO4 (uint32 active-low at offset 28), ADX (per-byte digital), Maimoller (bitmask touch+buttons in 7 bytes, output report for LED)
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
- Maimoller uses `featureReport(1)` to distinguish 1P vs 2P on same VID:PID — `data[3]==2` means 2P.
