let ctx: AudioContext | null = null;
let last = 0;
export function sound(
  kind: 'tap' | 'go' | 'water' | 'wash' | 'success' | 'friend',
  enabled: boolean,
) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const Audio =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Audio) return;
    ctx ??= new Audio();
    void ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    if (now - last < 0.075 && kind !== 'success') return;
    last = now;
    const notes =
      kind === 'success'
        ? [523, 659, 784, 1046]
        : kind === 'go'
          ? [196, 262]
          : kind === 'water'
            ? [740, 988]
            : kind === 'wash'
              ? [880, 1175]
              : kind === 'friend'
                ? [392, 523, 392]
                : [660];
    notes.forEach((hz, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz;
      const start = now + i * 0.13;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.11, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.23);
      osc.connect(gain);
      gain.connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.25);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    /* Sound is optional; unsupported or interrupted audio must not stop play. */
  }
}
