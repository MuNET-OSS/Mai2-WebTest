import { defineComponent } from 'vue';
import { closeSerial, lastBuffer, selectedZones, serial, serialConnect } from '@/serial';
import Display from '@/components/Display';

export default defineComponent({
  render() {
    return <div class="h-full flex flex-col">
      <div class="flex gap-4">
        <button onClick={serialConnect}>连接</button>
        <button onClick={closeSerial}>断开</button>
        <div>{serial.isOpen ? '已连接' : '已断开'}</div>
        {!!lastBuffer.value.length && <div class="flex gap-2">
          上次接收的数据:
          <div>(</div>
          {lastBuffer.value.map(b => <div>{b.toString(16).toUpperCase().padStart(2, '0')}</div>)}
          <div>)</div>
        </div>}
      </div>
      <Display currentSelected={selectedZones.value} class="max-h-90vw max-w-90vh" />
    </div>;
  },
});
