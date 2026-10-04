import { characterImage } from '../art/characterImages';
import female from '../assets/placeholders/female.svg?raw';
import male from '../assets/placeholders/male.svg?raw';
import type { Person } from '../data/people';

/** First letters of the first two words of a name: "Keikain Runa" gives "KR". */
function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

interface PortraitProps {
  name: string;
  /** The character's profile, if they have one; it sets the tint and the placeholder. */
  person?: Person;
}

/**
 * A character's portrait: their image if one exists in assets/characters, otherwise the male or
 * female placeholder tinted in the group's colour. A name with no profile shows its initials.
 * The parent sets the size.
 */
export function Portrait({ name, person }: PortraitProps) {
  const image = characterImage(name);
  let content;
  if (image) {
    content = <img src={image} alt="" loading="lazy" draggable={false} />;
  } else if (person) {
    // Inlined, not linked, so the SVG picks up the page's colours. The markup is our own file.
    content = <span className="silhouette" dangerouslySetInnerHTML={{ __html: person.sex === 'f' ? female : male }} />;
  } else {
    content = <span className="initials">{initials(name)}</span>;
  }
  return (
    <span className={`portrait g-${person?.group ?? 'other'}`} aria-hidden="true">
      {content}
    </span>
  );
}
