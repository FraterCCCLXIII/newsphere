import { TextT } from "@phosphor-icons/react";

import {
  TEXT_SCALE_DEFAULT,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
} from "@/components/text-scale-provider";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type TextScaleSliderProps = {
  textScale: number;
  onTextScaleChange: (scale: number) => void;
};

/** Slider uses percent steps for clearer labels; maps to multiplier on change. */
const SLIDER_MIN = Math.round(TEXT_SCALE_MIN * 100);
const SLIDER_MAX = Math.round(TEXT_SCALE_MAX * 100);
const SLIDER_STEP = 5;

function scaleToSliderValue(scale: number): number {
  return Math.round(scale * 100);
}

function sliderValueToScale(value: number): number {
  return value / 100;
}

export function TextScaleSlider({
  textScale,
  onTextScaleChange,
}: TextScaleSliderProps) {
  const value = scaleToSliderValue(textScale);

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="flex items-center gap-2">
        <TextT className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 text-sm text-foreground">Text size</span>
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
          {Math.round(textScale * 100)}%
        </span>
      </div>
      <Slider
        className={cn("app-no-drag w-full")}
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={SLIDER_STEP}
        value={[value]}
        onValueChange={(v) => {
          const next = v[0] ?? scaleToSliderValue(TEXT_SCALE_DEFAULT);
          onTextScaleChange(sliderValueToScale(next));
        }}
        aria-label="Text size"
      />
    </div>
  );
}
