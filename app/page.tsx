'use client';
/* eslint-disable next/no-html-link-for-pages -- Full document navigation serves the offline static settings page and rehydrates device state. */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CloudSun,
  Droplets,
  Flower2,
  Home as HomeIcon,
  Leaf,
  Moon,
  Settings2,
  Sparkles,
  Sprout,
  Sun,
  Volume2,
  VolumeX,
  Hand,
  Apple,
  Flag,
  Move,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ACTIVITIES,
  ANIMALS,
  CARS,
  REWARDS,
  animalCount,
  carCount,
  growthLevel,
  targetGoal,
  type Activity,
  type Action,
  type Game,
} from '@/lib/game';
import { useGame } from '@/lib/use-game';
import { sound } from '@/lib/sound';
import { gardenPlacement } from '@/lib/garden-layout';

const ACTIVITY_INFO = {
  fruit: {
    title: 'もぐもぐ ピクニック',
    hint: 'かごに、ぽんっ。',
    icon: Apple,
  },
  wash: {
    title: 'あわあわ せんしゃ',
    hint: 'なでなで、ぴっかぴか。',
    icon: Droplets,
  },
  water: {
    title: 'すくすく おはな',
    hint: 'おみずを、どうぞ。',
    icon: Flower2,
  },
};
function Sprite({
  index,
  className = '',
  style,
}: {
  index: number;
  className?: string;
  style?: CSSProperties;
}) {
  // Atlas rows have different natural heights; crop in CSS without stretching toys.
  const rows = [
    [0, 395],
    [406, 232],
    [639, 299],
    [939, 315],
  ];
  const [y, h] = rows[Math.floor(index / 4)];
  const x = (index % 4) * 313.5;
  const w = 313.5;
  const scale = Math.max(w, h);
  return (
    <span aria-hidden="true" className={`sprite ${className}`} style={style}>
      <span
        className="sprite-window"
        style={{
          width: `${(w / scale) * 100}%`,
          height: `${(h / scale) * 100}%`,
          left: `${(1 - w / scale) * 50}%`,
          top: `${(1 - h / scale) * 50}%`,
          backgroundSize: `${(1254 / w) * 100}% ${(1254 / h) * 100}%`,
          backgroundPosition: `${(x / (1254 - w)) * 100}% ${(y / (1254 - h)) * 100}%`,
        }}
      />
    </span>
  );
}
function Car({
  car,
  animal,
  className = '',
  onClick,
}: {
  car: number;
  animal: number;
  className?: string;
  onClick?: () => void;
}) {
  const art = (
    <>
      <Sprite index={animal} className="passenger" />
      <Sprite index={4 + car} className="car-body" />
    </>
  );
  return onClick ? (
    <button
      className={`toy-car ${className}`}
      onClick={onClick}
      aria-label={`${ANIMALS[animal]}のくるまをならす`}
    >
      {art}
    </button>
  ) : (
    <div aria-hidden="true" className={`toy-car ${className}`}>
      {art}
    </div>
  );
}
function Confetti({ id }: { id: number }) {
  return (
    <div className="confetti" aria-hidden="true" key={id}>
      {Array.from({ length: 18 }, (_, i) => (
        <i
          key={i}
          style={
            {
              '--i': i,
              '--c': ['#ffbc47', '#e77862', '#238c85', '#76b7d8'][i % 4],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function Home() {
  const { game, send, ready, saveOk } = useGame();
  const [destination, setDestination] = useState<Activity | null>(null);
  const [rest, setRest] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pulse, setPulse] = useState(-1);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressDrive = useRef(false);
  const trip = game.trip;
  const activity = trip?.activity ?? destination ?? ACTIVITIES[game.trips % 3];
  const info = ACTIVITY_INFO[activity];
  const reduced = !game.settings.motion;
  const playSound = (kind: Parameters<typeof sound>[0]) =>
    sound(kind, game.settings.sound);
  const act = (a: Action, tone: Parameters<typeof sound>[0] = 'tap') => {
    if (!ready) return;
    const next = send(a);
    sound(
      next.screen === 'reward' && game.screen !== 'reward' ? 'success' : tone,
      next.settings.sound,
    );
    return next;
  };
  const start = () =>
    act(
      trip
        ? { type: 'resume' }
        : {
            type: 'start',
            activity,
            id:
              typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `trip-${Date.now()}`,
          },
      'go',
    );
  const poke = (i: number) => {
    act({ type: 'poke', index: i }, 'friend');
    setPulse(i);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulse(-1), 800);
  };
  useEffect(
    () => () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    )
      return;
    let mounted = true;
    void navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        if (mounted) setOffline(true);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    // A small, read-only surface for a parent or assistive agent. No external data or network.
    type Context = {
      registerTool: (
        tool: object,
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool || !ready) return;
    const life = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'read_garden_progress',
            title: 'おにわの成長を確認',
            description:
              'Read completed outings, unlocked friends, cars and garden growth stored on this device. Does not change progress.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: false },
            execute(input: unknown) {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object');
              return {
                outings: game.trips,
                friends: ANIMALS.slice(0, animalCount(game)),
                cars: CARS.slice(0, carCount(game)),
                garden: REWARDS.slice(0, Math.min(game.trips, 8)).map(
                  (r, i) => ({ name: r.name, growth: growthLevel(game, i) }),
                ),
                saved: saveOk,
              };
            },
          },
          { signal: life.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Ordinary browsers do not need WebMCP. */
    }
    return () => life.abort();
  }, [ready, game, saveOk]);

  return (
    <main className={`app ${reduced ? 'reduce-motion' : ''}`}>
      <header className="topbar">
        <button
          className="brand"
          aria-label="ガレージに戻る"
          onClick={() => act({ type: 'home' })}
        >
          <span className="brand-mark">
            <Flag />
          </span>
          <span className="wordmark">
            どうぶつの
            <span>
              おでかけ<span className="brand-accent">ガレージ</span>
            </span>
          </span>
        </button>
        <div className="top-actions">
          <span className="offline-label">
            <i />
            {offline
              ? 'オフラインでも あそべるよ'
              : 'ちいさな おでかけ、いっぱい。'}
          </span>
          <button
            className="icon-button"
            aria-label={game.settings.sound ? 'おとを消す' : 'おとを出す'}
            aria-pressed={game.settings.sound}
            onClick={() =>
              act({
                type: 'setting',
                key: 'sound',
                value: !game.settings.sound,
              })
            }
          >
            {game.settings.sound ? <Volume2 /> : <VolumeX />}
          </button>
          <a
            href="/parents/"
            className={`icon-button ${!saveOk ? 'save-alert' : ''}`}
            aria-label="保護者設定"
          >
            <Settings2 />
          </a>
        </div>
      </header>
      <section
        className={`world weather-${game.weather} screen-${game.screen}`}
        aria-label="どうぶつのおでかけ"
      >
        <div className="world-art" aria-hidden="true" />
        <div className="weather-tint" />
        {game.weather === 2 && (
          <div className="rainbow-glow" aria-hidden="true" />
        )}
        {game.screen === 'home' && (
          <>
            <div className="scene-heading">
              <p>
                <span /> きみだけの モーターパーク
              </p>
              <h1>
                ぶーん！
                <br />
                <em>ぼうけんへ。</em>
              </h1>
              <span className="garage-stamp">
                <Flag /> GO, LITTLE DRIVER!
              </span>
            </div>
            <button
              className="garden-button"
              onClick={() => act({ type: 'garden' })}
            >
              <Sprout />
              <span>
                きみのおにわ
                <small>
                  {game.trips
                    ? 'おともだちが まってるよ'
                    : 'これから すこしずつ'}
                </small>
              </span>
              <ChevronRight />
            </button>
            <button
              className="weather-button"
              aria-label="空のようすを変える"
              onClick={() => act({ type: 'weather' }, 'friend')}
            >
              {game.weather === 0 ? (
                <Sun />
              ) : game.weather === 1 ? (
                <CloudSun />
              ) : (
                <Sparkles />
              )}
            </button>
            <div className="home-toy">
              <span className="speech-bubble">
                {trip ? 'つづき、いこう！' : 'いっしょに のろう！'}
              </span>
              <Car
                car={game.car}
                animal={game.animal}
                onClick={() => playSound('go')}
              />
            </div>
            {game.trips > 0 && (
              <button
                className="home-keepsake"
                onClick={() => act({ type: 'garden' })}
                aria-label="おにわのおみやげを見る"
              >
                <Sprite index={REWARDS[Math.min(game.trips, 8) - 1].sprite} />
                <span>
                  <Sparkles size={15} /> おにわに ふえたよ
                </span>
              </button>
            )}
            <div className="home-controls">
              <div className="selection-group">
                <span className="group-label">
                  <b>01</b> だれと いく？
                </span>
                <div className="friend-picks">
                  {ANIMALS.slice(0, animalCount(game)).map((a, i) => (
                    <button
                      key={a}
                      aria-label={a}
                      aria-pressed={game.animal === i}
                      className={game.animal === i ? 'chosen' : ''}
                      onClick={() =>
                        act({ type: 'animal', index: i }, 'friend')
                      }
                    >
                      <Sprite index={i} />
                      {game.animal === i && (
                        <Check className="selection-check" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="selection-group cars-group">
                <span className="group-label">
                  <b>02</b> どの くるま？
                </span>
                <div className="car-picks">
                  {CARS.slice(0, carCount(game)).map((c, i) => (
                    <button
                      key={c}
                      aria-label={c}
                      aria-pressed={game.car === i}
                      className={game.car === i ? 'chosen' : ''}
                      onClick={() => act({ type: 'car', index: i }, 'go')}
                    >
                      <Sprite index={i + 4} />
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="go-button"
                disabled={!ready}
                onClick={start}
                aria-label={trip ? 'おでかけを再開' : 'しゅっぱつ'}
              >
                <span>
                  {trip ? 'つづきから' : 'しゅっぱつ'}
                  <small>{trip ? 'まってたよ！' : 'さあ、いこう！'}</small>
                </span>
                <ArrowRight />
              </button>
            </div>
          </>
        )}
        {game.screen === 'ride' && trip && (
          <>
            <StageTop
              title="ぶーん、ぶーん！"
              subtitle={info.title}
              onBack={() => act({ type: 'home' })}
            />
            <div className="ride-markers" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span className={trip.step > i ? 'passed' : ''} key={i}>
                  <Leaf />
                </span>
              ))}
            </div>
            <button
              className="drive-area"
              aria-label="道をタップして進む"
              onClick={() => act({ type: 'move' }, 'go')}
              onPointerDown={(e) => {
                swipeStart.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerUp={(e) => {
                const p = swipeStart.current;
                if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 35) {
                  e.preventDefault();
                  act({ type: 'move' }, 'go');
                  suppressDrive.current = true;
                  setTimeout(() => {
                    suppressDrive.current = false;
                  }, 350);
                }
              }}
              onClickCapture={(e) => {
                if (suppressDrive.current) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              <Car
                car={game.car}
                animal={game.animal}
                className={`driving step-${trip.step}`}
              />
              <span className="drive-destination">
                <info.icon />
                <span>{info.title}</span>
              </span>
              <span className="touch-hint">
                <Hand /> <span>ぽんっ</span>
              </span>
            </button>
            <button
              className="go-button ride-go next-action"
              aria-label="くるまを進める"
              onClick={() => act({ type: 'move' }, 'go')}
            >
              <ArrowRight />
            </button>
          </>
        )}
        {game.screen === 'activity' && trip && (
          <>
            <StageTop
              title={info.hint}
              subtitle={info.title}
              onBack={() => act({ type: 'home' })}
            />
            <div
              className="activity-progress"
              aria-label={`できた数 ${trip.hits.filter((n) => n >= targetGoal(activity)).length} / ${trip.hits.length}`}
            >
              {trip.hits.map((n, i) => (
                <span
                  className={n >= targetGoal(activity) ? 'done' : ''}
                  key={i}
                >
                  {n >= targetGoal(activity) ? <Check /> : <Leaf />}
                </span>
              ))}
            </div>
            <ActivityBoard
              activity={activity}
              hits={trip.hits}
              variant={trip.variant}
              car={game.car}
              animal={game.animal}
              onHit={(i) =>
                act(
                  { type: 'hit', index: i },
                  activity === 'fruit' ? 'tap' : activity,
                )
              }
            />
          </>
        )}
        {game.screen === 'reward' && (
          <>
            <Confetti id={game.trips} />
            <div className="reward-panel" aria-live="polite">
              <div className="reward-kicker">
                <Sparkles /> できた、できた！ <Sparkles />
              </div>
              <h1>
                {game.trips <= 8
                  ? 'おみやげ、どうぞ。'
                  : 'おにわが そだったよ。'}
              </h1>
              <div className="gift-art">
                <Sprite index={REWARDS[Math.max(0, game.lastReward)].sprite} />
                <span className="gift-spark one">✦</span>
                <span className="gift-spark two">✦</span>
              </div>
              <p>{REWARDS[Math.max(0, game.lastReward)].name}</p>
              <div className="reward-friends">
                <Sprite index={game.animal} />
                <span>ありがとう！</span>
              </div>
              <button
                className="go-button"
                onClick={() => act({ type: 'garden' }, 'success')}
                aria-label="おみやげをおにわに置く"
              >
                <HomeIcon />
                <span>おにわへ</span>
                <ArrowRight />
              </button>
              <button
                className="quiet-button"
                onClick={() => {
                  act({ type: 'home' });
                  setRest(true);
                }}
              >
                <Moon size={18} /> きょうは おしまい
              </button>
            </div>
          </>
        )}
        {game.screen === 'garden' && (
          <>
            <StageTop
              title="きみの おにわ"
              subtitle="さわって、あそぼう。"
              onBack={() => act({ type: 'home' })}
            />
            <button
              className="weather-button garden-weather"
              aria-label="空のようすを変える"
              onClick={() => act({ type: 'weather' }, 'friend')}
            >
              <Sun />
            </button>
            <div className="garden-move-hint">
              <Hand />
              <Move />
              <span>つかんで、すいーっ。</span>
            </div>
            <GardenPlay
              game={game}
              pulse={pulse}
              onPoke={poke}
              onMove={(index, x, y) =>
                act({ type: 'place', index, x, y }, 'tap')
              }
            />
            {!game.trips && (
              <div className="empty-garden">
                <Sprout />
                <p>
                  おでかけすると、
                  <br />
                  ここに なにかが ふえるよ。
                </p>
              </div>
            )}
            <div className="garden-footer">
              <button className="quiet-button" onClick={() => setRest(true)}>
                <Moon /> ひとやすみ
              </button>
              <button
                className="go-button"
                onClick={() => act({ type: 'home' })}
              >
                <span>おでかけ</span>
                <ArrowRight />
              </button>
            </div>
          </>
        )}
        {!ready && (
          <div className="loading-cover" aria-label="準備中">
            <Sprite index={0} />
          </div>
        )}
      </section>
      <footer className="below-world">
        {game.screen === 'home' ? (
          <>
            <span className="footer-label">
              <Leaf /> こんどは なにして あそぶ？
            </span>
            <div className="activity-choices">
              {ACTIVITIES.map((a) => {
                const ItemIcon = ACTIVITY_INFO[a].icon;
                return (
                  <button
                    key={a}
                    className={activity === a ? 'active' : ''}
                    aria-label={ACTIVITY_INFO[a].title}
                    aria-pressed={activity === a}
                    disabled={!!trip}
                    onClick={() => {
                      setDestination(a);
                      playSound('tap');
                    }}
                  >
                    <ItemIcon />
                    <span>{ACTIVITY_INFO[a].title}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <span className="footer-note">
            <Leaf /> あわてなくて、だいじょうぶ。
          </span>
        )}
      </footer>
      <Dialog open={rest} onOpenChange={setRest}>
        <DialogContent className="rest-dialog" showCloseButton={false}>
          <Sprite index={game.animal} />
          <DialogTitle>また、あそぼうね。</DialogTitle>
          <DialogDescription>
            おでかけの続きは、ここでまってるよ。
          </DialogDescription>
          <span className="sleep-stars" aria-hidden="true">
            ☾ · ✦
          </span>
          <button className="go-button" onClick={() => setRest(false)}>
            あそびにもどる <ArrowRight />
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StageTop({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <div className="stage-top">
      <button
        className="stage-back icon-button"
        aria-label="ガレージに戻る"
        onClick={onBack}
      >
        <ArrowLeft />
      </button>
      <div>
        <p>{subtitle}</p>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
function ActivityBoard({
  activity,
  hits,
  variant,
  car,
  animal,
  onHit,
}: {
  activity: Activity;
  hits: number[];
  variant: number;
  car: number;
  animal: number;
  onHit: (i: number) => void;
}) {
  const drag = useRef<{
    index: number;
    x: number;
    y: number;
    pointer: number;
  } | null>(null);
  const [offset, setOffset] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const basket = useRef<HTMLDivElement>(null);
  const swipeHits = useRef(new Set<number>());
  const dragDown = (e: PointerEvent<HTMLButtonElement>, i: number) => {
    if (!e.isPrimary) return;
    drag.current = {
      index: i,
      x: e.clientX,
      y: e.clientY,
      pointer: e.pointerId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const dragEnd = (e: PointerEvent<HTMLButtonElement>, i: number) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    const distance = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    const r = basket.current?.getBoundingClientRect();
    if (
      distance > 12 &&
      r &&
      e.clientX >= r.left - 55 &&
      e.clientX <= r.right + 55 &&
      e.clientY >= r.top - 55 &&
      e.clientY <= r.bottom + 55
    )
      onHit(i);
    if (distance > 12) suppressTap.current = e.timeStamp + 450;
    drag.current = null;
    setOffset(null);
  };
  const suppressTap = useRef(0);
  if (activity === 'fruit')
    return (
      <div className="activity-board fruit-board">
        <div className="fruit-tree">
          <Sprite index={12} />
        </div>
        {hits.map((n, i) => (
          <button
            key={i}
            className={`fruit fruit-${i} ${i === hits.findIndex((v) => v < 1) ? 'is-next' : ''} ${n ? 'collected' : ''} ${offset?.index === i ? 'dragging' : ''}`}
            aria-label={`${variant % 2 ? 'にんじん' : 'りんご'} ${i + 1}をかごに入れる`}
            disabled={n > 0}
            style={
              offset?.index === i
                ? { transform: `translate(${offset.x}px,${offset.y}px)` }
                : undefined
            }
            onPointerDown={(e) => dragDown(e, i)}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d?.index === i && d.pointer === e.pointerId)
                setOffset({ index: i, x: e.clientX - d.x, y: e.clientY - d.y });
            }}
            onPointerUp={(e) => dragEnd(e, i)}
            onPointerCancel={() => {
              drag.current = null;
              setOffset(null);
            }}
            onClick={(e) => {
              if (e.timeStamp > suppressTap.current) onHit(i);
            }}
          >
            <Sprite index={variant % 2 ? 9 : 8} />
            <span className="tap-ring" />
            {i === hits.findIndex((v) => v < 1) && <TapCue />}
          </button>
        ))}
        <div className="picnic-basket" ref={basket}>
          <div className="basket-mouth">
            <ArrowLeft />
            {hits.map((n, i) => (
              <span key={i}>
                {n ? (
                  <Sprite index={variant % 2 ? 9 : 8} />
                ) : (
                  <span className="basket-slot" />
                )}
              </span>
            ))}
          </div>
          <span>ぽんっ！</span>
        </div>
        <Sprite index={animal} className="activity-friend" />
        <div className="mini-hint">
          <Hand />
          <ArrowRight />
          <span className="hint-basket">▱</span>
        </div>
      </div>
    );
  if (activity === 'wash')
    return (
      <div
        className="activity-board wash-board"
        onPointerDown={() => swipeHits.current.clear()}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          const el = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLButtonElement>('[data-wash]');
          if (!el) return;
          const i = Number(el.dataset.wash);
          if (!swipeHits.current.has(i)) {
            swipeHits.current.add(i);
            onHit(i);
          }
        }}
      >
        <Car car={car} animal={animal} className="wash-car" />
        {hits.map((n, i) => (
          <button
            key={i}
            data-wash={i}
            className={`wash-spot spot-${i} ${n ? 'clean' : ''} ${i === hits.findIndex((v) => v < 1) ? 'is-next' : ''}`}
            aria-label={`よごれ ${i + 1}をあらう`}
            disabled={n > 0}
            onClick={() => onHit(i)}
          >
            <span className="dirt-mark">✹</span>
            <span className="soap-bubble" />
            {i === hits.findIndex((v) => v < 1) && <TapCue />}
          </button>
        ))}
        <div className="wash-water" aria-hidden="true">
          <Droplets />
        </div>
        <div className="mini-hint">
          <Hand />
          <span>なでなで</span>
        </div>
      </div>
    );
  return (
    <div className="activity-board water-board">
      <div className="flower-pots">
        {hits.map((n, i) => (
          <button
            key={i}
            className={`flower-pot growth-${n} ${i === hits.findIndex((v) => v < 2) ? 'is-next' : ''}`}
            aria-label={`おはな ${i + 1}に水をあげる ${n}/2`}
            disabled={n >= 2}
            onClick={() => onHit(i)}
          >
            <Sprite
              index={n >= 2 ? 11 : 10}
              style={{ filter: `hue-rotate(${(variant + i) * 24}deg)` }}
            />
            {n < 2 ? (
              <Droplets className="water-hint" />
            ) : (
              <Sparkles className="bloom-spark" />
            )}
            {i === hits.findIndex((v) => v < 2) && <TapCue />}
            <span className="water-dots">
              <i className={n > 0 ? 'filled' : ''} />
              <i className={n > 1 ? 'filled' : ''} />
            </span>
          </button>
        ))}
      </div>
      <Sprite index={animal} className="activity-friend" />
      <div className="mini-hint">
        <Hand />
        <Droplets />
      </div>
    </div>
  );
}

function TapCue() {
  return (
    <span className="tap-cue" aria-hidden="true">
      <Hand />
    </span>
  );
}

function GardenPlay({
  game,
  pulse,
  onPoke,
  onMove,
}: {
  game: Game;
  pulse: number;
  onPoke: (i: number) => void;
  onMove: (i: number, x: number, y: number) => void;
}) {
  const board = useRef<HTMLFieldSetElement>(null);
  const gesture = useRef<{
    index: number;
    pointer: number;
    startX: number;
    startY: number;
    grabX: number;
    grabY: number;
    width: number;
    height: number;
    moved: boolean;
    x: number;
    y: number;
  } | null>(null);
  const [preview, setPreview] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const suppressClick = useRef(0);
  const pointerDown = (e: PointerEvent<HTMLButtonElement>, index: number) => {
    if (!e.isPrimary) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = game.gardenPositions[index];
    gesture.current = {
      index,
      pointer: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      grabX: e.clientX - r.left,
      grabY: e.clientY - r.top,
      width: r.width,
      height: r.height,
      moved: false,
      ...p,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current;
    if (!g || g.pointer !== e.pointerId || !board.current) return;
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < 8)
      return;
    const position = gardenPlacement(
      { x: e.clientX, y: e.clientY },
      board.current.getBoundingClientRect(),
      g,
    );
    g.moved = true;
    g.x = position.x;
    g.y = position.y;
    setPreview({ index: g.index, ...position });
  };
  const pointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current;
    if (!g || g.pointer !== e.pointerId) return;
    if (g.moved) {
      onMove(g.index, g.x, g.y);
      suppressClick.current = e.timeStamp + 500;
    }
    gesture.current = null;
    setPreview(null);
  };
  return (
    <fieldset
      ref={board}
      className="garden-items movable-garden"
      aria-label="おにわ。どうぶつや道具をドラッグして移動できます"
    >
      {REWARDS.slice(0, Math.min(8, game.trips)).map((r, i) => {
        const position =
          preview?.index === i ? preview : game.gardenPositions[i];
        return (
          <button
            key={i}
            className={`garden-item ${!game.gardenPositions[i].moved && preview?.index !== i ? 'unplaced' : ''} ${pulse === i ? 'boing' : ''} ${preview?.index === i ? 'being-moved' : ''}`}
            aria-label={`${r.name}であそぶ。ドラッグか矢印キーで移動`}
            onPointerDown={(e) => pointerDown(e, i)}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={() => {
              gesture.current = null;
              setPreview(null);
            }}
            onClick={(e) => {
              if (e.timeStamp > suppressClick.current) onPoke(i);
            }}
            onKeyDown={(e) => {
              const delta: { [key: string]: [number, number] } = {
                ArrowLeft: [-0.06, 0],
                ArrowRight: [0.06, 0],
                ArrowUp: [0, -0.06],
                ArrowDown: [0, 0.06],
              };
              if (delta[e.key]) {
                e.preventDefault();
                const [x, y] = delta[e.key];
                const r = e.currentTarget.getBoundingClientRect();
                const bounds = board.current?.getBoundingClientRect();
                const base = bounds
                  ? gardenPlacement({ x: r.left, y: r.top }, bounds, {
                      width: r.width,
                      height: r.height,
                      grabX: 0,
                      grabY: 0,
                    })
                  : position;
                onMove(i, base.x + x, base.y + y);
              }
            }}
            style={
              {
                '--x': position.x,
                '--y': position.y,
                '--default-x': (i % 4) / 3,
                '--default-y': Math.floor(i / 4),
                '--phone-x': (i % 3) / 2,
                '--phone-y': Math.floor(i / 3) / 2,
                '--growth': growthLevel(game, i),
                '--hue':
                  (game.gardenTaps[i] % 4) * (i === 0 || i === 7 ? 30 : 4),
              } as CSSProperties
            }
          >
            <Sprite index={r.sprite} />
            <span className="garden-item-grip" aria-hidden="true">
              <Move />
            </span>
            <span
              className="growth-dots"
              aria-label={`成長 ${growthLevel(game, i)}`}
            >
              {Array.from({ length: growthLevel(game, i) }, (_, j) => (
                <i key={j} />
              ))}
            </span>
            {pulse === i && (
              <span className="play-pop">
                {['♪', '♡', '✦'][game.gardenTaps[i] % 3]}
              </span>
            )}
          </button>
        );
      })}
    </fieldset>
  );
}
