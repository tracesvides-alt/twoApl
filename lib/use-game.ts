'use client';
/* eslint-disable react/react-compiler -- Hydrate a validated browser-only save once after the identical server/first-client render. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  freshGame,
  loadGame,
  saveGame,
  resetStoredGame,
  SAVE_KEY,
  transition,
  type Action,
  type Game,
} from './game';
export function useGame() {
  const [game, setGame] = useState<Game>(freshGame);
  const current = useRef(game);
  const [ready, setReady] = useState(false);
  const [saveOk, setSaveOk] = useState(true);
  const [recovered, setRecovered] = useState(false);
  useEffect(() => {
    try {
      const result = loadGame(window.localStorage);
      current.current = result.game;
      setGame(result.game);
      setRecovered(result.recovered);
      setSaveOk(result.available && saveGame(window.localStorage, result.game));
    } catch {
      setSaveOk(false);
    }
    setReady(true);
    const refresh = () => {
      try {
        const result = loadGame(window.localStorage);
        current.current = result.game;
        setGame(result.game);
        setRecovered(result.recovered);
        setSaveOk(result.available);
      } catch {
        setSaveOk(false);
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === SAVE_KEY || event.key === null) refresh();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);
  const send = useCallback((action: Action) => {
    const next = transition(current.current, action);
    if (next === current.current) return next;
    current.current = next;
    setGame(next);
    try {
      setSaveOk(saveGame(window.localStorage, next));
    } catch {
      setSaveOk(false);
    }
    return next;
  }, []);
  const reset = useCallback(() => {
    try {
      const initial = resetStoredGame(window.localStorage);
      if (!initial) {
        setSaveOk(false);
        return false;
      }
      current.current = initial;
      setGame(initial);
      setSaveOk(true);
      setRecovered(false);
      return true;
    } catch {
      setSaveOk(false);
      return false;
    }
  }, []);
  return { game, send, reset, ready, saveOk, recovered };
}
