export function gardenPlacement(
  pointer: { x: number; y: number },
  bounds: { left: number; top: number; width: number; height: number },
  item: { width: number; height: number; grabX: number; grabY: number },
) {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  return {
    x: clamp(
      (pointer.x - bounds.left - item.grabX) /
        Math.max(1, bounds.width - item.width),
    ),
    y: clamp(
      (pointer.y - bounds.top - item.grabY) /
        Math.max(1, bounds.height - item.height),
    ),
  };
}
