# QA 经验

## 无实机验证 NPro WinUSB

- 没有 NPro 实机时，可以在浏览器控制台临时覆盖 `navigator.usb` 的 `requestDevice`、`getDevices`、`addEventListener`、`removeEventListener`，注入一个假 `USBDevice` 来跑完整前端驱动路径。
- `transferIn` 首次返回一笔 8 字节 NPro 输入报告，之后返回永不结束的 Promise，可以模拟持续连接的 bulk IN；`transferOut` 记录每次写出的字节，用来核对 SEGA LED 帧。
- 测试帧应与 `oniimai_STM32/tools/npro_smoke.py` 的 `build_frame` 结果逐字节一致；重点核对颜色、亮度和保活命令。
- 这种测试只能覆盖浏览器侧解析、状态和写帧逻辑，不能替代实机确认 USB 枚举、WinUSB 驱动、固件行为和灯光效果。
