import { createContext, useContext } from 'react';
import { FULL_WORLD, type World } from './data/world';

/** The data as the reader's progress allows it to be seen (see data/world.ts). */
export const WorldContext = createContext<World>(FULL_WORLD);
export const useWorld = () => useContext(WorldContext);

/** What a glossary term in running text can do: preview its definition, or open its page. */
export interface TermActions {
  /** Show the definition beside `rect`; null hides it. */
  preview(id: string | null, rect?: DOMRect): void;
  open(id: string): void;
}

/** Null where terms should stay plain text, such as inside the pop-up itself. */
export const TermContext = createContext<TermActions | null>(null);
