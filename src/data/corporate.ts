/**
 * Corporate map: who owns, funds or pressures whom, and how that changes.
 *
 * Every change is tied to a timeline event id (`since`, `until`, `history`), so the map can be
 * stepped through in story order and each step links back to the timeline.
 */

export type CorpKind = 'person' | 'fund' | 'company' | 'project' | 'state' | 'outside';

export interface CorpNode {
  id: string;
  name: string;
  kind: CorpKind;
  /** Grid position: column (see CORP_COLUMNS) and row. */
  col: number;
  row: number;
  note: string;
  /** Real-world counterpart, where the novel has one. */
  real?: string;
  /** Event at which it enters the story. Omitted: present from the start. */
  since?: string;
  /** Event at which it is merged, sold, dissolved or wound up. */
  until?: string;
  /** Node it was merged into at `until`. */
  into?: string;
  /** Dated changes: [event id, what happened]. */
  history?: [string, string][];
}

export type CorpEdgeKind =
  | 'owns' // control
  | 'stake' // minority holding
  | 'option' // a right, not yet exercised
  | 'finance' // loans, collateral, rescue money, patronage
  | 'part' // belongs to the same group
  | 'pressure' // hostile bid or takeover pressure
  | 'family';

export interface CorpEdge {
  from: string;
  to: string;
  kind: CorpEdgeKind;
  label?: string;
  since?: string;
  until?: string;
}

export const CORP_EDGE_LABEL: Record<CorpEdgeKind | 'merged', string> = {
  owns: 'Owns or controls',
  stake: 'Minority stake',
  option: 'Right to bid',
  finance: 'Funding or rescue',
  part: 'Part of the group',
  pressure: 'Takeover pressure',
  family: 'Family tie',
  merged: 'Merged into',
};

/** Column titles, left to right. Keep them short: they sit above a node-wide column. */
export const CORP_COLUMNS = [
  'Runa',
  'Banks taken in',
  'Keika finance',
  'Trading and retail',
  'Property and rail',
  'Tech and culture',
  'Original Keika',
  'Rival groups',
];

