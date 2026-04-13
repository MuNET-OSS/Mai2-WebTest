import { defineComponent } from 'vue';
import { selectedZones } from '@/devices/touchSerial';
import { buttonStates, io4Connected, player1Buttons } from '@/devices/io4';
import { ledConnected } from '@/devices/ledSerial';
import Display from '@/components/Display';
import ButtonRing from '@/components/ButtonRing';
import ConnectionPanel from '@/components/ConnectionPanel';
import LedControl from '@/components/LedControl';
import { Section, theme } from '@munet/ui';

const SYSTEM_BUTTONS = ['SERVICE', 'TEST', '1P_SEL', '2P_SEL'] as const;

export default defineComponent({
  render() {
    const showLightSection = io4Connected.value || ledConnected.value;

    return (
      <div class="h-full flex flex-col gap-4 p-4">
        <ConnectionPanel />

        <div class="flex-1 flex flex-col min-[1600px]:grid min-[1600px]:cols-2 gap-4">
          <Section title="触摸" expend={true}>
            <div class="relative h-full w-full">
              <Display currentSelected={selectedZones.value} class="h-full w-full"/>
              {io4Connected.value && (
                <ButtonRing
                  pressed={player1Buttons.value}
                  class="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
              )}
            </div>
          </Section>

          <div class="flex flex-col gap-4">
            {io4Connected.value && (
              <Section title="系统按键" expend={true}>
                <div class="flex gap-3 flex-wrap justify-center">
                  {SYSTEM_BUTTONS.map(name => (
                    <div class={["flex items-center gap-1.5 px-3 py-1.5 rounded text-sm", buttonStates.value[name] ? theme.value.listItemAlt : theme.value.listItem]}>
                      <span
                        class={[
                          "w-2 h-2 rounded-full flex-shrink-0",
                          buttonStates.value[name] ? 'bg-green-500' : 'bg-gray-500'
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
