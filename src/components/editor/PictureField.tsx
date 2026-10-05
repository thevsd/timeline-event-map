import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motifSvg } from '../../art/illustration';
import { DEFAULT_MOTIF, MOTIF_GROUPS, MOTIF_NAMES, motifOf, type MotifSource } from '../../art/motifs';
import { ART_SCENES, ART_THEMES, HUES, type ArtDoc, type ArtScene, type ArtTheme, type Hue } from '../../model/schema';
import { formatSize } from '../../store/export';
import { dataUrlBytes, isEmbedded } from '../../store/images';
import { Illustration } from '../Illustration';

const THEME_LABEL: Record<ArtTheme, string> = { gradient: 'Gradient', night: 'Night', paper: 'Paper', solid: 'Solid' };
const SCENE_LABEL: Record<ArtScene, string> = { petals: 'Petals', stars: 'Stars', clouds: 'Clouds', plain: 'None' };

/** The library as the picker lists it: each pictogram with the text its search runs on. */
const LIBRARY = MOTIF_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  motifs: Object.entries(group.motifs as Record<string, MotifSource>).map(([name, motif]) => ({
    name,
    label: motif.label,
    haystack: `${name} ${motif.label} ${motif.keywords} ${group.label}`.toLowerCase(),
  })),
}));

const isWebAddress = (text: string) => /^https?:\/\/\S+\.\S+/i.test(text);

interface PictureFieldProps {
  /** Fixes where the decoration falls: the event's id. */
  seed: string;
  /** Colour of the event's category: the picture's colour unless it has one of its own. */
  categoryHue: Hue;
  motif: string;
  art: ArtDoc;
  image: string | undefined;
  figure: string;
  onMotif(name: string): void;
  onArt(art: ArtDoc): void;
  onImage(image: string | undefined): void;
}

/**
 * An event's picture: a pictogram from the library with its colour, theme and scene, or a
 * picture linked by its web address, which is then shown in the pictogram's place.
 *
 * The field is one row, showing the current choice, until it is clicked open: most events are
 * written without touching it.
 */