export const corpNodes: CorpNode[] = [
  // Runa
  {
    id: 'runa', name: 'Keikain Runa', kind: 'person', col: 0, row: 1,
    note: 'Real owner of the Moonlight Fund. She acts through Tachibana and Ichijou and holds no office in any company on this map: the proxy control Koizumi later calls unaccountable.',
    history: [
      ['ledgers', 'Mortgages the estate for ¥500m.'],
      ['testimony', 'The Duke is announced as her guardian.'],
      ['adoption', 'Formally adopted, which makes the Fund contestable.'],
      ['qualified', '‘You simply aren’t qualified.’'],
    ],
  },
  {
    id: 'moonlight', name: 'Moonlight Fund', kind: 'fund', col: 0, row: 3, since: 'moonlight',
    note: 'Runa’s offshore vehicle, run through Tachibana and Ichijou. About ¥50bn by 1997, over ¥1 trillion in Volume 2, and an underground treasury of more than ¥10 trillion by Volume 5.',
    history: [
      ['moonlight', 'Turns ¥500m into about ¥50bn.'],
      ['kaitaku', 'Bids for Hokkaido Kaitaku Bank through a ‘California-based’ front.'],
      ['auction', 'Buys Keika Bank for ¥800bn as the only bidder.'],
      ['adoption', 'Iwazaki-instigated moves begin to take it from her.'],
      ['treasury', 'The treasury under Kudanshita Keika Tower holds over ¥10tn.'],
    ],
  },

  // Banks and brokers taken in
  {
    id: 'febank', name: 'Far Eastern Bank', kind: 'company', col: 1, row: 0, until: 'keikabank', into: 'keikabank',
    note: 'The Sakata bank of her father’s Far Eastern Group, where Runa demands the real ledgers and recruits Ichijou.',
    history: [
      ['ledgers', 'Runa asks for the real books and the secret accounts.'],
      ['fareastern', 'The Fund buys a 33% stake for ¥20bn.'],
      ['keikabank', 'Becomes part of Keika Bank.'],
    ],
  },
  {
    id: 'kaitaku', name: 'Hokkaido Kaitaku Bank', kind: 'company', col: 1, row: 1, since: 'kaitaku', until: 'keikabank', into: 'keikabank',
    real: 'Hokkaido Takushoku Bank, which failed on 17 November 1997',
    note: 'A city bank with ¥2.3tn of bad debt. Runa waits for ¥59 a share and bids ¥74.',
  },
  {
    id: 'lpcb', name: 'LPCB', kind: 'company', col: 1, row: 2, since: 'keikabank', until: 'keikabank', into: 'keikabank',
    real: 'Long-Term Credit Bank of Japan, nationalized in 1998',
    note: 'Follows Kaitaku into the merged bank under the same protocol.',
  },
  {
    id: 'nihoncredit', name: 'Nihon Credit Bank', kind: 'company', col: 1, row: 3, since: 'keikabank', until: 'keikabank', into: 'keikabank',
    real: 'Nippon Credit Bank, nationalized in 1998',
    note: 'Follows Kaitaku into the merged bank under the same protocol.',
  },
  {
    id: 'sankai', name: 'Sankai Securities', kind: 'company', col: 1, row: 5, since: 'sankai',
    real: 'Sanyo Securities, which failed in November 1997',
    note: 'The first rung of the ladder: the smallest failing broker, bought for the Bank of Japan special loan that comes with it. By Volume 5 the group’s broker is called Keika Securities.',
    history: [
      ['sankai', 'Bought under the Keika Rules.'],
      ['ichiyama', 'Absorbs the larger Ichiyama in a reverse merger.'],
    ],
  },
  {
    id: 'ichiyama', name: 'Ichiyama Securities', kind: 'company', col: 1, row: 6, since: 'ichiyama', until: 'ichiyama', into: 'sankai',
    real: 'Yamaichi Securities, which closed in November 1997',
    note: 'Hides ¥260bn through tobashi and has paid off corporate bouncers, so it cannot get a special loan of its own.',
  },

  // Keika finance
  {
    id: 'holdings', name: 'Keika Holdings', kind: 'company', col: 2, row: 0, since: 'kidnap',
    note: 'Presented as Japan’s first new-style bank holding company. Ichijou leads it. The wider group also includes Kyomei Bank, a regional lender built from parts of LPCB and Nihon Credit.',
    history: [
      ['kidnap', 'Announced at the launch party.'],
      ['sougou', 'Ichijou is confirmed as its head.'],
      ['exitplan', 'Ichijou plans to step back when it lists.'],
    ],
  },
  {
    id: 'keikabank', name: 'Keika Bank', kind: 'company', col: 2, row: 2, since: 'keikabank',
    note: 'Four banks merged on about ¥8tn of Bank of Japan special loans. Runa declines to manage it and takes a written right to bid when it is privatized.',
    history: [
      ['keikabank', 'Formed; Runa signs away control for a right to bid.'],
      ['teisei', 'Rescues Teisei Department Stores.'],
      ['auction', 'Bought by the Moonlight Fund for ¥800bn.'],
    ],
  },
  {
    id: 'trust', name: 'Keika Trust Bank', kind: 'company', col: 2, row: 4, since: 'trustaccount',
    note: 'Formed from three trust banks. It holds Runa’s hidden account in Sapporo, under Katsura Naoyuki.',
  },
  {
    id: 'state', name: 'The state', kind: 'state', col: 2, row: 6, since: 'sankai',
    note: 'Bank of Japan special loans carry the rescued banks, and their bad loans go to the Resolution and Collection Corporation. The state pays for the clean-up between Runa’s option and its exercise.',
    history: [
      ['sankai', 'A live special loan comes with Sankai.'],
      ['keikabank', 'Special loans approach ¥8tn: ‘effective nationalization’.'],
      ['auction', 'The ministry ‘urges’ domestic banks to finance Runa’s bid.'],
    ],
  },

  // Trading and retail
  {
    id: 'matsuno', name: 'Matsuno Trading', kind: 'company', col: 3, row: 0, since: 'matsuno', until: 'akamatsu', into: 'akamatsu',
    note: 'The Fund buys ¥180bn of its loans from its banks and steps into its management.',
  },
  {
    id: 'akamaru', name: 'Akamaru', kind: 'company', col: 3, row: 1, since: 'akamatsu', until: 'akamatsu', into: 'akamatsu',
    real: 'Marubeni (probable)',
    note: 'A trading house merged with Matsuno and Keika Corp.',
  },
  {
    id: 'akamatsu', name: 'Akamatsu Corporation', kind: 'company', col: 3, row: 2, since: 'akamatsu',
    note: 'The trading house under Toudou: ‘the blood vessels and nervous system’ between Hokkaido producers, the bank and retail. It trades Russian crude, which is what Iwazaki wants.',
    history: [
      ['akamatsu', 'Formed from Matsuno Trading, Akamaru and Keika Corp.'],
      ['shikoku', 'Buys Dog Express for ¥140bn.'],
      ['t72', 'Arms the northern alliance.'],
      ['adoption', 'Named as Iwazaki’s real target.'],
      ['saudi', 'Sells its 49% of a Saudi mining railway to the Americans.'],
    ],
  },
  {
    id: 'dogexpress', name: 'Dog Express', kind: 'company', col: 3, row: 3, since: 'shikoku',
    note: 'A logistics firm bought for ¥140bn to strengthen Akamatsu.',
  },
  {
    id: 'teisei', name: 'Teisei Department Stores', kind: 'company', col: 3, row: 4, since: 'teisei',
    note: 'About ¥1.75tn of bad debt from a bubble-era move into hotels and property. The rescue’s ad campaign gives Runa the name ‘Little Queen’.',
    history: [
      ['teisei', 'Rescued by Keika Bank.'],
      ['akamatsu', 'Becomes Akamatsu’s subsidiary.'],
      ['sougou', 'Takes in Sougou, with ¥630bn written off.'],
      ['hizen', 'Takes on the Hizen hypermarkets.'],
    ],
  },
  {
    id: 'sougou', name: 'Sougou', kind: 'company', col: 3, row: 5, since: 'sougou', until: 'sougou', into: 'teisei',
    real: 'Sogo, which went bankrupt in July 2000',
    note: 'The department-store chain most likely to fail, folded into Teisei.',
  },
  {
    id: 'hizen', name: 'Hizen', kind: 'company', col: 3, row: 6, since: 'hizen',
    real: 'Nagasakiya (probable), which failed in February 2000',
    note: 'A hypermarket chain with about ¥400bn of bad debt and stores in Hokkaido. It goes under Teisei.',
  },
  {
    id: 'airho', name: 'AIRHO', kind: 'company', col: 3, row: 7, since: 'akamatsu',
    note: 'A struggling Hokkaido low-cost airline, rescued with aircraft bought cheaply during the Asian crisis.',
  },

  // Property, rail, transport
  {
    id: 'fehotels', name: 'Far Eastern Hotels', kind: 'company', col: 4, row: 0,
    note: 'Carved out of the Far Eastern Group before its property arm files. Keika Hotels appears among the group’s companies later.',
    history: [['fareastern', 'Bought by the Fund for ¥30bn.']],
  },
  {
    id: 'fedev', name: 'Far Eastern Developments', kind: 'company', col: 4, row: 1, until: 'fareastern',
    note: 'The group’s property arm, allowed to fail on purpose: it repays down to ¥15bn and files for corporate rehabilitation.',
  },
  {
    id: 'felife', name: 'Far Eastern Life Insurance', kind: 'company', col: 4, row: 2,
    note: 'Its assets are the collateral the Fund borrows against, at a ‘Japan premium’.',
  },
  {
    id: 'railway', name: 'Keika Railway', kind: 'company', col: 4, row: 3, since: 'railway',
    note: 'A visible, respectable business core, kept apart from the ‘suspicious’ Moonlight Fund. Tachibana is its managing director.',
    history: [
      ['railway', 'Formed around the KYOSHO line.'],
      ['shikoku', 'Takes on Kagawa Railroad and proposes the Shikoku Shinkansen.'],
      ['bigboned', 'Koizumi’s ‘big-boned’ policies put the Shinkansen on the block.'],
      ['tvinterview', '‘And despite all that, we lost.’'],
    ],
  },
  {
    id: 'kyosho', name: 'KYOSHO Rapid Railway', kind: 'company', col: 4, row: 4, since: 'railway',
    real: 'Hokusō Railway (probable)',
    note: 'A debt-laden Tokyo to Chiba line bought for ¥100bn. Its loans are paid off at a stroke and fares are cut.',
  },
  {
    id: 'kagawa', name: 'Kagawa Railroad', kind: 'company', col: 4, row: 5, since: 'shikoku',
    real: 'Kotoden',
    note: 'It guarantees the loans of the Sougou store at its terminal, so the two have to be saved together.',
  },
  {
    id: 'shikokushinkansen', name: 'Shikoku Shinkansen', kind: 'project', col: 4, row: 6, since: 'shikoku',
    note: 'An Okayama to Takamatsu bullet train for about ¥400bn. Runa admits it will barely break even: ‘I’m after the Shikoku vote.’',
  },
  {
    id: 'shinjuku', name: 'Shinjuku Shinkansen', kind: 'project', col: 4, row: 7, since: 'tvinterview',
    note: 'About ¥2tn, paid as a lump sum. That payment is part of why the Fund is short of yen when the Furukawa bid comes.',
  },

  // Technology and culture
  {
    id: 'browser', name: 'The browser company', kind: 'company', col: 5, row: 0, since: 'browser',
    real: 'Yahoo! Japan',
    note: 'The Japanese arm of the US browser company. It lists at ¥2m a share and reaches ¥167.9m by February 2000.',
  },
  {
    id: 'opera', name: 'Keika Opera Company', kind: 'company', col: 5, row: 1, since: 'queennight',
    note: 'A failing opera company that asks for patronage. Tachibana admits the arrangement is partly for Runa’s protection.',
  },
  {
    id: 'machishita', name: 'Machishita Fund', kind: 'outside', col: 5, row: 2, since: 'furukawa',
    real: 'Murakami Fund (probable)',
    note: 'Bids for 33.4% of Furukawa Telecoms, backed by Iron Partners and Charles & Edward. The bid was arranged by Runa’s own people to make her stand down.',
  },
  {
    id: 'furukawatel', name: 'Furukawa Telecoms', kind: 'company', col: 5, row: 3, since: 'furukawa', until: 'keu', into: 'keu',
    real: 'Fujitsu',
    note: 'The target of the staged takeover fight in Volume 4.',
  },
  {
    id: 'shiyo', name: 'Shiyo Electric', kind: 'company', col: 5, row: 4, since: 'furukawa', until: 'keu', into: 'keu',
    note: 'The company Runa falls back to defending when she cannot fund the Furukawa fight.',
  },
  {
    id: 'portercon', name: 'Portercon', kind: 'company', col: 5, row: 5, since: 'keu', until: 'keu', into: 'keu',
    note: 'Named among the holdings of Keika Electronics Union.',
  },
  {
    id: 'keu', name: 'Keika Electronics Union', kind: 'company', col: 5, row: 6, since: 'keu',
    note: 'A merger of Japanese and American computer companies. While rival makers cut tens of thousands of jobs, it refrains.',
    history: [
      ['keu', 'Launched at a tower party where Runa eavesdrops on her own guests.'],
      ['layoffs', 'Refrains from the mass layoffs.'],
    ],
  },

  // Original Keika Group
  {
    id: 'duke', name: 'The Keikain ducal house', kind: 'person', col: 6, row: 0,
    note: 'Duke Kiyomaro heads the Keika Group. Her father’s Far Eastern Group was absorbed into it after his scandal. The Duke sells the original companies to Iwazaki because the house cannot staff a group that size.',
    history: [
      ['testimony', 'Kiyomaro is announced as Runa’s guardian.'],
      ['iwazakirefuse', 'The Choufuu Council meets as Iwazaki moves in.'],
      ['adoption', 'Kiyomaro adopts Runa and explains the sale.'],
      ['trial', 'The Kitayama branch tries to strip Runa’s rights.'],
    ],
  },
  {
    id: 'keikapharma', name: 'Keika Pharmaceuticals', kind: 'company', col: 6, row: 1, until: 'adoption', into: 'keikaiwazaki',
    note: 'The original group’s lead company, and the door Iwazaki comes through.',
    history: [['iwazakirefuse', 'Iwazaki Pharma proposes a merger: in effect, a takeover of the Keika Group.']],
  },
  {
    id: 'keikaiwazaki', name: 'Keika-Iwazaki Pharma', kind: 'company', col: 6, row: 2, since: 'adoption',
    note: 'The merged pharmaceutical company, meant to sit above Keika Holdings and Akamatsu. The map shows it from late 2001, when the merger is under way.',
    history: [['lunch', 'Merges with Hatabe at 4 : 3 : 3; a foreign giant could buy out the other two stakes.']],
  },
  {
    id: 'keikaothers', name: 'Keika Chemicals and others', kind: 'company', col: 6, row: 3, until: 'adoption', into: 'iwazakihonsha',
    note: 'Keika Chemicals, Keika Storage and Keika Maritime Insurance: the rest of the original companies, absorbed by Iwazaki.',
  },
  {
    id: 'keikacorp', name: 'Keika Corp', kind: 'company', col: 6, row: 4, until: 'akamatsu', into: 'akamatsu',
    note: 'The original group’s trading arm, merged into Akamatsu.',
  },

  // Rival groups
  {
    id: 'iwazakihonsha', name: 'Iwazaki Honsha', kind: 'outside', col: 7, row: 0, until: 'layoffs',
    real: 'The Mitsubishi group (loosely)',
    note: 'Parent company of the Iwazaki zaibatsu, which was never dissolved in this world. It dominates Karafuto.',
    history: [['layoffs', 'Iwazaki dissolves its own parent company, fearing public outcry.']],
  },
  {
    id: 'iwazakibank', name: 'Imperial Iwazaki Bank', kind: 'outside', col: 7, row: 1,
    real: 'Bank of Tokyo-Mitsubishi (probable)',
    note: 'One of the zaibatsu’s three pillars. Its president, Iwazaki Yashirou, asks Runa to bring her companies and join.',
    history: [['iwazakirefuse', 'Runa refuses: ‘There is still much I have left to do.’']],
  },
  {
    id: 'iwazakicorp', name: 'Iwazaki Corporation', kind: 'outside', col: 7, row: 2,
    note: 'The trading pillar. It instigates the moves against the Moonlight Fund, with a hidden third party whispering to it.',
  },
  {
    id: 'iwazakiheavy', name: 'Iwazaki Heavy Industries', kind: 'outside', col: 7, row: 3,
    note: 'The third pillar of the zaibatsu.',
  },
  {
    id: 'iwazakimotors', name: 'Iwazaki Motors', kind: 'outside', col: 7, row: 4,
    real: 'Mitsubishi Motors',
    note: 'A secret recall surfaces. The government wants to break it out of the zaibatsu and merge it with Teia Motor.',
  },
  {
    id: 'iwazakipharma', name: 'Iwazaki Pharma', kind: 'outside', col: 7, row: 5, until: 'adoption', into: 'keikaiwazaki',
    note: 'Proposes the merger with Keika Pharmaceuticals.',
  },
  {
    id: 'futaki', name: 'Futaki Bank', kind: 'outside', col: 7, row: 6,
    real: 'Sakura Bank (Mitsui), later Sumitomo Mitsui',
    note: 'Bank of the Futaki zaibatsu, the Teia group’s patron.',
    history: [
      ['megabanks', 'Merges with Yodoyabashi Bank to form Futaki-Yodoyabashi.'],
      ['layoffs', 'Its cross-shareholdings are found to violate the Antitrust Act.'],
    ],
  },
  {
    id: 'teia', name: 'Teia Motor Co.', kind: 'outside', col: 7, row: 7,
    real: 'Toyota (loosely)',
    note: 'Eiichi’s family company. It has saved so much it is called ‘Teia Bank’.',
    history: [
      ['engagement', 'The Duke calculates Runa’s engagement to its heir.'],
      ['recall', 'A merger with Iwazaki Motors is floated.'],
    ],
  },
];

