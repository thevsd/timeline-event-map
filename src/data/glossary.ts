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
      'The terms Runa’s side sets for every rescue: dismiss the executives; punish malpractice; send all bad loans to the RCC; a capital reduction; a third-party allotment; and a BOJ special loan.{v6} By 2003 they are precedent anyone may use: Imperial Iwazaki rescues Gowa Osan under them and sends its Karafuto-linked debts to the RCC.',
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
  {
    id: 'takenaka-plan',
    term: 'Takenaka Plan',
    aliases: ['Programme for Financial Revival', 'Financial Revival Program', 'seven-point programme'],
    general: true,
    definition:
      'The October 2002 programme that forced Japan’s big banks to value assets strictly and halve their bad-loan ratios by March 2005.{v4} In the novel Takenaga issues it in June 2002, with market-value accounting as a seventh point.',
  },
  {
    id: 'committed-line',
    term: 'Committed credit line',
    aliases: ['committed credit lines', 'committed line'],
    general: true,
    definition:
      'A lender’s binding promise to lend up to a set amount on demand, legalised for Japanese banks in 1999.{v6} Runa’s offer of a ¥1tn line to Gowa Osan would have made Keika a private lender of last resort.',
  },

  // Accounting and markets
  {
    id: 'mark-to-market',
    term: 'Mark-to-market',
    aliases: ['current-value accounting', 'market-value accounting'],
    definition:
      'Carrying assets at their current price instead of what was paid for them (book value). The novel also calls it current-value accounting.{v3} Runa explains it as ‘a new way of making money without any cash’, since it let Enron book a long contract’s projected profit on signing. The glossary names the Sarbanes-Oxley Act that followed, which ‘still didn’t work for Lehman Brothers’.{v6} In 2003 it forces banks and insurers to sell shares to cover paper losses, and the borrowers who fail are ‘victims of the current value accounting introduced this spring’.',
  },
  {
    id: 'consolidated-accounting',
    term: 'Consolidated accounting',
    aliases: ['consolidation accounting', 'consolidated accounts'],
    definition:
      'Accounts that add up a parent company and everything it controls. Japan made them the primary accounts in its 1999–2003 accounting reforms; the novel’s glossary notes that they ‘made it harder to separate accounts to hide losses — or hide profits’.{v6} In 2003 they force the off-book Moonlight Fund to take a legal shape.',
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
    definition:
      'Lending to borrowers with weak credit. Packaged into securities, these loans drove the 2008 crisis.{v5} Angela pitches it to Runa in winter 2002–03; Runa refuses to lead or short it and joins only through a capped car-loan consortium.{v6} After the yen trade Angela points the beaten hedge funds at it, and Runa lets it pass.',
  },
  {
    id: 'round-trip',
    term: 'Round-trip transactions',
    aliases: ['round-trip trades', 'round-tripping'],
    definition:
      '‘Multiple companies collude to repeat orders from each other and create fake sales.’ Enron and other energy traders used offsetting trades to inflate volume and revenue.',
  },
  {
    id: 'margin-call',
    term: 'Margin call',
    aliases: ['margin calls'],
    general: true,
    definition:
      'A demand for more collateral when a leveraged position loses value.{v3} General Energy Online’s collapsing share price brings margin calls from the very electricity market it created.',
  },
  {
    id: 'veto-stake',
    term: 'Veto stake',
    aliases: ['one-third stake', 'veto rights'],
    general: true,
    definition:
      'In Japanese company law, a holding above one-third lets a shareholder block special resolutions: mergers, charter changes, new share issues.{v4} The Machishita Fund bids for 33.4% of Furukawa Telecoms for that reason.',
  },
  {
    id: 'conglomerate-discount',
    term: 'Conglomerate discount',
    general: true,
    definition:
      'Investors value a sprawling group below the sum of its parts because they cannot see inside it.{v4} lunakeikain’s complaint about the Keika Group: ‘The stock market doesn’t appreciate them.’',
  },
  {
    id: 'galapagos',
    term: 'Galapagos syndrome',
    general: true,
    definition:
      'The standard term for Japanese products, above all mobile handsets, that evolved to suit only the home market.{v4} Runa wants Keika’s electronics to set the world standard instead.',
  },
  {
    id: 'reflexivity',
    term: 'Reflexivity',
    general: true,
    definition:
      'George Soros’s term for market beliefs changing the fundamentals they price.{v6} Runa’s yen trade works this way: her reputation is the signal the funds trade on.',
  },
  {
    id: 'bond-options',
    term: 'Bond options',
    volume: 6,
    definition:
      'The novel’s device for the yen trade: contracts to buy not-yet-issued US war bonds at ¥110 to the dollar, said to skip congressional approval. Real Treasury issues need no such approval, and the 5% commission is a story-sized fee.',
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
  {
    id: 'cefp',
    term: 'Council on Economic and Fiscal Policy',
    definition:
      'A cabinet council chaired by the prime minister, which Koizumi used to drive his reforms.{v2} In the novel he puts Ichijou on it as a private member.',
  },
  {
    id: 'antimonopoly',
    term: 'Antimonopoly Act',
    aliases: ['Fair Trade Commission'],
    definition:
      'Japan’s postwar competition law, imposed by the Allies alongside zaibatsu dissolution and enforced by the Fair Trade Commission. In the novel the zaibatsu survived, so the law is their oldest enemy.{v2} It blocks Runa twice in 2001.',
  },
  {
    id: 'land-sea-power',
    term: 'Land power and sea power',
    aliases: ['land power', 'sea power'],
    definition:
      'Mahan’s geopolitical pair, used by the glossary for two camps in Japanese politics: west-coast politicians with ‘a long relationship with the mainland’ lean to land power, while the American alliance made sea power the mainstream. Katou and the Hashizume Faction stand for land power, Izumikawa for sea power.{v5} The nationalists who court Runa ‘believe in… land power’.',
  },
  {
    id: 'wide-show',
    term: 'Wide show',
    general: true,
    definition:
      'Japanese daytime television mixing news and gossip, which shaped opinion in the Koizumi years.{v4} Vol. 4 Ch. 8 is a transcript of one.',
  },
  {
    id: 'chian-shutsudo',
    term: 'Public-security operation',
    aliases: ['public security operation', 'chian shutsudō'],
    origin: 'chian shutsudō',
    definition:
      'A deployment of the Self-Defense Forces to keep order when the police are insufficient, by the prime minister’s order or at a governor’s request. Never ordered in real postwar history.{v6} In the novel Koizumi orders one at Narita.',
  },
  {
    id: 'daf',
    term: 'DAF',
    aliases: ['Democratic Allied Fellowship'],
    origin: 'Democratic Allied Fellowship',
    volume: 5,
    definition:
      'The reorganised opposition party. Kanbe describes its base as ‘politicians, mass media, and agitators’. Plausibly the Democratic Party of Japan (the map’s identification).{v6} In the July 2003 election it campaigns on a manifesto and recovers proportional seats.',
  },
  {
    id: 'worker-dispatch-act',
    term: 'Worker Dispatch Act',
    aliases: ['dispatch amendment', 'Worker Dispatch amendment', 'dispatch work'],
    origin: 'rōdōsha haken hō',
    definition:
      'The law governing temporary workers sent by staffing agencies. An amendment passed in June 2003 opened manufacturing to dispatch work from March 2004.{v7} The novel’s glossary: ‘amended in 2003 and implemented on a very large scale’, a safety net during restructuring that ‘indirectly contributed to the lasting job drought afterward’. Runa resists the amendment, remembering her first life.',
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
      'The nobles’ protection from arrest in criminal matters, with a form of diplomatic immunity created when the House of Peers became the House of Councilors. The glossary credits Runa’s grandfather with inventing it. Ichijou: ‘Tax evasion is the crime for which that impunity is most often invoked.’ Runa’s side first uses it to protect a whistle-blower in 1997.{v4} A house may enrol dependants up to a quota fixed by its rank, judges them by its own rules and reports to the Privy Council; houses sell places to tax evaders. Kiyomaro invokes it after the raid on Keika Railway, and Koizumi tables a bill to end it in criminal cases.{v7} After the Karafuto Bank scandal it shelters the culprits and is widely resented; houses begin to waive it privately, as the Kaihouins do for their elder.',
  },
  {
    id: 'privy-council',
    term: 'Privy Council',
    definition:
      'A noble institution that survives in the novel’s world. Its power is suspended, not repealed.{v3} The glossary says its existence ‘is what allowed the nobles to exist until today’ and, with diplomatic immunity, lets nobles ‘continuously commit crimes’. A 2001 act makes the Deputy Prime Minister its chairman.{v4} Supposed to check noble immunity, it has left such matters to the families since the war. Chaired by Izumikawa, with Fuchigami a member, it is framed on television as a stronghold of the forces resisting Koizumi.{v5} Kanbe calls it ‘a bastion of fifty nobles’, enlarged in the 1990s; it fights the abolition of noble privilege.{v7} In autumn 2003 it stonewalls the Privy Council Reformation Act.',
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
      'The People’s Democratic Republic of Northern Japan: a Soviet-aligned state with its own Ministry of National Security, which collapsed in the Winter Festival Revolution after the Berlin Wall fell.{v3} Volume 3 gives the full account: the USSR set it up in southern Karafuto, and the home islands were never divided.{v7} Volume 7 dates its fall and unification to 1994.',
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
    definition:
      'Runa’s public nickname, from the Teisei Department Stores campaign, whose line was ‘Tell me what you want, Your Little Majesty’. Angela uses both forms in 1998.{v5} The US president addresses her as ‘Your Little Majesty’.',
  },
  {
    id: 'toyohara-girls',
    term: 'Toyohara girls',
    volume: 2,
    definition:
      'Orphans trained as spies by Northern Japan. Toudou proposes recruiting them for a private intelligence service around Runa; Ichijou calls it human trafficking, and Tachibana authorizes it in secret.{v5} The plan is carried out on Toudou’s timetable: the orphan ‘associates’ arrive as she enters junior high.',
  },
  {
    id: 'choufuu',
    term: 'Choufuu Council',
    volume: 1,
    definition:
      'The council of the Keika Group’s company presidents, set up as the group outgrows its founding company, alongside cross-shareholdings financed by the Moonlight Fund. ‘Keika’ supplies flower and moon; the name adds bird and wind, completing kachōfūgetsu, ‘flower, bird, wind, moon’.{v6} After Narita it becomes an incorporated foundation chaired by the Duke, holding 10% of Keika Holdings and 20% of Keika-Iwazaki-Hatabe Pharma and managing the group’s arts patronage.',
  },
  {
    id: 'avanti',
    term: 'Avanti',
    volume: 2,
    definition: 'The café where the Quartet keeps its ritual of 22 December.',
  },
  {
    id: 'super-j',
    term: 'Super-J',
    volume: 1,
    definition:
      'A near-perfect counterfeit yen note from the old Northern Japanese regime’s networks, blamed as ‘one cause of the bubble’s bursting’. The glossary says it is based on North Korea’s counterfeit dollar ‘supernotes’.',
  },
  {
    id: 'karafuto-bank',
    term: 'Karafuto Bank',
    volume: 1,
    definition:
      'Northern Japan’s former central bank, nationalised over bad debts after reunification.{v6} Run under the Karafuto prefecture and the Karafuto Reconstruction Agency, it was ‘the entrance and exit’ for Karafuto’s underground money. It paid the ransom in Runa’s kidnapping, opened the Anastasia account and funded the 2003 coup; in the game it was ‘the institution that controlled me’.',
  },
  {
    id: 'second-226',
    term: 'Second February 26 Incident',
    aliases: ['Second February 26th Incident'],
    volume: 2,
    definition:
      'This world’s postwar uprising of about 1967: a call from literary figures for a ‘Shōwa Restoration’ sets off a battalion that occupies central Tokyo and kills nobles and zaibatsu people, under slogans of dissolving the zaibatsu and breaking the privileged classes. The Imperial Police are disbanded afterwards.{v5} It was a coup by the imperial police and parts of the Self-Defense Forces, aimed in part at the Keikains; Hikomaro survived it. Its veterans were among those slated to attack the Shinjuku Geofront.{v7} Kanna Sera’s warning saved Hikomaro.',
  },
  {
    id: 'hinomaru',
    term: 'Hinomaru oil field',
    volume: 2,
    definition:
      'A Persian Gulf concession ‘between Kuwait and Saudi Arabia’. Runa keeps it in 2000 by paying for a ¥200bn Saudi mine railway that runs along Iraq’s southern border. Modelled on the Arabian Oil Company’s Khafji concession, which in reality lapsed.{v4} In 2002 the railway is sold.',
  },
  {
    id: 'kitakaba',
    term: 'Kitakaba Security',
    aliases: ['Kitakaba', 'Kitakaba Integrated Securities'],
    volume: 3,
    definition:
      'Runa’s private security and military company, staffed largely by former Northern Japanese soldiers. It supplies her armed maids, bodyguard units and the ‘Escort Guard for Her Little Majesty’.',
  },
  {
    id: 'geofront',
    term: 'Shinjuku Geofront',
    aliases: ['Shinjuku Geofront Project', 'Shinjuku Shinkansen'],
    volume: 3,
    definition:
      'A ¥1tn redevelopment around a new Shinjuku Shinkansen terminal, sponsored by Keika. Runa gets it approved in exchange for sending her company to Nepal, and it becomes a terrorist target.',
  },
  {
    id: 'offshore-town-act',
    term: 'Offshore Town Act',
    aliases: ['offshore towns', 'offshore town', 'ark city', 'ark cities'],
    volume: 3,
    definition:
      'A law, proposed by Ichijou and passed after 9/11, for gated towns built from old tankers, for Karafuto’s second-class citizens. A trial city at Kisarazu is planned for 10,000 people; an ‘ark city’ rises in Osaka Bay.',
  },
  {
    id: 'nagashima-doctrine',
    term: 'Nagashima Doctrine',
    origin: 'after Oda Nobunaga’s annihilation of the Nagashima Ikkō-ikki (1574)',
    volume: 3,
    definition:
      'In the novel, an anti-guerrilla doctrine of destroying fighters together with the local population, used by Japan in Vietnam and studied by the United States. The glossary takes it from Satou Daisuke’s novel Seito.{v5} Runa’s own narration states it as fact: ‘the act of bombing areas to destroy guerilla fighters alongside other local inhabitants’, used in this world’s Afghanistan alongside chemical and biological weapons.',
  },
  {
    id: 'k-card',
    term: 'K-Card',
    aliases: ['K-Cards', 'KeiCard', 'KeiCards'],
    volume: 4,
    definition:
      'Keika’s IC card, which serves as photo ID in Tokyo, Hokkaido and Karafuto.{v5} It merges the cards of Keika Holdings and Teisei with the Imperial Railway transit card, and gives undocumented Karafuto workers an ID and a bank account.',
  },
  {
    id: 'law-haven',
    term: 'Law haven',
    volume: 5,
    definition:
      'Per the novel’s glossary, a jurisdiction beyond extradition. The game’s Runa planned to make Karafuto ‘a special economic zone serving as a tax haven and law haven’ under noble privilege.',
  },
  {
    id: 'zashiki-warashi',
    term: 'Zashiki warashi',
    definition:
      'A household spirit of Japanese folklore, usually a child, said to bring a home good fortune.{v7} In the novel the Imperial Gakushuukan Academy was built as a feng-shui circle to make them from the souls of dead children, as luck for a nation catching up. Runa breaks it.',
  },

  // The academy
  {
    id: 'daimyo-procession',
    term: 'Daimyo’s Procession',
    volume: 2,
    definition:
      'Runa’s name for the academy’s self-government: high school over junior high over elementary, eight committees, and class representatives walking in procession between divisions.',
  },
  {
    id: 'courtiers',
    term: 'Courtiers',
    aliases: ['Courtiers’ Hall'],
    volume: 2,
    definition:
      'The academy’s clique of noble families, with its own clubhouse. In 2001 it offers Runa membership, the Privy Council’s support and help ‘if you ever wanted to create an independent state’.',
  },
  {
    id: 'badges',
    term: 'Gold, silver and bronze badges',
    aliases: ['gold badge', 'gold badges', 'silver badge', 'silver badges', 'bronze badge', 'bronze badges'],
    volume: 5,
    definition:
      'The academy’s ranks. Gold for pupils since elementary school (nobility, zaibatsu, political families); silver for junior-high entrants, mostly the gold badges’ retainers wearing their patron’s crest; bronze for high-school scholarship students.',
  },
  {
    id: 'seven-wonders',
    term: 'Seven Wonders',
    origin: 'nana fushigi',
    volume: 7,
    definition:
      'The Imperial Gakushuukan Academy’s ghost stories, which Kanna Mizuki investigates for Runa. Volume 7 settles three: the concert-hall mirror, the chain letters and the dormitory zashiki warashi.',
  },

  // Karafuto and the crisis of 2003
  {
    id: 'northern-karafuto',
    term: 'Northern Karafuto',
    volume: 2,
    definition:
      'The north of Sakhalin, disputed between Japan and Russia. High society believes the dispute is kept alive so that Runa can be rewarded with ‘my own country’ there, and Izumikawa becomes Minister for the Northern Karafuto Crisis.{v4} Koizumi opens peace-treaty talks with Russia over it.{v7} Soviet territory managed by Northern Japan, then seized and brought into Japan at reunification, it is claimed by both countries and governed by neither. Fugitives from the Karafuto Bank scandal plan a new state there, with Runa as its ruler.',
  },
  {
    id: 'reconstruction-agency',
    term: 'Karafuto Reconstruction Agency',
    volume: 6,
    definition:
      'The government body that, with the prefecture, oversees Karafuto’s restoration and Karafuto Bank, outside the Finance Ministry’s sight. It quietly absorbed the bank’s losses until prosecutors raided it in 2003.',
  },
  {
    id: 'anastasia',
    term: 'Anastasia account',
    volume: 6,
    definition:
      'A Swiss private-bank account opened by Karafuto Bank on Northern Japan’s orders, nominally to hold the Romanov family treasure until ‘a legitimate heir to the Romanov family emerged’. In fact a laundering system and the Russian mafia’s ‘piggy bank’.',
  },
  {
    id: 'gekkou',
    term: 'Gekkou Investment Firm',
    aliases: ['Gekkou'],
    origin: '‘moonlight’',
    volume: 6,
    definition:
      'A mainland ‘Moonlight Fund knockoff’ protected by Communist Party officials, which uses the Fund’s name for laundering and speculates against the yen. Okazaki believes it is backed by a Chinese sovereign wealth fund.',
  },
  {
    id: 'jnoc',
    term: 'Japan Petroleum Development Corporation',
    aliases: ['JNOC', 'Japan National Oil Corporation'],
    origin: 'the novel’s name for the Japan National Oil Corporation',
    volume: 6,
    definition:
      'The state oil-development corporation, which the glossary identifies with the real JNOC. METI plans to rebuild it around Keika’s resource arm; its affiliate Nichika Oil Development hides ¥2tn of losses.{v7} Volume 7 spells the affiliate ‘Nichikaba’.',
  },
  {
    id: 'keika-resource',
    term: 'Keika Resource Development',
    volume: 6,
    definition:
      'The company the Moonlight Fund becomes in 2003: the group’s resource core merged with the failed Nichika Oil Development as a Keika Corp subsidiary.{v7} Keika Corp holds 49.9%; Runa’s Swiss private-bank account holds the controlling 50.1%.',
  },
  {
    id: 'scavengers',
    term: 'Scavengers',
    aliases: ['scavenger'],
    volume: 7,
    definition:
      'Okazaki’s name for the Wall Street funds that follow the vultures, ‘vultures who feast on the bodies of other vultures’. They preach that businesses belong to shareholders and pressure the Keika Group by advertisement and by buying distressed bonds.',
  },
  {
    id: 'karafuto-special-zone',
    term: 'Karafuto Special Zone Act',
    aliases: ['Karafuto special zone'],
    volume: 7,
    definition:
      'Koizumi’s autumn 2003 bill to abolish the Karafuto Reconstruction Agency and make the region a special economic zone and a proving ground for deregulation, modelled on his real Special Zones for Structural Reform. Runa backs it.',
  },
  {
    id: 'privy-council-reform',
    term: 'Privy Council Reformation Act',
    volume: 7,
    definition:
      'The autumn 2003 bill to strip nobles of immunity from arrest, the ‘showpiece’ of Koizumi’s programme. The Privy Council stonewalls it.',
  },

  // Custom and history
  {
    id: 'bubuzuke',
    term: 'Bubuzuke',
    origin: 'rice with tea poured over it',
    definition:
      'In Kyoto, offering a guest bubuzuke is said to be a polite signal to leave. The glossary admits the origin may be apocryphal but says the convention is now real. Runa serves it to Angela Sullivan, who leaves it untouched.{v6} Tenmabashi eats his and asks for seconds.',
  },
  {
    id: 'oshikome',
    term: 'Oshikome',
    aliases: ['shukun oshikome'],
    origin: 'shukun oshikome',
    definition:
      'The Edo-period practice of vassals confining a lord they judged unfit.{v6} The coup plotters of 2003 mean to do it to Runa, with the Duke as their figurehead.',
  },
  {
    id: 'tozama',
    term: 'Shinpan, fudai and tozama',
    aliases: ['tozama', 'shinpan', 'fudai'],
    general: true,
    definition:
      'The Tokugawa ranks of daimyo: shinpan were the shogun’s kin, fudai hereditary vassals who ran the government from small domains, tozama outside lords with large domains far from power.',
  },
  {
    id: 'muko-yoshi',
    term: 'Muko yōshi',
    aliases: ['adopted son-in-law'],
    definition:
      'An adopted son-in-law who takes his wife’s family name and inherits the house.{v7} The glossary notes Kansai merchant families passing businesses through daughters this way.',
  },
  {
    id: 'imoni',
    term: 'Imoni',
    aliases: ['imoni party'],
    origin: 'imoni-kai',
    definition: 'A Yamagata autumn custom: taro stew cooked outdoors by a river. Shonai’s version uses pork and miso, inland Yamagata’s beef and soy sauce.',
  },
];
