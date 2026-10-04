/** A storyline that runs across volumes. Events are listed by id; the loader sorts them by date. */
export interface Thread {
  id: string;
  name: string;
  /** Two or three sentences: what the thread argues and where it ends up. May carry spoiler markers (see lib/spoilers.ts). */
  summary: string;
  events: string[];
}

export const threads: Thread[] = [
  {
    id: 'accounting',
    name: 'The accounting argument',
    summary:
      'The series’ spine. Hidden losses at Ichiyama lead to book value against market value{v3}, then to Enron’s{v4} and WorldCom’s{v3} books{v4}, then to subprime{v1} and the night Lehthan Sisters falls.{v3} The glossaries draw the line themselves: the reforms were ‘not enough warning’.',
    events: ['pudding', 'ichiyama', 'ltcm', 'darklink', 'takenaga', 'geo', 'wci', 'subprime', 'subprimerefusal', 'layoffs', 'crash2008'],
  },
  {
    id: 'option',
    name: 'The option architecture',
    summary:
      'Runa declines to manage Keika Bank and takes a written right to bid instead: a call option on the banking system, with the state paying for the clean-up in between. She exercises it as the only bidder while Wall Street is busy with its hedge fund.',
    events: ['keikabank', 'russia', 'auction', 'ltcm'],
  },
  {
    id: 'convoy',
    name: 'The convoy system',
    summary:
      'Japan’s promise that no bank would fail really died in November 1997. Runa’s rescues keep the convoy afloat past that date, as its last escort ship{v3}, until Koizumi’s reforms sink it{v1}.',
    events: ['sankai', 'ichiyama', 'kaitaku', 'keikabank', 'teisei', 'megabanks', 'takenaga', 'bigboned', 'memoir', 'layoffs'],
  },
  {
    id: 'accountability',
    name: 'Accountability against proxy power',
    summary:
      'Acting through proxies starts as cleverness{v3}, becomes the lever others use against her{v4}, and ends in Koizumi’s ‘you simply aren’t qualified’{v1}.{v5} Volume 5 shows the game’s ruin depended on the very privilege he abolishes: the defeat was a rescue.',
    events: ['ledgers', 'testimony', 'lockedroom', 'adoption', 'furukawa', 'privilege', 'qualified', 'trial', 'downfall'],
  },
  {
    id: 'foreknowledge',
    name: 'Decaying foreknowledge',
    summary:
      'Every use of what she remembers changes the world she remembers. Her interventions move prices and people.{v3} 9/11 is redirected instead of prevented.{v5} By Volume 5 she is ‘not an omnipotent, omniscient god’.',
    events: ['moonlight', 'russia', 'stroke', 'caretaker', 'sept11trip', 'nuke', 'dirtybomb', 'sept11', 'okazaki', 'treasury'],
  },
  {
    id: 'adults',
    name: 'The adults managing Runa',
    summary:
      'From the two rooms at the Wise Dragon King’s Palace onward, the adults around her decide things without her: a hidden account and a private intelligence service{v4}, then a staged takeover{v5}, then surveillance presented as protection{v1}.',
    events: ['protection', 'trustaccount', 'tachibanahome', 'furukawa', 'withdraw', 'exitplan', 'embassy'],
  },
  {
    id: 'politics',
    name: 'The political arc',
    summary:
      'Hashizume to Fuchigami{v2}, a caretaker Izumikawa, Hayashi, then Koizumi{v4}, who is at once the structural antagonist, the man who catches her and the man who scolds her{v1}.',
    events: [
      'mofscandal', 'election98', 'fuchigamipm', 'knife', 'governor', 'stroke', 'lockedroom', 'caretaker',
      'hayashifall', 'aso', 'koizumiwins', 'takenaga', 'bigboned', 'privilege', 'qualified',
    ],
  },
  {
    id: 'moral',
    name: 'Runa’s moral line',
    summary:
      'She profits from silence in 1998.{v3} She cannot stop 9/11.{v4} She manufactures a whistleblower.{v5} She breaks on discovering her own nuclear reasoning, and refuses the subprime trade. The line she settles on is being the proximate cause.',
    events: ['russia', 'sept11', 'wci', 'subprimerefusal', 'treasury'],
  },
  {
    id: 'game',
    name: 'The game plot, revealed in stages',
    summary:
      'What the otome game’s downfall actually was keeps changing: a love triangle, a political purge, a spy-tinged takeover{v4}, a school reform vote{v5}, and finally a Karafuto law-haven scheme that collapses with the 2008 crisis{v1}.',
    events: ['debut', 'kidnap', 'concert', 'angela', 'dream', 'downfall', 'crash2008'],
  },
  {
    id: 'iwazaki',
    name: 'The Iwazaki absorption',
    summary:
      'The Iwazaki zaibatsu circles the Keika Group from Runa’s debut onward.{v3} The Duke sells the original Keika companies to it because his house cannot staff them, and its real target turns out to be Akamatsu.{v5} In Volume 5 Iwazaki dissolves its own parent company.',
    events: ['debut', 'darklink', 'iwazakirefuse', 'recall', 'adoption', 'lunch', 'layoffs'],
  },
  {
    id: 'runa',
    name: '‘What is Runa, actually?’',
    summary:
      'The running question. The villainess frame reads as a way of coping and of licensing her bets, not a belief; the attachment to this world is real and growing.{v5} ‘Poor Keikain Runa’ may be where she starts to separate herself from the original.',
    events: ['birth', 'pudding', 'queennight', 'avanti', 'mitsuya', 'sept11trip', 'cry', 'dream', 'exitplan', 'treasury', 'downfall'],
  },
];