export function PictureField({ seed, categoryHue, motif, art, image, figure, onMotif, onArt, onImage }: PictureFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState(image && !isEmbedded(image) ? image : '');
  const [problem, setProblem] = useState('');
  const current = motifOf(motif) ? motif : DEFAULT_MOTIF;
  const hue = art.color ?? categoryHue;

  // Opens with the chosen pictogram in view; the list is long.
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = list.current;
    const chosen = box?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (box && chosen) box.scrollTop = chosen.offsetTop - (box.clientHeight - chosen.offsetHeight) / 2;
  }, [open]);

  // The closed row says what is chosen: the pictogram, then whatever differs from the default look.
  const linked = image && !isEmbedded(image);
  const look = [art.color && art.color[0]!.toUpperCase() + art.color.slice(1), art.theme && THEME_LABEL[art.theme], art.scene && SCENE_LABEL[art.scene]]
    .filter(Boolean)
    .join(' · ');
  const summary = linked ? 'Picture from the web' : isEmbedded(image) ? 'Stored picture' : (motifOf(current)?.label ?? '');
  const detail = image ? `Falls back to the pictogram: ${motifOf(current)?.label}` : look || 'Default look';

  // Every word typed must be found in a pictogram's name, label, keywords or group.
  const groups = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return LIBRARY.map((group) => ({ ...group, motifs: group.motifs.filter((entry) => words.every((word) => entry.haystack.includes(word))) })).filter(
      (group) => group.motifs.length,
    );
  }, [query]);

  /** Change one part of the look; a part set to its default is left out of the document. */
  const setArt = (change: Partial<ArtDoc>) => {
    const next: ArtDoc = { ...art, ...change };
    if (!next.color) delete next.color;
    if (!next.theme || next.theme === 'gradient') delete next.theme;
    if (!next.scene || next.scene === 'petals') delete next.scene;
    onArt(next);
  };

  const link = (text: string) => {
    setAddress(text);
    const trimmed = text.trim();
    if (isWebAddress(trimmed)) {
      onImage(trimmed);
      setProblem('');
    } else if (!trimmed) {
      // Clearing the address removes a linked picture, not one stored by an earlier version.
      if (!isEmbedded(image)) onImage(undefined);
      setProblem('');
    } else {
      setProblem('A web address starts with https://');
    }
  };

  const body = useId();
  return (
    <div className={open ? 'picture open' : 'picture'}>
      <button type="button" className="pichead" aria-expanded={open} aria-controls={body} onClick={() => setOpen(!open)}>
        <span className={`picthumb hue-${categoryHue}`}>
          <Illustration event={{ id: seed, image, motif: current, art }} />
        </span>
        <span className="picsummary">
          <b>{summary}</b>
          <small>{detail}</small>
        </span>
        <span className="picchange">{open ? 'Close' : 'Change'}</span>
      </button>
      {open && (
        <div className="picbody" id={body}>
          <div className={`picpreview hue-${categoryHue}`}>
            <Illustration event={{ id: seed, image, motif: current, art, figure: figure || undefined }} />
          </div>

          <div className="picrow">
            <input
              type="search"
              className="picsearch"
              placeholder={`Search ${MOTIF_NAMES.length} pictograms`}
              aria-label="Search pictograms"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="picname">{motifOf(current)?.label}</span>
          </div>
          <div ref={list} className={`motifs hue-${hue}`} role="radiogroup" aria-label="Pictogram">
            {groups.map((group) => (
              <div key={group.id} className="motifgroup">
                <span className="motifhead">{group.label}</span>
                <div className="motifgrid">
                  {group.motifs.map((entry) => (
                    <button
                      key={entry.name}
                      type="button"
                      role="radio"
                      aria-checked={entry.name === current}
                      aria-label={entry.label}
                      title={entry.label}
                      data-motif={entry.name}
                      className="motif"
                      onClick={() => onMotif(entry.name === DEFAULT_MOTIF ? '' : entry.name)}
                    >
                      {/* Markup comes from our own library, never from user input. */}
                      <span className="art theme-paper" dangerouslySetInnerHTML={{ __html: motifSvg(entry.name) }} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!groups.length && <span className="fhint">No pictogram matches “{query.trim()}”.</span>}
          </div>

          <div className="picoption">
            <span className="piclabel">Colour</span>
            <div className="hues" role="radiogroup" aria-label="Colour of the picture">
              <button type="button" role="radio" aria-checked={!art.color} className="pill auto" title="Follow the category’s colour" onClick={() => setArt({ color: undefined })}>
                Category
              </button>
              {HUES.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={art.color === name}
                  aria-label={name}
                  title={name}
                  className={`swatch-btn hue-${name}`}
                  onClick={() => setArt({ color: name })}
                />
              ))}
            </div>
          </div>
          <div className="picoption">
            <span className="piclabel">Theme</span>
            <div className="seg" role="radiogroup" aria-label="Theme of the picture">
              {ART_THEMES.map((name) => (
                <button key={name} type="button" role="radio" aria-checked={(art.theme ?? 'gradient') === name} data-theme-option={name} onClick={() => setArt({ theme: name })}>
                  {THEME_LABEL[name]}
                </button>
              ))}
            </div>
          </div>
          <div className="picoption">
            <span className="piclabel">Scene</span>
            <div className="seg" role="radiogroup" aria-label="Scene around the pictogram">
              {ART_SCENES.map((name) => (
                <button key={name} type="button" role="radio" aria-checked={(art.scene ?? 'petals') === name} data-scene-option={name} onClick={() => setArt({ scene: name })}>
                  {SCENE_LABEL[name]}
                </button>
              ))}
            </div>
          </div>

          <div className="picoption column">
            <span className="piclabel">Or a picture from the web</span>
            {isEmbedded(image) ? (
              <div className="picstored">
                <span className="fhint">This event has a stored picture ({formatSize(dataUrlBytes(image))}). Remove it to show the pictogram.</span>
                <button type="button" className="textbtn" onClick={() => onImage(undefined)}>
                  Remove
                </button>
              </div>
            ) : (
              <>
                <input type="url" className="imagelink" placeholder="https://…" aria-label="Web address of a picture" value={address} onChange={(e) => link(e.target.value)} />
                <span className={problem ? 'fhint bad' : 'fhint'}>
                  {problem || 'Shown in place of the pictogram. It needs a connection; when it cannot be loaded, the pictogram shows.'}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
