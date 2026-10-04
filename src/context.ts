import { createContext, useContext } from 'react';
import type { World } from './model/world';

/** The timeline as the reader's progress allows it to be seen (see model/world.ts). */
export const WorldContext = createContext<World | null>(null);

export function useWorld(): World {
  const world = useContext(WorldContext);
  if (!world) throw new Error('useWorld needs a WorldContext provider');
  return world;
}

/** What a glossary term in running text can do: preview its definition, or open its page. */
export interface TermActions {
  /** Show the definition beside `rect`; null hides it. */
  preview(id: string | null, rect?: DOMRect): void;
  open(id: string): void;
}

/** Null where terms should stay plain text, such as inside the pop-up itself. */
export const TermContext = createContext<TermActions | null>(null);
