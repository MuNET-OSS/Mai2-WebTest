import { defineComponent } from 'vue';
import { selectedZones } from '@/devices/touchSerial';
import { buttonStates, io4Connected, player1Buttons } from '@/devices/io4';
import { adxConnected, adxButtonStates, adxPlayer1Buttons } from '@/devices/adxHid';
import { mmlConnected, mmlButtonStates, mmlPlayer1Buttons, mmlSelectedZones } from '@/devices/maimollerHid';
import { ledConnected } from '@/devices/ledSerial';
import { deviceMode } from '@/devices/deviceMode';
import Display from '@/components/Display';
import ButtonRing from '@/components/ButtonRing';
import ConnectionPanel from '@/components/ConnectionPanel';
import LedControl from '@/components/LedControl';
import { Section, theme } from '@munet/ui';

const IO4_SYSTEM_BUTTONS = ['SERVICE', 'TEST', '1P_SEL', '2P_SEL'] as const;
const MML_SYSTEM_BUTTONS = ['SERVICE', 'TEST', '1P_SEL', 'COIN'] as const;

export default defineComponent({
  render() {
    const mode = deviceMode.value;

    const activeZones = mode === 'maimoller' ? mmlSelectedZones.value : selectedZones.value;

    const activePlayer1Buttons = mode === 'io4' ? player1Buttons.value
      : mode === 'adx' ? adxPlayer1Buttons.value
      : mmlPlayer1Buttons.value;

    const activeButtonStates = mode === 'io4' ? buttonStates.value
      : mode === 'adx' ? adxButtonStates.value
      : mmlButtonStates.value;

    const hidConnected = mode === 'io4' ? io4Connected.value
      : mode === 'adx' ? adxConnected.value
      : mmlConnected.value;

    const systemButtons = mode === 'maimoller' ? MML_SYSTEM_BUTTONS : IO4_SYSTEM_BUTTONS;
    const showLightSection = hidConnected || ledConnected.value;

    return (
      <div class="h-full flex flex-col gap-4 p-4 max-h-100vh overflow-y-auto cst">
        <ConnectionPanel />

        <div class="flex-1 flex flex-col min-[1600px]:grid min-[1600px]:cols-2 gap-4">
          <Section title="触摸" expend={true}>
            <div class="relative h-full w-full">
              <Display currentSelected={activeZones} class="h-full w-full"/>
              {hidConnected && (
                <ButtonRing
                  pressed={activePlayer1Buttons}
                  class="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
              )}
            </div>
          </Section>

          <div class="flex flex-col gap-4">
            {hidConnected && (
              <Section title="系统按键" expend={true}>
                <div class="flex gap-3 flex-wrap justify-center">
                  {systemButtons.map(name => (
                    <div class={["flex items-center gap-1.5 px-3 py-1.5 rounded text-sm", activeButtonStates[name] ? theme.value.listItemAlt : theme.value.listItem]}>
                      <span
                        class={[
                          "w-2 h-2 rounded-full flex-shrink-0",
                          activeButtonStates[name] ? 'bg-green-500' : 'bg-gray-500'
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
