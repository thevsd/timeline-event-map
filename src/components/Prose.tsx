import { useContext, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { TermContext, useWorld } from '../context';
import { splitTerms } from '../lib/glossary';

interface ProseProps {
  text: string;
  /** Term to leave unmarked: the one whose page this is. */
  skip?: string;
}

/**
 * Running text with its glossary terms marked. A term shows its definition while hovered or
 * focused, and opens its page on click or Enter.
 */
export function Prose({ text, skip }: ProseProps) {
  const world = useWorld();
  const actions = useContext(TermContext);
  if (!actions) return <>{text}</>;

  return (
    <>
      {splitTerms(text, world, skip).map((part, i) => {
        const id = part.term;
        if (!id) return part.text;
        const show = (target: Element) => actions.preview(id, target.getBoundingClientRect());
        const hide = () => actions.preview(null);
        const open = () => {
          hide();
          actions.open(id);
        };
        return (
          // A span, not a button, so the term wraps with the sentence around it.
          <span
            key={i}
            className="term"
            role="button"
            tabIndex={0}
            data-term={id}
            onPointerEnter={(ev: PointerEvent<HTMLElement>) => show(ev.currentTarget)}
            onPointerLeave={hide}
            onFocus={(ev: FocusEvent<HTMLElement>) => show(ev.currentTarget)}
            onBlur={hide}
            onClick={open}
            onKeyDown={(ev: KeyboardEvent) => {
              if (ev.key !== 'Enter' && ev.key !== ' ') return;
              ev.preventDefault();
              open();
            }}
          >
            {part.text}
          </span>
        );
      })}
    </>
  );
}
