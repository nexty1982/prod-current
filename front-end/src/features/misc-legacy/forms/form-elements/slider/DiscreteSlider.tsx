"use client";

import { Slider } from "@mui/material";
import ChildCard from '@/shared/ui/ChildCard'
import DiscreteSliderCode from "@/components/forms/form-elements/slider/code/DiscreteSliderCode";

const valuetext = (value: any) => `${value}°C`;

const DiscreteSlider = () => {
  return (
    <ChildCard title="Discrete" codeModel={<DiscreteSliderCode />}>
      <Slider
        aria-label="Temperature"
        defaultValue={30}
        getAriaValueText={valuetext}
        valueLabelDisplay="auto"
        step={10}
        marks
        min={10}
        max={110}
      />
    </ChildCard>
  );
};

export default DiscreteSlider;
