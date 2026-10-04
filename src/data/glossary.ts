/**
 * Glossary: terms of Japanese finance and politics, and of the novel's own world.
 *
 * Wherever a term (or one of its aliases) appears in the side panel it is underlined, shows its
 * definition on hover, and opens its own page on click. Definitions follow §15 of the context
 * file; the few marked `general` are standard reference, not taken from the novel's glossaries.
 */
export interface Term {
  id: string;
  /** Heading of the entry. */
  term: string;
  /** Other spellings to match in text. The heading itself is matched too; accents and case are ignored. */
  aliases?: string[];
  /** The term in Japanese, or what an abbreviation stands for. */
  origin?: string;
  /** May carry spoiler markers (see lib/spoilers.ts). */
  definition: string;
  /** For terms the novel invents: the volume that introduces them. Hidden until then. */
  volume?: number;
  /** Standard reference, not from the novel's glossaries. */
  general?: boolean;
}

export const glossary: Term[] = [
  // Banking and rescue
  {
    id: 'convoy',
    term: 'Convoy system',
    aliases: ['convoy'],
    origin: 'gosō sendan hōshiki',
    definition:
      'The Finance Ministry’s post-war regime under which no bank was allowed to fail: capped interest rates, segmented business lines, branch licensing, administrative guidance and arranged rescue mergers. It effectively ended between November 1997 and 1998.',
  },
  {
    id: 'jusen',
    term: 'Jūsen',
    aliases: ['housing-loan companies', 'housing loan companies'],
    origin: 'jūtaku kin’yū senmon gaisha',
    definition:
      'Housing-loan specialist companies founded in the 1970s that drifted into commercial property lending. Their 1996 settlement used ¥685bn of public money, and the backlash made public funds for banks politically untouchable.',
  },
  {
    id: 'sokaiya',
    term: 'Sōkaiya',
    aliases: ['corporate bouncers', 'corporate bouncer'],
    definition:
      'Racketeers who extorted companies with the threat of disrupting shareholder meetings, and who were paid by management to silence other shareholders. The translation calls them ‘corporate bouncers’.',
  },
  {
    id: 'tobashi',
    term: 'Tobashi',
    definition: 'Hiding losses by shuttling them between accounts or entities across reporting dates.',
  },
  {
    id: 'mof-tan',
    term: 'MOF-tan',
    definition: 'A bank’s liaison to the Ministry of Finance: the employee whose job was to cultivate its officials.',
  },
  {
    id: 'amakudari',
    term: 'Amakudari',
    origin: '‘descent from heaven’',
    definition: 'The placing of retired bureaucrats in the firms they once supervised.',
  },
  {
    id: 'special-loan',
    term: 'BOJ special loan',
    aliases: ['BOJ special loans', 'Bank of Japan special loan', 'Bank of Japan special loans', 'special loan', 'special loans'],
    definition:
      'Unsecured emergency lending by the Bank of Japan at the government’s request. It needs no vote in the Diet, which is what makes it usable when public money is politically impossible.',
  },
  {
    id: 'rcc',
    term: 'RCC',
    aliases: ['Resolution and Collection Corporation'],
    origin: 'Resolution and Collection Corporation',
    definition:
      'The state’s bad-loan collector, formed in 1999 from the Jūsen collection body and the Resolution and Collection Bank.',
  },
  {
    id: 'keika-rules',
    term: 'Keika Rules',
    volume: 1,
    definition:
      'The terms Runa’s side sets for every rescue: dismiss the executives; punish malpractice; send all bad loans to the RCC; a capital reduction; a third-party allotment; and a BOJ special loan.',
  },
  {
    id: 'capital-reduction',
    term: 'Capital reduction',
    aliases: ['100% capital reduction'],
    definition:
      'Cancelling worthless shares so that the owners absorb losses first. At 100% the old shareholders are wiped out, and it is paired with a new share issue.',
  },
  {
    id: 'third-party-allotment',
    term: 'Third-party allotment',
    definition: 'New shares issued to a chosen investor instead of to the existing shareholders or the market.',
  },
  {
    id: 'reverse-merger',
    term: 'Reverse merger',
    definition:
      'A smaller entity absorbing a larger one, so that carrying values are reset while the survivor keeps its licences and loans.',
  },
  {
    id: 'call-market',
    term: 'Call market',
    definition: 'The interbank overnight lending market. A firm shut out of it cannot fund itself and fails within days.',
  },
  {
    id: 'japan-premium',
    term: 'Japan premium',
    definition: 'The surcharge foreign lenders charged Japanese banks in the late 1990s.',
  },
  {
    id: 'defect-warranty',
    term: 'Defect warranty',
    definition:
      'The clause in the sale of the Long-Term Credit Bank that let the buyer hand back loans which lost 20% or more of their value.',
  },
  {
    id: 'vulture',
    term: 'Vulture fund',
    aliases: ['vulture funds', 'hagetaka'],
    origin: 'hagetaka',
    definition: 'A buyer of distressed debt. In Japan the word was stretched to cover turnaround and buyout funds as well.',
  },

  // Accounting and markets
  {
    id: 'mark-to-market',
    term: 'Mark-to-market',
    aliases: ['current-value accounting', 'market-value accounting'],
    definition:
      'Carrying assets at their current price instead of what was paid for them (book value). The novel also calls it current-value accounting.',
  },
  {
    id: 'cross-shareholding',
    term: 'Cross-shareholding',
    aliases: ['cross-shareholdings'],
    definition: 'Shares that companies in the same group hold in one another. They act as a shield against takeover, and only work while nobody sells.',
  },
  {
    id: 'bspc',
    term: 'BSPC',
    aliases: ['Banks’ Shareholdings Purchase Corporation'],
    origin: 'Banks’ Shareholdings Purchase Corporation',
    definition: 'Set up in 2002 to buy the shares that banks were made to unwind.',
  },
  {
    id: 'big-bang',
    term: 'Financial Big Bang',
    aliases: ['Big Bang'],
    definition:
      'Hashimoto’s ‘Free, Fair, Global’ deregulation of 1996 to 2001. The ban on holding companies was lifted in 1997, and the deposit guarantee was capped at ¥10m plus interest in stages from 2002.',
  },
  {
    id: 'filp',
    term: 'FILP',
    aliases: ['Fiscal Investment and Loan Program'],
    origin: 'Fiscal Investment and Loan Program',
    definition: 'The ‘second budget’, funded by postal savings and insurance, that financed public works.',
  },
  {
    id: 'cds',
    term: 'CDS',
    aliases: ['credit default swap', 'credit default swaps'],
    origin: 'credit default swap',
    definition: 'Insurance against a borrower’s default, sold as a tradable contract. It was AIG’s undoing in 2008.',
  },
  {
    id: 'subprime',
    term: 'Subprime',
    aliases: ['subprime loans', 'subprime loan'],
    definition: 'Lending to borrowers with weak credit. Packaged into securities, these loans drove the 2008 crisis.',
  },

  // Politics
  {
    id: 'lists',
    term: 'Closed and open lists',
    aliases: ['closed list', 'open list', 'party list'],
    definition:
      'How the upper house fills its proportional seats. In 1998 the party set the ranking of its list (closed); since 2001 the candidates’ personal votes set it (open).',
  },
  {
    id: 'konin',
    term: 'Kōnin',
    aliases: ['tsuika kōnin', 'endorsement'],
    definition: 'A party’s endorsement of a candidate. Tsuika kōnin is endorsement granted after the election, to a winner who ran without it.',
  },
  {
    id: 'witness',
    term: 'Sworn and unsworn witnesses',
    aliases: ['shōnin kanmon', 'sankōnin', 'unsworn witness', 'sworn witness'],
    definition:
      'Shōnin kanmon is testimony before the Diet under oath, with liability for perjury. A sankōnin is an unsworn reference witness, who carries no such risk.',
  },
  {
    id: 'three-ban',
    term: 'Jiban, kanban, kaban',
    aliases: ['jiban', 'kanban', 'kaban'],
    definition: 'Support base, name and money: the ‘three ban’ a candidate needs in a Japanese election.',
  },
  {
    id: 'mikoshi',
    term: 'Mikoshi',
    definition: 'A portable shrine; in politics, a figurehead carried by others.',
  },
  {
    id: 'misogi',
    term: 'Misogi',
    definition: 'Ritual purification; in politics, an election treated as washing a scandal away.',
  },
  {
    id: 'kuromaku',
    term: 'Kuromaku',
    aliases: ['fixer'],
    origin: '‘black curtain’',
    definition: 'The power behind the curtain: a fixer who arranges outcomes without holding office.',
  },
  {
    id: 'gang-of-five',
    term: 'Gang of Five',
    aliases: ['Gonin Gumi'],
    origin: 'Gonin Gumi',
    definition: 'The five party leaders who chose Mori Yoshirō as Prime Minister behind closed doors in April 2000.',
  },
  {
    id: 'honebuto',
    term: '‘Big-boned’ policies',
    aliases: ['big-boned', 'honebuto no hōshin'],
    origin: 'honebuto no hōshin',
    definition:
      'The basic policy guidelines Koizumi’s Council on Economic and Fiscal Policy issued each June. Policy was decided first and the budget built around it, which took leverage away from the Finance Ministry.',
  },
  {
    id: 'cocom',
    term: 'CoCom',
    origin: 'Coordinating Committee for Multilateral Export Controls',
    definition: 'The Cold War regime that barred the West from exporting strategic technology to the Eastern bloc.',
  },

  // The novel's world
  {
    id: 'zaibatsu',
    term: 'Zaibatsu',
    general: true,
    definition:
      'Family-controlled conglomerates built around a holding company and a bank. The Occupation really dissolved them after 1945; in the novel’s world they were never dissolved.',
  },
  {
    id: 'peerage',
    term: 'Peerage',
    definition:
      'Japan’s titled nobility. Really abolished in 1947; here it survives, along with ‘lifelong peerages’ comparable to British life peers.',
  },
  {
    id: 'impunity',
    term: 'Impunity to arrest',
    aliases: ['impunity'],
    volume: 1,
    definition:
      'The nobles’ protection from arrest in criminal matters, with a form of diplomatic immunity created when the House of Peers became the House of Councilors. The glossary credits Runa’s grandfather with inventing it.',
  },
  {
    id: 'privy-council',
    term: 'Privy Council',
    definition: 'A noble institution that survives in the novel’s world. Its power is suspended, not repealed.',
  },
  {
    id: 'special-higher-police',
    term: 'Special Higher Police',
    origin: 'Tokkō',
    general: true,
    definition: 'Imperial Japan’s political police, which watched and suppressed dissent until 1945.',
  },
  {
    id: 'karafuto',
    term: 'Karafuto',
    definition:
      'Sakhalin. Split between Japan and Russia after the Russo-Japanese War; in the novel its Japanese south becomes Northern Japan and returns to Japan around 1990.',
  },
  {
    id: 'northern-japan',
    term: 'Northern Japan',
    aliases: ['People’s Democratic Republic of Northern Japan'],
    volume: 1,
    definition:
      'The People’s Democratic Republic of Northern Japan: a Soviet-aligned state with its own Ministry of National Security, which collapsed in the Winter Festival Revolution after the Berlin Wall fell.{v3} Volume 3 gives the full account: the USSR set it up in southern Karafuto, and the home islands were never divided.',
  },
  {
    id: 'manchurian-war',
    term: 'Manchurian War',
    volume: 1,
    definition: 'The narration’s counterpart to the Korean War, fought over a Manchuria that the Kuomintang holds with American and Japanese backing.',
  },
  {
    id: 'winter-festival',
    term: 'Winter Festival Revolution',
    aliases: ['Maslenitsa Revolution'],
    volume: 1,
    definition:
      'The coup by Northern Japan’s secret police during Maslenitsa, endorsed by the army, that let Japan occupy Karafuto. Abroad it is called the Maslenitsa Revolution.',
  },
  {
    id: 'otome-game',
    term: 'Otome game',
    aliases: ['otome'],
    general: true,
    definition:
      'A story-driven romance game in which a heroine wins one of several love interests. The villainess is the rival written to lose. Runa’s is ‘Love Where the Cherry Blossom Falls’.',
  },
  {
    id: 'quartet',
    term: 'The Quartet',
    aliases: ['Quartet'],
    volume: 1,
    definition: 'Runa, Teia Eiichi, Izumikawa Yuujirou and Gotou Mitsuya.',
  },
  {
    id: 'little-queen',
    term: 'Little Queen',
    volume: 1,
    definition: 'Runa’s public nickname, from the advertising campaign for the Teisei Department Stores rescue.',
  },
  {
    id: 'toyohara-girls',
    term: 'Toyohara girls',
    volume: 2,
    definition: 'Orphans trained as spies by Northern Japan. Toudou proposes recruiting them for a private intelligence service around Runa.',
  },
  {
    id: 'choufuu',
    term: 'Choufuu Council',
    volume: 2,
    definition: 'The council of the Keika Group’s company presidents. The name comes from kachōfūgetsu, ‘flower, bird, wind, moon’.',
  },
  {
    id: 'avanti',
    term: 'Avanti',
    volume: 2,
    definition: 'The café where the Quartet keeps its ritual of 22 December.',
  },
  {
    id: 'zashiki-warashi',
    term: 'Zashiki warashi',
    definition: 'A household spirit of Japanese folklore, usually a child, said to bring a home good fortune.',
  },
];
