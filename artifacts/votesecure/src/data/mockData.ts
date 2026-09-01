export type ElectionStatus = 'upcoming' | 'active' | 'ended';
export type Election = { id: string; title: string; description: string; startDate: string; endDate: string; status: ElectionStatus; candidateIds: string[]; votes: number; registeredVoters: number; voted: boolean };
export type Candidate = { id: string; electionId: string; name: string; party: string; description: string; color: string };
export type Voter = { id: string; name: string; email: string; mobile: string; registrationDate: string; voted: boolean };
export type Activity = { id: string; label: string; detail: string; timestamp: string; type: 'vote' | 'election' | 'user' | 'system' };
export type Result = { candidateId: string; votes: number; percentage: number };
const candidateSeeds = [
  ['c1','e1','Maya Chen','Forward Together','A practical voice for transparent student representation.','#277fa6'],
  ['c2','e1','Jordan Brooks','Campus Common','Focused on belonging, access, and a campus that listens.','#397c68'],
  ['c3','e1','Samira Okafor','Students First','Making everyday student services easier to navigate.','#bd7b43'],
  ['c4','e1','Theo Martinez','Independent','A clear agenda for sustainable, measurable change.','#6c6f9d'],
  ['c5','e2','Ravi Patel','Build Better','Connecting makers with the tools and mentors to ship ideas.','#277fa6'],
  ['c6','e2','Elena Rossi','Open Source','A welcoming club culture with room for every skill level.','#397c68'],
  ['c7','e2','Noah Williams','Tech for Good','Putting technical talent to work on community needs.','#bd7b43'],
  ['c8','e2','Priya Shah','Independent','More workshops, better documentation, and shared ownership.','#6c6f9d'],
  ['c9','e3','Amina Diallo','Many Voices','Celebrating the traditions and stories that shape our community.','#277fa6'],
  ['c10','e3','Lucas Ferreira','Common Ground','A year-round calendar with something for everyone.','#397c68'],
  ['c11','e3','Grace Kim','Create Together','Supporting emerging artists and first-time event organizers.','#bd7b43'],
  ['c12','e3','Owen Hughes','Independent','Thoughtful programming, clear budgets, open to all.','#6c6f9d'],
] as const;
export const candidates: Candidate[] = candidateSeeds.map(([id,electionId,name,party,description,color]) => ({id,electionId,name,party,description,color}));
export const elections: Election[] = [
  { id:'e1', title:'Student Council Election 2026', description:'Choose the student representatives who will help shape campus life, services, and advocacy this year.', startDate:'2026-02-12', endDate:'2026-02-20', status:'active', candidateIds:['c1','c2','c3','c4'], votes:817, registeredVoters:1248, voted:false },
  { id:'e2', title:'Technology Club Election 2026', description:'Select the next committee for workshops, projects, and the Technology Club community.', startDate:'2026-03-03', endDate:'2026-03-10', status:'upcoming', candidateIds:['c5','c6','c7','c8'], votes:0, registeredVoters:386, voted:false },
  { id:'e3', title:'Cultural Committee Election 2026', description:'Help choose the people who will steward gatherings, grants, and cultural programming.', startDate:'2026-01-15', endDate:'2026-01-23', status:'ended', candidateIds:['c9','c10','c11','c12'], votes:492, registeredVoters:561, voted:true },
];
const names = ['Avery Morgan','Mina Park','Theo Grant','Nia Roberts','Leo Wilson','Fatima Ali','Eli Turner','Sofia Nguyen','Camila Ortiz','Arjun Mehta','Maeve O’Brien','Kai Johnson','Iris Bell','Noah Green','Layla Haddad','Milo Reed','Zara Khan','Ethan Brooks','Chloe Martin','David Okafor','Rina Sato','Jonah Price'];
export const voters: Voter[] = names.map((name,i) => ({ id:`v${i+1}`, name, email:`${name.toLowerCase().replace(/[^a-z]/g,'')}@example.org`, mobile:`+1 555 01${String(i+1).padStart(2,'0')}`, registrationDate:`2026-01-${String((i%19)+1).padStart(2,'0')}`, voted:i%3 !== 0 }));
export const activities: Activity[] = [
  {id:'a1',label:'Ballot recorded',detail:'Student Council Election 2026',timestamp:'8 minutes ago',type:'vote'},
  {id:'a2',label:'Election published',detail:'Technology Club Election 2026',timestamp:'2 hours ago',type:'election'},
  {id:'a3',label:'New voter registered',detail:'Registration completed successfully',timestamp:'Yesterday',type:'user'},
  {id:'a4',label:'Ballot window opened',detail:'Student Council Election 2026',timestamp:'2 days ago',type:'system'},
];
export const results: Record<string, Result[]> = { e3: [{candidateId:'c9',votes:181,percentage:36.8},{candidateId:'c10',votes:139,percentage:28.3},{candidateId:'c11',votes:103,percentage:20.9},{candidateId:'c12',votes:69,percentage:14}] };