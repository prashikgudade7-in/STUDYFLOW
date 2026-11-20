const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const state = { user:null, records:[], view:'home', taskFilter:'all', timetablePeriod:'today', statsRange:'today', calendarDate:new Date(), calendarPeriod:'month', selectedDate:localDate(new Date()), englishTopic:'mixed', mathTopic:'mixed', englishQuiz:null, mathQuiz:null, challenge:null, challengeTimer:null, challengeStarting:false, aiProvider:'openai', aiModel:'gpt-4o-mini', aiEndpoint:'', aiKey:'', aiConnected:false, aiBusy:false, aiProviderApprovalStatus:null, revisionImage:null, revisionFileName:'', timerStart:null, timerInterval:null, focusSubject:'Study session', modalReturnFocus:null, notifications:[], notificationFilter:'all', notificationPreferences:null, notificationHasMore:false, notificationPage:0, notificationLoading:false, notificationRequestId:0, notificationError:'', notificationFocusReturn:null, notificationUnreadCount:0, privacyConsent:null };
const AI_PROVIDER_PENDING_MESSAGE='This AI provider is not currently available because its student-data privacy review is pending.';
const notificationActions=Object.freeze({
  '/#home':{view:'home',label:'Open dashboard'},
  '/#challenge':{view:'challenge',label:'View challenge'},
  '/#leaderboard':{view:'leaderboard',label:'View leaderboard'},
  '/#stats':{view:'stats',label:'View progress'},
  '/#settings':{view:'settings',label:'Open settings'}
});
const providers = [
  {id:'openai',name:'OpenAI',short:'OA',model:'gpt-6-luna'},
  {id:'gemini',name:'Gemini',short:'G',model:'gemini-3.5-flash-lite'},
  {id:'claude',name:'Claude',short:'C',model:'claude-haiku-5-5'},
  {id:'azure',name:'Azure AI',short:'MS',model:''},
  {id:'perplexity',name:'Perplexity',short:'P',model:'perplexity/sonar'},
  {id:'deepseek',name:'DeepSeek',short:'D',model:'deepseek-flash'},
  {id:'grok',name:'Grok',short:'X',model:'grok-4.7'},
  {id:'mistral',name:'Mistral',short:'M',model:'mistral-small-latest'},
  {id:'cohere',name:'Cohere',short:'Co',model:'command-a-03-2025'},
  {id:'llama',name:'Meta Llama',short:'L',model:'accounts/fireworks/models/llama-v3p3-70b-instruct'}
];
const legacyProviderModels={
  'gemini:gemini-2.0-flash':'gemini-3.5-flash-lite',
  'claude:claude-3-5-haiku-latest':'claude-haiku-5-5',
  'perplexity:sonar':'perplexity/sonar',
  'deepseek:deepseek-chat':'deepseek-flash',
  'grok:grok-3-mini':'grok-4.7',
  'llama:llama-3.3-70b-versatile':'accounts/fireworks/models/llama-v3p3-70b-instruct'
};
function migrateProviderModel(provider,model){return legacyProviderModels[`${provider}:${model}`]||model}
const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const englishBank = [
 {topic:'synonyms',q:'Choose the closest synonym of “abundant”.',o:['Scarce','Plentiful','Tiny','Empty'],a:1,e:'Abundant means existing in large quantities; plentiful is a close synonym.'},
 {topic:'antonyms',q:'Choose the antonym of “reluctant”.',o:['Unwilling','Hesitant','Eager','Doubtful'],a:2,e:'Reluctant means unwilling; eager expresses willingness and enthusiasm.'},
 {topic:'meaning',q:'What does “meticulous” mean?',o:['Careless','Very careful and precise','Extremely quick','Confused'],a:1,e:'Meticulous describes careful attention to detail.'},
 {topic:'grammar',q:'Choose the grammatically correct sentence.',o:['She don’t like tea.','She doesn’t likes tea.','She doesn’t like tea.','She not like tea.'],a:2,e:'After “doesn’t”, use the base form of the verb: like.'},
 {topic:'tenses',q:'By next June, they _____ the project.',o:['complete','will have completed','completed','are complete'],a:1,e:'The future perfect describes an action completed before a future point.'},
 {topic:'synonyms',q:'Which word is closest in meaning to “brief”?',o:['Concise','Lengthy','Complicated','Unclear'],a:0,e:'Brief means short in duration or concise in expression.'},
 {topic:'antonyms',q:'Choose the antonym of “optimistic”.',o:['Hopeful','Positive','Pessimistic','Confident'],a:2,e:'Pessimistic is the opposite of optimistic.'},
 {topic:'meaning',q:'What does “resilient” mean?',o:['Easily discouraged','Able to recover after difficulty','Unnecessarily loud','Always uncertain'],a:1,e:'Resilient means able to recover or adapt after challenges.'},
 {topic:'grammar',q:'Identify the part of speech of the word “carefully”.',o:['Noun','Adjective','Adverb','Preposition'],a:2,e:'Carefully modifies a verb and tells how an action is performed, so it is an adverb.'},
 {topic:'tenses',q:'Choose the correct past perfect sentence.',o:['I have ate.','I had eaten.','I has eaten.','I was eat.'],a:1,e:'Past perfect uses had + past participle.'},
 {topic:'synonyms',q:'Choose a synonym for “innovative”.',o:['Original','Traditional','Ordinary','Outdated'],a:0,e:'Innovative means introducing new ideas or methods; original is a close synonym.'},
 {topic:'antonyms',q:'Which word is the opposite of “expand”?',o:['Enlarge','Extend','Contract','Increase'],a:2,e:'Contract means to become smaller, the opposite of expand.'},
 {topic:'meaning',q:'“Inevitable” most nearly means:',o:['Impossible to predict','Certain to happen','Easy to avoid','Rarely seen'],a:1,e:'Inevitable means certain to happen or unavoidable.'},
 {topic:'grammar',q:'Choose the correct article: “She is _____ honest person.”',o:['a','an','the','no article'],a:1,e:'Use “an” before a vowel sound. Honest begins with a vowel sound.'},
 {topic:'tenses',q:'When I arrived, the film _____.',o:['already started','has already started','had already started','starts already'],a:2,e:'The past perfect shows the film started before another past event.'},
 {topic:'synonyms',q:'Select the best synonym for “substantial”.',o:['Insignificant','Considerable','Fragile','Temporary'],a:1,e:'Substantial means considerable in amount, value or importance.'},
 {topic:'antonyms',q:'Choose the antonym of “transparent”.',o:['Clear','Visible','Opaque','Obvious'],a:2,e:'Opaque means not allowing light to pass through; it is the opposite of transparent.'},
 {topic:'meaning',q:'What does “versatile” mean?',o:['Limited to one use','Able to adapt or do many things','Difficult to understand','Not reliable'],a:1,e:'Versatile describes someone or something that can adapt to many different functions.'},
 {topic:'grammar',q:'Choose the correct preposition: “She is interested _____ science.”',o:['at','on','in','for'],a:2,e:'The correct expression is interested in something.'},
 {topic:'tenses',q:'Which sentence uses the present perfect?',o:['I visited Pune.','I have visited Pune.','I will visit Pune.','I am visiting Pune tomorrow.'],a:1,e:'Present perfect uses have/has + past participle.'}
];
const englishBasicBank = [
 {topic:'synonyms',q:'Choose a synonym for “quick”.',o:['Slow','Fast','Late','Weak'],a:1,e:'Quick and fast have similar meanings.'},
 {topic:'antonyms',q:'Choose the opposite of “happy”.',o:['Glad','Cheerful','Sad','Excited'],a:2,e:'Sad is the opposite of happy.'},
 {topic:'meaning',q:'What does “eager” mean?',o:['Excited to do something','Very sleepy','Angry','Confused'],a:0,e:'Eager means looking forward to doing something.'},
 {topic:'grammar',q:'Choose the correct sentence.',o:['He play cricket.','He plays cricket.','He playing cricket.','He are play cricket.'],a:1,e:'With he/she/it in the simple present, add -s to the verb.'},
 {topic:'grammar',q:'Which word is an adjective in “The blue bag is new”?',o:['bag','is','blue','the'],a:2,e:'Blue describes the noun bag, so it is an adjective.'},
 {topic:'tenses',q:'Yesterday, we _____ to the library.',o:['go','goes','went','going'],a:2,e:'Yesterday signals the simple past tense: went.'},
 {topic:'synonyms',q:'Choose a synonym for “begin”.',o:['Start','End','Stop','Close'],a:0,e:'Begin and start mean to do the first part of something.'},
 {topic:'antonyms',q:'Choose the opposite of “strong”.',o:['Powerful','Weak','Brave','Healthy'],a:1,e:'Weak is the opposite of strong.'},
 {topic:'meaning',q:'What does “generous” mean?',o:['Willing to share','Always late','Very quiet','Not careful'],a:0,e:'Generous people are willing to give or share with others.'},
 {topic:'grammar',q:'Choose the correct article: “I saw _____ elephant.”',o:['a','an','the','no article'],a:1,e:'Use “an” before a vowel sound.'}
];
const englishIntermediateBank = [
 {topic:'synonyms',q:'Choose a synonym for “diligent”.',o:['Careless','Hardworking','Impatient','Uncertain'],a:1,e:'Diligent means showing careful and persistent effort.'},
 {topic:'antonyms',q:'Choose the antonym of “scarce”.',o:['Rare','Limited','Abundant','Insufficient'],a:2,e:'Abundant means available in large quantities.'},
 {topic:'meaning',q:'What does “concise” mean?',o:['Using few words clearly','Very confusing','Extremely loud','Highly emotional'],a:0,e:'Concise means brief but clear.'},
 {topic:'grammar',q:'Choose the grammatically correct sentence.',o:['They has completed it.','They have completed it.','They is completed it.','They completing it.'],a:1,e:'Use have with the subject they.'},
 {topic:'tenses',q:'By the time she arrived, the class _____.',o:['begins','has begun','had begun','begin'],a:2,e:'Past perfect shows an action completed before another past event.'},
 {topic:'synonyms',q:'Which word is closest to “plausible”?',o:['Reasonable','Impossible','Unclear','Unbelievable'],a:0,e:'Plausible means seeming reasonable or likely.'},
 {topic:'antonyms',q:'Choose the opposite of “hostile”.',o:['Aggressive','Unfriendly','Friendly','Angry'],a:2,e:'Friendly is the opposite of hostile.'},
 {topic:'meaning',q:'“Ambiguous” most nearly means:',o:['Having more than one possible meaning','Very simple','Completely false','Easy to prove'],a:0,e:'Ambiguous language can be understood in more than one way.'},
 {topic:'grammar',q:'Identify the adverb: “She answered politely.”',o:['She','answered','politely','none'],a:2,e:'Politely describes how she answered; it is an adverb.'},
 {topic:'tenses',q:'Choose the correct future form: “This time tomorrow, I _____.”',o:['travel','will be travelling','travelled','have travel'],a:1,e:'Future continuous uses will be + verb-ing.'}
];
const mathsBank = [
 {topic:'arithmetic',q:'What is 15% of 240?',o:['24','30','36','42'],a:2,e:'10% of 240 is 24 and 5% is 12. Together, 15% is 36.'},
 {topic:'algebra',q:'Solve: 3x + 7 = 22.',o:['3','4','5','6'],a:2,e:'Subtract 7 to get 3x = 15, then divide by 3: x = 5.'},
 {topic:'geometry',q:'What is the area of a triangle with base 10 cm and height 6 cm?',o:['16 cm²','30 cm²','60 cm²','120 cm²'],a:1,e:'Area = ½ × base × height = ½ × 10 × 6 = 30 cm².'},
 {topic:'statistics',q:'Find the mean of 4, 6, 8 and 10.',o:['6','7','8','9'],a:1,e:'Mean = (4 + 6 + 8 + 10) ÷ 4 = 28 ÷ 4 = 7.'},
 {topic:'algebra',q:'Factorise x² − 9.',o:['(x − 9)(x + 1)','(x − 3)(x + 3)','(x − 3)²','(x + 9)(x − 1)'],a:1,e:'This is a difference of squares: a² − b² = (a − b)(a + b).'},
 {topic:'geometry',q:'The sum of the interior angles of a quadrilateral is:',o:['180°','270°','360°','540°'],a:2,e:'A quadrilateral can be divided into two triangles, so the sum is 180° + 180° = 360°.'},
 {topic:'arithmetic',q:'A price of ₹800 is reduced by 10%. What is the new price?',o:['₹700','₹710','₹720','₹780'],a:2,e:'10% of 800 is 80. New price = 800 − 80 = ₹720.'},
 {topic:'statistics',q:'What is the median of 3, 9, 5, 1, 7?',o:['3','5','7','9'],a:1,e:'Arrange the values: 1, 3, 5, 7, 9. The middle value is 5.'},
 {topic:'algebra',q:'If x + y = 11 and x − y = 3, what is x?',o:['4','6','7','8'],a:2,e:'Add the equations: 2x = 14, so x = 7.'},
 {topic:'geometry',q:'What is the circumference of a circle with radius 7 cm? Use π = 22/7.',o:['22 cm','44 cm','49 cm','154 cm'],a:1,e:'Circumference = 2πr = 2 × 22/7 × 7 = 44 cm.'},
 {topic:'algebra',q:'The roots of x² − 5x + 6 = 0 are:',o:['1 and 6','2 and 3','−2 and −3','−1 and −6'],a:1,e:'Factorise: (x − 2)(x − 3) = 0, so x = 2 or 3.'},
 {topic:'statistics',q:'A fair die is rolled. What is the probability of getting an even number?',o:['1/6','1/3','1/2','2/3'],a:2,e:'Even outcomes are 2, 4 and 6: 3 favourable outcomes out of 6, so 1/2.'},
 {topic:'arithmetic',q:'Simplify: 3/4 + 1/8.',o:['4/12','5/8','7/8','1'],a:2,e:'Convert 3/4 to 6/8. Then 6/8 + 1/8 = 7/8.'},
 {topic:'algebra',q:'If f(x) = 2x² + 3, find f(2).',o:['7','8','11','14'],a:2,e:'f(2) = 2(2²) + 3 = 8 + 3 = 11.'},
 {topic:'geometry',q:'For a right triangle with legs 6 cm and 8 cm, the hypotenuse is:',o:['9 cm','10 cm','12 cm','14 cm'],a:1,e:'By Pythagoras, c² = 6² + 8² = 100, so c = 10 cm.'},
 {topic:'statistics',q:'If the probability of an event is 0.25, what is its percentage?',o:['2.5%','10%','25%','250%'],a:2,e:'Multiply the decimal probability by 100: 0.25 × 100 = 25%.'}
];
const mathsBasicBank = [
 {topic:'arithmetic',q:'What is 25 × 4?',o:['50','75','100','125'],a:2,e:'25 multiplied by 4 equals 100.'},
 {topic:'arithmetic',q:'What is 3/4 of 20?',o:['10','12','15','16'],a:2,e:'20 ÷ 4 = 5, and 5 × 3 = 15.'},
 {topic:'algebra',q:'Solve: x + 7 = 15.',o:['6','7','8','9'],a:2,e:'Subtract 7 from both sides: x = 8.'},
 {topic:'geometry',q:'How many degrees are in a right angle?',o:['45°','90°','180°','360°'],a:1,e:'A right angle measures 90 degrees.'},
 {topic:'geometry',q:'Find the perimeter of a square with side 5 cm.',o:['10 cm','15 cm','20 cm','25 cm'],a:2,e:'Perimeter = 4 × side = 4 × 5 = 20 cm.'},
 {topic:'statistics',q:'Find the mean of 2, 4 and 6.',o:['3','4','5','6'],a:1,e:'(2 + 4 + 6) ÷ 3 = 4.'},
 {topic:'arithmetic',q:'What is 40% of 50?',o:['10','15','20','25'],a:2,e:'40% of 50 = 0.4 × 50 = 20.'},
 {topic:'algebra',q:'If 4x = 28, what is x?',o:['6','7','8','9'],a:1,e:'Divide both sides by 4: x = 7.'}
];
const mathsIntermediateBank = [
 {topic:'arithmetic',q:'A value increases from 80 to 100. What is the percentage increase?',o:['20%','25%','30%','40%'],a:1,e:'Increase = 20. Percentage increase = 20/80 × 100 = 25%.'},
 {topic:'algebra',q:'Solve: 3x − 5 = 16.',o:['5','6','7','8'],a:2,e:'3x = 21, so x = 7.'},
 {topic:'geometry',q:'What is the area of a circle with radius 7 cm? Use π = 22/7.',o:['44 cm²','77 cm²','154 cm²','308 cm²'],a:2,e:'Area = πr² = 22/7 × 49 = 154 cm².'},
 {topic:'statistics',q:'Find the median of 4, 9, 2, 7, 5.',o:['4','5','7','9'],a:1,e:'In order: 2, 4, 5, 7, 9. The median is 5.'},
 {topic:'algebra',q:'Factorise x² − 16.',o:['(x − 8)(x + 2)','(x − 4)(x + 4)','(x − 4)²','(x − 16)(x + 1)'],a:1,e:'Difference of squares: x² − 4² = (x − 4)(x + 4).'},
 {topic:'geometry',q:'The angles of a triangle are 2x, 3x and 4x. Find x.',o:['10°','15°','20°','30°'],a:2,e:'2x + 3x + 4x = 180°, so 9x = 180° and x = 20°.'},
 {topic:'arithmetic',q:'A ₹1,200 item has a 15% discount. What is the sale price?',o:['₹960','₹1,000','₹1,020','₹1,080'],a:2,e:'15% of 1,200 = 180. Sale price = 1,020.'},
 {topic:'statistics',q:'A bag has 3 red and 5 blue balls. What is the probability of picking red?',o:['3/5','3/8','5/8','1/3'],a:1,e:'There are 3 red out of 8 total balls, so probability is 3/8.'}
];
function localDate(d){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}
function todayKey(){return localDate(new Date())}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtDate(d,opts={weekday:'short',month:'short',day:'numeric'}){return new Intl.DateTimeFormat('en-IN',opts).format(d)}
function parseDate(s){return new Date((s||todayKey())+'T00:00:00')}
function weekStartKey(d=new Date()){const x=new Date(d);x.setDate(x.getDate()-(x.getDay()+6)%7);return localDate(x)}
function monthKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function rec(kind){return state.records.filter(r=>r.kind===kind)}
function recordBy(kind,id){return state.records.find(r=>r.kind===kind&&r.id===id)}
async function api(url,opts={}){const res=await fetch(url,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});let d={};try{d=await res.json()}catch{}if(!res.ok)throw new Error(d.error||`Request failed (${res.status})`);return d}
function toast(msg,type=''){const el=document.createElement('div');el.className='toast '+type;const text=document.createElement('span');text.className='toast-message';text.textContent=msg;const close=document.createElement('button');close.type='button';close.className='toast-dismiss';close.setAttribute('aria-label','Dismiss message');close.innerHTML='&times;';close.onclick=()=>el.remove();el.append(text,close);$('#toast-region').append(el);const timer=setTimeout(()=>el.remove(),5000);close.addEventListener('click',()=>clearTimeout(timer),{once:true})}
function updateNotificationCount(value,announce=false){
 const count=Number.isSafeInteger(Number(value))?Math.max(0,Number(value)):0;
 const previous=state.notificationUnreadCount;
 state.notificationUnreadCount=count;
 const badge=$('#notification-count'),button=$('#notifications-btn');
 badge.textContent=count>99?'99+':String(count);
 badge.classList.toggle('hidden',count===0);
 $('#notification-header-count').textContent=`${count} unread`;
 button.setAttribute('aria-label',count?`Notifications, ${count} unread`:'Notifications');
 if(announce||count!==previous)$('#notification-announcement').textContent=`${count} unread notification${count===1?'':'s'}.`;
}
function notificationNode(tag,className,text){
 const element=document.createElement(tag);
 if(className)element.className=className;
 if(text!==undefined)element.textContent=text;
 return element;
}
function renderNotificationCard(notification){
 const icons={study_reminder:'◷',daily_goal:'✓',challenge:'⚡',achievement:'✦',system:'ℹ'};
 const card=notificationNode('article',`notification-card${notification.is_read?'':' is-unread'}`);
 const top=notificationNode('div','notification-card-top');
 top.append(notificationNode('span','notification-type-icon',icons[notification.type]||'♧'));
 const copy=notificationNode('div','notification-card-copy');
 const heading=notificationNode('div','notification-card-title');
 heading.append(notificationNode('span','notification-title-text',notification.title));
 if(notification.is_important)heading.append(notificationNode('span','notification-star-mark','★'));
 copy.append(heading,notificationNode('p','notification-card-message',notification.message));
 top.append(copy);
 card.append(top);
 const meta=notificationNode('div','notification-meta');
 const status=notificationNode('span',`notification-status${notification.is_read?'':' unread'}`,notification.is_read?'Read':'Unread');
 status.setAttribute('aria-label',notification.is_read?'Read notification':'Unread notification');
 meta.append(status);
 const priority=notification.priority==='high'?'High priority':notification.priority==='low'?'Low priority':'Standard priority';
 const priorityLabel=notificationNode('span',`notification-priority ${notification.priority||'normal'}`,priority);
 meta.append(priorityLabel);
 if(notification.is_important)meta.append(notificationNode('span','notification-important-label','★ Important'));
 const date=new Date(Number(notification.created_at)*1000);
 if(Number.isFinite(date.getTime())){
  const time=notificationNode('time','',new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(date));
  time.dateTime=date.toISOString();
  meta.append(time);
 }
 card.append(meta);
 const actions=notificationNode('div','notification-card-actions');
 const action=notificationActions[notification.action_url];
 if(action){
  const actionButton=notificationNode('button','notification-action primary',action.label);
  actionButton.type='button';
  actionButton.dataset.view=action.view;
  actionButton.setAttribute('aria-label',`${action.label}: ${notification.title}`);
  actions.append(actionButton);
 }
 if(!notification.is_read){
  const readButton=notificationNode('button','notification-card-action','Mark read');
  readButton.type='button';
  readButton.dataset.notificationRead=String(notification.id);
  readButton.setAttribute('aria-label',`Mark as read: ${notification.title}`);
  actions.append(readButton);
 }
 const importantButton=notificationNode('button','notification-card-action',notification.is_important?'★ Important':'☆ Important');
 importantButton.type='button';
 importantButton.dataset.notificationImportant=String(notification.id);
 importantButton.dataset.important=String(!notification.is_important);
 importantButton.setAttribute('aria-pressed',String(notification.is_important));
 importantButton.setAttribute('aria-label',`${notification.is_important?'Remove from':'Mark as'} important: ${notification.title}`);
 actions.append(importantButton);
 const deleteButton=notificationNode('button','notification-card-action','Delete');
 deleteButton.type='button';
 deleteButton.dataset.notificationDelete=String(notification.id);
 deleteButton.setAttribute('aria-label',`Delete notification: ${notification.title}`);
 actions.append(deleteButton);
 card.append(actions);
 return card;
}
function renderNotifications(){
 const list=$('#notification-list');
 list.replaceChildren();
 $$('#notification-filters [role="tab"]').forEach(button=>{
  const selected=button.dataset.notificationFilter===state.notificationFilter;
  button.classList.toggle('selected',selected);
  button.setAttribute('aria-selected',String(selected));
  button.tabIndex=selected?0:-1;
 });
 $('#notification-mark-all').disabled=state.notificationUnreadCount===0;
 if(state.notificationLoading&&!state.notifications.length){
  list.append(notificationNode('div','notification-loading','Loading notifications…'));
  return;
 }
 if(state.notificationError&&!state.notifications.length){
  const error=notificationNode('div','notification-error',state.notificationError);
  const retry=notificationNode('button','notification-card-action','Try again');
  retry.type='button';
  retry.dataset.notificationRetry='true';
  error.append(document.createElement('br'),retry);
  list.append(error);
  return;
 }
 if(!state.notifications.length&&!state.notificationLoading){
  const empty=notificationNode('div','notification-empty');
  empty.append(notificationNode('span','notification-empty-icon','♧'));
  empty.append(notificationNode('h3','',"You're all caught up!"));
  empty.append(notificationNode('p','',"You don't have any notifications right now. New study reminders, achievements and updates will appear here."));
  list.append(empty);
 }else{
  state.notifications.forEach(notification=>list.append(renderNotificationCard(notification)));
 }
 if(state.notificationHasMore){
  const more=notificationNode('button','notification-card-action','Load older notifications');
  more.type='button';
  more.dataset.notificationMore='true';
  more.disabled=state.notificationLoading;
  list.append(more);
 }
 if(state.notificationLoading)list.append(notificationNode('div','notification-loading','Loading more…'));
 if(state.notificationError)list.append(notificationNode('div','notification-error',state.notificationError));
}
async function fetchNotificationPage(append=false){
 if(state.notificationLoading&&append)return;
 const requestId=++state.notificationRequestId;
 state.notificationLoading=true;
 state.notificationError='';
 if(!append){state.notifications=[];state.notificationPage=0;state.notificationHasMore=false}
 renderNotifications();
 const page=append?state.notificationPage:0;
 try{
  const result=await api(`/api/notifications?filter=${encodeURIComponent(state.notificationFilter)}&page=${page}`);
  if(requestId!==state.notificationRequestId)return;
  state.notifications=append?state.notifications.concat(result.notifications||[]):result.notifications||[];
  state.notificationHasMore=Boolean(result.has_more);
  state.notificationPage=Number.isInteger(result.next_page)?result.next_page:page;
  updateNotificationCount(result.unread_count);
  $('#notification-live-status').textContent=`${state.notifications.length} notifications loaded. ${result.unread_count} unread.`;
 }catch(error){
  if(requestId!==state.notificationRequestId)return;
  state.notificationError='Notifications could not be loaded. Check your connection and try again.';
  $('#notification-live-status').textContent=state.notificationError;
 }finally{
  if(requestId===state.notificationRequestId){
   state.notificationLoading=false;
   renderNotifications();
  }
 }
}
async function refreshNotificationCount(announce=true){
 const result=await api('/api/notifications/unread-count');
 updateNotificationCount(result.unread_count,announce);
}
async function loadNotificationPreferences(){
 const result=await api('/api/notifications/preferences');
 state.notificationPreferences=result.preferences;
 const form=$('#notification-preferences-form');
 Object.entries(result.preferences).forEach(([key,value])=>{
  const input=form.elements.namedItem(key);
  if(input)input.checked=value;
 });
}
async function openNotifications(){
 const drawer=$('#notifications-drawer');
 if(drawer.classList.contains('is-open'))return;
 state.notificationFocusReturn=document.activeElement;
 drawer.classList.add('is-open');
 drawer.removeAttribute('inert');
 drawer.setAttribute('aria-hidden','false');
 $('#notification-overlay').classList.add('is-open');
 $('#notification-overlay').setAttribute('aria-hidden','false');
 $('#notifications-btn').setAttribute('aria-expanded','true');
 document.body.classList.add('notification-open');
 $('#notification-close').focus();
 renderNotifications();
 const results=await Promise.allSettled([fetchNotificationPage(),loadNotificationPreferences()]);
 if(results[1].status==='rejected')toast('Notification preferences could not be loaded.','error');
}
function closeNotifications(restoreFocus=true){
 const drawer=$('#notifications-drawer');
 if(!drawer.classList.contains('is-open'))return;
 drawer.classList.remove('is-open');
 drawer.setAttribute('aria-hidden','true');
 drawer.setAttribute('inert','');
 $('#notification-overlay').classList.remove('is-open');
 $('#notification-overlay').setAttribute('aria-hidden','true');
 $('#notifications-btn').setAttribute('aria-expanded','false');
 document.body.classList.remove('notification-open');
 if(restoreFocus&&state.notificationFocusReturn instanceof HTMLElement)state.notificationFocusReturn.focus();
}
function notificationFocusableElements(){
 return [...$('#notifications-drawer').querySelectorAll('button:not([disabled]),input:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')]
  .filter(element=>element.getClientRects().length);
}
async function handleNotificationAction(target){
 const read=target.closest('[data-notification-read]');
 const important=target.closest('[data-notification-important]');
 const remove=target.closest('[data-notification-delete]');
 if(read){
  const index=state.notifications.findIndex(notification=>String(notification.id)===read.dataset.notificationRead);
  const item=state.notifications[index];
  if(!item||item.is_read)return;
  const oldCount=state.notificationUnreadCount;
  item.is_read=true;
  if(state.notificationFilter==='unread')state.notifications.splice(index,1);
  updateNotificationCount(Math.max(0,oldCount-1),true);
  renderNotifications();
  $('#notification-list').focus();
  try{
   const result=await api(`/api/notifications/${encodeURIComponent(read.dataset.notificationRead)}/read`,{method:'PATCH',body:'{}'});
   updateNotificationCount(result.unread_count,true);
   await fetchNotificationPage();
   $('#notification-list').focus();
  }catch(error){
   item.is_read=false;
   if(state.notificationFilter==='unread')state.notifications.splice(index,0,item);
   updateNotificationCount(oldCount,true);
   renderNotifications();
   $('#notification-list').focus();
   toast(error.message,'error');
  }
  return;
 }
 if(important){
  const index=state.notifications.findIndex(notification=>String(notification.id)===important.dataset.notificationImportant);
  const item=state.notifications[index];
  if(!item)return;
  const prior=item.is_important;
  item.is_important=important.dataset.important==='true';
  if(state.notificationFilter==='important'&&!item.is_important)state.notifications.splice(index,1);
  renderNotifications();
  $('#notification-list').focus();
  try{
   await api(`/api/notifications/${encodeURIComponent(important.dataset.notificationImportant)}/important`,{method:'PATCH',body:JSON.stringify({is_important:item.is_important})});
   await fetchNotificationPage();
   $('#notification-list').focus();
  }catch(error){
   item.is_important=prior;
   if(state.notificationFilter==='important'&&prior)state.notifications.splice(index,0,item);
   renderNotifications();
   $('#notification-list').focus();
   toast(error.message,'error');
  }
  return;
 }
 if(remove){
  if(!confirm('Delete this notification?'))return;
  const id=remove.dataset.notificationDelete;
  const index=state.notifications.findIndex(notification=>String(notification.id)===id);
  if(index<0)return;
  const [item]=state.notifications.splice(index,1);
  const oldCount=state.notificationUnreadCount;
  updateNotificationCount(Math.max(0,oldCount-(item.is_read?0:1)),true);
  renderNotifications();
  $('#notification-list').focus();
  try{
   const result=await api(`/api/notifications/${encodeURIComponent(id)}`,{method:'DELETE'});
   updateNotificationCount(result.unread_count,true);
   await fetchNotificationPage();
   $('#notification-list').focus();
  }catch(error){
   state.notifications.splice(index,0,item);
   updateNotificationCount(oldCount,true);
   renderNotifications();
   $('#notification-list').focus();
   toast(error.message,'error');
  }
 }
}
function showAuth(mode='login'){ $('#auth-screen').classList.remove('hidden');$('#app-shell').classList.add('hidden');$('#login-form').classList.toggle('hidden',mode!=='login');$('#signup-form').classList.toggle('hidden',mode!=='signup');$('#auth-title').textContent=mode==='login'?'Sign in to StudyFlow':'Create your StudyFlow account';$('#auth-eyebrow').textContent=mode==='login'?'WELCOME BACK':'GET STARTED';$('#auth-subtitle').textContent=mode==='login'?'Your next study win starts here.':'A better study routine starts with one small step.';$('#auth-switch-text').textContent=mode==='login'?'New to StudyFlow?':'Already have an account?';$('#auth-switch').textContent=mode==='login'?'Create an account':'Sign in';$('#auth-error').textContent='';}
function showApp(){ $('#auth-screen').classList.add('hidden');$('#app-shell').classList.remove('hidden'); }
async function loadAll(){state.notifications=[];state.notificationPreferences=null;state.notificationFilter='all';state.notificationError='';const [data,approvalStatus,notificationCount,privacyConsent]=await Promise.all([api('/api/data'),api('/api/ai/approval-status'),api('/api/notifications/unread-count'),api('/api/privacy/consent')]);state.records=data.records||[];state.aiProviderApprovalStatus=approvalStatus.providers||{};state.privacyConsent=privacyConsent;updateNotificationCount(notificationCount.unread_count);renderAll();}
async function saveRecord(kind,data,id){const d=await api('/api/data',{method:'POST',body:JSON.stringify({kind,data,id})});const index=state.records.findIndex(r=>r.id===d.id);const record={...d,created_at:recordBy(kind,d.id)?.created_at||Date.now()/1000};if(index>=0)state.records[index]=record;else state.records.unshift(record);renderAll();return d.id;}
async function deleteRecord(id){await api('/api/data?id='+encodeURIComponent(id),{method:'DELETE'});state.records=state.records.filter(r=>r.id!==id);renderAll();}
async function startSession(){if(state.timerStart){stopSession();return}state.timerStart=Date.now();state.focusSubject=prompt('What are you focusing on?', 'Study session')||'Study session';$('#header-focus').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>'; state.timerInterval=setInterval(()=>{$('#header-focus').title='Focus session running · click to finish';},1000);toast('Focus session started. Stay with it!','success')}
async function stopSession(){if(!state.timerStart)return;clearInterval(state.timerInterval);const mins=Math.max(1,Math.round((Date.now()-state.timerStart)/60000));await saveRecord('session',{date:todayKey(),minutes:mins,subject:state.focusSubject,startedAt:state.timerStart,endedAt:Date.now()});state.timerStart=null;$('#header-focus').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>'; $('#header-focus').title='Start focus session';toast(`Nice work — ${mins} minute${mins===1?'':'s'} saved.`,'success')}
function goView(view){if(!$('#view-'+view))return;state.view=view;$$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const labels={home:'Dashboard',timetable:'Timetable',tasks:'My tasks',calendar:'Calendar',stats:'My progress',revision:'Quick revision',english:'English practice',maths:'Math practice',challenge:'Daily challenge',leaderboard:'Leaderboard',assistant:'AI & dictionary',profile:'My profile',settings:'Settings'};$('#page-breadcrumb').textContent=labels[view]||view;renderView(view);window.scrollTo({top:0,behavior:'smooth'})}
function renderAll(){renderHeader();renderHome();renderTasks();renderTimetable();renderCalendar();renderStats();renderEnglishStats();renderMathStats();renderChallengeStats();renderLeaderboard();renderAssistant();renderProfile();renderGoal();renderPrivacySettings()}
function renderHeader(){const u=state.user;const now=new Date();const h=now.getHours();const greeting=h<12?'Good morning':h<17?'Good afternoon':'Good evening';$('#welcome-title').innerHTML=`${greeting}, ${esc(u.name.split(' ')[0])} <span>✦</span>`;$('#today-label').textContent=fmtDate(now,{weekday:'long',month:'long',day:'numeric'}).toUpperCase();$('#mini-name').textContent=u.name;$('#mini-class').textContent=`Class ${u.standard} · ${u.board}`;$('#mini-avatar').textContent=(u.name||'S')[0].toUpperCase();$('#top-avatar').textContent=(u.name||'S')[0].toUpperCase();$('#side-task-count').textContent=rec('task').filter(x=>!x.data.completed).length}
function streakData(){const map=new Set();rec('session').forEach(r=>{if((r.data.minutes||0)>0)map.add(r.data.date)});rec('task').forEach(r=>{if(r.data.completed)map.add(r.data.completedDate||r.data.due||todayKey())});const dates=[...map].sort();let longest=0,run=0,prev=null;for(const k of dates){const d=parseDate(k);if(prev&&Math.round((d-prev)/86400000)===1)run++;else run=1;longest=Math.max(longest,run);prev=d}let current=0;let d=parseDate(todayKey());if(!map.has(todayKey()))d.setDate(d.getDate()-1);while(map.has(localDate(d))){current++;d.setDate(d.getDate()-1)}return {current,longest,map}}
function studyMinutes(date){return rec('session').filter(r=>r.data.date===date).reduce((a,r)=>a+(Number(r.data.minutes)||0),0)}
function totalMinutes(start,end){return rec('session').filter(r=>r.data.date>=start&&r.data.date<=end).reduce((a,r)=>a+(Number(r.data.minutes)||0),0)}
function getGoal(){return rec('goal')[0]?.data.minutes||120}
function renderHome(){const tasks=rec('task');const done=tasks.filter(t=>t.data.completed&&t.data.completedDate===todayKey()).length;const due=tasks.filter(t=>t.data.due===todayKey()).length;const todayTasks=tasks.filter(t=>t.data.due===todayKey()||(!t.data.due&&!t.data.completed));const mins=studyMinutes(todayKey()),goal=getGoal();$('#today-hours').textContent=`${Math.floor(mins/60)}h ${mins%60}m`;$('#today-completed').textContent=`${done}/${Math.max(due,done)}`;const pct=Math.min(100,Math.round(done/Math.max(due,1)*100));$('#task-ring').style.background=`conic-gradient(#7048df ${pct*3.6}deg,#eeeaf5 0deg)`;$('#task-ring b').textContent=pct+'%';$('#daily-goal-value').textContent=Math.min(100,Math.round(mins/goal*100))+'%';$('#daily-goal-caption').textContent=`${mins} of ${goal} minutes`;$('#daily-goal-bar').style.width=Math.min(100,mins/goal*100)+'%';const events=rec('event').filter(e=>e.data.date>=todayKey()&&e.data.date<=localDate(new Date(Date.now()+7*86400000)));$('#upcoming-count').textContent=events.length;const st=streakData();$('#streak-number').textContent=st.current;$('#longest-streak').textContent=st.longest+' days';$('#streak-week').innerHTML=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(d.getDay()+6)%7+i);const k=localDate(d);return `<span class="streak-day ${st.map.has(k)?'done':''}"><i>${st.map.has(k)?'✓':'·'}</i>${dayNames[d.getDay()]}</span>`}).join('');
 const entries=rec('timetable').filter(t=>(t.data.days||[]).includes(new Date().getDay())).sort((a,b)=>a.data.start.localeCompare(b.data.start));const now=new Date();const currentM=now.getHours()*60+now.getMinutes();$('#today-plan').innerHTML=entries.length?entries.map(t=>{const [sh,sm]=t.data.start.split(':').map(Number),[eh,em]=t.data.end.split(':').map(Number);const active=currentM>=sh*60+sm&&currentM<eh*60+em;const done=(t.data.completedDates||[]).includes(todayKey());return `<div class="timeline-item ${active?'current':''} ${done?'done':''}"><span class="timeline-time">${esc(t.data.start)}–${esc(t.data.end)}</span><span class="timeline-rail"><i></i></span><span class="timeline-info"><b>${esc(t.data.title)}</b><small>${esc(t.data.subject||'Study')}</small></span><span class="timeline-status">${done?'Done':active?'Now':'Upcoming'}</span></div>`}).join(''):`<div class="empty-state"><div class="empty-graphic">▦</div><b>Your timetable is waiting</b><p>Add your regular classes and study slots to plan the day.</p></div>`;
 const home=tasks.filter(t=>!t.data.completed).sort((a,b)=>String(a.data.due||'9999').localeCompare(String(b.data.due||'9999'))).slice(0,4);$('#home-tasks').innerHTML=home.length?home.map(t=>`<div class="home-task"><button class="task-check" data-complete="${esc(t.id)}" title="Mark complete" aria-label="Mark ${esc(t.data.title)} complete" aria-pressed="false"></button><span><b>${esc(t.data.title)}</b><small>${esc(t.data.subject||'Personal')} · ${t.data.due?fmtDate(parseDate(t.data.due),{month:'short',day:'numeric'}):'No due date'}</small></span><i class="priority-dot ${esc(t.data.priority||'medium')}"></i></div>`).join(''):`<div class="empty-state" style="min-height:130px"><div class="empty-graphic">✓</div><b>Nothing pending here</b><p>Add a task to keep your day moving.</p></div>`;renderHomeWeek();}
