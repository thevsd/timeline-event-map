/** A storyline that runs across volumes. Events are listed by id; the loader sorts them by date. */
export interface Thread {
  id: string;
  name: string;
  /** Two or three sentences: what the thread argues and where it ends up. */
  summary: string;
  events: string[];
}

export const threads: Thread[] = [
  {
    id: 'accounting',
    name: 'The accounting argument',
    summary:
      'The series’ spine. Hidden losses at Ichiyama lead to book value against market value, then to Enron’s and WorldCom’s books, then to subprime and the night Lehthan Sisters falls. The glossaries draw the line themselves: the reforms were ‘not enough warning’.',
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
      'Japan’s promise that no bank would fail really died in November 1997. Runa’s rescues keep the convoy afloat past that date, as its last escort ship, until Koizumi’s reforms sink it.',
    events: ['sankai', 'ichiyama', 'kaitaku', 'keikabank', 'teisei', 'megabanks', 'takenaga', 'bigboned', 'memoir', 'layoffs'],
  },
  {
    id: 'accountability',
    name: 'Accountability against proxy power',
    summary:
      'Acting through proxies starts as cleverness, becomes the lever others use against her, and ends in Koizumi’s ‘you simply aren’t qualified’. Volume 5 shows the game’s ruin depended on the very privilege he abolishes: the defeat was a rescue.',
    events: ['ledgers', 'testimony', 'lockedroom', 'adoption', 'furukawa', 'privilege', 'qualified', 'trial', 'downfall'],
  },
  {
    id: 'foreknowledge',
    name: 'Decaying foreknowledge',
    summary:
      'Every use of what she remembers changes the world she remembers. Her interventions move prices and people, 9/11 is redirected instead of prevented, and by Volume 5 she is ‘not an omnipotent, omniscient god’.',
    events: ['moonlight', 'russia', 'stroke', 'caretaker', 'sept11trip', 'nuke', 'dirtybomb', 'sept11', 'okazaki', 'treasury'],
  },
  {
    id: 'adults',
    name: 'The adults managing Runa',
    summary:
      'From the two rooms at the Wise Dragon King’s Palace onward, the adults around her decide things without her: a hidden account, a private intelligence service, a staged takeover, and surveillance presented as protection.',
    events: ['protection', 'trustaccount', 'tachibanahome', 'furukawa', 'withdraw', 'exitplan', 'embassy'],
  },
  {
    id: 'politics',
    name: 'The political arc',
    summary:
      'Hashizume to Fuchigami, a caretaker Izumikawa, Hayashi, then Koizumi, who is at once the structural antagonist, the man who catches her and the man who scolds her.',
    events: [
      'mofscandal', 'election98', 'fuchigamipm', 'knife', 'governor', 'stroke', 'lockedroom', 'caretaker',
      'hayashifall', 'aso', 'koizumiwins', 'takenaga', 'bigboned', 'privilege', 'qualified',
    ],
  },
  {
    id: 'moral',
    name: 'Runa’s moral line',
    summary:
      'She profits from silence in 1998, cannot stop 9/11, breaks on discovering her own nuclear reasoning, and refuses the subprime trade. The line she settles on is being the proximate cause.',
    events: ['russia', 'sept11', 'wci', 'subprimerefusal', 'treasury'],
  },
  {
    id: 'game',
    name: 'The game plot, revealed in stages',
    summary:
      'What the otome game’s downfall actually was keeps changing: a love triangle, a political purge, a spy-tinged takeover, a school reform vote, and finally a Karafuto law-haven scheme that collapses with the 2008 crisis.',
    events: ['debut', 'kidnap', 'concert', 'angela', 'dream', 'downfall', 'crash2008'],
  },
  {
    id: 'iwazaki',
    name: 'The Iwazaki absorption',
    summary:
      'The Duke sells the original Keika companies to the Iwazaki zaibatsu because his house cannot staff them. Iwazaki’s real target turns out to be Akamatsu, and in Volume 5 Iwazaki dissolves its own parent company.',
    events: ['debut', 'darklink', 'iwazakirefuse', 'recall', 'adoption', 'lunch', 'layoffs'],
  },
  {
    id: 'runa',
    name: '‘What is Runa, actually?’',
    summary:
      'The running question. The villainess frame reads as a way of coping and of licensing her bets, not a belief; the attachment to this world is real and growing. ‘Poor Keikain Runa’ may be where she starts to separate herself from the original.',
    events: ['birth', 'pudding', 'queennight', 'avanti', 'mitsuya', 'sept11trip', 'cry', 'dream', 'exitplan', 'treasury', 'downfall'],
  },
];
