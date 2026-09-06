'use client';
/* eslint-disable next/no-html-link-for-pages -- Full document navigation restores the latest device save without a server-side router dependency. */
import { useState } from 'react';
import {
  ArrowLeft,
  Car,
  Check,
  Hand,
  LockKeyhole,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sprout,
  Volume2,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useGame } from '@/lib/use-game';
import { animalCount, carCount } from '@/lib/game';
import './parents.css';

export default function ParentSettings() {
  const { game, send, reset, ready, saveOk, recovered } = useGame();
  const [gate, setGate] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [message, setMessage] = useState('');
  return (
    <main
      className={`parent-page ${!game.settings.motion ? 'reduce-motion' : ''}`}
    >
      <header className="parent-page-header">
        <a href="/" className="parent-back">
          <ArrowLeft /> あそびに戻る
        </a>
        <span>
          <ShieldCheck /> 保護者メニュー
        </span>
      </header>
      <div className="parent-page-title">
        <span className="parent-title-icon">
          <Settings2 />
        </span>
        <div>
          <p>おでかけガレージ</p>
          <h1>おうちの方の設定</h1>
        </div>
      </div>
      {!ready ? (
        <p className="parent-status">記録を読み込んでいます…</p>
      ) : gate < 3 ? (
        <section className="parent-card parent-gate">
          <LockKeyhole />
          <h2>保護者の方が操作してください</h2>
          <p>
            数字を <strong>7 → 2 → 9</strong>{' '}
            の順にタップすると、設定が開きます。
          </p>
          <div className="gate-dots" aria-label={`${gate} / 3`}>
            {[0, 1, 2].map((i) => (
              <i className={gate > i ? 'filled' : ''} key={i} />
            ))}
          </div>
          <div className="gate-numbers">
            {[2, 9, 7, 5, 1, 4].map((n) => (
              <button
                key={n}
                onClick={() => setGate(n === [7, 2, 9][gate] ? gate + 1 : 0)}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="parent-small">
            進み具合は、設定を開いてもそのままです。
          </p>
        </section>
      ) : (
        <>
          <div className="parent-stats">
            <div>
              <Car />
              <strong>{game.trips}</strong>
              <span>おでかけ</span>
            </div>
            <div>
              <Hand />
              <strong>{animalCount(game)}</strong>
              <span>なかま</span>
            </div>
            <div>
              <Car />
              <strong>{carCount(game)}</strong>
              <span>くるま</span>
            </div>
            <div>
              <Sprout />
              <strong>{Math.min(8, game.trips)}</strong>
              <span>おみやげ</span>
            </div>
          </div>
          <div className="parent-page-grid">
            <section className="parent-card">
              <h2>
                <Volume2 /> あそびの設定
              </h2>
              <label className="setting-row" htmlFor="parent-sound">
                <span>
                  効果音<small>タップや成功したときの音</small>
                </span>
                <Switch
                  id="parent-sound"
                  aria-label="効果音"
                  checked={game.settings.sound}
                  onCheckedChange={(value) =>
                    send({ type: 'setting', key: 'sound', value })
                  }
                />
              </label>
              <label className="setting-row" htmlFor="parent-motion">
                <span>
                  アニメーション<small>ゆっくりした誘導と成功の演出</small>
                </span>
                <Switch
                  id="parent-motion"
                  aria-label="アニメーション"
                  checked={game.settings.motion}
                  onCheckedChange={(value) =>
                    send({ type: 'setting', key: 'motion', value })
                  }
                />
              </label>
              <p>
                動きをオフにしても、指のマークと明るい枠で触る場所が分かります。
              </p>
            </section>
            <section className="parent-card">
              <h2>
                <Sprout /> おにわの配置
              </h2>
              <p>
                庭のどうぶつや道具を指でつかんで動かすと、好きな場所に置けます。位置はこの端末に保存されます。
              </p>
              <button
                className="parent-secondary"
                onClick={() => {
                  send({ type: 'tidy' });
                  setMessage(
                    'おにわを最初の並びに戻しました。集めた物はそのままです。',
                  );
                }}
              >
                <LayoutGrid /> 配置だけ整える
              </button>
            </section>
            <section className="parent-card">
              <h2>
                <ShieldCheck /> 保存について
              </h2>
              <p className={saveOk ? 'storage-good' : 'storage-bad'}>
                {saveOk
                  ? 'この端末に自動保存しています。'
                  : 'このブラウザでは保存できません。'}
              </p>
              {recovered && (
                <p>
                  保存データを読み直しました。利用できる直前の記録から再開しています。
                </p>
              )}
              <p>
                ゲームの途中や庭の配置も保存します。ブラウザのデータ削除で記録が失われます。別の端末への同期はありません。
              </p>
            </section>
            <section className="parent-card">
              <h2>
                <Sparkles /> ホーム画面に追加
              </h2>
              <p>iPhone・iPad：Safariの共有メニュー →「ホーム画面に追加」。</p>
              <p>
                Android：Chromeのメニュー
                →「ホーム画面に追加」または「アプリをインストール」。
              </p>
              <p>
                初回は通信できる状態で開いてください。本番版は準備ができるとオフラインでも遊べます。
              </p>
            </section>
            <section className="parent-card play-guide">
              <h2>
                <Hand /> 遊び方のヒント
              </h2>
              <p>
                <strong>指のマークが「ここをさわってね」の目印です。</strong>
              </p>
              <p>
                果物はタップ、またはかごへドラッグ。洗車は丸い汚れをタップ・なぞる。お花は2回ずつ触ると咲きます。庭ではタップで反応、ドラッグで移動できます。
              </p>
              <p>
                8回で全種類がそろい、その後は庭の物が3段階に育ちます。途中でやめても続きから遊べます。
              </p>
            </section>
            <section className="parent-card reset-card">
              <h2>
                <RotateCcw /> 最初から遊び直す
              </h2>
              <p>
                なかま・くるま・おみやげ・庭の配置・お出かけの記録・設定を、この端末で最初の状態に戻します。取り消しはできません。
              </p>
              <button
                className="reset-button"
                onClick={() => {
                  setPhrase('');
                  setConfirm(true);
                }}
              >
                <RotateCcw /> ゲームをリセットする
              </button>
            </section>
          </div>
          {message && (
            <output className="parent-message">
              <Check />
              {message}
            </output>
          )}
        </>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="reset-confirm">
          <AlertDialogTitle>ゲームを最初の状態に戻しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            この端末のゲーム記録とバックアップを初期化します。元には戻せません。確認のため「リセット」と入力してください。
          </AlertDialogDescription>
          <label htmlFor="reset-phrase">確認のことば</label>
          <input
            id="reset-phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="リセット"
            autoComplete="off"
          />
          <div className="reset-actions">
            <AlertDialogCancel>やめる</AlertDialogCancel>
            <AlertDialogAction
              className="reset-button"
              disabled={phrase !== 'リセット'}
              onClick={() => {
                const ok = reset();
                setConfirm(false);
                setPhrase('');
                setMessage(
                  ok
                    ? 'リセットしました。最初のガレージから遊べます。'
                    : '保存できなかったため、リセットを完了できませんでした。ブラウザの保存設定をご確認ください。',
                );
              }}
            >
              リセットする
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
