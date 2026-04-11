import idleSkin from './assets/dororong/idle.png';
import workingSkin from './assets/dororong/working.png';
import errorSkin from './assets/dororong/error.png';
import sleepingSkin from './assets/dororong/sleeping.png';
import type { DororongVisualState } from '../shared/types';

const skinMap: Record<DororongVisualState, string> = {
  idle: idleSkin,
  working: workingSkin,
  error: errorSkin,
  sleeping: sleepingSkin,
};

const animationClassMap: Record<DororongVisualState, string> = {
  idle: 'do:animate-[dororong-bob_2.8s_ease-in-out_infinite]',
  working: 'do:animate-[dororong-pulse_1.6s_ease-in-out_infinite]',
  error: 'do:animate-[dororong-shake_0.6s_ease-in-out_infinite]',
  sleeping: 'do:animate-[dororong-float_3.6s_ease-in-out_infinite]',
};

type CharacterProps = {
  name: string;
  state: DororongVisualState;
};

export function Character({ name, state }: CharacterProps) {
  return (
    <div className="do:relative do:flex do:h-32 do:items-end do:justify-center do:rounded-[2rem] do:bg-gradient-to-b do:from-orange-50 do:to-white do:p-3">
      <img
        alt={`${name} 도로롱 캐릭터 (${state})`}
        className={`do:h-full do:w-auto do:max-w-full do:select-none ${animationClassMap[state]}`}
        draggable={false}
        loading="lazy"
        src={skinMap[state]}
      />
    </div>
  );
}
