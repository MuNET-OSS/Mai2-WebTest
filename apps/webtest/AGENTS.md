# WEBTEST - Hardware Test Application

## OVERVIEW

Browser-based diagnostic tool for maimai DX cabinet hardware: touch panel, LED controller, IO4 button board. Uses Web Serial and WebHID APIs.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new device | `src/devices/` | Follow existing pattern: connect/disconnect/autoReconnect + Vue refs for state |
| Add new component | `src/components/` | `defineComponent` + JSX in `index.tsx`, styles in `index.module.sass` |
| Modify page layout | `src/views/Index.tsx` | Single page, uses `Section` from `@munet/ui` |
| Change routing | `src/router.ts` | Currently single route `/` |
| Modify theme | `src/main.ts` | `initThemeDefaults`, `selectedThemeName` |

## CONVENTIONS (DIFFERENT FROM PARENT)

- All device drivers export Vue reactive refs (`touchConnected`, `ledConnected`, etc.) at module scope
- Auto-reconnect stored in `localStorage` keys: `autoReconnect.touch`, `autoReconnect.led`, `autoReconnect.io4`
- Device port matching uses `usbVendorId` + `usbProductId` + `sameDeviceIndex` for serial, `vendorId` for HID

## DEVICE PROTOCOL QUICK REFERENCE

| Device | API | Baud/Config | Frame Format |
|--------|-----|-------------|--------------|
| Touch | Web Serial | 9600, 8N1 | `(` + 7 data bytes + `)` |
| LED | Web Serial | 115200 | `0xE0` SYNC + escaped body + checksum |
| IO4 | WebHID | — | HID input report, buttons at offset 28, uint32 LE |

## ANTI-PATTERNS

- Touch zone mapping is hardcoded in `touchSerial.ts` (34 zones → bit positions) and SVG in `Display/index.tsx` — keep in sync if zones change.
