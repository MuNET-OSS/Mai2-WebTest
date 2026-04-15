import { defineComponent } from 'vue';
import { activeDevice } from '@/devices/deviceMode';
import { touchCounters, buttonCounters, resetCounters } from '@/pressCounter';
import Display from '@/components/Display';
import ButtonRing from '@/components/ButtonRing';
import ConnectionPanel from '@/components/ConnectionPanel';
import LedControl from '@/components/LedControl';
import { Section, theme } from '@munet/ui';

export default defineComponent({
  render() {
    const device = activeDevice.value;
    const hidConnected = device.buttons.connected.value;
    const showLightSection = device.lighting.available.value;

    return (
      <div class="h-full flex flex-col gap-4 p-4 max-h-100vh overflow-y-auto cst">
        <ConnectionPanel />

        <div class="flex-1 flex flex-col min-[1600px]:grid min-[1600px]:cols-2 gap-4">
          <Section title="触摸" expend={true}>
            <div class="relative h-full w-full">
              <Display currentSelected={device.touch.zones.value} counters={touchCounters} class="h-full w-full"/>
              {hidConnected && (
                <ButtonRing
                  pressed={device.buttons.player1.value}
                  counters={buttonCounters}
                  class="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
              )}
              <button
                onClick={resetCounters}
                class="absolute top-2 right-2 text-xs"
              >
                重置计数
              </button>
            </div>
          </Section>

          <div class="flex flex-col gap-4">
            {hidConnected && (
              <Section title="系统按键" expend={true}>
                <div class="flex gap-3 flex-wrap justify-center">
                  {device.buttons.systemButtons.map(name => (
                    <div class={["flex items-center gap-1.5 px-3 py-1.5 rounded text-sm", device.buttons.states.value[name] ? theme.value.listItemAlt : theme.value.listItem]}>
                      <span
                        class={[
                          "w-2 h-2 rounded-full flex-shrink-0",
                          device.buttons.states.value[name] ? 'bg-green-500' : 'bg-gray-500'
                        ]}
                      />
                      {name}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {showLightSection && (
              <Section title="灯光控制" expend={true}>
                <LedControl />
              </Section>
            )}
          </div>
        </div>
      </div>
    );
  },
});
