import { defineComponent } from 'vue';
import { lastBuffer, selectedZones, touchConnected } from '@/devices/touchSerial';
import { buttonStates, io4Connected, player1Buttons } from '@/devices/io4';
import Display from '@/components/Display';
import ButtonRing from '@/components/ButtonRing';
import ConnectionPanel from '@/components/ConnectionPanel';
import LedControl from '@/components/LedControl';

const SYSTEM_BUTTONS = ['SERVICE', 'TEST', '1P_SEL', '2P_SEL'] as const;

export default defineComponent({
  render() {
    return (
      <div class="h-full flex flex-col gap-4 p-4">
        <ConnectionPanel />

        <div class="flex-1 grid min-[1600px]:cols-2 items-center gap-4">
          <div class="relative h-full w-full">
            <Display currentSelected={selectedZones.value} class="h-full w-full"/>
            {io4Connected.value && (
              <ButtonRing
                pressed={player1Buttons.value}
                class="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
            )}
          </div>

          <div class="flex flex-col gap-4 items-center">
            {io4Connected.value && (
              <div class="flex gap-3 flex-wrap justify-center">
                {SYSTEM_BUTTONS.map(name => (
                  <div class="flex items-center gap-1.5 px-3 py-1 rounded border border-gray-600 text-sm">
                    <span
                      class="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: buttonStates.value[name] ? '#4caf50' : '#666' }}
                    />
                    {name}
                  </div>
                ))}
              </div>
            )}

            <LedControl />

            {touchConnected.value && !!lastBuffer.value.length && (
              <div class="flex gap-2 text-sm text-gray-400">
                <span>Touch raw:</span>
                <span>(</span>
                {lastBuffer.value.map(b => (
                  <span>{b.toString(16).toUpperCase().padStart(2, '0')}</span>
                ))}
                <span>)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
});
