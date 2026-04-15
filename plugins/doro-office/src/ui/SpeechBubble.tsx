type SpeechBubbleProps = {
  text: string;
  tone: 'idle' | 'working' | 'error' | 'sleeping';
};

const toneClassMap: Record<SpeechBubbleProps['tone'], string> = {
  idle: 'do:border-slate-200 do:bg-white do:text-slate-700',
  working: 'do:border-sky-200 do:bg-sky-50 do:text-sky-800',
  error: 'do:border-rose-200 do:bg-rose-50 do:text-rose-800',
  sleeping: 'do:border-violet-200 do:bg-violet-50 do:text-violet-800',
};

export function SpeechBubble({ text, tone }: SpeechBubbleProps) {
  return (
    <div className={`do:relative do:rounded-2xl do:border do:px-3 do:py-2 do:text-xs do:font-semibold do:shadow-sm ${toneClassMap[tone]}`}>
      {text}
      <span
        aria-hidden="true"
        className={`do:absolute do:-bottom-2 do:left-5 do:size-3 do:rotate-45 do:border-b do:border-r ${toneClassMap[tone]}`}
      />
    </div>
  );
}