function renderHomeWeek(){const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(d.getDay()+6)%7+i);return d});const vals=days.map(d=>studyMinutes(localDate(d))/60);const max=Math.max(1,...vals);$('#home-week-chart').innerHTML=days.map((d,i)=>`<div class="week-col"><div class="week-bar ${localDate(d)===todayKey()?'today':''}" style="height:${Math.max(4,vals[i]/max*90)}%" title="${vals[i].toFixed(1)} hours"></div><small>${['M','T','W','T','F','S','S'][i]}</small></div>`).join('')}
function renderTasks(){const tasks=rec('task');const completed=tasks.filter(t=>t.data.completed).length;const pending=tasks.length-completed;const overdue=tasks.filter(t=>!t.data.completed&&t.data.due&&t.data.due<todayKey()).length;$('#task-summary').innerHTML=[['Total tasks',tasks.length],['Completed',completed],['Pending',pending],['Overdue',overdue]].map(([a,b])=>`<div class="task-summary-card"><span>${a}</span><b>${b}</b></div>`).join('');let list=tasks.slice().sort((a,b)=>Number(a.data.completed)-Number(b.data.completed)||String(a.data.due||'9999').localeCompare(String(b.data.due||'9999')));if(state.taskFilter==='pending')list=list.filter(t=>!t.data.completed);if(state.taskFilter==='completed')list=list.filter(t=>t.data.completed);$('#task-list').innerHTML=list.length?list.map(t=>`<div class="task-row ${t.data.completed?'completed':''}"><button class="task-check ${t.data.completed?'checked':''}" data-complete="${esc(t.id)}" aria-label="${t.data.completed?'Mark incomplete':'Mark complete'}: ${esc(t.data.title)}" aria-pressed="${t.data.completed}">${t.data.completed?'✓':''}</button><div class="task-details"><b>${esc(t.data.title)}</b><small>${esc(t.data.subject||'General')} · ${t.data.due?`Due ${fmtDate(parseDate(t.data.due),{month:'short',day:'numeric'})}`:'No deadline'} · ${esc(t.data.category||'Academic')}</small></div><span class="priority-pill ${esc(t.data.priority||'medium')}">${esc(t.data.priority||'medium')}</span><div class="row-actions"><button class="tiny-btn" data-edit="task:${esc(t.id)}">Edit</button><button class="tiny-btn" data-delete="${esc(t.id)}" aria-label="Delete task: ${esc(t.data.title)}">×</button></div></div>`).join(''):`<div class="empty-state"><div class="empty-graphic">☑</div><b>No tasks in this view</b><p>Add a task or change the filter.</p></div>`;}
function renderTimetable(){const period=state.timetablePeriod;const entries=rec('timetable');const days=period==='today'?[new Date().getDay()]:period==='week'?[1,2,3,4,5,6,0]:[];if(period==='month'){const d=new Date();$('#timetable-content').innerHTML=`<div class="empty-state"><div class="empty-graphic">▦</div><b>Monthly timetable overview</b><p>${entries.length} recurring activities are set up. Use the weekly view to see your schedule by day.</p><button class="btn btn-outline" id="switch-week-view">View this week</button></div>`;return}const grouped=days.map(day=>({day,items:entries.filter(e=>(e.data.days||[]).includes(day)).sort((a,b)=>a.data.start.localeCompare(b.data.start))}));$('#timetable-content').innerHTML=grouped.map(g=>`<div class="timetable-day"><h3>${g.day===new Date().getDay()&&period==='today'?'TODAY · ':''}${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][g.day].toUpperCase()}</h3>${g.items.length?g.items.map(e=>`<div class="timetable-row"><span class="time">${esc(e.data.start)} – ${esc(e.data.end)}</span><span class="subject"><i class="subject-square">${esc((e.data.subject||'S').slice(0,1))}</i><span><b>${esc(e.data.title)}</b><small>${esc(e.data.subject||'Study')}</small></span></span><span class="status-chip">${esc(e.data.days?.length===7?'Every day':'Scheduled')}</span><span class="row-actions"><button class="tiny-btn" data-time-done="${esc(e.id)}">${(e.data.completedDates||[]).includes(todayKey())?'Done ✓':'Mark done'}</button><button class="tiny-btn" data-edit="timetable:${esc(e.id)}">Edit</button><button class="tiny-btn" data-delete="${esc(e.id)}" aria-label="Delete activity: ${esc(e.data.title)}">×</button></span></div>`).join(''):`<div class="small-help">No activities yet for this day.</div>`}</div>`).join('')||`<div class="empty-state"><b>No timetable yet</b><p>Add activities to start planning.</p></div>`;}
function renderCalendar(){
 const period=state.calendarPeriod;const events=rec('event');const d=parseDate(state.selectedDate);const year=state.calendarDate.getFullYear(),month=state.calendarDate.getMonth();
 const title=period==='year'?String(year):period==='day'?fmtDate(d,{weekday:'long',month:'long',day:'numeric',year:'numeric'}):period==='week'?`Week of ${fmtDate(parseDate(weekStartKey(d)),{month:'short',day:'numeric'})}`:new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric'}).format(state.calendarDate);
 $('#calendar-title').textContent=title;$$('#calendar-periods button').forEach(b=>b.classList.toggle('selected',b.dataset.calendarPeriod===period));const root=$('#calendar-grid');root.className='calendar-grid';let html='';
 if(period==='month'){
  const first=new Date(year,month,1),start=new Date(year,month,1-first.getDay());html=dayNames.map(day=>`<div class="calendar-weekday">${day}</div>`).join('');
  for(let i=0;i<42;i++){const day=new Date(start);day.setDate(start.getDate()+i);const key=localDate(day);const ev=events.filter(e=>e.data.date===key);html+=`<button class="calendar-day ${day.getMonth()!==month?'muted-day':''} ${key===todayKey()?'today-day':''} ${key===state.selectedDate?'selected-day':''}" data-calendar-date="${key}"><b>${day.getDate()}</b><span class="day-dots">${ev.slice(0,4).map(e=>`<i class="dot ${e.data.category==='Exam'?'purple-dot':e.data.category==='Assignment'?'blue-dot':e.data.category==='Personal'?'orange-dot':'mint-dot'}"></i>`).join('')}</span></button>`}
 }else if(period==='day'){
  root.classList.add('calendar-single');const key=state.selectedDate;const ev=events.filter(e=>e.data.date===key);html=`<div class="calendar-agenda-card"><div class="agenda-date"><b>${fmtDate(d,{weekday:'long',day:'numeric'})}</b><small>${ev.length} event${ev.length===1?'':'s'}</small></div>${ev.length?ev.map(e=>`<div class="agenda-event"><i class="dot ${e.data.category==='Exam'?'purple-dot':e.data.category==='Assignment'?'blue-dot':e.data.category==='Personal'?'orange-dot':'mint-dot'}"></i><span><b>${esc(e.data.title)}</b><small>${esc(e.data.category||'Event')} · ${esc(e.data.time||'All day')}</small></span></div>`).join(''):'<div class="small-help">No events on this date. Use “Add event” to create one.</div>'}</div>`;
 }else if(period==='week'){
  root.classList.add('calendar-week-view');const monday=parseDate(weekStartKey(d));for(let i=0;i<7;i++){const day=new Date(monday);day.setDate(monday.getDate()+i);const key=localDate(day),ev=events.filter(e=>e.data.date===key);html+=`<button class="calendar-agenda-card ${key===state.selectedDate?'selected-day':''} ${key===todayKey()?'today-day':''}" data-calendar-date="${key}"><div class="agenda-date"><b>${fmtDate(day,{weekday:'short',day:'numeric'})}</b><small>${ev.length} item${ev.length===1?'':'s'}</small></div>${ev.slice(0,2).map(e=>`<div class="agenda-event"><i class="dot ${e.data.category==='Exam'?'purple-dot':e.data.category==='Assignment'?'blue-dot':e.data.category==='Personal'?'orange-dot':'mint-dot'}"></i><span><b>${esc(e.data.title)}</b><small>${esc(e.data.time||'All day')}</small></span></div>`).join('')||'<span class="small-help">No events</span>'}</button>`}
 }else{
  root.classList.add('calendar-year-view');for(let m=0;m<12;m++){const start=new Date(year,m,1),end=new Date(year,m+1,0);const count=events.filter(e=>e.data.date>=localDate(start)&&e.data.date<=localDate(end)).length;html+=`<button class="calendar-year-card" data-year-month="${m}"><b>${new Intl.DateTimeFormat('en-IN',{month:'long'}).format(start)}</b><span>${count} event${count===1?'':'s'}</span><small>${start.getDate()} – ${end.getDate()}</small></button>`}
 }
 root.innerHTML=html;renderSelectedEvents();
}
function renderSelectedEvents(){const d=parseDate(state.selectedDate);$('#selected-date-title').textContent=fmtDate(d,{weekday:'long',month:'long',day:'numeric'});const ev=rec('event').filter(e=>e.data.date===state.selectedDate).sort((a,b)=>String(a.data.time||'').localeCompare(String(b.data.time||'')));$('#selected-date-events').innerHTML=ev.length?ev.map(e=>`<div class="event-row"><i class="event-mark" style="background:${e.data.category==='Exam'?'#9874e5':e.data.category==='Assignment'?'#75a7e8':e.data.category==='Personal'?'#eea26a':'#65c1a0'}"></i><span><b>${esc(e.data.title)}</b><small>${esc(e.data.category||'Event')} · ${esc(e.data.time||'All day')}</small>${e.data.description?`<small>${esc(e.data.description)}</small>`:''}</span><button class="tiny-btn" data-delete="${esc(e.id)}" aria-label="Delete event: ${esc(e.data.title)}">×</button></div>`).join(''):`<div class="empty-state" style="min-height:160px"><div class="empty-graphic">▣</div><b>No events on this day</b><p>Tap Add event to keep an important date here.</p></div>`}
function renderStats(){const range=state.statsRange;let start=range==='today'?todayKey():localDate(new Date(Date.now()-(Number(range)-1)*86400000));const end=todayKey();const mins=totalMinutes(start,end);const tasks=rec('task').filter(t=>(t.created_at*1000||Date.now())>=parseDate(start).getTime());const done=tasks.filter(t=>t.data.completed).length;const days=range==='today'?1:Number(range);$('#stats-summary').innerHTML=[['Study time',`${Math.floor(mins/60)}h ${mins%60}m`],['Average / day',`${Math.round(mins/days)} min`],['Tasks completed',done],['Goal completion',`${Math.min(100,Math.round(mins/(getGoal()*days)*100))}%`]].map(([a,b])=>`<div class="stat-card"><div class="stat-icon purple">✦</div><div><span>${a}</span><strong>${b}</strong><small class="muted">Selected period</small></div></div>`).join('');const chartDays=range==='today'?[new Date()]:Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d});const vals=chartDays.map(d=>studyMinutes(localDate(d)));const max=Math.max(1,...vals);$('#stats-bar-chart').innerHTML=chartDays.map((d,i)=>`<div class="week-col"><div class="week-bar ${localDate(d)===todayKey()?'today':''}" style="height:${Math.max(4,vals[i]/max*88)}%" title="${vals[i]} minutes"></div><small>${range==='today'?'Today':fmtDate(d,{weekday:'short'})}</small></div>`).join('');const allTasks=rec('task').filter(t=>range==='today'?t.data.due===todayKey()||t.data.created===todayKey():t.data.due>=start&&t.data.due<=end||t.data.created>=start&&t.data.created<=end);const c=allTasks.filter(t=>t.data.completed).length,p=allTasks.length-c,percent=allTasks.length?Math.round(c/allTasks.length*100):0;$('#task-donut-chart').innerHTML=`<div class="donut-wrap"><div class="donut" style="background:conic-gradient(#55b895 ${percent*3.6}deg,#eeeaf5 0deg)"><b>${percent}%</b></div><div class="donut-legend"><span><i class="dot mint-dot"></i>Completed <b>${c}</b></span><span><i class="dot" style="background:#e5e1ee"></i>Pending <b>${p}</b></span></div></div>`;const sub={};rec('session').filter(r=>r.data.date>=start&&r.data.date<=end).forEach(r=>{const k=r.data.subject||'General';sub[k]=(sub[k]||0)+Number(r.data.minutes||0)});const pairs=Object.entries(sub).sort((a,b)=>b[1]-a[1]).slice(0,6);const sm=Math.max(1,...pairs.map(x=>x[1]));$('#subject-chart').innerHTML=pairs.length?pairs.map(([k,v])=>`<div class="subject-row"><span>${esc(k)}</span><div class="subject-track"><i style="width:${v/sm*100}%"></i></div><b>${Math.round(v)}m</b></div>`).join(''):`<div class="small-help">Start a focus session to see your subject distribution.</div>`;const consistency=Array.from({length:range==='today'?7:Math.min(30,Number(range))},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(range==='today'?6-i:(Number(range)-1-i)));return d});$('#consistency-chart').innerHTML=consistency.map(d=>{const k=localDate(d);return `<span class="consistency-cell ${studyMinutes(k)>0?'active':''} ${k===todayKey()?'today':''}" title="${k}: ${studyMinutes(k)} minutes">${d.getDate()}</span>`}).join('')}
function renderGoal(){const g=rec('goal')[0];if(g)$('#goal-form [name="minutes"]').value=g.data.minutes||120}
function renderPrivacySettings(){const consent=state.privacyConsent?.consent;const consentStatus=$('#privacy-consent-status');const consentButton=$('#accept-privacy-consent-btn');if(consent){consentStatus.textContent=`Recorded for notice ${consent.version} on ${new Date(consent.granted_at*1000).toLocaleString()}.`;consentButton.disabled=true;consentButton.textContent='Core data use recorded'}else{consentStatus.textContent='No current core-service acceptance is recorded for this account.';consentButton.disabled=false;consentButton.textContent='Agree to core data use'}const providers=Object.values(state.aiProviderApprovalStatus||{});const approved=providers.some(categories=>['text','images','documents'].every(category=>categories[category]?.approved===true));$('#ai-privacy-status').textContent=approved?'Provider approval exists, but StudyFlow has not enabled student-content processing or collected provider-specific consent. AI content requests remain blocked.':'No AI provider is approved. Student prompts, images and documents are blocked from all providers.'}
function getPracticeStats(type){return recordBy('achievement',`${type}_stats`)?.data||{attempted:0,correct:0}}
function renderEnglishStats(){const x=getPracticeStats('english');$('#english-level').textContent=`Class ${state.user.standard} · ${state.user.board}`;$('#english-stats').innerHTML=`<div class="metric-box"><b>${x.attempted||0}</b><small>Questions attempted</small></div><div class="metric-box"><b>${x.correct||0}</b><small>Correct answers</small></div><div class="metric-box"><b>${x.attempted?Math.round(x.correct/x.attempted*100):0}%</b><small>Accuracy</small></div><div class="metric-box"><b>${Math.max(0,(x.attempted||0)-(x.correct||0))}</b><small>To practise again</small></div>`}
function renderMathStats(){const x=getPracticeStats('math');$('#math-level').textContent=`Class ${state.user.standard} · ${state.user.board}`;$('#math-stats').innerHTML=`<div class="metric-box"><b>${x.attempted||0}</b><small>Problems attempted</small></div><div class="metric-box"><b>${x.correct||0}</b><small>Correct answers</small></div><div class="metric-box"><b>${x.attempted?Math.round(x.correct/x.attempted*100):0}%</b><small>Accuracy</small></div><div class="metric-box"><b>${Math.max(0,(x.attempted||0)-(x.correct||0))}</b><small>Keep practising</small></div>`}
function filteredQuestions(type,topic){const grade=Number(state.user.standard);let bank;if(type==='english')bank=grade<=8?englishBasicBank:grade<=10?englishIntermediateBank:englishBank;else bank=grade<=8?mathsBasicBank:grade<=10?mathsIntermediateBank:mathsBank;bank=bank.filter(q=>topic==='mixed'||q.topic===topic);return bank.length?bank:(type==='english'?englishBasicBank:mathsBasicBank)}
function startPractice(type){const topic=type==='english'?state.englishTopic:state.mathTopic;const bank=filteredQuestions(type,topic).slice().sort(()=>Math.random()-.5).slice(0,5);const quiz={type,questions:bank,index:0,selected:null,checked:false,correct:0,attempted:0};if(type==='english')state.englishQuiz=quiz;else state.mathQuiz=quiz;renderPracticeQuestion(type)}
function renderPracticeQuestion(type){const qz=type==='english'?state.englishQuiz:state.mathQuiz;if(!qz)return;const root=type==='english'?$('#english-quiz'):$('#math-quiz');root.classList.remove('hidden');if(qz.index>=qz.questions.length){root.innerHTML=`<div class="challenge-result"><div class="result-score">${qz.correct}/${qz.questions.length}</div><h3>Round complete!</h3><p class="muted">You got ${qz.correct} out of ${qz.questions.length} correct.</p><button class="btn btn-primary" id="practice-again">Practise again →</button></div>`;$('#practice-again',root).onclick=()=>startPractice(type);return}const q=qz.questions[qz.index];root.innerHTML=`<div class="quiz-progress"><span>QUESTION ${qz.index+1} OF ${qz.questions.length}</span><span>${qz.correct} correct</span></div><div class="quiz-question">${esc(q.q)}</div><div class="quiz-options">${q.o.map((o,i)=>`<button class="quiz-option ${qz.selected===i?'selected':''} ${qz.checked&&i===q.a?'correct':''} ${qz.checked&&qz.selected===i&&i!==q.a?'wrong':''}" data-answer="${i}" ${qz.checked?'disabled':''}>${String.fromCharCode(65+i)}. ${esc(o)}</button>`).join('')}</div>${qz.checked?`<div class="quiz-feedback">${qz.selected===q.a?'✓ Correct!':'Not quite.'} ${esc(q.e)}</div>`:''}<div class="quiz-actions"><span class="small-help">${qz.checked?'Answer checked':'Choose one answer'}</span><button class="btn btn-primary" id="quiz-submit" ${qz.selected===null&&!qz.checked?'disabled':''}>${qz.checked?(qz.index===qz.questions.length-1?'See result':'Next question'):'Check answer'}</button></div>`;
 $$('[data-answer]',root).forEach(b=>b.onclick=()=>{if(qz.checked)return;qz.selected=Number(b.dataset.answer);renderPracticeQuestion(type)});$('#quiz-submit',root).onclick=async()=>{if(!qz.checked){if(qz.selected===null)return;qz.checked=true;qz.attempted++;if(qz.selected===q.a)qz.correct++;renderPracticeQuestion(type)}else{qz.index++;qz.selected=null;qz.checked=false;if(qz.index>=qz.questions.length){const old=getPracticeStats(type==='english'?'english':'math');await saveRecord('achievement',{attempted:(old.attempted||0)+qz.attempted,correct:(old.correct||0)+qz.correct},`${type==='english'?'english':'math'}_stats`);type==='english'?renderEnglishStats():renderMathStats()}renderPracticeQuestion(type)}}}
