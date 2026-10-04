import { useWorld } from '../context';
import female from '../assets/placeholders/female.svg?raw';
import male from '../assets/placeholders/male.svg?raw';
import type { PersonDoc } from '../model/schema';

/** First letters of the first two words of a name: "Keikain Runa" gives "KR". */
function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

interface PortraitProps {
  name: string;
  /** The person's profile, if they have one; it supplies the picture, the tint and the placeholder. */
  person?: PersonDoc;
}

/**
 * A person's portrait: their picture if they have one, otherwise the male or female placeholder
 * tinted in their group's colour, otherwise their initials. The parent sets the size.
 */
export function Portrait({ name, person }: PortraitProps) {
  const world = useWorld();
  const hue = (person?.group && world.groupById.get(person.group)?.color) || 'gray';
  let content;
  if (person?.image) {
    content = <img src={person.image} alt="" loading="lazy" draggable={false} />;
  } else if (person?.sex) {
    // Inlined, not linked, so the SVG picks up the page's colours. The markup is our own file.
    content = <span className="silhouette" dangerouslySetInnerHTML={{ __html: person.sex === 'f' ? female : male }} />;
  } else {
    content = <span className="initials">{initials(name)}</span>;
  }
  return (
    <span className={`portrait hue-${hue}`} aria-hidden="true">
      {content}
    </span>
  );
}
