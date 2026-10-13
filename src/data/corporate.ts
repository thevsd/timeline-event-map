/**
 * Corporate map: who owns, funds or pressures whom, and how that changes (Vols. 1–7).
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
  /** May carry spoiler markers (see lib/spoilers.ts). */
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
  'Oil and resources',
  'Property and rail',
  'Tech and culture',
  'Original Keika',
  'Rival groups',
];

export const corpNodes: CorpNode[] = [
  // Runa
  {
    id: 'runa', name: 'Keikain Runa', kind: 'person', col: 0, row: 1,
    note: 'Real owner of the Moonlight Fund. She acts through Tachibana and Ichijou and holds no office in any company on this map{v4}: the proxy control Koizumi later calls unaccountable{v1}.',
    history: [
      ['ledgers', 'Mortgages the estate for ¥500m.'],
      ['testimony', 'The Duke is announced as her guardian.'],
      ['reignin', 'Formally adopted by Kiyomaro.'],
      ['adoption', 'Her adoption is now used to make the Fund contestable.'],
      ['qualified', '‘You simply aren’t qualified.’'],
      ['trial', 'The branch families try to take her rights; her stake is left alone until she is of age.'],
      ['coupwarning', 'Warned of a coup across the group to remove her.'],
      ['dakiniten', 'Funds a religious corporation to run the campus Inari shrine.'],
    ],
  },
  {
    id: 'moonlight', name: 'Moonlight Fund', kind: 'fund', col: 0, row: 3, since: 'moonlight',
    note: 'Runa’s offshore vehicle, run through Tachibana and Ichijou. About ¥50bn by 1997.{v2} Over ¥1 trillion in Volume 2.{v5} An underground treasury of more than ¥10 trillion by Volume 5.{v6} In 2003 consolidated accounting forces it to take a form: its office is cleared and its resource core becomes Keika Resource Development.{v7} The group chart still places it above the holding companies as ‘Financial Management’, and its Swiss account keeps 50.1% of that company.',
    history: [
      ['moonlight', 'Turns ¥500m into about ¥50bn.'],
      ['kaitaku', 'Bids for Hokkaido Kaitaku Bank through a ‘California-based’ front.'],
      ['swiss', 'Its secret: a Swiss account in Runa’s name.'],
      ['auction', 'Buys Keika Bank for ¥800bn as the only bidder.'],
      ['moscow', 'Supplies most of a $10bn loan to Russia, repaid in crude.'],
      ['hinomaru', 'Pays for the ¥200bn Saudi mine railway.'],
      ['adoption', 'Iwazaki-instigated moves begin to take it from her.'],
      ['geo', 'Buys Imperial Iwazaki Bank’s ¥35bn of GEO credit.'],
      ['keunion', 'Buys Portercon for $14.5bn.'],
      ['treasury', 'The treasury under Kudanshita Keika Tower holds over ¥10tn.'],
      ['analytics', 'Consolidated accounts show how much of the group rests on it.'],
      ['keikaresource', 'Its office is cleared; its resource core becomes Keika Resource Development.'],
      ['swiss501', 'Its Swiss account holds 50.1% of Keika Resource Development.'],
    ],
  },
  {
    id: 'floridaresort', name: 'Moonlight Florida Resort', kind: 'company', col: 0, row: 5, since: 'kingmaker', until: 'florida',
    note: 'A Florida company bought on Runa’s order during the 2000 campaign: a walled, privately policed town whose staff ‘would encourage others to support the presidential election’. Sold at a profit after the vote; its guards become the core of a military company.',
    history: [['florida', 'Sold at a profit after the election.']],
  },
  {
    id: 'zugagaga', name: 'Zugagaga Entertainment', kind: 'company', col: 0, row: 7, since: 'moratorium',
    real: 'Sega (the map’s identification)',
    note: 'A game company Runa buys for ¥50bn from her own pocket, between rounds at an Akihabara arcade.{v6} Karin Viola wants it inside Keika Electronics Union: ‘That company is the only one doing well.’',
    history: [
      ['moratorium', 'Bought for ¥50bn from Runa’s own money.'],
      ['techspree', 'Karin asks for it and for the Russian satellite company.'],
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
    note: 'A city bank with ¥2.3tn of bad debt. Runa waits for ¥59 a share and bids ¥74.{v7} The group’s ferry line, Keika Pacific Ferry, came with it.',
  },
  {
    id: 'lpcb', name: 'LPCB', kind: 'company', col: 1, row: 2, since: 'keikabank', until: 'keikabank', into: 'keikabank',
    real: 'Long-Term Credit Bank of Japan, nationalized in 1998',
    note: 'Follows Kaitaku into the merged bank under the same protocol.',
  },
  {
    id: 'nihoncredit', name: 'Nihon Credit Bank', kind: 'company', col: 1, row: 3, since: 'keikabank', until: 'keikabank', into: 'keikabank',
    real: 'Nippon Credit Bank, nationalized in 1998',
    note: 'Follows Kaitaku into the merged bank under the same protocol.{v2} Its old head office in Kudanshita is expected to become Runa’s headquarters.',
  },
  {
    id: 'kyomei', name: 'Kyomei Bank', kind: 'company', col: 1, row: 4, since: 'railway',
    note: 'An Osaka bank rescued into Keika Holdings in spring 2000 without public money, paid for by the Fund’s sales of tech shares.{v3} Its building across from Kudanshita Tower becomes dormitories.{v4} It grows quietly into a ‘superregional’ bank across Tokyo, Osaka and Hokkaido.',
  },
  {
    id: 'sankai', name: 'Sankai Securities', kind: 'company', col: 1, row: 5, since: 'sankai',
    real: 'Sanyo Securities, which failed in November 1997',
    note: 'The first rung of the ladder: the smallest failing broker, bought for the Bank of Japan special loan that comes with it.{v4} By 2002 the group’s broker is Keika Securities, which Angela is to head.',
    history: [
      ['sankai', 'Bought under the Keika Rules.'],
      ['ichiyama', 'Absorbs the larger Ichiyama in a reverse merger; the residue goes to the RCC.'],
      ['exitplan', 'Angela is to head it as Keika Securities, then Keika Holdings.'],
    ],
  },
  {
    id: 'ichiyama', name: 'Ichiyama Securities', kind: 'company', col: 1, row: 6, since: 'ichiyama', until: 'ichiyama', into: 'sankai',
    real: 'Yamaichi Securities, which closed in November 1997',
    note: 'Hides ¥260bn through tobashi and has paid off corporate bouncers, so it cannot get a special loan of its own.',
  },
  {
    id: 'shinden', name: 'Shinden Bank', kind: 'company', col: 1, row: 7, since: 'furukawa',
    real: 'Ashikaga Bank (the map’s identification), nationalized in November 2003',
    note: 'The Ashio zaibatsu’s failing main bank, taken into Keika Holdings for about ¥600bn under the Keika Rules. Other regional banks queue behind it: ‘We had the money, just not the manpower for it.’',
  },

  // Keika finance
  {
    id: 'holdings', name: 'Keika Holdings', kind: 'company', col: 2, row: 0, since: 'kidnap',
    note: 'Presented as Japan’s first new-style bank holding company, launched under the Ministry’s control.{v2} It opens in 2000 under Ichijou, takes in Osaka’s Kyomei Bank and adds Keika Life and an enlarged Keika Maritime.{v4} It is to list: 10% to a family foundation, 10% each to Akamatsu and Keika Railway, 19.9% kept by the Fund.{v6} Plotters plan a board coup in 2003; Angela is to succeed Ichijou.',
    history: [
      ['kidnap', 'Announced at the launch party, under the Ministry’s control.'],
      ['trustaccount', 'Tachibana nominates Ichijou to lead it.'],
      ['sougou', 'Ichijou is confirmed as its head for at least five years.'],
      ['railway', 'Opens as the first bank holding company since the ban was lifted; rescues Kyomei Bank.'],
      ['ftc', 'Absorbs two failed life insurers into Keika Life and enlarges Keika Maritime.'],
      ['takenaga', 'Nakamaro joins its board.'],
      ['furukawa', 'Its core-banking order is cancelled; Shinden Bank joins.'],
      ['reorg', 'To list, with stakes for a family foundation, Akamatsu, Keika Railway and the Fund; Nakamaro leaves the board.'],
      ['exitplan', 'Ichijou plans to step back when it lists.'],
      ['subprimerefusal', 'Angela’s plan opens its listing to foreign capital.'],
      ['bloated', 'The government insists it go public.'],
      ['coupwarning', 'A board coup is planned for June.'],
      ['mondayfailures', 'Takes Gowa Osan’s calls at a 1.5% premium; Tsukihi Life asks to join.'],
      ['oiltrap', 'The Choufuu foundation takes 10%.'],
    ],
  },
  {
    id: 'keikabank', name: 'Keika Bank', kind: 'company', col: 2, row: 2, since: 'keikabank',
    note: 'Four banks merged on about ¥8tn of Bank of Japan special loans. Runa declines to manage it and takes a written right to bid when it is privatized.{v2} Bought back, it is said to be worth over ¥3tn.',
    history: [
      ['keikabank', 'Formed; the Ministry appoints its president, and Runa signs away control for a right to bid.'],
      ['teisei', 'Rescues Teisei Department Stores.'],
      ['auction', 'Bought by the Moonlight Fund for ¥800bn.'],
      ['recall', 'Finances Ayukawa Motors’ purchase of Iwazaki Motors.'],
    ],
  },
  {
    id: 'trust', name: 'Keika Trust Bank', kind: 'company', col: 2, row: 4, since: 'trustaccount',
    note: 'Formed from three trust banks. It holds Runa’s hidden account in Sapporo, under Katsura Naoyuki.',
    history: [['analytics', 'Katsura is moved here to administer Runa’s assets.']],
  },
  {
    id: 'state', name: 'The state', kind: 'state', col: 2, row: 6, since: 'sankai',
    note: 'Bank of Japan special loans carry the rescued banks, and their bad loans go to the Resolution and Collection Corporation. The state pays for the clean-up between Runa’s option and its exercise.',
    history: [
      ['sankai', 'A live special loan comes with Sankai.'],
      ['keikabank', 'Special loans approach ¥8tn: ‘effective nationalization’.'],
      ['auction', 'The ministry ‘urges’ domestic banks to finance Runa’s bid.'],
      ['bloated', 'Presses Keika Holdings to list.'],
      ['oiltrap', 'METI offers to build a national oil company around Keika’s resource arm.'],
    ],
  },

  // Trading and retail
  {
    id: 'matsuno', name: 'Matsuno Trading', kind: 'company', col: 3, row: 0, since: 'matsuno', until: 'akamatsu', into: 'akamatsu',
    note: 'The Fund buys ¥180bn of its loans from its banks and steps into its management, with Toudou as managing director.',
    history: [['combine', 'Joins Iwazaki and Yodoyabashi in the Karafuto gas combine.']],
  },
  {
    id: 'akamaru', name: 'Akamaru', kind: 'company', col: 3, row: 1, since: 'akamatsu', until: 'akamatsu', into: 'akamatsu',
    real: 'Marubeni (probable)',
    note: 'A trading house merged with Matsuno and Keika Corp.',
  },
  {
    id: 'akamatsu', name: 'Akamatsu Corporation', kind: 'company', col: 3, row: 2, since: 'akamatsu',
    note: 'The trading house under Toudou: ‘the blood vessels and nervous system’ between Hokkaido producers, the bank and retail. It trades Russian crude{v3}, which is what Iwazaki wants{v1}.{v4} In 2002 it goes under one holding company with Teisen Ishii, Teimen and Kanegana, to merge as Keika Corp.{v6} Its resource division, the pillar of the Moonlight Fund, is spun off in 2003.',
    history: [
      ['akamatsu', 'Formed from Matsuno Trading, Akamaru and Keika Corp.'],
      ['moscow', 'Sells Russia’s repayment crude on to Europe.'],
      ['hinomaru', 'Takes the Gulf exploration company and half the Saudi railway.'],
      ['shikoku', 'Buys Dog Express for ¥140bn.'],
      ['t72', 'Arms the northern alliance.'],
      ['adoption', 'Named as Iwazaki’s real target.'],
      ['envelope', 'A plan surfaces to sell its resources division to Blackship Energy.'],
      ['teimen', 'Absorbs Teisen Ishii and Teimen; Kanegana’s cosmetics come to it.'],
      ['saudi', 'Sells its 49% of a Saudi mining railway to the Americans.'],
      ['oiltrap', 'Its resource division is spun off into Gulf Oil Development.'],
    ],
  },
  {
    id: 'dogexpress', name: 'Dog Express', kind: 'company', col: 3, row: 3, since: 'shikoku',
    note: 'A logistics firm bought for ¥140bn to strengthen Akamatsu.',
    history: [['sakata', 'Okazaki buys four-engine freighters for its Pacific cargo.']],
  },
  {
    id: 'teisei', name: 'Teisei Department Stores', kind: 'company', col: 3, row: 4, since: 'teisei',
    note: 'About ¥1.75tn of bad debt from a bubble-era move into hotels and property. The rescue’s ad campaign gives Runa the name ‘Little Queen’.{v4} In 2002 its store group moves under Keika Railway’s holding company.',
    history: [
      ['teisei', 'Rescued by Keika Bank from the paralyzed DK Bank.'],
      ['akamatsu', 'Becomes Akamatsu’s subsidiary.'],
      ['sougou', 'Takes in Sougou, with ¥630bn written off.'],
      ['hizen', 'Takes on the Hizen hypermarkets.'],
      ['reorg', 'Moves under Keika Railway’s new holding company.'],
      ['tirnanog', 'Launches Runa’s fashion brand, Tír na nÓg.'],
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
    real: 'Air Do',
    note: 'A struggling Hokkaido low-cost airline, rescued with aircraft bought cheaply during the Asian crisis.{v4} The first company Runa controlled directly to go into the red.',
    history: [['reorg', 'After losses since the attacks, moves under Keika Railway’s holding company.']],
  },
  {
    id: 'keikacorphd', name: 'Keika Corp Holdings', kind: 'company', col: 3, row: 8, since: 'teimen',
    note: 'One holding company over Akamatsu, Teisen Ishii, Teimen and Kanegana Textiles, to merge as Keika Corp in three years; Toudou asks for the name.{v6} In 2003 it names its officers: Toudou president, Tenmabashi vice-president, Okazaki managing director. Keika Resource Development becomes its subsidiary.{v7} It holds only 49.9% of that company, and the press now sees Keika Corp as the group’s centre.',
    history: [
      ['teimen', 'Planned: one holding company for four traders, to merge in three years.'],
      ['bloated', 'The four are merging into Keika Corp, based in Kansai Airport Rinkai Tower; the Fund stays outside.'],
      ['coupwarning', 'Tenmabashi is made vice-president to stop the coup.'],
      ['oiltrap', 'Officers named: Toudou, Tenmabashi, and Okazaki as managing director.'],
      ['keikaresource', 'Keika Resource Development becomes its subsidiary.'],
      ['swiss501', 'Holds 49.9% of Keika Resource Development and runs it.'],
    ],
  },
  {
    id: 'teisen', name: 'Teisen Ishii and Teimen', kind: 'company', col: 3, row: 9, since: 'teimen',
    real: 'Nissho Iwai and Nichimen',
    note: 'Two weak trading houses with ¥2.75tn of receivables and loans, much of it in Southeast Asia, swallowed at the government’s wish: ‘Fine, then. Let’s eat them up.’{v6} Tenmabashi, Keika Corp’s vice-president, comes from Teisen Ishii.',
  },
  {
    id: 'kanegana', name: 'Kanegana Textiles', kind: 'company', col: 3, row: 10, since: 'teimen',
    real: 'Kanebo',
    note: 'A textile firm about to fail over accounting fraud, its cosmetics arm propping up the losses; debts ¥350bn. The cosmetics are the real prize.{v7} Kanegana Cosmetics begs to supply Runa’s Tír na nÓg brand.',
    history: [['tirnanog', 'Its cosmetics arm wins the right to supply Runa’s brand.']],
  },
  {
    id: 'kitakaba', name: 'Kitakaba Security', kind: 'company', col: 3, row: 11, since: 'florida',
    note: 'A Sapporo military company of former Northern soldiers, bought outright by Runa in 2000 and run by Akamatsu’s resource division; its American arm is led by the Desert Hero.{v3} Its armed maids guard Kudanshita Tower.{v5} It buys orphans to train as her retainers and builds a camp at Yūbari.{v6} The group chart puts it under Keika Corp Holdings.',
    history: [['yubari', 'Builds a training camp at Yūbari, whose debts Keika and Iwazaki take on.']],
  },

  // Oil and resources
  {
    id: 'russia', name: 'Russian state', kind: 'state', col: 4, row: 0, since: 'moscow',
    note: 'Moscow borrows $10bn, mostly from the Moonlight Fund, and repays in crude that Akamatsu sells on to Europe. The crude trade turns the Fund’s dollars into yen.{v5} The Fund also pledges ¥200bn to Russia’s GLONASS satellites.',
    history: [
      ['moscow', 'The Moscow Declaration: a loan repaid in crude.'],
      ['moratorium', 'The Fund pledges ¥200bn to GLONASS.'],
    ],
  },
  {
    id: 'gascombine', name: 'Karafuto gas combine', kind: 'project', col: 4, row: 1, since: 'combine',
    note: 'A Karafuto gas project tying Ishikari Bay, Sakata and Niigata together, with Iwazaki, Yodoyabashi and Keika’s Matsuno Trading. Its Sakata end turns the Fund’s dollar profits into yen through oil stockpiling.',
  },
  {
    id: 'hinomaru', name: 'Hinomaru oil field', kind: 'project', col: 4, row: 2, since: 'hinomaru',
    real: 'Arabian Oil’s Khafji concession, which really lapsed in February 2000',
    note: 'A Gulf oil concession between Kuwait and Saudi Arabia. Runa keeps it by paying for the mine railway Riyadh demands; the exploration company comes under Akamatsu.',
  },
  {
    id: 'saudirail', name: 'Saudi mine railway', kind: 'project', col: 4, row: 3, since: 'hinomaru', until: 'saudi',
    real: 'The railway Riyadh asked Japan to build and pay for',
    note: 'A ¥200bn line from Dammam toward Hafar Al Batin, with a branch to King Khalid Military City: its route runs along Iraq’s southern border.{v4} Eighty per cent built when Akamatsu sells its 49% to the Americans, with Runa’s forecast priced in.',
    history: [['saudi', 'Akamatsu’s 49% is sold to the United States.']],
  },
  {
    id: 'gulfoil', name: 'Gulf Oil Development', kind: 'company', col: 4, row: 4, since: 'oiltrap', until: 'keikaresource', into: 'krd',
    note: 'Okazaki’s oil company. In July 2003 it absorbs Keika’s resource division, spun off from Akamatsu: the old core of the Moonlight Fund gets an organisational home.',
  },
  {
    id: 'krd', name: 'Keika Resource Development', kind: 'company', col: 4, row: 5, since: 'keikaresource',
    note: 'The Moonlight Fund’s resource core made into a company: Gulf Oil Development merged with the failed Nichika, run as a subsidiary of Keika Corp. Okazaki has checked it cannot be used to strip Runa of power.{v7} Keika Corp holds only 49.9%; the controlling 50.1% sits in an anonymous Swiss private-bank account, Runa’s, which Russian rumour says holds the Romanov treasure. It buys Imperial Metals and Chemicals.',
    history: [
      ['keikaresource', 'Formed, after a third of the Fund’s staff are poached.'],
      ['scavengers', 'Wall Street funds buy Nichikaba’s defaulted bonds, which could stall the merger.'],
      ['hokkaidobuys', 'Takes on ¥140bn of debt to buy Imperial Metals and Chemicals.'],
      ['swiss501', '49.9% Keika Corp, 50.1% an anonymous Swiss account.'],
    ],
  },
  {
    id: 'nichika', name: 'Nichika Oil Development', kind: 'company', col: 4, row: 6, since: 'oiltrap', until: 'keikaresource', into: 'krd',
    real: 'Possibly SODECO, the state oil corporation’s Sakhalin vehicle (the map’s guess)',
    note: 'An oil developer under the state’s Japan Petroleum Development Corporation, banked by Karafuto Bank and hiding about ¥2tn of losses. METI’s ‘oil queen’ offer would have made Keika carry them.{v7} Vol. 7 spells it Nichikaba, ‘Japan–Karafuto’.',
    history: [['pandora', 'Files under the Civil Rehabilitation Law with ¥2tn of debt.']],
  },
  {
    id: 'karafutobank', name: 'Karafuto Bank', kind: 'outside', col: 4, row: 7, since: 'karafutobank',
    note: 'The former central bank of Northern Japan, nationalized over bad debts after reunification.{v6} Run by the Karafuto prefecture and Reconstruction Agency, it is where restoration money slipped out of sight. In the game it was ‘the institution that controlled me’. The ransom in her kidnapping came from it, and so does the money behind the 2003 coup. It books a ¥2tn loss and is raided when Nichika fails.{v7} Its laundered money is traced to CIA funds, and the CIA director resigns.',
    history: [
      ['karafutobank', 'Nationalized over bad debts.'],
      ['japanpost', 'May be merged and swallowed by the Japan Post Bank; Runa has Ichijou look into it.'],
      ['coupwarning', 'Named as the money behind the coup.'],
      ['pandora', 'Books a ¥2tn loss; prosecutors raid it.'],
      ['ciaresign', 'Its laundered capital is traced to CIA funds.'],
    ],
  },
  {
    id: 'imc', name: 'Imperial Metals and Chemicals', kind: 'company', col: 4, row: 8, since: 'hokkaidobuys',
    real: 'Japan Metals & Chemicals (plausibly)',
    note: 'A ferroalloy maker in court reorganisation since 2002, once under Hachitomi Steel. Keika Resource Development takes on ¥140bn of its debt and supports it through the Sakata refinery.',
  },

  // Property, rail, transport
  {
    id: 'fehotels', name: 'Far Eastern Hotels', kind: 'company', col: 5, row: 0,
    note: 'Carved out of the Far Eastern Group before its property arm files. Her hotels own the cruise ship Actress.{v2} By 1999 it is Keika Hotels.{v4} In 2002 it goes under Keika Railway’s new holding company, with AIRHO and the Opera Company.',
    history: [
      ['fareastern', 'Bought by the Fund for ¥30bn.'],
      ['reorg', 'Moves under Keika Railway’s holding company.'],
      ['punishment', 'Hotels beside Narita and Haneda are bought as escape routes.'],
      ['hokkaidobuys', 'Keika Hotels takes on Suikan Hotel’s ¥34bn.'],
    ],
  },
  {
    id: 'fedev', name: 'Far Eastern Developments', kind: 'company', col: 5, row: 1, until: 'fareastern',
    note: 'The group’s property arm, allowed to fail on purpose: it repays down to ¥15bn and files for corporate rehabilitation.',
  },
  {
    id: 'felife', name: 'Far Eastern Life Insurance', kind: 'company', col: 5, row: 2,
    note: 'Its assets are the collateral the Fund borrows against, at a ‘Japan premium’.{v2} In late 2000 it absorbs two failed mutual life insurers and is renamed Keika Life, under Keika Holdings.',
    history: [['ftc', 'Absorbs two failed mutual life insurers and becomes Keika Life.']],
  },
  {
    id: 'railway', name: 'Keika Railway', kind: 'company', col: 5, row: 3, since: 'railway',
    note: 'A visible, respectable business core, kept apart from the ‘suspicious’ Moonlight Fund. Tachibana is its managing director.{v4} An unlisted holding company under it takes the hotels, AIRHO, Teisei, the ferries and the resorts.{v5} Tachibana hands the presidency to Mikihara Kazuaki.',
    history: [
      ['railway', 'Formed around the KYOSHO line.'],
      ['shikoku', 'Takes on Kagawa Railroad and proposes the Shikoku Shinkansen.'],
      ['ftc', 'Buys Buzen Transport and takes up the Shinjuku Shinkansen.'],
      ['bigboned', 'Koizumi’s ‘big-boned’ policies put the Shinkansen on the block.'],
      ['tvinterview', '‘And despite all that, we lost.’'],
      ['reorg', 'Freight lines in Nagoya and Osaka’s Naniwasuji line; it gets 10% of Keika Holdings.'],
      ['raid', 'Prosecutors search Tachibana and the company at dawn.'],
      ['trial', 'Tachibana becomes chairman without representation rights; Mikihara takes over.'],
      ['sakata', 'About ¥1.2tn of new lines and works, from the Rinkai Line to the Shin-Itaya Tunnel.'],
    ],
  },
  {
    id: 'kyosho', name: 'KYOSHO Rapid Railway', kind: 'company', col: 5, row: 4, since: 'railway',
    real: 'Hokusō Railway (probable)',
    note: 'A debt-laden Tokyo to Chiba line bought for ¥100bn. Its loans are paid off at a stroke and fares are cut.',
  },
  {
    id: 'kagawa', name: 'Kagawa Railroad', kind: 'company', col: 5, row: 5, since: 'shikoku',
    real: 'Kotoden',
    note: 'It guarantees the loans of the Sougou store at its terminal, so the two have to be saved together.',
  },
  {
    id: 'shikokushinkansen', name: 'Shikoku Shinkansen', kind: 'project', col: 5, row: 6, since: 'shikoku',
    note: 'An Okayama to Takamatsu bullet train for about ¥400bn. Runa admits it will barely break even: ‘I’m after the Shikoku vote.’',
    history: [['reorg', 'Finished by spring 2002.']],
  },
  {
    id: 'shinjuku', name: 'Shinjuku Shinkansen', kind: 'project', col: 5, row: 7, since: 'ftc',
    note: 'The unbuilt Shinjuku extension of the Tōhoku and Jōetsu Shinkansen, which Runa takes up ‘to do something for myself for a change’.{v3} Koizumi’s ‘big-boned’ policies put it on the block.{v4} It costs about ¥2tn, paid as a lump sum: part of why the Fund is short of yen when the Furukawa bid comes.',
    history: [
      ['bigboned', 'Lands on the chopping block.'],
      ['furukawa', 'The ¥2tn paid in one sum leaves the Fund short of yen.'],
    ],
  },
  {
    id: 'railwayhd', name: 'Keika Railway Holdings', kind: 'company', col: 5, row: 8, since: 'reorg',
    note: 'The unlisted second pillar formed in 2002: Keika Railway with the hotels and AIRHO, the Teisei store group, the ferries, the gated communities and the Kinugawa resort. Railways stay private: ‘They can’t be visualized from quarterly reports.’{v6} The group chart shows it as one of four holding companies; Keika Central Sakata is added.{v7} Its Keika Pacific Ferry buys Hokkaido Ferry for ¥70bn, and Moonlight Resorts takes over the Tomamu resort.',
    history: [
      ['reorg', 'Formed under Keika Railway.'],
      ['sakata', 'Keika Central Sakata, a twelve-storey station building, is built in Sakata.'],
      ['hokkaidobuys', 'Keika Pacific Ferry buys Hokkaido Ferry; Moonlight Resorts takes on Tomamu’s ¥22bn.'],
    ],
  },
  {
    id: 'hollandtown', name: 'Holland Town', kind: 'company', col: 5, row: 9, since: 'hollandtown',
    real: 'Huis Ten Bosch (the map’s identification)',
    note: 'A failing Dutch theme park carrying ¥200bn of Honami Bank’s bad debts. Mark Barnes suggests holding it for a century; Runa buys it as patronage and refuses to play queen.',
    history: [['mondayfailures', 'Angela routes the purchase through the Moonlight Fund, not Keika Holdings.']],
  },

  // Technology and culture
  {
    id: 'browser', name: 'The browser company', kind: 'company', col: 6, row: 0, since: 'browser',
    real: 'Yahoo! Japan',
    note: 'The Japanese arm of the US browser company. It lists at ¥2m a share and reaches ¥167.9m by February 2000.',
  },
  {
    id: 'opera', name: 'Keika Opera Company', kind: 'company', col: 6, row: 1, since: 'queennight',
    note: 'A failing opera company that asks for patronage. Tachibana admits the arrangement is partly for Runa’s protection.{v6} The group chart places it in the Keika Hotel Group.',
  },
  {
    id: 'machishita', name: 'Machishita Fund', kind: 'outside', col: 6, row: 2, since: 'furukawa',
    real: 'Murakami Fund (probable)',
    note: 'Bids for 33.4% of Furukawa Telecoms, backed by Iron Partners and Charles & Edward. The bid was arranged by Runa’s own people to make her stand down.',
    history: [['wci', 'Iron Partners abandons the bid.']],
  },
  {
    id: 'furukawatel', name: 'Furukawa Telecoms', kind: 'company', col: 6, row: 3, since: 'fieldtrip',
    real: 'Fujitsu',
    note: 'A telecoms and computer maker whose president Runa pressures in late 2001.{v4} The target of the staged takeover fight: Keika ends with 35% and joins it to Shiyo and Portercon.{v5} Inside Keika Electronics Union it declines and cuts 8,000 jobs.',
    history: [
      ['fieldtrip', 'Runa pressures its president.'],
      ['geo', 'Keika Holdings and Imperial Iwazaki agree to declare no confidence in him.'],
      ['tig', 'Eiichi begins buying its shares.'],
      ['furukawa', 'A hostile bid for 33.4%.'],
      ['keunion', 'Integrates with Shiyo, joined to Portercon; Keika holds 35%.'],
      ['layoffs', 'Cuts 8,000 jobs.'],
    ],
  },
  {
    id: 'shiyo', name: 'Shiyo Electric', kind: 'company', col: 6, row: 4, since: 'proposal',
    real: 'Sanyo Electric',
    note: 'An electronics maker Keika takes over in 2000; its batteries go into Keika Parts Manufacturing, beside Teia’s hybrid programme.{v4} Runa falls back to defending it when she cannot fund the Furukawa fight; Keika’s stake rises to 50% and it buys into Hope Memory.{v5} Its profits carry Keika Electronics Union.',
    history: [
      ['proposal', 'Taken over; its batteries go to Keika Parts.'],
      ['iwazakirefuse', 'Attends the Choufuu Council as an observer.'],
      ['wci', 'Takes just over 10% of Hope Memory and sells its large appliances; Keika’s stake reaches 50%.'],
    ],
  },
  {
    id: 'portercon', name: 'Portercon', kind: 'company', col: 6, row: 5, since: 'keunion',
    real: 'Compaq',
    note: 'America’s number-two PC maker, bought by the Fund for $14.5bn and joined to Furukawa and Shiyo.{v5} It needs another acquisition to pay its way.',
  },
  {
    id: 'keu', name: 'Keika Electronics Union', kind: 'company', col: 6, row: 6, since: 'keunion',
    note: 'Shiyo Electric, Furukawa Telecoms and Portercon in one electronics group under Karin Viola. ‘My main goal is cell phones.’{v5} While rival makers cut tens of thousands of jobs, it refrains.{v6} In 2003 it buys IBeM’s PC arm, parts of M-Rose and a Russian satellite company: ‘twenty billion dollars’ of wasteful ventures.',
    history: [
      ['keunion', 'Announced: Furukawa and Shiyo integrate, joined to Portercon.'],
      ['tigdata', 'Karin buys Runa’s half of TIG Backup Systems.'],
      ['keu', 'Launched at a tower party where Runa eavesdrops on her own guests.'],
      ['layoffs', 'Refrains from the mass layoffs.'],
      ['techspree', 'Buys IBeM’s PC business for about $1.3bn, Karin’s old employer and the best parts of M-Rose.'],
      ['scavengers', 'The group chart lists those purchases, a Russian satellite business and Keika Games.'],
    ],
  },
  {
    id: 'tigbackup', name: 'TIG Backup Systems', kind: 'company', col: 6, row: 7, since: 'tigbackup',
    note: 'The boys’ second company, built from Keika’s shelved core-banking system; Runa puts up half the capital, and Honami Bank is its first big customer. Karin Viola later buys Runa’s half.{v6} Runa is its vice-president; it sits in Keika Electronics Union.',
    history: [
      ['tigbackup', 'Founded; buys a US East Coast IT firm.'],
      ['tigdata', 'Karin buys Runa’s half; a failing LAN venture’s data centre is to be bought.'],
    ],
  },
  {
    id: 'keikaparts', name: 'Keika Parts Manufacturing', kind: 'company', col: 6, row: 8, since: 'proposal',
    real: 'Echigo Engineering is Niigata Engineering',
    note: 'Built from Ayukawa’s cast-off suppliers with Shiyo Electric’s batteries, alongside the rescued Echigo Engineering.{v3} It takes over the subcontractors cut loose from Iwazaki Motors.{v6} The group chart puts it, with Echigo Engineering, under Keika Corp Holdings.',
    history: [
      ['iwazakirefuse', 'Joins the Choufuu Council with Echigo Engineering.'],
      ['fieldtrip', 'A bankrupt Osaka firm is rescued into Echigo Engineering.'],
      ['recall', 'Takes over Iwazaki Motors’ cut-loose subcontractors.'],
    ],
  },

  // Original Keika Group
  {
    id: 'duke', name: 'The Keikain ducal house', kind: 'person', col: 7, row: 0,
    note: 'Duke Kiyomaro heads the Keika Group. Her father’s Far Eastern Group was absorbed into it after his scandal.{v2} In 2000 the original companies pass to Iwazaki.{v3} Kiyomaro sold them because the house cannot staff a group that size.{v6} The plotters of 2003 mean to make him their figurehead; instead he chairs the Choufuu Council’s new foundation.',
    history: [
      ['engagement', 'Nakamaro’s marriage to a marquess’s daughter tied to Iwazaki binds the house closer to that group.'],
      ['testimony', 'Kiyomaro is announced as Runa’s guardian.'],
      ['reignin', 'Adopts Runa; the original companies pass to Iwazaki.'],
      ['iwazakirefuse', 'The Choufuu Council meets as Iwazaki moves in.'],
      ['adoption', 'As her guardian Kiyomaro could direct the Fund, and declines to.'],
      ['trial', 'The Kitayama branch tries to strip Runa’s rights.'],
      ['lunch', 'The family sells half its pharma stake for ¥200bn.'],
      ['oiltrap', 'Kiyomaro chairs the Choufuu foundation.'],
    ],
  },
  {
    id: 'keikapharma', name: 'Keika Pharmaceuticals', kind: 'company', col: 7, row: 1, until: 'reignin', into: 'keikaiwazaki',
    note: 'The original group’s lead company, grown from the pharmaceutical family of Hikomaro’s wife.{v2} Iwazaki comes in through it: in June 2000 it merges with Iwazaki Pharma, the Keikains keeping ‘60 percent of the managerial rights’.',
    history: [
      ['testimony', 'Iwazaki Pharma proposes a merger: in effect, a takeover of the Keika Group.'],
      ['reignin', 'Merges with Iwazaki Pharma.'],
    ],
  },
  {
    id: 'keikaiwazaki', name: 'Keika-Iwazaki Pharma', kind: 'company', col: 7, row: 2, since: 'reignin',
    note: 'The merged drug maker. Iwazaki proposes putting it above Keika Holdings and Akamatsu; Runa refuses.{v5} It merges with Hatabe at 4 : 3 : 3, and Arts Nova takes 50.1%; it keeps its name, management and listing.{v6} The Choufuu foundation holds 20%.',
    history: [
      ['iwazakirefuse', 'Proposed as the top of a hierarchy over Keika Holdings and Akamatsu.'],
      ['maidprocession', 'The merger is reported as proceeding, with Keika-Iwazaki Chemicals beside it.'],
      ['reorg', 'Nakamaro returns to it from the bank’s board.'],
      ['lunch', 'Merges with Hatabe at 4 : 3 : 3; Arts Nova takes 50.1%.'],
    ],
  },
  {
    id: 'keikaothers', name: 'Keika Chemicals and others', kind: 'company', col: 7, row: 3, until: 'reignin', into: 'iwazakihonsha',
    note: 'Keika Chemicals, Keika Shipping and Keika Maritime Insurance: the rest of the original companies.{v2} Chemicals, Shipping and Storage pass to Iwazaki companies in June 2000; Keika Maritime stays and is enlarged under Keika Holdings.{v6} The group chart marks Keika-Iwazaki Chemical as ‘joined Iwazaki zaibatsu’.',
  },
  {
    id: 'keikacorp', name: 'Keika Corp', kind: 'company', col: 7, row: 4, until: 'akamatsu', into: 'akamatsu',
    note: 'The original group’s trading arm, merged into Akamatsu.{v4} Toudou later revives the name for the merged trader under Keika Corp Holdings.',
  },
  {
    id: 'choufuu', name: 'Choufuu Council', kind: 'fund', col: 7, row: 5, since: 'auction',
    note: 'The Keika Group’s presidents’ council, set up with cross-shareholdings financed by the Moonlight Fund.{v4} Runa calls it ‘a social gathering’.{v6} After Narita it becomes a foundation chaired by Kiyomaro, with 10% of Keika Holdings and 20% of Keika-Iwazaki-Hatabe Pharma: Tachibana’s ‘lifeboat’.',
    history: [
      ['auction', 'Formed, with cross-shareholdings financed by the Fund.'],
      ['iwazakirefuse', 'New members Keika Railway, Echigo Engineering and Keika Parts; Iwazaki Yashirou attends as an observer.'],
      ['oiltrap', 'Becomes an incorporated foundation chaired by Kiyomaro.'],
    ],
  },

  // Rival groups
  {
    id: 'iwazakihonsha', name: 'Iwazaki Honsha', kind: 'outside', col: 8, row: 0, until: 'layoffs',
    real: 'The Mitsubishi group (loosely)',
    note: 'Parent company of the Iwazaki zaibatsu, which was never dissolved in this world. It dominates Karafuto.',
    history: [
      ['reignin', 'Its companies absorb Keika Chemicals, Shipping and Storage.'],
      ['layoffs', 'Iwazaki dissolves its own parent company, fearing public outcry.'],
    ],
  },
  {
    id: 'iwazakibank', name: 'Imperial Iwazaki Bank', kind: 'outside', col: 8, row: 1,
    real: 'Bank of Tokyo-Mitsubishi (probable)',
    note: 'One of the zaibatsu’s three pillars.{v2} It is still the Keika Group’s main bank, not Keika Bank. Its president, Iwazaki Yashirou, asks Runa to bring her companies and join.{v6} It rescues Gowa Osan under the Keika Rules.',
    history: [
      ['iwazakirefuse', 'Runa refuses: ‘There is still much I have left to do.’'],
      ['geo', 'Sells its ¥35bn of GEO credit to the Fund: ‘a wedding gift’.'],
      ['pandora', 'Absorbs Gowa Osan under the Keika Rules, sending its Karafuto exposure to the RCC.'],
    ],
  },
  {
    id: 'iwazakicorp', name: 'Iwazaki Corporation', kind: 'outside', col: 8, row: 2,
    note: 'The trading pillar.{v3} It instigates the moves against the Moonlight Fund, with a hidden third party, General Energy Online, whispering to it.',
    history: [['envelope', 'Floats a plan to break up the Keika Group.']],
  },
  {
    id: 'iwazakiheavy', name: 'Iwazaki Heavy Industries', kind: 'outside', col: 8, row: 3,
    note: 'The third pillar of the zaibatsu.',
  },
  {
    id: 'iwazakimotors', name: 'Iwazaki Motors', kind: 'outside', col: 8, row: 4,
    real: 'Mitsubishi Motors',
    note: 'The zaibatsu’s carmaker.{v3} A secret recall surfaces. The government wants to break it out of the zaibatsu and merge it with Teia Motor; instead it leaves the zaibatsu and Ayukawa Motors buys it with Keika Bank’s money.',
    history: [['recall', 'Leaves the zaibatsu; Ayukawa Motors buys it, financed by Keika Bank.']],
  },
  {
    id: 'iwazakipharma', name: 'Iwazaki Pharma', kind: 'outside', col: 8, row: 5, until: 'reignin', into: 'keikaiwazaki',
    note: 'The zaibatsu’s drug maker.{v2} Proposes the merger with Keika Pharmaceuticals.',
  },
  {
    id: 'futaki', name: 'Futaki Bank', kind: 'outside', col: 8, row: 6,
    real: 'Sakura Bank (Mitsui), later Sumitomo Mitsui',
    note: 'Bank of the Futaki zaibatsu, the Teia group’s patron.{v6} It had cut Teia loose, leaving it without a main bank.',
    history: [
      ['megabanks', 'Merges with Yodoyabashi Bank to form Futaki-Yodoyabashi.'],
      ['layoffs', 'Its cross-shareholdings are found to violate the Antitrust Act.'],
    ],
  },
  {
    id: 'teia', name: 'Teia Motor Co.', kind: 'outside', col: 8, row: 7,
    real: 'Toyota (loosely)',
    note: 'Eiichi’s family company. It has saved so much it is called ‘Teia Bank’.{v6} In 2003 it takes Honami Bank into the group with a ¥1tn share allotment.',
    history: [
      ['engagement', 'The Duke calculates Runa’s engagement to its heir.'],
      ['recall', 'A merger with Iwazaki Motors is floated; it stays in the Futaki zaibatsu.'],
      ['honamiteia', 'Takes a ¥1tn allotment in Honami Bank.'],
    ],
  },
  {
    id: 'honami', name: 'Honami Bank', kind: 'outside', col: 8, row: 8, since: 'tigbackup',
    real: 'Mizuho',
    note: 'A megabank whose systems fail in spring 2002; the boys’ TIG Backup Systems is hired to help.{v6} It hunts for ¥1tn and wants Holland Town’s ¥200bn of bad debt gone. Teia Motor takes a ¥1tn allotment and Honami joins the Teia Group.',
    history: [
      ['tigdata', 'Runa walks into its machine room; TIG and Furukawa withdraw from its system.'],
      ['hollandtown', 'Wants ¥200bn of Holland Town debt off its books.'],
      ['honamiteia', 'Joins the Teia Group.'],
    ],
  },
  {
    id: 'gowaosan', name: 'Gowa Osan Bank', kind: 'outside', col: 8, row: 9, since: 'japanpost', until: 'pandora', into: 'iwazakibank',
    real: 'UFJ',
    note: 'A megabank behind on its bad debts and in trouble for resisting its audit, to be broken up ‘as an example’. Locked out of the call market, it sells its calls to Keika at a 1.5% premium; Imperial Iwazaki rescues it under the Keika Rules.',
    history: [
      ['mondayfailures', 'Three borrowers fail for over ¥2tn; Keika takes its calls at +1.5%.'],
      ['pandora', 'A relief merger into Imperial Iwazaki Bank.'],
    ],
  },
  {
    id: 'artsnova', name: 'Arts Nova', kind: 'outside', col: 8, row: 10, since: 'lunch',
    real: 'Novartis (probable)',
    note: 'A foreign drug giant. Nakamaro sells it control of Keika-Iwazaki-Hatabe Pharma rather than let Runa fight Charles & Earhart’s offer.',
  },
  {
    id: 'geo', name: 'General Energy Online', kind: 'outside', col: 8, row: 11, since: 'kingmaker', until: 'geo',
    real: 'Enron',
    note: 'America’s most admired energy trader. Runa hands its CEO a California water scheme built to fail.{v3} Through Iwazaki Corporation it pushes a plan to break up the Keika Group and sell Akamatsu’s resources to its Japan arm, Blackship Energy. Then it files for Chapter 11.',
    history: [
      ['kingmaker', 'Runa gives its CEO a doomed water scheme.'],
      ['envelope', 'Revealed as the third party behind the break-up plan.'],
      ['geo', 'Files for Chapter 11.'],
    ],
  },
  {
    id: 'teikoku', name: 'Teikoku Telephone', kind: 'outside', col: 8, row: 12, since: 'furukawa',
    real: 'NTT',
    note: 'Japan’s telephone giant. It is behind the Furukawa bid and has every systems vendor cancel Keika Holdings’ core-banking order: ‘Get that young lady under control.’',
    history: [
      ['wci', 'Its syndicate ends with just under 35% of Furukawa.'],
      ['keunion', 'Answers the Portercon deal by announcing a rescue of WCI.'],
    ],
  },
];

export const corpEdges: CorpEdge[] = [
  { from: 'runa', to: 'moonlight', kind: 'owns', label: 'real owner', since: 'moonlight' },
  { from: 'duke', to: 'runa', kind: 'family', label: 'guardian, then father', since: 'testimony' },
  { from: 'felife', to: 'moonlight', kind: 'finance', label: 'collateral', since: 'moonlight' },
  { from: 'runa', to: 'kitakaba', kind: 'owns', label: 'bought outright', since: 'florida' },
  { from: 'runa', to: 'zugagaga', kind: 'owns', label: '¥50bn, own money', since: 'moratorium' },
  { from: 'runa', to: 'tigbackup', kind: 'stake', label: 'half the capital', since: 'tigbackup', until: 'tigdata' },
  { from: 'moonlight', to: 'floridaresort', kind: 'owns', since: 'kingmaker', until: 'florida' },

  { from: 'moonlight', to: 'fehotels', kind: 'owns', label: '¥30bn', since: 'fareastern' },
  { from: 'moonlight', to: 'febank', kind: 'stake', label: '33%', since: 'fareastern', until: 'keikabank' },
  { from: 'moonlight', to: 'sankai', kind: 'owns', label: 'Keika Rules', since: 'sankai' },
  { from: 'state', to: 'sankai', kind: 'finance', label: 'special loan', since: 'sankai', until: 'keikabank' },
  { from: 'moonlight', to: 'kaitaku', kind: 'owns', label: 'bid at ¥74', since: 'kaitaku', until: 'keikabank' },
  { from: 'moonlight', to: 'browser', kind: 'stake', since: 'browser' },

  { from: 'state', to: 'keikabank', kind: 'finance', label: '≈ ¥8tn special loans', since: 'keikabank', until: 'auction' },
  { from: 'moonlight', to: 'keikabank', kind: 'option', label: 'right to bid', since: 'keikabank', until: 'auction' },
  { from: 'moonlight', to: 'keikabank', kind: 'owns', label: '¥800bn, sole bidder', since: 'auction' },
  { from: 'moonlight', to: 'holdings', kind: 'owns', label: 'sole shareholder', since: 'auction' },
  { from: 'keikabank', to: 'sankai', kind: 'part', label: 'securities arm', since: 'keikabank' },
  { from: 'holdings', to: 'keikabank', kind: 'part', since: 'kidnap' },
  { from: 'holdings', to: 'trust', kind: 'part', since: 'trustaccount' },
  { from: 'holdings', to: 'kyomei', kind: 'owns', label: 'rescued with tech-share sales', since: 'railway' },
  { from: 'holdings', to: 'felife', kind: 'part', label: 'Keika Life', since: 'ftc' },
  { from: 'holdings', to: 'shinden', kind: 'owns', label: '≈ ¥600bn, Keika Rules', since: 'furukawa' },
  { from: 'holdings', to: 'gowaosan', kind: 'finance', label: 'takes its calls at +1.5%', since: 'mondayfailures', until: 'pandora' },
  { from: 'choufuu', to: 'holdings', kind: 'stake', label: '10%', since: 'oiltrap' },

  { from: 'moonlight', to: 'matsuno', kind: 'finance', label: 'buys ¥180bn of loans', since: 'matsuno', until: 'akamatsu' },
  { from: 'moonlight', to: 'akamatsu', kind: 'owns', since: 'akamatsu', until: 'teimen' },
  { from: 'moonlight', to: 'airho', kind: 'finance', label: 'rescue', since: 'akamatsu' },
  { from: 'keikabank', to: 'teisei', kind: 'finance', label: 'rescue', since: 'teisei' },
  { from: 'akamatsu', to: 'teisei', kind: 'owns', label: 'subsidiary', since: 'akamatsu', until: 'reorg' },
  { from: 'teisei', to: 'hizen', kind: 'owns', since: 'hizen' },
  { from: 'akamatsu', to: 'dogexpress', kind: 'owns', label: '¥140bn', since: 'shikoku' },
  { from: 'moonlight', to: 'keikacorphd', kind: 'owns', since: 'teimen' },
  { from: 'keikacorphd', to: 'akamatsu', kind: 'owns', since: 'teimen' },
  { from: 'keikacorphd', to: 'teisen', kind: 'owns', label: '¥2.75tn of receivables', since: 'teimen' },
  { from: 'keikacorphd', to: 'kanegana', kind: 'owns', label: '¥350bn of debt', since: 'teimen' },
  { from: 'keikacorphd', to: 'kitakaba', kind: 'part', since: 'oiltrap' },
  { from: 'keikacorphd', to: 'keikaparts', kind: 'part', since: 'oiltrap' },

  { from: 'moonlight', to: 'russia', kind: 'finance', label: '$10bn loan, repaid in crude', since: 'moscow' },
  { from: 'matsuno', to: 'gascombine', kind: 'part', since: 'combine', until: 'akamatsu' },
  { from: 'akamatsu', to: 'gascombine', kind: 'part', since: 'akamatsu' },
  { from: 'iwazakicorp', to: 'gascombine', kind: 'part', since: 'combine' },
  { from: 'akamatsu', to: 'hinomaru', kind: 'owns', label: 'exploration company', since: 'hinomaru' },
  { from: 'moonlight', to: 'saudirail', kind: 'finance', label: 'pays ¥200bn', since: 'hinomaru', until: 'saudi' },
  { from: 'akamatsu', to: 'saudirail', kind: 'stake', label: 'joint railway', since: 'hinomaru', until: 'saudi' },
  { from: 'keikacorphd', to: 'gulfoil', kind: 'owns', label: 'takes the resource division', since: 'oiltrap', until: 'keikaresource' },
  { from: 'keikacorphd', to: 'krd', kind: 'part', label: 'subsidiary', since: 'keikaresource', until: 'swiss501' },
  { from: 'keikacorphd', to: 'krd', kind: 'stake', label: '49.9%, runs it', since: 'swiss501' },
  { from: 'moonlight', to: 'krd', kind: 'owns', label: '50.1%, Swiss account', since: 'swiss501' },
  { from: 'krd', to: 'imc', kind: 'owns', label: '¥140bn of debt', since: 'hokkaidobuys' },
  { from: 'karafutobank', to: 'nichika', kind: 'finance', label: 'main bank', since: 'oiltrap', until: 'keikaresource' },
  { from: 'karafutobank', to: 'runa', kind: 'pressure', label: 'money behind the coup', since: 'coupwarning', until: 'pandora' },
  { from: 'state', to: 'akamatsu', kind: 'pressure', label: '‘oil queen’ offer', since: 'oiltrap', until: 'pandora' },

  { from: 'moonlight', to: 'railway', kind: 'owns', since: 'railway' },
  { from: 'railway', to: 'kyosho', kind: 'owns', label: '¥100bn', since: 'railway' },
  { from: 'railway', to: 'kagawa', kind: 'owns', label: 'rescue', since: 'shikoku' },
  { from: 'railway', to: 'shikokushinkansen', kind: 'part', label: 'proposed', since: 'shikoku' },
  { from: 'railway', to: 'shinjuku', kind: 'part', label: 'taken up', since: 'ftc' },
  { from: 'railwayhd', to: 'railway', kind: 'part', since: 'reorg' },
  { from: 'railwayhd', to: 'fehotels', kind: 'owns', since: 'reorg' },
  { from: 'railwayhd', to: 'airho', kind: 'owns', since: 'reorg' },
  { from: 'railwayhd', to: 'teisei', kind: 'owns', label: 'store group', since: 'reorg' },
  { from: 'moonlight', to: 'hollandtown', kind: 'owns', label: 'patronage', since: 'hollandtown' },

  { from: 'moonlight', to: 'opera', kind: 'finance', label: 'patronage', since: 'queennight' },
  { from: 'machishita', to: 'furukawatel', kind: 'pressure', label: '33.4% bid, staged', since: 'furukawa', until: 'wci' },
  { from: 'moonlight', to: 'shiyo', kind: 'stake', label: 'taken over; 50% by 2002', since: 'proposal', until: 'keunion' },
  { from: 'moonlight', to: 'keikaparts', kind: 'owns', since: 'proposal', until: 'oiltrap' },
  { from: 'shiyo', to: 'keikaparts', kind: 'part', label: 'battery division', since: 'proposal' },
  { from: 'moonlight', to: 'furukawatel', kind: 'stake', label: '35%', since: 'keunion' },
  { from: 'moonlight', to: 'keu', kind: 'owns', since: 'keunion' },
  { from: 'keu', to: 'shiyo', kind: 'part', since: 'keunion' },
  { from: 'keu', to: 'furukawatel', kind: 'part', since: 'keunion' },
  { from: 'keu', to: 'portercon', kind: 'part', label: '$14.5bn', since: 'keunion' },
  { from: 'keu', to: 'tigbackup', kind: 'stake', label: 'half, through Karin', since: 'tigdata' },

  { from: 'duke', to: 'keikapharma', kind: 'owns', until: 'reignin' },
  { from: 'duke', to: 'keikaothers', kind: 'owns', until: 'reignin' },
  { from: 'duke', to: 'keikacorp', kind: 'owns', until: 'akamatsu' },
  { from: 'duke', to: 'keikaiwazaki', kind: 'stake', label: 'family stake', since: 'reignin' },
  { from: 'duke', to: 'choufuu', kind: 'owns', label: 'Kiyomaro chairs it', since: 'oiltrap' },
  { from: 'moonlight', to: 'choufuu', kind: 'finance', label: 'cross-shareholdings', since: 'auction' },
  { from: 'choufuu', to: 'keikaiwazaki', kind: 'stake', label: '20%', since: 'oiltrap' },

  { from: 'iwazakihonsha', to: 'iwazakibank', kind: 'owns', until: 'layoffs' },
  { from: 'iwazakihonsha', to: 'iwazakicorp', kind: 'owns', until: 'layoffs' },
  { from: 'iwazakihonsha', to: 'iwazakiheavy', kind: 'owns', until: 'layoffs' },
  { from: 'iwazakihonsha', to: 'iwazakimotors', kind: 'owns', until: 'recall' },
  { from: 'iwazakipharma', to: 'keikapharma', kind: 'pressure', label: 'merger proposal', since: 'testimony', until: 'reignin' },
  { from: 'iwazakicorp', to: 'akamatsu', kind: 'pressure', label: 'wants its Russian crude', since: 'adoption' },
  { from: 'iwazakicorp', to: 'moonlight', kind: 'pressure', label: 'moves to take the Fund', since: 'adoption' },
  { from: 'geo', to: 'iwazakicorp', kind: 'pressure', label: 'whispers the break-up plan', since: 'envelope', until: 'geo' },
  { from: 'geo', to: 'akamatsu', kind: 'pressure', label: 'wants its resources', since: 'envelope', until: 'geo' },
  { from: 'moonlight', to: 'iwazakibank', kind: 'finance', label: 'buys ¥35bn of GEO credit', since: 'geo' },
  { from: 'keikabank', to: 'iwazakimotors', kind: 'finance', label: 'funds its sale to Ayukawa', since: 'recall' },
  { from: 'artsnova', to: 'keikaiwazaki', kind: 'owns', label: '50.1%', since: 'lunch' },
  { from: 'futaki', to: 'teia', kind: 'finance', label: 'patron group', until: 'honamiteia' },
  { from: 'teia', to: 'iwazakimotors', kind: 'pressure', label: 'merger floated', since: 'recall', until: 'adoption' },
  { from: 'teia', to: 'honami', kind: 'owns', label: '¥1tn allotment', since: 'honamiteia' },
  { from: 'teikoku', to: 'furukawatel', kind: 'pressure', label: 'behind the bid', since: 'furukawa', until: 'keunion' },
  { from: 'teikoku', to: 'holdings', kind: 'pressure', label: 'core-banking order cancelled', since: 'furukawa', until: 'keunion' },
];