function renderChallengeStats(){const x=recordBy('achievement','challenge_stats')?.data||{attempted:0,correct:0,points:0};$('#challenge-level').textContent=`Class ${state.user.standard} group`;$('#challenge-intro').textContent=`You're in the Class ${bandForClass()} group. Your official daily attempt is timed and adds to the leaderboard.`;$('#challenge-stats').innerHTML=`<div class="metric-box"><b>${x.points||0}</b><small>Total points</small></div><div class="metric-box"><b>${x.attempted||0}</b><small>Questions answered</small></div><div class="metric-box"><b>${x.correct||0}</b><small>Correct answers</small></div><div class="metric-box"><b>${x.attempted?Math.round(x.correct/x.attempted*100):0}%</b><small>Accuracy</small></div>`}
function bandForClass(){const n=Number(state.user.standard);return n<=8?'7-8':n<=10?'9-10':'11-12'}
async function beginChallenge(official=true,existingAttempt=null){if(state.challengeStarting)return;const button=$('#begin-challenge');state.challengeStarting=true;button.disabled=true;try{const attempt=existingAttempt||await api('/api/challenge/start',{method:'POST',body:JSON.stringify({official})});state.challenge={attemptId:attempt.attempt_id,questions:attempt.questions,answers:Array(attempt.questions.length).fill(null),index:0,selected:null,official:attempt.official,started:Date.now()-((attempt.duration_seconds-attempt.remaining_seconds)*1000),remaining:attempt.remaining_seconds};$('#challenge-start-panel').classList.add('hidden');$('#challenge-result').classList.add('hidden');$('#challenge-quiz').classList.remove('hidden');renderChallengeQuestion();clearInterval(state.challengeTimer);if(state.challenge&&state.challenge.remaining<=0){finishChallenge();return}state.challengeTimer=setInterval(()=>{if(!state.challenge)return;state.challenge.remaining--;const timer=$('#challenge-timer');if(timer)timer.textContent=`${String(Math.floor(state.challenge.remaining/60)).padStart(2,'0')}:${String(state.challenge.remaining%60).padStart(2,'0')}`;if(state.challenge.remaining<=0)finishChallenge()},1000)}catch(error){toast(error.message,'error')}finally{state.challengeStarting=false;button.disabled=false}}
function renderChallengeQuestion(){const c=state.challenge;if(!c)return;if(c.index>=c.questions.length){finishChallenge();return}const q=c.questions[c.index];$('#challenge-quiz').innerHTML=`<div class="challenge-quiz-top"><div><span class="eyebrow">${c.official?'OFFICIAL DAILY ATTEMPT':'PRACTICE ROUND'}</span><h3>Vocabulary sprint</h3></div><div class="challenge-timer" id="challenge-timer">${String(Math.floor(c.remaining/60)).padStart(2,'0')}:${String(c.remaining%60).padStart(2,'0')}</div></div><div class="quiz-progress"><span>QUESTION ${c.index+1} / ${c.questions.length}</span></div><h2>${esc(q.prompt)}</h2><div class="quiz-options">${q.options.map((option,i)=>`<button class="quiz-option ${c.selected===i?'selected':''}" data-challenge-answer="${i}">${String.fromCharCode(65+i)}. ${esc(option)}</button>`).join('')}</div><div class="quiz-actions"><span class="small-help">Correct +1 · Wrong 0</span><button class="btn btn-primary" id="challenge-next">${c.index===c.questions.length-1?'Finish challenge':'Next question'}</button></div>`;$$('[data-challenge-answer]').forEach(button=>button.onclick=()=>{c.selected=Number(button.dataset.challengeAnswer);$$('[data-challenge-answer]').forEach(option=>option.classList.toggle('selected',option===button))});$('#challenge-next').onclick=()=>{c.answers[c.index]=c.selected;c.index++;c.selected=null;renderChallengeQuestion()}}
async function finishChallenge(){
 const c=state.challenge;
 if(!c||c.submitting)return;
 c.submitting=true;
 if(c.selected!==null&&c.index<c.questions.length)c.answers[c.index]=c.selected;
 clearInterval(state.challengeTimer);
 state.challengeTimer=null;
 let result=null;
 let message='The server did not confirm a score.';
 try{
  result=await api('/api/challenge',{method:'POST',body:JSON.stringify({attempt_id:c.attemptId,answers:c.answers})});
  message=result.official?'Your official score has been added to the leaderboard.':'Practice round complete.';
  if(result.official){
   try{await refreshNotificationCount(true)}catch{toast('Challenge saved, but the notification count could not be refreshed.','error')}
   const old=recordBy('achievement','challenge_stats')?.data||{};
   try{await saveRecord('achievement',{attempted:(old.attempted||0)+result.total,correct:(old.correct||0)+result.correct,points:(old.points||0)+result.score},'challenge_stats')}catch{message='Your score was recorded, but personal challenge stats could not be updated.'}
  }
 }catch(error){message=error.message}
 const scoreText=result?`${result.score} pts`:'Score unavailable';
 const detailText=result?`${result.correct} correct · ${Math.max(0,result.total-result.correct)} incorrect or skipped · ${result.elapsed}s used`:'No result was confirmed by the server.';
 const heading=c.official&&!result?'Challenge result not recorded':c.official?'Daily challenge complete!':'Practice round complete!';
 $('#challenge-quiz').classList.add('hidden');
 $('#challenge-result').classList.remove('hidden');
 $('#challenge-result').innerHTML=`<div class="empty-graphic" style="margin:auto">⚡</div><div class="result-score">${scoreText}</div><h3>${heading}</h3><p class="muted">${detailText}</p><p class="small-help">${esc(message)}</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:15px"><button class="btn btn-primary" id="challenge-practice-again">Practise again</button><button class="btn btn-outline" data-view="leaderboard">View leaderboard</button></div>`;
 $('#challenge-practice-again').onclick=()=>{state.challenge=null;beginChallenge(false)};
 state.challenge=null;
 renderChallengeStats();
 renderLeaderboardPreview();
 $('#challenge-start-panel').classList.remove('hidden');
 $('#begin-challenge').textContent='Practise again (not scored)';
 $('#begin-challenge').onclick=()=>beginChallenge(false);
}
async function renderLeaderboard(){if(!$('#leaderboard-table'))return;const period=$('#leaderboard-period .selected')?.dataset.period||'daily';const band=$('#leaderboard-band').value;$('#leaderboard-group').textContent=band==='all'?'All student groups':`Class ${band}`;try{const d=await api(`/api/leaderboard?period=${period}&band=${band}`);const entries=d.entries||[];const top=entries.slice(0,3);const order=[top[1],top[0],top[2]];$('#leaderboard-podium').innerHTML=order.map((x,i)=>x?`<div class="podium-card ${i===1?'first':i===0?'second':'third'}"><div class="podium-avatar">${esc(x.username.slice(0,1).toUpperCase())}</div><b>${esc(x.username)}</b><small>${x.score} points</small><div class="podium-block">${i===1?'1':i===0?'2':'3'}</div></div>`:'').join('')||'<div class="empty-state"><b>No scores yet</b><p>Be the first to take today&#39;s challenge.</p></div>';$('#leaderboard-table').innerHTML=entries.map((x,i)=>`<tr class="${x.username===state.user.username?'me-row':''}"><td>${i+1}</td><td>${esc(x.username)}${x.username===state.user.username?' · you':''}</td><td>${esc(x.standard)}</td><td>${x.correct||0}</td><td><b>${x.score||0}</b></td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:#aaa;padding:22px">No leaderboard scores for this period yet.</td></tr>';$('#leaderboard-preview').innerHTML=entries.slice(0,4).map((x,i)=>`<div class="leaderboard-preview-row"><span class="rank-badge">${i+1}</span><b>${esc(x.username)}</b><small>Class ${esc(x.standard)}</small><strong>${x.score} pts</strong></div>`).join('')||'<div class="small-help">No scores yet. Take the daily challenge to get started.</div>';}catch(e){$('#leaderboard-table').innerHTML=`<tr><td colspan="5">${esc(e.message)}</td></tr>`}}
function renderLeaderboardPreview(){renderLeaderboard()}
function renderAssistant(){
 const saved=localStorage.getItem('studyflow_ai_pref');
 if(saved){try{const x=JSON.parse(saved);state.aiProvider=providers.some(p=>p.id===x.provider)?x.provider:state.aiProvider;state.aiModel=typeof x.model==='string'?migrateProviderModel(state.aiProvider,x.model):state.aiModel;state.aiEndpoint=typeof x.endpoint==='string'?x.endpoint:''}catch{}}
 const selected=providers.find(p=>p.id===state.aiProvider)||providers[0];
 $('#provider-grid').innerHTML=providers.map(p=>`<button class="provider-card ${state.aiProvider===p.id?'selected':''}" data-provider="${p.id}" aria-label="Select ${p.name}" title="${p.name}"><span class="provider-logo" aria-hidden="true">${p.short}</span><b>${p.name}</b></button>`).join('');
 const dictionaryProvider=$('#dictionary-provider-mark');
 if(dictionaryProvider)dictionaryProvider.textContent=selected.name;
 const approval=state.aiProviderApprovalStatus?.[state.aiProvider];
 const categories=approval?Object.entries(approval):[];
 const pendingCategories=categories.filter(([,status])=>!status.approved).map(([category])=>category);
 let approvalMessage=AI_PROVIDER_PENDING_MESSAGE;
 if(categories.length&&pendingCategories.length>0&&pendingCategories.length<3){
  approvalMessage=`Student-data review is pending for: ${pendingCategories.join(', ')}.`;
 }else if(categories.length&&!pendingCategories.length){
  approvalMessage='This AI provider has documented approval for text, images and documents.';
 }
 $('#ai-provider-approval-status').textContent=approvalMessage;
 const revisionApprovalStatus=$('#revision-ai-approval-status');
 if(revisionApprovalStatus)revisionApprovalStatus.textContent=approvalMessage;
 $('#ai-model').value=state.aiModel;
 $('#ai-model').placeholder=state.aiProvider==='azure'?'Azure deployment name':'Provider model name';
 $('#ai-endpoint').value=state.aiEndpoint;
 $('#endpoint-wrap').classList.toggle('hidden',state.aiProvider!=='azure');
 $('#ai-connection-status').textContent=state.aiConnected?'Tested for this session':'Not tested';
 $('#ai-connection-status').style.color=state.aiConnected?'#268d6a':'';
 const words=rec('saved_word');
 $('#saved-words-list').innerHTML=words.length?words.map(w=>`<button class="saved-word" data-word="${esc(w.data.word)}">${esc(w.data.word)} ×</button>`).join(''):'<span class="small-help">Words you save will appear here.</span>';
}
function selectProvider(id){const p=providers.find(x=>x.id===id);if(!p)return;state.aiProvider=id;state.aiModel=p.model;state.aiConnected=false;state.aiKey='';renderAssistant()}
async function aiCall(prompt,image=null,contentCategory='text'){const requiredCategories=['text','images','documents'];const approval=state.aiProviderApprovalStatus?.[state.aiProvider];if(!approval||!requiredCategories.every(category=>approval[category]?.approved===true))throw new Error(AI_PROVIDER_PENDING_MESSAGE);if(!state.aiKey)throw new Error('Enter an API key for your selected provider first.');const body={provider:state.aiProvider,api_key:state.aiKey,model:state.aiModel,prompt,content_category:contentCategory};if(state.aiEndpoint)body.endpoint=state.aiEndpoint;if(image)body.image=image;const d=await api('/api/ai',{method:'POST',body:JSON.stringify(body)});return d.text||''}
async function testAIConnection(){if(!state.aiKey)throw new Error('Enter an API key for your selected provider first.');const body={provider:state.aiProvider,api_key:state.aiKey,model:state.aiModel};if(state.aiEndpoint)body.endpoint=state.aiEndpoint;await api('/api/ai/test-connection',{method:'POST',body:JSON.stringify(body)})}
function parseAIJSON(text){let t=text.trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();const start=t.indexOf('{'),end=t.lastIndexOf('}');if(start>=0&&end>start)t=t.slice(start,end+1);return JSON.parse(t)}
async function lookupWord(){const word=$('#dictionary-word').value.trim();if(!word){toast('Enter a word to look up.','error');return}const out=$('#dictionary-result');out.innerHTML='<div class="empty-state"><div class="empty-graphic">…</div><b>Looking up your word</b><p>Preparing a clear explanation.</p></div>';try{let text;if(state.aiKey&&state.aiConnected){text=await aiCall(`Explain the English word "${word}" for a student in Class ${state.user.standard}. Include: simple meaning, part of speech, two synonyms, two antonyms, and two natural example sentences. Use clear headings and keep it concise.`)}else{const local={abundant:'Existing in large quantities; plentiful.',meticulous:'Showing great attention to detail; very careful and precise.',resilient:'Able to recover, adapt or become strong again after difficulty.',inevitable:'Certain to happen; impossible to avoid.',pragmatic:'Dealing with situations in a practical and realistic way.',ephemeral:'Lasting for a very short time.',versatile:'Able to adapt to many different activities or uses.',diligent:'Showing care and effort in your work.'};text=local[word.toLowerCase()]||`Connect an AI provider above to get a detailed meaning, synonyms, antonyms and examples for “${word}”.`; }out.innerHTML=`<div class="dictionary-card"><h2>${esc(word)}</h2><p>${esc(text)}</p><button class="btn btn-outline" id="save-word-btn">＋ Save word</button></div>`;$('#save-word-btn').onclick=async()=>{if(!rec('saved_word').some(w=>w.data.word.toLowerCase()===word.toLowerCase()))await saveRecord('saved_word',{word,meaning:text});toast('Word saved to your vocabulary.','success');renderAssistant()}}catch(e){out.innerHTML=`<div class="empty-state"><b>Could not look up that word</b><p>${esc(e.message)}</p></div>`}}
async function readRevisionFile(file){if(!file)return;if(file.size>8*1024*1024){toast('File is larger than 8 MB.','error');return}state.revisionFileName=file.name;$('#file-name').textContent=file.name;state.revisionImage=null;if(file.type.startsWith('image/')){const data=await fileToBase64(file);state.revisionImage={mime:file.type,data};toast('Image added. A connected vision-capable AI is needed to read it.','success')}else if(file.type==='text/plain'||file.name.endsWith('.md')){$('#revision-text').value=await file.text();toast('Text file loaded.','success')}else if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){try{const data=await fileToBase64(file);const d=await api('/api/pdf-text',{method:'POST',body:JSON.stringify({data})});$('#revision-text').value=d.text;toast('Text extracted from PDF.','success')}catch(e){toast(e.message,'error')}}else toast('Unsupported file type. Please use an image, TXT or PDF.','error')}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(new Error('Could not read this file.'));r.readAsDataURL(file)})}
function makeLocalRevision(text,type,count){const sentences=text.split(/[.!?\n]+/).map(s=>s.trim()).filter(s=>s.length>25);if(!sentences.length)throw new Error('Please add a longer paragraph with a few complete sentences.');const questions=[];for(let i=0;i<Math.min(count,Math.max(1,sentences.length));i++){const s=sentences[i%sentences.length];if(type==='blank'||type==='mixed'){const words=s.split(/\s+/);const candidates=words.map((w,j)=>({w:w.replace(/[^A-Za-z]/g,''),j})).filter(x=>x.w.length>5);if(candidates.length){const pick=candidates[Math.floor(candidates.length/2)];const answer=pick.w;words[pick.j]=words[pick.j].replace(answer,'_____');questions.push({type:'fill_blank',question:words.join(' '),options:[],answer,explanation:`The missing word is “${answer}”, as shown in your source text.`});continue}}
 if(type==='tf'||type==='mixed'){questions.push({type:'true_false',question:`Is this statement found in your source material? “${s}.”`,options:['True','False'],answer:'True',explanation:'This statement is taken directly from the text you supplied.'});continue}
 questions.push({type:'short_answer',question:'In your own words, explain this key idea: '+s,options:[],answer:'Use the sentence in your source material as the basis for your own explanation.',explanation:'Compare your answer with the original source and include its key idea.'});}
 if(type==='short'){questions.length=0;questions.push({type:'short_answer',question:'What is the main idea of the paragraph? Write 2–3 sentences.',answer:'Use the main point and supporting details from the source paragraph.',explanation:'A good answer captures the central idea and one or two supporting details.'},{type:'short_answer',question:'Choose one important term from the paragraph and explain it in your own words.',answer:'Use the explanation and context provided in the source text.',explanation:'Try to define the term clearly and connect it to the topic.'})}
 return {title:'Quick revision set',questions};}
async function generateRevision(){const source=$('#revision-text').value.trim();const type=$('#revision-type').value;const count=Number($('#revision-count').value);if(!source&&!state.revisionImage){toast('Paste your material or upload a file first.','error');return}$('#generate-revision').disabled=true;$('#generate-revision').textContent='Generating…';$('#revision-status').textContent='Working';try{let quiz;if(state.aiKey&&state.aiConnected){const prompt=`Create a revision quiz from the supplied study material for a Class ${state.user.standard} student following ${state.user.board}. Question type: ${type}. Number of questions: ${count}. Return ONLY valid JSON with this exact structure: {"title":"...","questions":[{"type":"fill_blank|true_false|short_answer","question":"...","options":["..."],"answer":"...","explanation":"..."}]}. For fill_blank use four options if possible. For true_false options must be ["True","False"]. For short_answer include a concise model answer. Every question and answer must be supported by the source material; do not invent facts.`;const contentCategory=state.revisionFileName?'documents':'text';const text=await aiCall(prompt,state.revisionImage,contentCategory);quiz=parseAIJSON(text);if(!Array.isArray(quiz.questions))throw new Error('AI response did not contain a question list. Try generating again.')}else{if(state.revisionImage){const approval=state.aiProviderApprovalStatus?.[state.aiProvider];if(!approval?.images?.approved)throw new Error(AI_PROVIDER_PENDING_MESSAGE);throw new Error('Connect a vision-capable AI provider to read uploaded photos. You can also paste the paragraph text.')}quiz=makeLocalRevision(source,type,count)}renderRevisionQuiz(quiz);$('#revision-status').textContent='Ready to practise';}catch(e){$('#revision-result').innerHTML=`<div class="empty-state"><b>Could not generate questions</b><p>${esc(e.message)}</p></div>`;$('#revision-status').textContent='Needs attention'}finally{$('#generate-revision').disabled=false;$('#generate-revision').textContent='✧ Generate revision set'}}
function renderRevisionQuiz(quiz){const root=$('#revision-result');root.innerHTML=`<div class="revision-result-head"><b>${esc(quiz.title||'Your revision set')}</b><span class="status-chip">${quiz.questions.length} questions</span></div><div id="revision-question-list"></div><button class="btn btn-primary btn-full" id="submit-revision">Check my answers</button><div id="revision-score"></div>`;const qroot=$('#revision-question-list');qroot.innerHTML=quiz.questions.map((q,i)=>`<div class="dictionary-card revision-q" data-qindex="${i}"><b style="font-size:11px">${i+1}. ${esc(q.question)}</b>${q.options?.length?`<div class="quiz-options" style="margin-top:10px">${q.options.map((o,j)=>`<label class="quiz-option" style="display:flex;gap:7px;align-items:center"><input type="radio" name="revision-${i}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</div>`:`<textarea class="revision-answer" rows="2" placeholder="Write your answer..."></textarea>`}<div class="revision-feedback hidden"></div></div>`).join('');$('#submit-revision').onclick=()=>{let score=0;$$('.revision-q',qroot).forEach((el,i)=>{const q=quiz.questions[i];let answer='';const radio=$(`input[name="revision-${i}"]:checked`,el);if(radio)answer=radio.value;else answer=$('.revision-answer',el)?.value.trim()||'';const exact=String(q.answer||'').trim().toLowerCase();const correct=answer.toLowerCase()===exact||String(q.options||[]).includes(answer)&&answer.toLowerCase()===exact;const fb=$('.revision-feedback',el);fb.classList.remove('hidden');fb.innerHTML=`<b>${correct?'✓ Answer accepted':'Suggested answer: '+esc(q.answer||'See your source material')}</b><p>${esc(q.explanation||'Review the relevant part of your notes.')}</p>`;fb.className='revision-feedback quiz-feedback';if(correct)score++});$('#revision-score').innerHTML=`<div class="quiz-feedback">You matched ${score} of ${quiz.questions.length} answer${quiz.questions.length===1?'':'s'} exactly. For short answers, compare your response with the suggested answer.</div>`;$('#submit-revision').disabled=true}}
function renderProfile(){const u=state.user;if(!u)return;$('#profile-name').textContent=u.name;$('#profile-username').textContent='@'+u.username;$('#profile-class').textContent=`Class ${u.standard} · ${u.board}`;$('#profile-avatar').textContent=(u.name||'S')[0].toUpperCase();$('#profile-metrics').innerHTML=`<div><b>${Math.round(rec('session').reduce((a,r)=>a+(r.data.minutes||0),0)/60)}h</b><small>Study time</small></div><div><b>${streakData().current}</b><small>Current streak</small></div><div><b>${rec('task').filter(r=>r.data.completed).length}</b><small>Tasks done</small></div>`;const f=$('#profile-form');f.elements.name.value=u.name;f.elements.username.value=u.username;f.elements.email.value=u.email;f.elements.standard.value=u.standard;f.elements.board.value=u.board;f.elements.school.value=u.school||'';f.elements.timezone.value=u.timezone||'Asia/Kolkata'}
function renderView(view){if(view==='timetable')renderTimetable();if(view==='tasks')renderTasks();if(view==='calendar')renderCalendar();if(view==='stats')renderStats();if(view==='english')renderEnglishStats();if(view==='maths')renderMathStats();if(view==='challenge'){renderChallengeStats();renderLeaderboardPreview();}if(view==='leaderboard')renderLeaderboard();if(view==='assistant')renderAssistant();if(view==='profile')renderProfile();if(view==='settings'){renderGoal();renderPrivacySettings()}}
function openModal(type,id=null){const existing=id?state.records.find(r=>r.id===id):null;const data=existing?.data||{};state.modal={type,id};state.modalReturnFocus=document.activeElement;const fields=$('#modal-fields');let title='',html='';if(type==='task'){title=existing?'Edit task':'Add a task';html=`<label class="modal-field">Task title<input name="title" required maxlength="120" value="${esc(data.title||'')}"></label><div class="two-fields"><label class="modal-field">Subject<input name="subject" value="${esc(data.subject||'') }" placeholder="e.g. Mathematics"></label><label class="modal-field">Category<select name="category"><option ${data.category==='Academic'?'selected':''}>Academic</option><option ${data.category==='Homework'?'selected':''}>Homework</option><option ${data.category==='Revision'?'selected':''}>Revision</option><option ${data.category==='Personal'?'selected':''}>Personal</option><option ${data.category==='Examination Preparation'?'selected':''}>Examination Preparation</option></select></label></div><div class="two-fields"><label class="modal-field">Due date<input type="date" name="due" value="${esc(data.due||todayKey())}"></label><label class="modal-field">Priority<select name="priority"><option ${data.priority==='low'?'selected':''}>low</option><option ${!data.priority||data.priority==='medium'?'selected':''}>medium</option><option ${data.priority==='high'?'selected':''}>high</option></select></label></div><label class="modal-field">Description<textarea name="description" rows="3">${esc(data.description||'')}</textarea></label>`}
 else if(type==='timetable'){title=existing?'Edit timetable activity':'Add timetable activity';html=`<label class="modal-field">Activity / subject<input name="title" required value="${esc(data.title||'')}"></label><label class="modal-field">Subject / category<input name="subject" value="${esc(data.subject||'') }" placeholder="e.g. Physics"></label><div class="two-fields"><label class="modal-field">Start time<input name="start" type="time" required value="${esc(data.start||'08:00')}"></label><label class="modal-field">End time<input name="end" type="time" required value="${esc(data.end||'09:00')}"></label></div><div class="modal-field"><span>Repeat on</span><div class="day-checkboxes">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=>`<label style="display:inline-flex;align-items:center;gap:4px;margin:5px 8px 0 0;font-size:10px"><input type="checkbox" name="days" value="${i}" ${(data.days||[1,2,3,4,5]).includes(i)?'checked':''}>${d}</label>`).join('')}</div></div>`}
 else if(type==='event'){title=existing?'Edit event':'Add calendar event';html=`<label class="modal-field">Event title<input name="title" required value="${esc(data.title||'')}"></label><div class="two-fields"><label class="modal-field">Date<input type="date" name="date" required value="${esc(data.date||state.selectedDate||todayKey())}"></label><label class="modal-field">Time<input type="time" name="time" value="${esc(data.time||'')}"></label></div><label class="modal-field">Category<select name="category"><option ${data.category==='Exam'?'selected':''}>Exam</option><option ${data.category==='Assignment'?'selected':''}>Assignment</option><option ${data.category==='College Event'?'selected':''}>College Event</option><option ${data.category==='Personal'?'selected':''}>Personal</option><option ${data.category==='Study'?'selected':''}>Study</option><option ${data.category==='Deadline'?'selected':''}>Deadline</option></select></label><label class="modal-field">Description<textarea name="description" rows="3">${esc(data.description||'')}</textarea></label>`}
 $('#modal-title').textContent=title;fields.innerHTML=html;$('#modal-submit').textContent=existing?'Save changes':'Save';$('#modal-backdrop').classList.remove('hidden');document.body.classList.add('modal-open');requestAnimationFrame(()=>fields.querySelector('input,select,textarea')?.focus())}
function closeModal(){const returnFocus=state.modalReturnFocus;$('#modal-backdrop').classList.add('hidden');$('#modal-form').reset();state.modal=null;state.modalReturnFocus=null;document.body.classList.remove('modal-open');if(returnFocus?.isConnected)returnFocus.focus()}
async function submitModal(ev){ev.preventDefault();const type=state.modal?.type,id=state.modal?.id;const fd=new FormData(ev.target);let data={};if(type==='task'){data={title:fd.get('title').trim(),subject:fd.get('subject').trim(),category:fd.get('category'),due:fd.get('due'),priority:fd.get('priority'),description:fd.get('description').trim(),completed:recordBy('task',id)?.data.completed||false,completedDate:recordBy('task',id)?.data.completedDate||null,created:recordBy('task',id)?.data.created||todayKey()}}else if(type==='timetable'){const days=fd.getAll('days').map(Number);const start=fd.get('start'),end=fd.get('end');if(start>=end){toast('End time must be after the start time.','error');return}data={title:fd.get('title').trim(),subject:fd.get('subject').trim(),start,end,days,completedDates:recordBy('timetable',id)?.data.completedDates||[]}}else if(type==='event'){data={title:fd.get('title').trim(),date:fd.get('date'),time:fd.get('time'),category:fd.get('category'),description:fd.get('description').trim()};state.selectedDate=data.date}try{await saveRecord(type,data,id||undefined);closeModal();toast(`${type==='task'?'Task':type==='event'?'Event':'Activity'} saved.`, 'success');if(type==='event')renderCalendar()}catch(e){toast(e.message,'error')}}
async function toggleTask(id){const r=recordBy('task',id);if(!r)return;const d={...r.data,completed:!r.data.completed,completedDate:!r.data.completed?todayKey():null};await saveRecord('task',d,id);toast(d.completed?'Task completed. Nice work!':'Task moved back to pending.','success')}
async function toggleTimetableDone(id){const r=recordBy('timetable',id);if(!r)return;const dates=[...(r.data.completedDates||[])];const i=dates.indexOf(todayKey());if(i>=0)dates.splice(i,1);else dates.push(todayKey());await saveRecord('timetable',{...r.data,completedDates:dates},id);toast(i>=0?'Activity marked as not done.':'Activity marked complete.','success')}
function setTaskFilter(f){state.taskFilter=f;$$('#task-filters button').forEach(b=>b.classList.toggle('selected',b.dataset.filter===f));renderTasks()}
function initEvents(){
 document.addEventListener('keydown',e=>{
  const notificationDrawer=$('#notifications-drawer');
  if(notificationDrawer.classList.contains('is-open')){
   if(e.key==='Escape'){e.preventDefault();closeNotifications();return}
   if(e.key==='Tab'){
    const focusable=notificationFocusableElements();
    if(!focusable.length){e.preventDefault();notificationDrawer.focus();return}
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===notificationDrawer)){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
  }
  const backdrop=$('#modal-backdrop');
  if(backdrop.classList.contains('hidden'))return;
  if(e.key==='Escape'){e.preventDefault();closeModal();return}
  if(e.key==='Tab'){
   const dialog=backdrop.querySelector('[role="dialog"]');
   const focusable=[...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
   if(!focusable.length){e.preventDefault();dialog.focus();return}
   const first=focusable[0],last=focusable[focusable.length-1];
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
 });
 document.addEventListener('click',e=>{
  const toggle=e.target.closest('.password-toggle');
  if(!toggle)return;
  const input=toggle.parentElement.querySelector('input');
  const show=input.type==='password';
  input.type=show?'text':'password';
  toggle.setAttribute('aria-label',show?'Hide password':'Show password');
  toggle.setAttribute('title',show?'Hide password':'Show password');
  toggle.classList.toggle('visible',show);
 });
 $('#auth-switch').onclick=()=>showAuth($('#signup-form').classList.contains('hidden')?'signup':'login');
 $('#login-form').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);$('#auth-error').textContent='';try{const d=await api('/api/login',{method:'POST',body:JSON.stringify({identifier:fd.get('identifier'),password:fd.get('password'),remember_me:fd.get('remember_me')==='on'})});state.user=d.user;showApp();await loadAll();toast('Welcome back!','success')}catch(x){$('#auth-error').textContent=x.message}};
 $('#signup-form').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);$('#auth-error').textContent='';if(fd.get('password')!==fd.get('confirm_password')){$('#auth-error').textContent='Passwords do not match.';return}try{const payload=Object.fromEntries(fd.entries());payload.privacy_notice_acknowledged=fd.get('privacy_notice_acknowledged')==='on';const d=await api('/api/signup',{method:'POST',body:JSON.stringify(payload)});state.user=d.user;showApp();await loadAll();toast('Your StudyFlow account is ready.','success')}catch(x){$('#auth-error').textContent=x.message}};
 $('#forgot-link').onclick=e=>{e.preventDefault();toast('Password reset email is not configured in this local build. Ask your app administrator to configure email delivery.','error')};
 $('#modal-close').onclick=closeModal;$('#modal-cancel').onclick=closeModal;$('#modal-backdrop').onclick=e=>{if(e.target.id==='modal-backdrop')closeModal()};$('#modal-form').onsubmit=submitModal;
 document.addEventListener('click',async e=>{const nav=e.target.closest('[data-view]');if(nav){if(nav.closest('#notifications-drawer'))closeNotifications();e.preventDefault();goView(nav.dataset.view);return}const action=e.target.closest('[data-action]');if(action){const a=action.dataset.action;if(a==='add-task')openModal('task');if(a==='add-timetable')openModal('timetable');if(a==='add-event')openModal('event');if(a==='focus-start')startSession();return}const complete=e.target.closest('[data-complete]');if(complete){toggleTask(complete.dataset.complete);return}const edit=e.target.closest('[data-edit]');if(edit){const [type,id]=edit.dataset.edit.split(':');openModal(type,id);return}const del=e.target.closest('[data-delete]');if(del){if(confirm('Delete this item?')){try{await deleteRecord(del.dataset.delete);toast('Deleted.','success')}catch(x){toast(x.message,'error')}}return}const done=e.target.closest('[data-time-done]');if(done){toggleTimetableDone(done.dataset.timeDone);return}const cal=e.target.closest('[data-calendar-date]');if(cal){state.selectedDate=cal.dataset.calendarDate;renderCalendar();return}const yearMonth=e.target.closest('[data-year-month]');if(yearMonth){const d=parseDate(state.selectedDate);d.setFullYear(state.calendarDate.getFullYear(),Number(yearMonth.dataset.yearMonth),1);state.selectedDate=localDate(d);state.calendarDate=new Date(d);state.calendarPeriod='month';renderCalendar();return}const word=e.target.closest('[data-word]');if(word){$('#dictionary-word').value=word.dataset.word;lookupWord();return}});
 $('#header-focus').onclick=()=>state.timerStart?stopSession():startSession();
 $('#notifications-btn').onclick=openNotifications;
 $('#notification-close').onclick=()=>closeNotifications();
 $('#notification-overlay').onclick=()=>closeNotifications();
 $('#notification-filters').onclick=e=>{
  const button=e.target.closest('[data-notification-filter]');
  if(!button||button.dataset.notificationFilter===state.notificationFilter)return;
  state.notificationFilter=button.dataset.notificationFilter;
  fetchNotificationPage();
 };
 $('#notification-filters').onkeydown=e=>{
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
  const tabs=$$('#notification-filters [role="tab"]');
  const current=tabs.indexOf(document.activeElement);
  if(current<0)return;
  e.preventDefault();
  const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  tabs[next].focus();
  tabs[next].click();
 };
 $('#notification-mark-all').onclick=async()=>{
  const old=state.notificationUnreadCount;
  const previous=state.notifications.slice();
  const previousReadState=previous.map(notification=>notification.is_read);
  if(state.notificationFilter==='unread'){state.notifications=[];state.notificationHasMore=false}
  else state.notifications.forEach(notification=>notification.is_read=true);
  updateNotificationCount(0,true);
  renderNotifications();
  $('#notification-list').focus();
  try{
   const result=await api('/api/notifications/read-all',{method:'PATCH',body:'{}'});
   updateNotificationCount(result.unread_count,true);
  }catch(error){
   state.notifications=previous;
   previous.forEach((notification,index)=>notification.is_read=previousReadState[index]);
   updateNotificationCount(old,true);
   renderNotifications();
   $('#notification-list').focus();
   toast(error.message,'error');
  }
 };
 $('#notification-clear-all').onclick=async()=>{
  if(!confirm('Permanently clear all your notifications?'))return;
  const previous=state.notifications.slice();
  const previousCount=state.notificationUnreadCount;
  const previousHasMore=state.notificationHasMore;
  state.notifications=[];
  state.notificationHasMore=false;
  updateNotificationCount(0,true);
  renderNotifications();
  $('#notification-list').focus();
  try{
   const result=await api('/api/notifications',{method:'DELETE'});
   updateNotificationCount(result.unread_count,true);
  }catch(error){
   state.notifications=previous;
   state.notificationHasMore=previousHasMore;
   updateNotificationCount(previousCount,true);
   renderNotifications();
   $('#notification-list').focus();
   toast(error.message,'error');
  }
 };
 $('#notification-list').onclick=async e=>{
  const target=e.target.closest('button');
  if(!target)return;
  if(target.dataset.notificationMore){await fetchNotificationPage(true);return}
  if(target.dataset.notificationRetry){await fetchNotificationPage();return}
  await handleNotificationAction(target);
 };
 $('#notification-preferences-form').onsubmit=async e=>{
  e.preventDefault();
  const preferences=Object.fromEntries([...e.target.elements].filter(input=>input.name).map(input=>[input.name,input.checked]));
  try{
   const result=await api('/api/notifications/preferences',{method:'PUT',body:JSON.stringify(preferences)});
   state.notificationPreferences=result.preferences;
   toast('Notification preferences saved.','success');
  }catch(error){toast(error.message,'error')}
 };
 $('#task-filters').onclick=e=>{const b=e.target.closest('button[data-filter]');if(b)setTaskFilter(b.dataset.filter)};
 $('#timetable-tabs').onclick=e=>{const b=e.target.closest('button[data-period]');if(!b)return;state.timetablePeriod=b.dataset.period;$$('#timetable-tabs button').forEach(x=>x.classList.toggle('selected',x===b));renderTimetable()};
 $('#timetable-content').onclick=e=>{if(e.target.id==='switch-week-view'){$('#timetable-tabs [data-period="week"]').click()}};
 $('#calendar-prev').onclick=()=>{const d=parseDate(state.selectedDate);if(state.calendarPeriod==='day')d.setDate(d.getDate()-1);else if(state.calendarPeriod==='week')d.setDate(d.getDate()-7);else if(state.calendarPeriod==='year')d.setFullYear(d.getFullYear()-1);else d.setMonth(d.getMonth()-1);state.selectedDate=localDate(d);state.calendarDate=new Date(d);renderCalendar()};$('#calendar-next').onclick=()=>{const d=parseDate(state.selectedDate);if(state.calendarPeriod==='day')d.setDate(d.getDate()+1);else if(state.calendarPeriod==='week')d.setDate(d.getDate()+7);else if(state.calendarPeriod==='year')d.setFullYear(d.getFullYear()+1);else d.setMonth(d.getMonth()+1);state.selectedDate=localDate(d);state.calendarDate=new Date(d);renderCalendar()};$('#calendar-today').onclick=()=>{state.calendarDate=new Date();state.selectedDate=todayKey();renderCalendar()};$('#calendar-periods').onclick=e=>{const b=e.target.closest('[data-calendar-period]');if(!b)return;state.calendarPeriod=b.dataset.calendarPeriod;state.calendarDate=parseDate(state.selectedDate);renderCalendar()};
 $('#stats-filters').onclick=e=>{const b=e.target.closest('button[data-range]');if(!b)return;state.statsRange=b.dataset.range;$$('#stats-filters button').forEach(x=>x.classList.toggle('selected',x===b));renderStats()};
 $('#english-topics').onclick=e=>{const b=e.target.closest('button[data-topic]');if(!b)return;state.englishTopic=b.dataset.topic;$$('#english-topics button').forEach(x=>x.classList.toggle('selected',x===b))};$('#math-topics').onclick=e=>{const b=e.target.closest('button[data-topic]');if(!b)return;state.mathTopic=b.dataset.topic;$$('#math-topics button').forEach(x=>x.classList.toggle('selected',x===b))};$('#start-english').onclick=()=>startPractice('english');$('#start-maths').onclick=()=>startPractice('math');
 $('#begin-challenge').onclick=async()=>{try{const status=await api('/api/challenge/status');if(status.attempt)await beginChallenge(status.attempt.official,status.attempt);else if(status.completed){toast('Your official challenge is already submitted. Starting an unscored practice round.','success');await beginChallenge(false)}else await beginChallenge(true)}catch(error){toast(error.message,'error')}};
 $('#leaderboard-period').onclick=e=>{const b=e.target.closest('button[data-period]');if(!b)return;$$('#leaderboard-period button').forEach(x=>x.classList.toggle('selected',x===b));renderLeaderboard()};$('#leaderboard-band').onchange=renderLeaderboard;
 const connectAIProvider=async()=>{state.aiModel=$('#ai-model').value.trim();state.aiEndpoint=$('#ai-endpoint').value.trim();state.aiKey=$('#ai-key').value.trim()||state.aiKey;if(!state.aiKey){toast('Enter an API key first.','error');return}try{await testAIConnection();state.aiConnected=true;localStorage.setItem('studyflow_ai_pref',JSON.stringify({provider:state.aiProvider,model:state.aiModel,endpoint:state.aiEndpoint}));renderAssistant();$('#ai-key').value='';toast('Connection tested. Student-data use remains subject to content-category approval.','success')}catch(error){state.aiConnected=false;toast(error.message,'error')}};
 $('#provider-grid').onclick=e=>{const b=e.target.closest('[data-provider]');if(b)selectProvider(b.dataset.provider)};$('#save-ai-provider').onclick=connectAIProvider;$('#test-ai-provider').onclick=connectAIProvider;$('#disconnect-ai').onclick=()=>{state.aiKey='';state.aiConnected=false;$('#ai-key').value='';toast('AI disconnected for this session.','success');renderAssistant()};$('#lookup-word').onclick=lookupWord;$('#dictionary-word').onkeydown=e=>{if(e.key==='Enter')lookupWord()};
 $('#revision-file').onchange=e=>readRevisionFile(e.target.files[0]);$('#upload-zone').ondragover=e=>{e.preventDefault();e.currentTarget.style.background='#f1ebff'};$('#upload-zone').ondragleave=e=>{e.currentTarget.style.background=''};$('#upload-zone').ondrop=e=>{e.preventDefault();e.currentTarget.style.background='';readRevisionFile(e.dataTransfer.files[0])};$('#generate-revision').onclick=generateRevision;
 $('#profile-form').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);try{const d=await api('/api/profile',{method:'POST',body:JSON.stringify({name:fd.get('name'),school:fd.get('school'),timezone:fd.get('timezone'),standard:fd.get('standard'),board:fd.get('board')})});state.user=d.user;renderHeader();renderProfile();toast('Profile updated.','success')}catch(x){toast(x.message,'error')}};
 $('#goal-form').onsubmit=async e=>{e.preventDefault();const mins=Math.max(15,Math.min(720,Number(new FormData(e.target).get('minutes'))||120));await saveRecord('goal',{minutes:mins},rec('goal')[0]?.id);toast('Daily study goal saved.','success')};
 $('#enable-notifications').onclick=async()=>{if(!('Notification'in window)){toast('Notifications are not supported by this browser.','error');return}const p=await Notification.requestPermission();$('#notification-status').textContent='Notifications: '+p;if(p==='granted'){new Notification('StudyFlow reminders enabled',{body:'You can now receive reminders from StudyFlow while this app is open.'});toast('Notifications enabled.','success')}else toast('Notification permission was not granted.','error')};
 $('#logout-btn').onclick = async () => {
    state.aiKey = '';
    state.aiConnected = false;
    $('#ai-key').value = '';

    if (state.timerStart) {
        await stopSession();
    }

    await api('/api/logout', {
        method: 'POST',
        body: '{}'
    });

    state.user = null;
    state.records = [];

    showAuth('login');
    toast('You have signed out.', 'success');
 };
 $('#accept-privacy-consent-btn').onclick = async () => {
    try {
        const result = await api('/api/privacy/consent', {
            method: 'PUT',
            body: JSON.stringify({ accepted: true })
        });
        state.privacyConsent = {
            current_version: result.consent.version,
            consent: result.consent
        };
        renderPrivacySettings();
        toast('Your core data-use choice was recorded.', 'success');
    } catch (error) {
        toast(error.message, 'error');
    }
 };
 $('#delete-study-records-btn').onclick = async () => {
    if (!window.confirm('Delete all saved study records for this account? This cannot be undone.')) return;

    try {
        await api('/api/data', {
            method: 'DELETE',
            body: JSON.stringify({ confirm: true })
        });
        state.records = [];
        renderAll();
        toast('Your study records were deleted.', 'success');
    } catch (error) {
        toast(error.message, 'error');
    }
 };
 $('#delete-challenge-history-btn').onclick = async () => {
    if (!window.confirm('Delete your challenge scores, challenge attempts and challenge notifications? A completed official challenge remains unavailable until midnight IST to preserve fairness.')) return;

    try {
        await api('/api/challenge/history', {
            method: 'DELETE',
            body: JSON.stringify({ confirm: true })
        });
        state.challenge = null;
        clearInterval(state.challengeTimer);
        state.challengeTimer = null;
        renderAll();
        toast('Your challenge history was deleted.', 'success');
    } catch (error) {
        toast(error.message, 'error');
    }
 };
 $('#clear-ai-preferences-btn').onclick = () => {
    localStorage.removeItem('studyflow_ai_pref');
    state.aiProvider = 'openai';
    state.aiModel = 'gpt-4o-mini';
    state.aiEndpoint = '';
    state.aiKey = '';
    state.aiConnected = false;
    $('#ai-key').value = '';
    renderAssistant();
    toast('Saved AI provider preferences and the in-memory key were cleared.', 'success');
 };
 $('#export-account-btn').onclick = async () => {
    try {
        const data = await api('/api/account/export');
        const preferences = JSON.parse(localStorage.getItem('studyflow_ai_pref') || 'null');
        if (preferences !== null && (
            typeof preferences !== 'object' ||
            Array.isArray(preferences)
        )) {
            throw new Error('Saved AI provider preferences are invalid. Clear them in Settings and try again.');
        }
        data.browser_ai_preferences = preferences
            ? {
                provider: String(preferences.provider || ''),
                model: String(preferences.model || ''),
                endpoint: String(preferences.endpoint || '')
            }
            : null;
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'studyflow-account-export.json';
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        toast(error.message, 'error');
    }
 };
 const deleteAccountDialog = $('#delete-account-dialog');
 $('#delete-account-btn').onclick = () => {
    deleteAccountDialog.showModal();
    $('#delete-account-password').focus();
 };
 $('#delete-account-cancel').onclick = () => deleteAccountDialog.close();
 $('#delete-account-form').onsubmit = async event => {
    event.preventDefault();
    const passwordInput = $('#delete-account-password');
    try {
        await api('/api/account', {
            method: 'DELETE',
            body: JSON.stringify({ password: passwordInput.value })
        });
        localStorage.removeItem('studyflow_ai_pref');
        window.location.reload();
    } catch (error) {
        passwordInput.value = '';
        toast(error.message, 'error');
        passwordInput.focus();
    }
 };
}
async function boot(){initEvents();const saved=localStorage.getItem('studyflow_ai_pref');if(saved){try{const x=JSON.parse(saved);state.aiProvider=x.provider||'openai';state.aiModel=migrateProviderModel(state.aiProvider,x.model||providers[0].model);state.aiEndpoint=x.endpoint||''}catch{}}try{const d=await api('/api/me');if(d.user){state.user=d.user;showApp();await loadAll();setInterval(()=>{if(state.user){renderHeader();renderHome()}},30000)}else showAuth('login')}catch(e){showAuth('login');$('#auth-error').textContent='Could not connect to the StudyFlow server. Start server.js and refresh this page.'}}
document.addEventListener('DOMContentLoaded',boot);