export const corpEdges: CorpEdge[] = [
  { from: 'runa', to: 'moonlight', kind: 'owns', label: 'real owner', since: 'moonlight' },
  { from: 'duke', to: 'runa', kind: 'family', label: 'guardian, then father', since: 'testimony' },
  { from: 'felife', to: 'moonlight', kind: 'finance', label: 'collateral', since: 'moonlight' },

  { from: 'moonlight', to: 'fehotels', kind: 'owns', label: '¥30bn', since: 'fareastern' },
  { from: 'moonlight', to: 'febank', kind: 'stake', label: '33%', since: 'fareastern', until: 'keikabank' },
  { from: 'moonlight', to: 'sankai', kind: 'owns', label: 'Keika Rules', since: 'sankai' },
  { from: 'state', to: 'sankai', kind: 'finance', label: 'special loan', since: 'sankai', until: 'keikabank' },
  { from: 'moonlight', to: 'kaitaku', kind: 'owns', label: 'bid at ¥74', since: 'kaitaku', until: 'keikabank' },
  { from: 'moonlight', to: 'browser', kind: 'stake', since: 'browser' },

  { from: 'state', to: 'keikabank', kind: 'finance', label: '≈ ¥8tn special loans', since: 'keikabank', until: 'auction' },
  { from: 'moonlight', to: 'keikabank', kind: 'option', label: 'right to bid', since: 'keikabank', until: 'auction' },
  { from: 'moonlight', to: 'keikabank', kind: 'owns', label: '¥800bn, sole bidder', since: 'auction' },
  { from: 'keikabank', to: 'sankai', kind: 'part', label: 'securities arm', since: 'keikabank' },
  { from: 'holdings', to: 'keikabank', kind: 'part', since: 'kidnap' },
  { from: 'holdings', to: 'trust', kind: 'part', since: 'trustaccount' },

  { from: 'moonlight', to: 'matsuno', kind: 'finance', label: 'buys ¥180bn of loans', since: 'matsuno', until: 'akamatsu' },
  { from: 'moonlight', to: 'akamatsu', kind: 'owns', since: 'akamatsu' },
  { from: 'moonlight', to: 'airho', kind: 'finance', label: 'rescue', since: 'akamatsu' },
  { from: 'keikabank', to: 'teisei', kind: 'finance', label: 'rescue', since: 'teisei' },
  { from: 'akamatsu', to: 'teisei', kind: 'owns', label: 'subsidiary', since: 'akamatsu' },
  { from: 'teisei', to: 'hizen', kind: 'owns', since: 'hizen' },
  { from: 'akamatsu', to: 'dogexpress', kind: 'owns', label: '¥140bn', since: 'shikoku' },

  { from: 'moonlight', to: 'railway', kind: 'owns', since: 'railway' },
  { from: 'railway', to: 'kyosho', kind: 'owns', label: '¥100bn', since: 'railway' },
  { from: 'railway', to: 'kagawa', kind: 'owns', label: 'rescue', since: 'shikoku' },
  { from: 'railway', to: 'shikokushinkansen', kind: 'part', label: 'proposed', since: 'shikoku' },
  { from: 'railway', to: 'shinjuku', kind: 'part', label: '≈ ¥2tn', since: 'tvinterview' },

  { from: 'moonlight', to: 'opera', kind: 'finance', label: 'patronage', since: 'queennight' },
  { from: 'machishita', to: 'furukawatel', kind: 'pressure', label: '33.4% bid, staged', since: 'furukawa', until: 'keu' },
  { from: 'moonlight', to: 'shiyo', kind: 'stake', label: 'defended', since: 'furukawa', until: 'keu' },
  { from: 'moonlight', to: 'keu', kind: 'owns', since: 'keu' },

  { from: 'duke', to: 'keikapharma', kind: 'owns', until: 'adoption' },
  { from: 'duke', to: 'keikaothers', kind: 'owns', until: 'adoption' },
  { from: 'duke', to: 'keikacorp', kind: 'owns', until: 'akamatsu' },

  { from: 'iwazakihonsha', to: 'iwazakibank', kind: 'owns', until: 'layoffs' },
  { from: 'iwazakihonsha', to: 'iwazakicorp', kind: 'owns', until: 'layoffs' },
  { from: 'iwazakihonsha', to: 'iwazakiheavy', kind: 'owns', until: 'layoffs' },
  { from: 'iwazakipharma', to: 'keikapharma', kind: 'pressure', label: 'merger proposal', since: 'iwazakirefuse', until: 'adoption' },
  { from: 'iwazakicorp', to: 'akamatsu', kind: 'pressure', label: 'wants its Russian crude', since: 'adoption' },
  { from: 'iwazakicorp', to: 'moonlight', kind: 'pressure', label: 'moves to take the Fund', since: 'adoption' },
  { from: 'futaki', to: 'teia', kind: 'finance', label: 'patron group' },
  { from: 'teia', to: 'iwazakimotors', kind: 'pressure', label: 'merger plan', since: 'recall' },
];
