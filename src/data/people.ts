export type PersonGroup = 'family' | 'circle' | 'school' | 'politics' | 'intelligence' | 'other';

export const PERSON_GROUP_LABEL: Record<PersonGroup, string> = {
  family: 'The Keikain family',
  circle: 'Runa’s inner circle',
  school: 'Classmates and the game cast',
  politics: 'Politicians',
  intelligence: 'Intelligence and security',
  other: 'Others',
};

/** A short profile. `name` must match the spelling used in the events’ `people` lists. */
export interface Person {
  name: string;
  group: PersonGroup;
  /** One line: who they are to the story. */
  role: string;
  bio: string;
  /** Real-world counterpart, where the novel has one. */
  real?: string;
}

export const people: Person[] = [
  // The Keikain family
  {
    name: 'Keikain Runa',
    group: 'family',
    role: 'Protagonist; real owner of the Moonlight Fund',
    bio: 'Reborn as the villainess of an otome game, with full memory of the game and of real history. Three-quarters Russian through her Romanov mother. Nicknamed ‘Little Queen’. She quietly collects bookkeeping, secretarial and English qualifications, preparing to survive the collapse of everything she builds.',
  },
  {
    name: 'Keikain Hikomaro',
    group: 'family',
    role: 'Grandfather; fixer (dead before the story)',
    bio: 'Adopted into a dormant ducal line, rose to Special Higher Police superintendent, and was gifted the dukedom after failing to solve a prime minister’s assassination. Kept blackmail files and invented the nobility’s diplomatic immunity.',
  },
  {
    name: 'Keikain Otsumaro',
    group: 'family',
    role: 'Father; founder of the Far Eastern Group (dead before the story)',
    bio: 'Hikomaro’s illegitimate son. His group was a front for Eastern technology theft and was caught in a CoCom violation. Died by apparent suicide; Volume 2 reveals Tachibana pushed him to it.',
  },
  {
    name: 'Natasha Romanova',
    group: 'family',
    role: 'Mother (dead shortly after Runa’s birth)',
    bio: 'Natasha Alexandrovna Romanova, great-granddaughter of Tsar Alexander III, deployed as a honeytrap by Northern Japan’s Ministry of National Security. Buried in Sakata.',
  },
  {
    name: 'Keikain Kiyomaro',
    group: 'family',
    role: 'Duke; uncle, guardian and then adoptive father',
    bio: 'Head of the Keika Group. Sold the original Keika companies to Iwazaki because the house could not staff them. Volume 3 shows him sincere: ‘I don’t want to be the kind of terrible father who steals his child’s belongings.’',
  },
  {
    name: 'Keikain Nakamaro',
    group: 'family',
    role: 'Cousin; the Duke’s heir',
    bio: 'Promised Runa’s dying mother to protect her. Testifies to the House of Councilors in her place, survives 11 September 2001 in New York, and becomes a Keika Holdings director.',
  },
  {
    name: 'Asagiri Sakurako',
    group: 'family',
    role: 'Nakamaro’s fiancée',
    bio: 'Granddaughter of Iwazaki Yashirou. Hands Runa an envelope from him at the adoption dinner; its contents are still unknown.',
  },

  // Inner circle
  {
    name: 'Tachibana Ryuuji',
    group: 'circle',
    role: 'Butler; guardian of record',
    bio: 'Born in Karafuto, ex-underworld, once Hikomaro’s bodyguard. Noticed Runa’s precocity because her books were always reshelved correctly. Builds a private intelligence service behind her back, runs Keika Railway, and drove her father to suicide: a secret she does not know.',
  },
  {
    name: 'Tachibana Yuka',
    group: 'circle',
    role: 'Tachibana’s granddaughter; Runa’s maid',
    bio: 'The maid in the 2008 frame scene, trained as Runa’s protector. Brings the sandwiches the morning after 9/11.',
  },
  {
    name: 'Ichijou Susumu',
    group: 'circle',
    role: 'Banker; head of Keika Holdings',
    bio: 'The Far Eastern Bank branch manager Runa blackmails and recruits at about five. Co-runs the Moonlight Fund, is kept ‘pure’ by the other adults, and is drawn onto Koizumi’s economic council. ‘I’m the second guy she scouted.’',
  },
  {
    name: 'Ichijou Erika',
    group: 'circle',
    role: 'Ichijou’s daughter; Runa’s secretary-maid',
    bio: 'A graduate of Professor Kanbe’s seminar, hired in Volume 3 for talking to Runa like a person.',
  },
  {
    name: 'Toudou Nagayoshi',
    group: 'circle',
    role: 'Resources advisor; managing director of Akamatsu',
    bio: 'A resources man with a Manchurian past and a Lucky Strikes box. Co-designs the plan to recruit the Toyohara girls.',
  },
  {
    name: 'Okazaki Yuuichi',
    group: 'circle',
    role: 'Akamatsu resources man',
    bio: 'Works out that Runa has foreknowledge and asks only for ‘a front row seat’. Runs the WCI operation and the Gulf logistics, and names what broke her on 20 March 2003.',
  },
  {
    name: 'Katsura Naoyuki',
    group: 'circle',
    role: 'Banker; keeper of the hidden trust account',
    bio: 'Worked at Hokkaido Kaitaku Bank and begged Runa to save it. Moves to private banking at Keika Bank and holds her secret Keika Trust Bank account in Sapporo.',
  },
  {
    name: 'Tokitou Aki',
    group: 'circle',
    role: 'Maid',
    bio: 'Implied to be Hikomaro’s secret daughter. Her scholarship is the detail that tells Runa the household is short of money.',
  },
  {
    name: 'Angela Sullivan',
    group: 'circle',
    role: 'CIA analyst, then Runa’s secretary',
    bio: 'Author of the Sullivan Report. Tachibana buys her away from the CIA. By Volumes 4 and 5 she is the frontrunner to lead the Keika Group; her loyalty is real but conditional.',
  },

  // Classmates and the game cast
  {
    name: 'Teia Eiichi',
    group: 'school',
    role: 'Heir to Teia Motor; fiancé',
    bio: 'In the game he casts the deciding vote against Runa. Here he proposes over breakfast as strategy, tells her it is okay to cry, and co-founds TIG Systems.',
  },
  {
    name: 'Izumikawa Yuujirou',
    group: 'school',
    role: 'Youngest son of Izumikawa Tatsunosuke',
    bio: 'A love interest in the game. Handles finance and sales at TIG Systems and is heading for prefectural politics.',
  },
  {
    name: 'Gotou Mitsuya',
    group: 'school',
    role: 'Son of a Finance Ministry budget analyst',
    bio: 'The engineer of the Quartet. Tells Runa she is ‘growing up far faster than us’.',
  },
  {
    name: 'Takanashi Mizuho',
    group: 'school',
    role: 'The game’s heroine',
    bio: 'Enters the academy on a scholarship at high school and fronts the reform that topples the game’s Runa. Absent from the present-day story through Volume 5.',
  },
  {
    name: 'Kasugano Asuka',
    group: 'school',
    role: 'Friend since kindergarten',
    bio: 'A Dietman’s daughter from Ehime, raised for an arranged political future.',
  },
  {
    name: 'Kaihouin Hotaru',
    group: 'school',
    role: 'Friend since kindergarten',
    bio: 'Cannot be found at hide-and-seek, even on video. Was meant to be sacrificed to become a zashiki warashi, and is tied to the dollhouse. Still unexplained.',
  },
  {
    name: 'Amane Mio',
    group: 'school',
    role: 'Friend; later head of an independent faction',
    bio: 'Daughter of a struggling trader rescued through antique dolls. She never existed in the game.',
  },
  {
    name: 'Shisuka Lydia',
    group: 'school',
    role: 'Classmate, called ‘Vasilisa’',
    bio: 'Daughter of the Northern secret-police chief whose defection made reunification possible: honoured by Japan, hated in Karafuto. She never existed in the game.',
  },
  {
    name: 'Kushunnai Nanami',
    group: 'school',
    role: 'Leader of Runa’s junior-high faction',
    bio: 'Runs the faction of 69 girls in Volume 5 and serves as Runa’s body double.',
  },
  {
    name: 'Nozuki Misaki',
    group: 'school',
    role: 'Advisor to the faction',
    bio: 'Runa’s guildmate from an online game, now her faction’s advisor.',
  },
  {
    name: 'Kanna Mizuki',
    group: 'school',
    role: 'Fortune teller',
    bio: 'Appears in Volume 5 as part of the story’s growing supernatural layer.',
  },

  // Politicians
  {
    name: 'Fuchigami Keiichi',
    group: 'politics',
    role: 'Prime Minister, 1998 to 2000',
    bio: 'Warned by Runa, he survives his stroke and retires. Tells her he used her, and warns her off her grandfather’s path.',
    real: 'Obuchi Keizō',
  },
  {
    name: 'Izumikawa Tatsunosuke',
    group: 'politics',
    role: 'Finance Minister, party vice president, caretaker Prime Minister',
    bio: 'Runa’s main political ally and Yuujirou’s father. Resigns over the Finance Ministry scandal, returns through her scribbled note, and serves a six-month caretaker premiership on her advice.',
    real: 'A composite; his 1998 resignation is Mitsuzuka Hiroshi’s',
  },
  {
    name: 'Izumikawa Taichirou',
    group: 'politics',
    role: 'Councilor; Tatsunosuke’s son',
    bio: 'Rescued in 1998 by being moved from a two-seat district to the party list.',
  },
  {
    name: 'Katou Kazuhiro',
    group: 'politics',
    role: 'Party heavyweight',
    bio: 'Complicit in the cover-up that destroyed Runa’s father; his later help reads as atonement. His mistake ‘was in thinking she was a mere prop’.',
    real: 'Katō Kōichi',
  },
  {
    name: 'Koizumi Souichirou',
    group: 'politics',
    role: 'Prime Minister from 2001',
    bio: 'Structural antagonist, the man who catches her on 9/11 and the man who tells her ‘you simply aren’t qualified’. The author does not write him as a villain.',
    real: 'Koizumi Jun’ichirō',
  },
  {
    name: 'Takenaga Nobutame',
    group: 'politics',
    role: 'Economist; Koizumi’s reform minister',
    bio: 'Makes the televised case against cross-shareholdings and drives the ‘big-boned’ policies.',
    real: 'Takenaka Heizō',
  },
  {
    name: 'Iwasawa Makoto',
    group: 'politics',
    role: 'Governor of Tokyo',
    bio: 'A novelist-politician whose 1999 win Runa engineers. Writes ‘The Little Queen Takes Back the Capital’.',
    real: 'Ishihara Shintarō',
  },

  // Intelligence and security
  {
    name: 'Maefuji Shouichi',
    group: 'intelligence',
    role: 'Public Safety Bureau inspector, later director',
    bio: 'Leads the raid that frees Runa in 1998. In the game he is the officer who arrests her.',
  },
  {
    name: 'Anisha Egorova',
    group: 'intelligence',
    role: 'Former Eastern intelligence ‘observer’',
    bio: 'One of the rival spies seated at Runa’s own dinner table.',
  },
  {
    name: 'Eva Charon',
    group: 'intelligence',
    role: 'CIA',
    bio: 'Part of the US Embassy’s view of the Keika Group in Volume 5.',
  },
  {
    name: 'Yulia Molotova',
    group: 'intelligence',
    role: 'Intelligence staff',
    bio: 'Named among the intelligence staff placed around Runa in Volume 5.',
  },
  {
    name: 'Nakajima Atsushi',
    group: 'intelligence',
    role: 'Security chief',
    bio: 'Runa’s security chief, a former captain in Northern Japan’s army.',
  },
  {
    name: 'Kitagumo Ryouko',
    group: 'intelligence',
    role: 'Maid; bodyguard',
    bio: 'Former Eastern intelligence, trained in Northern-Japanese kendo.',
  },

  // Others
  {
    name: 'Iwazaki Yashirou',
    group: 'other',
    role: 'President of Imperial Iwazaki Bank',
    bio: 'One of the Iwazaki zaibatsu’s three Dons. Asks Runa to bring all her companies and join; she refuses.',
  },
  {
    name: 'Professor Kanbe',
    group: 'other',
    role: 'Economics professor',
    bio: 'Erika’s seminar teacher. His Volume 4 lecture presents neoliberalism fairly.',
  },
];
