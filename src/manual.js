// Deterministic templates only: never fetch a URL or call a paid provider.
export function validateEvidence(value) {
  if(value===undefined)return [];
  if(!Array.isArray(value)||value.length>8)throw Error('Add up to eight sources.');
  return value.map((s,index)=>{
    if(!s||!['background','development'].includes(s.kind))throw Error(`Choose a type for source ${index+1}.`);
    for(const [key,max] of [['title',300],['url',2000],['excerpt',6000]])if(typeof s[key]!=='string'||!s[key].trim()||s[key].length>max)throw Error(`Complete the title, link and fact for source ${index+1}.`);
    let url;try{url=new URL(s.url);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error();}catch{throw Error(`Use a full http or https link for source ${index+1}.`);}
    const date=s.date||null;
    if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>new Date().toISOString().slice(0,10)))throw Error(`Use a valid past publication date for source ${index+1}, or leave it blank.`);
    if(s.why!==undefined&&(typeof s.why!=='string'||s.why.length>2000))throw Error('Keep potential relevance under 2,000 characters.');
    return {kind:s.kind,title:s.title.trim(),url:url.href,date,excerpt:s.excerpt.trim(),why:(s.why||'').trim()};
  });
}
const shorten=(s,max)=>s.trim().split(/\s+/).slice(0,max).join(' ');
export function manualBrief(input,knowledge) {
  const evidence=validateEvidence(input.evidence);
  const sources=evidence.map((s,i)=>({...s,id:`s${i+1}`}));
  const backgrounds=sources.filter(s=>s.kind==='background');
  const developments=sources.filter(s=>s.kind==='development').slice(0,5);
  const topic=input.offering==='Both'?'payment visibility and financial crime':input.offering==='Financial Crime'?'AML and fraud detection':'transaction observability and payment tracking';
  const first=developments[0];const title=first?shorten(first.title,12):null;
  const bank=shorten(input.bank,10);const persona=shorten(input.persona,10);
  const anchor=title?`I came across a publication titled “${title}”. `:'';
  const sourceIds=first?[first.id]:[];
  return {
    mode:'manual',generatedAt:new Date().toISOString(),
    overview:{text:backgrounds.length?backgrounds.map(s=>`[${s.id}] ${s.excerpt}`).join('\n\n'):'No sourced account background supplied. Add a background source to describe the institution.',sourceIds:backgrounds.map(s=>s.id)},
    developments:developments.map(s=>({title:s.title,date:s.date,text:s.excerpt,why:s.why||`A possible conversation topic is how this relates to ${topic}. Relevance and ownership need to be checked; the publication does not establish a problem.`,sourceIds:[s.id]})),
    useCases:developments.map(s=>({title:`Explore requirements: ${shorten(s.title,12)}`,fact:s.excerpt,sourceIds:[s.id],hypothesis:`There may be requirements related to ${topic}. This is a question to investigate, not an established problem or a confirmed Vyntra fit.`,question:`In relation to “${shorten(s.title,12)}”, is ${topic} within scope?`})),
    targets:[{title:input.persona,name:null,text:`Function hypothesis: this role may help identify the owner of ${topic}. No individual or current role has been independently verified.`,sourceIds:[]}],
    call:{sourceIds,opener:`Hello, I’m with Vyntra. ${anchor}I’m looking to understand how ${bank} approaches ${topic}. Is that something you look after, or would a colleague be better placed?`,questions:[first?`In relation to “${title}”, is ${topic} in scope?`:`What, if anything, is changing in how ${bank} approaches ${topic}?`,`Which requirements would matter most to a ${persona} when reviewing ${topic}?`,'What would need to be true for a further conversation to be useful?'],objections:[{objection:'We already have this covered.',response:'Understood. Is there anything changing in your requirements, or is the current approach meeting them?'},{objection:'This is not a priority.',response:'Fair enough. Would it be better to leave it here, or is there a relevant review point later?'}],nextStep:'If a relevant need is confirmed, agree a short discovery conversation with its owner. Check approved Vyntra material before making any capability or results claim.'},
    outreach:{sourceIds,email:`Subject: ${topic}\n\nHello,\n\n${anchor}Is ${topic} part of your remit at ${bank}?\n\nI’m with Vyntra and would like to understand whether there are requirements worth discussing. I’m not assuming there is a gap in your current approach.\n\nWould a short conversation be useful, or is there a better person to ask?`,linkedin:`Hello — I’m with Vyntra. Is ${topic} part of your remit at ${bank}? I’d welcome a short conversation about your requirements, if useful. If you’re not the right person, who would be better placed?`},
    sources,
    limitations:['MANUAL RESEARCH — facts, dates and links were supplied by you and have not been independently verified. No web searches or AI calls were made.','Call and outreach text uses fixed templates. Review and personalise it before use. Named contacts are not verified or used as confirmed role holders.','Potential relevance and use cases are hypotheses, not evidence that the bank has a problem. No specific Vyntra capabilities, integrations or results are claimed.',...(sources.length?[]:['No source evidence supplied. No account facts, developments or reason to engage have been invented.']),...(sources.filter(s=>s.kind==='development').length>5?['Only the first five supplied developments are shown; all source entries remain in the source library.']:[])]
  };
}
