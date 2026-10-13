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
      'The series’ spine. Ichiyama’s hidden losses and a homemade pudding explain book value against market value, and the frame scene ends on the night Lehthan Sisters falls.{v2} Market-value accounting becomes the new government’s weapon against her group.{v3} An American energy trader’s books collapse, and the glossaries say the reforms were ‘not enough warning’.{v4} She brings down a carrier’s books herself, and the volume ends on subprime{v5}, which she refuses to trigger.{v6} Consolidated accounting forces the Moonlight Fund to take a legal shape{v7}, and a Swiss 50.1% keeps it hers.',
    events: [
      'pudding', 'ichiyama', 'ltcm', 'darklink', 'takenaga', 'geo', 'wci', 'memoir', 'subprime',
      'subprimerefusal', 'layoffs', 'analytics', 'keikaresource', 'swiss501', 'crash2008',
    ],
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
      'Japan’s promise that no bank would fail really died in November 1997. Runa’s rescues keep the convoy afloat past that date, as its last escort ship.{v2} Koizumi’s reforms set out to sink it{v4}, and public funds for every megabank finish the job.{v6} When Japan Post opens and Keika Holdings lists, no one is left to rescue failing banks, and the last rescues land on other people’s balance sheets under her Keika Rules.{v7} Her rescues go on as purchases, and a magazine tallies them.',
    events: [
      'sankai', 'ichiyama', 'kaitaku', 'keikabank', 'teisei', 'megabanks', 'takenaga', 'bigboned',
      'memoir', 'privilege', 'layoffs', 'japanpost', 'mondayfailures', 'pandora', 'honamiteia',
      'hokkaidobuys',
    ],
  },
  {
    id: 'accountability',
    name: 'Accountability against proxy power',
    summary:
      'Acting through proxies starts as cleverness: a five-year-old demands the secret ledgers.{v2} Five people with a claim on her ask her politely to stop: Fuchigami, Nakamaro, Teia Kiichi, Kaoru and the Secretary of State.{v3} It becomes the lever others use against her{v4}, and ends in Koizumi’s ‘you simply aren’t qualified’, the first warning anyone can enforce.{v5} The game’s ruin turns out to depend on the very privilege he abolishes: the defeat was a rescue.{v6} Kanbe names the flaw (‘It’s your position that’s wrong’), the coup attacks exactly that gap, and she answers by giving her power formal shapes with other people in them.{v7} Wall Street’s funds take up the same critique in newspaper ads.',
    events: [
      'ledgers', 'testimony', 'lockedroom', 'reignin', 'proposal', 'florida', 'courtiers', 'adoption',
      'furukawa', 'keunion', 'talkshow', 'raid', 'privilege', 'qualified', 'trial', 'services',
      'downfall', 'position', 'oiltrap', 'keikaresource', 'scavengers',
    ],
  },
  {
    id: 'foreknowledge',
    name: 'Decaying foreknowledge',
    summary:
      'Every use of what she remembers changes the world she remembers: her interventions move prices and people.{v2} Eiichi tells her that Cassandra needed a way to stop Troy falling.{v3} An envoy tells her of a war she never knew, and 9/11 is redirected instead of prevented.{v5} Her rescues leave Japan’s banks healthy enough to walk into subprime, and she is ‘not an omnipotent, omniscient god’.{v7} Michimaro’s birth changes the succession, and the game’s line no longer holds.',
    events: [
      'moonlight', 'kaitaku', 'russia', 'stroke', 'caretaker', 'cassandra', 'sept11trip', 'adultsjob',
      'nuke', 'dirtybomb', 'colorado', 'sept11', 'okazaki', 'saudi', 'subprimerefusal', 'treasury',
      'avantiboys',
    ],
  },
  {
    id: 'adults',
    name: 'The adults managing Runa',
    summary:
      'From 1997 the adults around her decide things without her: her family lets the security police stage her kidnapping.{v2} Then come two rooms at the Wise Dragon King’s Palace, a hidden account, a private intelligence service and Tachibana’s secret.{v3} An attempt on her life is buried, her staff decide what she is told, and a city-wide sweep is timed to her absence: ‘a job for adults’.{v4} Then a staged takeover, two leaders who take her war from her, and exit dates planned behind her back.{v5} Tachibana hides the nationalists’ courtship, and the US embassy presents surveillance as protection.{v6} After Narita they stage a farce to keep her in place, and she chooses for herself not to learn who was behind it.{v7} Prosecutors reopen her father’s death and turn to Tachibana, and no one tells her.',
    events: [
      'staged', 'protection', 'trustaccount', 'tachibanahome', 'sniper', 'adultsjob', 'coup', 'geofront',
      'furukawa', 'withdraw', 'stainedhands', 'antiquity', 'exitplan', 'embassy', 'farce', 'punishment',
      'ignorance', 'policebanquet',
    ],
  },
  {
    id: 'politics',
    name: 'The political arc',
    summary:
      'Hashizume to Fuchigami, with Runa steering Izumikawa by a note and Koizumi learning her nickname.{v2} A caretaker Izumikawa makes Koizumi his secretary-general; Hayashi follows, then Koizumi wins, her own side’s creation.{v3} He catches her on 9/11{v4} and scolds her out of the war.{v5} Her policies are the old mainstream’s that he exists to destroy, and the governor’s people tried to turn her against him.{v6} In 2003 he bows to her on camera and wins a landslide{v7}, and the autumn bills leave the two of them in ‘something closer to mutually assured destruction’.',
    events: [
      'mofscandal', 'election98', 'fuchigamipm', 'koizumi98', 'knife', 'governor', 'stroke',
      'lockedroom', 'caretaker', 'hayashifall', 'aso', 'koizumiwins', 'takenaga', 'bigboned',
      'privilege', 'qualified', 'glowworm', 'katsucurry', 'election', 'autumnbills',
    ],
  },
  {
    id: 'moral',
    name: 'Runa’s moral line',
    summary:
      'She profits from silence in 1998.{v2} In 2000 she orders a railway toward a war she hopes will not come.{v3} She cannot stop 9/11.{v4} She manufactures a whistleblower, and a paper on Iraq breaks her.{v5} She confesses that the mass-casualty plan for Iraq was hers first; she refuses the subprime trade and joins it only at the edge. The line she settles on is not being the proximate cause.{v6} After the yen trade she records without objection that Angela has steered the defeated funds toward subprime.{v7} She will not buy the country’s luck with dead children.',
    events: [
      'russia', 'hinomaru', 'sept11', 'geo', 'wci', 'report', 'subprimerefusal', 'treasury', 'yentrade',
      'shrinemove',
    ],
  },
  {
    id: 'game',
    name: 'The game plot, revealed in stages',
    summary:
      'What the otome game’s downfall actually was keeps changing: a love triangle, and a policeman who will one day arrest her. The 2008 frame is not that ending: it is this world’s Runa, with a maid the game never had.{v2} A school reform movement she clashes with, and a declining house that spends her on a marriage{v4}, then a reform vote lost by one{v5}, a hidden financier, and finally a Karafuto law haven that collapses with the 2008 crisis.{v6} Karafuto Bank, the institution behind that haven, funds a coup against her, and she has its losses exposed by other hands.{v7} Shiori dreams the game’s ending from inside, and Michimaro’s birth removes the heirship the haven needed.',
    events: [
      'debut', 'kidnap', 'staged', 'concert', 'angela', 'daimyo', 'courtiers', 'foxbride', 'dream',
      'eiichicall', 'fortune', 'japanpost', 'downfall', 'pandora', 'chainletters', 'avantiboys',
      'festival', 'crash2008',
    ],
  },
  {
    id: 'iwazaki',
    name: 'The Iwazaki absorption',
    summary:
      'The Iwazaki zaibatsu circles the Keika Group from Runa’s debut onward.{v2} In June 2000 the original Keika companies pass to it on the day Runa is adopted, and she refuses to bring the rest.{v3} The Duke sold them because his house could not staff them. Its real target is Akamatsu’s Russian crude, the adoption is turned against her, and General Energy Online’s envelope would break up her group; she answers with a ¥35bn ‘wedding gift’ that leaves Iwazaki in her debt.{v5} Iwazaki directors are brought in to keep her in check, and Iwazaki dissolves its own parent company.{v6} It takes over Gowa Osan under her Keika Rules{v7}, and turns an imoni party into a marriage meeting that surrounds her staff.',
    events: [
      'debut', 'darklink', 'reignin', 'iwazakirefuse', 'recall', 'adoption', 'envelope', 'geo', 'trial',
      'lunch', 'layoffs', 'pandora', 'avantiboys', 'rakan',
    ],
  },
  {
    id: 'runa',
    name: '‘What is Runa, actually?’',
    summary:
      'The running question. The villainess frame reads as a way of coping and of licensing her bets, not a belief; the attachment to this world is real and growing, and the frame scene shows this world’s Runa reaching 2008.{v2} If she cannot be a villainess, ‘then… what was I?’{v3} On Mount Takao she decides she may live freely rather than play a role.{v4} At eleven she answers her six-year-old self’s tape: ‘Yes, I’m happy.’{v5} The friends who were never in the game hold her hand, and ‘Poor Keikain Runa’ is where she starts to separate herself from the original.{v6} Others answer by her uses: collateral, an empress consort, a leader without a title.{v7} She mourns the girl whose life she borrowed, singing Butterfly’s aria for a Runa who never chose her own end.',
    events: [
      'birth', 'pudding', 'schoolday', 'staged', 'queennight', 'avanti', 'mitsuya', 'cassandra',
      'sept11trip', 'takao', 'cry', 'foxbride', 'horse', 'dream', 'tape', 'exitplan', 'treasury',
      'downfall', 'dutyhappy', 'truegamble', 'librarystandoff', 'festival',
    ],
  },
  {
    id: 'romanov',
    name: 'Romanov blood as currency',
    summary:
      'Her mother was a Romanov sent as a honeytrap. One ad-libbed line, that the fund’s owner has Russian blood, makes the ancestry a market fact, and her real kidnappers answer to a Russian former prime minister drawn by ‘my wealth and Romanov blood’.{v3} A failed Russian coup wanted her as its figurehead, and Moscow calls her ‘the final oligarch’.{v5} The press calls the Moonlight Fund a Romanov front.{v6} A Swiss laundering account called Anastasia waits for a Romanov heir, and a European financier plans to send her to Russia as empress consort.{v7} Her own Swiss 50.1% is rumoured in Russia to hold the Romanovs’ secret assets, and Russian groups begin to target her.',
    events: [
      'birth', 'kaitaku', 'kidnap', 'russia', 'coup', 'bloated', 'anastasia', 'keikaresource',
      'frankfurt', 'swiss501', 'escortfarce',
    ],
  },
  {
    id: 'iraq',
    name: 'The Iraq war as her project',
    summary:
      'In February 2000 Runa pays for a Saudi railway along Iraq’s southern border, ‘before the eventual Iraq war would wipe it out’, and in 2001 she passes Afghan arms requests to Washington.{v3} Her loose-warhead evidence goes through every channel she has, and her staff read America’s next war off a map of Iraq.{v4} She provisions the war in advance, with a Bahrain base and advice to the president on when to invade, until Koizumi and Washington take it from her and the railway is sold.{v5} The mass-casualty plan turns out to have been hers; the war begins on 20 March 2003 and Iraq breaks in three, while her Russian crude profits throughout.{v7} By 2004 the UN is debating partition.',
    events: [
      'hinomaru', 'arms', 'nuke', 'coup', 'whitehouse', 'saltlake', 'withdraw', 'stainedhands', 'report',
      'saudi', 'midterms', 'oilbook', 'congress', 'treasury', 'iraqsplit', 'res1559',
    ],
  },
  {
    id: 'karafuto',
    name: 'Karafuto after reunification',
    summary:
      'Reunification brings Japan the North’s people and its debts: Karafuto Bank is nationalized, and Runa’s trading company joins a Karafuto gas project.{v2} The Courtiers offer help ‘if you ever wanted to create an independent state’, and Runa suspects she was always meant to be the sacrifice.{v3} A failed Russian coup wants her as figurehead{v4}, and Koizumi will not allow Karafuto’s independence ‘even as a federation’.{v5} The north becomes Japan’s low-wage interior and its orphans are bought as her retainers; the nobles renew their offer with ‘the guillotine’, and the game’s ruin turns out to be a Karafuto tax and law haven.{v6} Karafuto Bank is the gateway for laundered money, and its exposure breaks the opposition’s Karafuto strongholds.{v7} Its fugitives plan a new state with Runa at its head, Karafuto-born students are bullied, and the autumn bills bring a special zone she backs and a dispatch amendment she remembers from her first life.',
    events: [
      'reunification', 'karafutobank', 'combine', 'courtiers', 'coup', 'stainedhands', 'layoffs',
      'yubari', 'katsudon', 'teaparty', 'downfall', 'pandora', 'election', 'debate', 'northkarafuto',
      'autumnbills', 'bathroom', 'threebills', 'ciaresign',
    ],
  },
  {
    id: 'coup2003',
    name: 'Who controls the Keika Group',
    summary:
      'With Runa sidelined, the branch families hold a trial in her absence and want her rights; nobody can say who would run them, and her relatives spread the story that she is a puppet.{v6} In 2003 Tenmabashi warns of a coup: not one plot but rings of branch families, favour-seekers, executives, ministries, Karafuto Bank’s money and the opposition. It is beaten by the adults’ theatre, by institutions she concedes, by other people’s balance sheets and by Koizumi, whom the plotters made their enemy; its family wing is pacified, not gone.{v7} Michimaro will inherit the dukedom, and the succession no longer matches the game’s.',
    events: [
      'trial', 'angelacia', 'coupwarning', 'michimaro', 'bloated', 'fathers', 'distance', 'farce',
      'oiltrap', 'katsucurry', 'pandora', 'election', 'keikaresource', 'avantiboys',
    ],
  },
  {
    id: 'supernatural',
    name: 'Hotaru and the uncanny',
    summary:
      'Hotaru cannot be found at hide-and-seek, only the librarian ever finds her, and a warm dollhouse appears once and is never found again.{v3} At Fushimi Inari a fox bride lifts her mask and shows Runa her grown-up self.{v4} Cameras and heat sensors cannot see Hotaru, and a spirit owes her a favour.{v5} A fortune teller from Hikomaro’s past sends her heir to Runa’s class, and Hotaru chooses to become human.{v7} Hotaru was meant to be sacrificed as a guardian god, in a ritual with Hikomaro, to repair the academy: a feng-shui circle that turns dead children into national luck. Runa pays to break it, Hotaru becomes fully human, the fox god gives Runa a sickle, and the old man is placed under house arrest by his own house.',
    events: [
      'kindergarten', 'dollhouse', 'library', 'foxbride', 'hotaru', 'fortune', 'hotaruhuman',
      'oldmankyoto', 'mirror', 'zashiki', 'akiko', 'shrinemove', 'librarystandoff', 'dakiniten',
      'oldmanend',
    ],
  },
  {
    id: 'genius',
    name: 'One genius and a million prodigies',
    summary:
      'Professor Kanbe’s ‘economics of genius’ says a country gains if a million prodigies are sacrificed for one genius, and he takes Runa as the proof. She, one of the million in her first life, answers that the million make everything work; Angela warns that a person who can do anything could become a monster, and an envelope turns the theory into a plan to dismiss half her staff.{v4} Kanbe calls her a ‘gifted’ child who can avoid responsibility, and Koizumi tells her she simply isn’t qualified.{v5} Kanbe names the price of a return: ‘Be the one to bury the people you love.’{v6} Then he says the flaw is her position, not her choices.{v7} Paid to lecture the academy’s elite children, he teaches bribery and inequality, and she hears the idea ‘that had cut down everyone who was weak, including myself’.',
    events: [
      'kanbeseminar', 'guam', 'recall', 'envelope', 'kanbe', 'qualified', 'services', 'position',
      'debate', 'kanbeclass',
    ],
  },
  {
    id: 'security',
    name: 'The private security state',
    summary:
      'Toudou proposes a private intelligence service built from orphans the North trained as spies, and Tachibana authorizes it in secret.{v3} Rival spies join her household, her fortress rises, and the guards, detectives and bounty hunters she hires against nuclear terror become police subcontractors. A new law brings offshore towns and colour-ranked ID cards for second-class citizens, the police wonder whether her companies could become a second ‘imperial police’, and in Afghanistan licensed companies keep order.{v5} Five purchased orphans become her retainers.{v6} Narita shows that one escape path is not enough, and the routes are redrawn.{v7} The police reorganise to handle ‘the young lady’, and Washington sends Secret Service men as trainees.',
    events: [
      'trustaccount', 'spies', 'boss', 'tower', 'nuke', 'offshore', 'geofront', 'kandahar', 'yubari',
      'narita', 'punishment', 'policebanquet',
    ],
  },
];
