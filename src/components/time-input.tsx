import { Input } from "@/components/ui/input";

interface TimeValue {
  hours: number;
  minutes: number;
  seconds: number;
}

interface TimeInputProps {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
}

export function TimeInput({ value, onChange }: TimeInputProps) {
  const handleChange = (field: keyof TimeValue) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = parseInt(e.target.value) || 0;
    const maxValue = field === "hours" ? Infinity : 59;
    
    onChange({
      ...value,
      [field]: Math.min(Math.max(0, newValue), maxValue),
    });
  };

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min={0}
        value={value.hours}
        onChange={handleChange("hours")}
        placeholder="HH"
        className="w-20"
      />
      <Input
        type="number"
        min={0}
        max={59}
        value={value.minutes}
        onChange={handleChange("minutes")}
        placeholder="MM"
        className="w-20"
      />
      <Input
        type="number"
        min={0}
        max={59}
        value={value.seconds}
        onChange={handleChange("seconds")}
        placeholder="SS"
        className="w-20"
      />
    </div>
  );
}