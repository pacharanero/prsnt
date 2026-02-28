type SlideCounterProps = {
  current: number;
  total: number;
};

export function SlideCounter({ current, total }: SlideCounterProps) {
  return <div className="slide-counter">{current} / {total}</div>;
}
