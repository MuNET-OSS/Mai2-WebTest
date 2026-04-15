# WEBTEST - Hardware Test Application

## OVERVIEW

Browser-based diagnostic tool for maimai DX cabinet hardware. Supports 3 device modes (IO4, ADX/NDX, Maimoller) via `TestDeviceProvider` abstraction. Uses Web Serial and WebHID APIs.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new device mode | `src/devices/providers/` | Implement `TestDeviceProvider` from `types.ts`, register in `deviceMode.ts` |
| Add new HID driver | `src/devices/` | Follow `adxHid.ts` pattern: connect/disconnect/autoReconnect + Vue refs |
| Add new serial driver | `src/devices/` | Follow `touchSerial.ts` pattern: requestPort/open/read loop |
| Provider interface | `src/devices/providers/types.ts` | `TestDeviceProvider`, `DeviceConnection`, capability interfaces |
| Device mode switching | `src/devices/deviceMode.ts` | `setDeviceMode()` — handles disconnect/reconnect lifecycle |
| Add new component | `src/components/` | `defineComponent` + JSX in `index.tsx`, styles in `index.module.sass` |
| Modify page layout | `src/views/Index.tsx` | Single page, uses `Section` from `@munet/ui` |
| Change routing | `src/router.ts` | Currently single route `/` |
| Modify theme | `src/main.ts` | `initThemeDefaults`, `selectedThemeName` |

## ARCHITECTURE: PROVIDER SYSTEM

Components consume `activeDevice` (computed from `deviceMode`), never raw drivers.

```
deviceMode.ts          → selects active provider (io4 | adx | maimoller)
providers/types.ts     → TestDeviceProvider interface
providers/io4Provider   → touch(Serial) + LED(Serial) + IO4(HID)
providers/adxProvider   → touch(Serial) + LED(Serial) + ADX(HID)
providers/maimollerProv → single Maimoller HID device handles all
```

**Connection categories**:
- **Presented**: shared across serial modes (touch + LED serial ports)
- **Exclusive**: mode-specific (IO4, ADX, or Maimoller HID device)

Mode transitions disconnect exclusive (and sometimes presented) connections, then auto-reconnect the new mode's connections.

## CONVENTIONS (DIFFERENT FROM PARENT)

- All device drivers export Vue reactive refs (`touchConnected`, `adxConnected`, etc.) at module scope
- Auto-reconnect stored in `localStorage` keys: `autoReconnect.touch`, `autoReconnect.led`, `autoReconnect.io4`, `autoReconnect.adx`, `autoReconnect.maimoller`
- Device mode persisted via `useStorage('deviceMode', 'io4')`
- Device port matching: `usbVendorId` + `usbProductId` + `sameDeviceIndex` for serial; `vendorId`/`productId` for HID
- Components use `activeDevice.value.touch.zones`, `activeDevice.value.buttons.states`, etc. — never import driver refs directly

## DEVICE PROTOCOL QUICK REFERENCE

| Device | API | ID / Baud | Frame Format |
|--------|-----|-----------|--------------|
| Touch | Web Serial | 9600, 8N1 | `(` + 7 data bytes + `)` |
| LED | Web Serial | 115200 | `0xE0` SYNC + escaped body + checksum |
| IO4 | WebHID | VID 0x0CA3 | Input report, uint32 LE at offset 28, active-low |
| ADX/NDX | WebHID | VID 0x2E3C | Input report, per-byte digital (0/1), 14+ bytes |
| Maimoller | WebHID | VID 0x0E8F PID 0x1224 | Input 7 bytes (touch bitmask + buttons); Output 63 bytes (LED colors + brightness) |

## ANTI-PATTERNS

- Touch zone mapping is hardcoded in `touchSerial.ts` (34 zones → bit positions) and SVG in `Display/index.tsx` — keep in sync if zones change
- Maimoller duplicates the same 34-zone structure in `maimollerHid.ts` TOUCH_ZONES array — must stay in sync with Display SVG
