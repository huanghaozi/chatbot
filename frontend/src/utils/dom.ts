import BezierEasing from "bezier-easing";

interface SetScrollTopOptions {
  target?: HTMLElement;
  targetValue?: number;
  useAnimation?: boolean;
  duration?: number;
}

interface StepOptions {
  target?: HTMLElement;
  start: number;
  end: number;
  stepNo?: number;
  stepTotal: number;
}

const easingFunc = BezierEasing(0.42, 0, 1, 1);
function getNextScrollTopValue(
  start: number,
  end: number,
  stepNo: number,
  stepTotal: number
): number {
  if (start > end) {
    return start - easingFunc(stepNo / stepTotal) * (start - end);
  } else {
    return start + easingFunc(stepNo / stepTotal) * (end - start);
  }
}

function getEleScrollTop(target = document.body): number {
  if (target === document.body || target === document.documentElement) {
    return document.body.scrollTop || document.documentElement.scrollTop;
  } else {
    return target.scrollTop;
  }
}

function animateSetScrollTop({
  target = document.documentElement,
  start,
  end,
  stepNo = 1,
  stepTotal,
}: StepOptions) {
  const next = getNextScrollTopValue(start, end, stepNo, stepTotal);
  window.requestAnimationFrame(() => {
    setElementScrollTop({
      target,
      value: next,
    });
    if (stepNo !== stepTotal) {
      const nextStepNo = stepNo + 1;
      animateSetScrollTop({
        target,
        start,
        end,
        stepNo: nextStepNo,
        stepTotal,
      });
    }
  });
}

function setElementScrollTop({
  target = document.documentElement,
  value,
}: {
  target?: HTMLElement;
  value: number;
}) {
  if (target === document.body || target === document.documentElement) {
    document.body.scrollTop = value;
    document.documentElement.scrollTop = value;
  } else {
    target.scrollTop = value;
  }
}

export function setScrollTop({
  target = document.documentElement,
  targetValue = 0,
  useAnimation = false,
  duration = 0.5,
}: SetScrollTopOptions = {}): void {
  if (useAnimation) {
    const currScrollTop = getEleScrollTop(target);
    const stepTotal = duration * 60;
    if (currScrollTop === targetValue) {
      return;
    }
    animateSetScrollTop({
      target,
      start: currScrollTop,
      end: targetValue,
      stepTotal,
    });
  } else {
    setElementScrollTop({
      target,
      value: targetValue,
    });
  }
}
