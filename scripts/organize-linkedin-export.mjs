import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

const [inputDir, outputDir] = process.argv.slice(2);
if (!inputDir || !outputDir) {
  console.error('Usage: node scripts/organize-linkedin-export.mjs <extracted-dir> <output-dir>');
  process.exit(1);
}

function parseCsv(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], next=text[i+1];
    if(ch==='"' && quoted && next==='"'){cell+='"';i++;}
    else if(ch==='"') quoted=!quoted;
    else if(ch===',' && !quoted){row.push(cell);cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  if(cell||row.length){row.push(cell);rows.push(row);}
  return rows;
}

function readCsv(name, headerMarker) {
  const rows=parseCsv(fs.readFileSync(path.join(inputDir,name),'utf8').replace(/^\uFEFF/,''));
  const headerIndex=rows.findIndex(r=>r.includes(headerMarker));
  if(headerIndex<0) throw new Error(`Missing header in ${name}`);
  const headers=rows[headerIndex].map(x=>x.trim());
  return rows.slice(headerIndex+1).filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
}

const canonicalUrl=v=>(v||'').split('?')[0].replace(/\/$/,'').toLowerCase();
const cleanName=v=>(v||'').trim().replace(/\s+/g,' ');
const keyFor=(url,name)=>canonicalUrl(url)||`name:${cleanName(name).toLowerCase()}`;
const classifyCompany=value=>{
  const v=(value||'').toLowerCase();
  if(/\bopenai\b/.test(v)) return 'OpenAI';
  if(/\bmicrosoft\b|微软/.test(v)) return 'Microsoft';
  return '';
};
const csvCell=v=>`"${String(v??'').replaceAll('"','""')}"`;
const writeCsv=(file,headers,rows)=>fs.writeFileSync(path.join(outputDir,file),'\uFEFF'+[headers,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n'));

const connections=readCsv('Connections.csv','First Name');
const invitations=readCsv('Invitations.csv','From');
const messages=readCsv('messages.csv','CONVERSATION ID');
const people=new Map();

function getPerson({url,name}){
  const key=keyFor(url,name);
  if(!people.has(key)) people.set(key,{name:cleanName(name),linkedin:canonicalUrl(url),company:'',title:'',connectedOn:'',inviteDirection:'',inviteSentAt:'',sentMessages:0,receivedMessages:0,lastMessageAt:''});
  return people.get(key);
}

for(const c of connections){
  const name=cleanName(`${c['First Name']} ${c['Last Name']}`);
  const p=getPerson({url:c.URL,name});
  Object.assign(p,{name,companyRaw:c.Company,title:c.Position,connectedOn:c['Connected On'],relationshipStatus:'connected'});
  p.company=classifyCompany(c.Company);
}

for(const i of invitations){
  const outgoing=i.Direction==='OUTGOING';
  const name=outgoing?i.To:i.From;
  const url=outgoing?i.inviteeProfileUrl:i.inviterProfileUrl;
  const p=getPerson({url,name});
  p.inviteDirection=i.Direction;
  p.inviteSentAt=i['Sent At'];
  if(!p.relationshipStatus) p.relationshipStatus=outgoing?'connect_sent':'incoming_invite';
}

const selfUrls=new Set(['https://www.linkedin.com/in/jian98']);
for(const m of messages){
  const senderUrl=canonicalUrl(m['SENDER PROFILE URL']);
  const senderIsSelf=selfUrls.has(senderUrl)||cleanName(m.FROM).toUpperCase()==='JIAN JIANG';
  const urls=senderIsSelf?(m['RECIPIENT PROFILE URLS']||'').split(','):[m['SENDER PROFILE URL']];
  const names=senderIsSelf?(m.TO||'').split(','):[m.FROM];
  urls.forEach((url,index)=>{
    if(!canonicalUrl(url)||selfUrls.has(canonicalUrl(url))) return;
    const p=getPerson({url,name:names[index]||names[0]});
    if(senderIsSelf) p.sentMessages++; else p.receivedMessages++;
    if((m.DATE||'')>p.lastMessageAt) p.lastMessageAt=m.DATE;
  });
}

for(const p of people.values()){
  if(p.receivedMessages>0) p.relationshipStatus='engaged';
  else if(p.sentMessages>0) p.relationshipStatus='contacted';
  else if(!p.relationshipStatus) p.relationshipStatus='watch';
}

fs.mkdirSync(outputDir,{recursive:true});
const all=[...people.values()].sort((a,b)=>(a.company||'Z').localeCompare(b.company||'Z')||a.name.localeCompare(b.name));
const target=all.filter(p=>p.company);
const review=all.filter(p=>!p.company&&(p.inviteDirection||p.sentMessages||p.receivedMessages));
const targetHeaders=['name','company','team','title','linkedin','status','connectedOn','inviteDirection','inviteSentAt','sentMessages','receivedMessages','lastMessageAt','confidence','lastVerified','sourceUrl','notes'];
const targetRows=target.map(p=>{
  const activity=[p.connectedOn&&`连接 ${p.connectedOn}`,p.sentMessages&&`发 ${p.sentMessages}`,p.receivedMessages&&`回 ${p.receivedMessages}`].filter(Boolean).join('；');
  return [p.name,p.company,'unknown',p.title,p.linkedin,p.relationshipStatus,p.connectedOn,p.inviteDirection,p.inviteSentAt,p.sentMessages,p.receivedMessages,p.lastMessageAt,'review','2026-10-01',p.linkedin,activity];
});
writeCsv('target-company-import.csv',targetHeaders,targetRows);
writeCsv('needs-company-review.csv',['name','linkedin','status','inviteDirection','inviteSentAt','sentMessages','receivedMessages','lastMessageAt'],review.map(p=>[p.name,p.linkedin,p.relationshipStatus,p.inviteDirection,p.inviteSentAt,p.sentMessages,p.receivedMessages,p.lastMessageAt]));
writeCsv('all-linkedin-relationships.csv',['name','linkedin','companyRaw','title','status','connectedOn','inviteDirection','inviteSentAt','sentMessages','receivedMessages','lastMessageAt'],all.map(p=>[p.name,p.linkedin,p.companyRaw,p.title,p.relationshipStatus,p.connectedOn,p.inviteDirection,p.inviteSentAt,p.sentMessages,p.receivedMessages,p.lastMessageAt]));
const summary={generatedAt:new Date().toISOString(),connections:connections.length,invitations:invitations.length,messages:messages.length,uniquePeople:all.length,targetCompanies:{Microsoft:target.filter(p=>p.company==='Microsoft').length,OpenAI:target.filter(p=>p.company==='OpenAI').length},needsCompanyReview:review.length,statusCounts:Object.fromEntries([...new Set(all.map(p=>p.relationshipStatus))].sort().map(s=>[s,all.filter(p=>p.relationshipStatus===s).length]))};
fs.writeFileSync(path.join(outputDir,'summary.json'),JSON.stringify(summary,null,2));
const syncPayload={
  generatedAt:summary.generatedAt,
  summary,
  connections:connections.map(c=>({
    name:cleanName(`${c['First Name']} ${c['Last Name']}`),
    linkedin:canonicalUrl(c.URL),
    company:c.Company||'',
    position:c.Position||'',
    connectedOn:c['Connected On']||''
  })),
  targetPeople:target.map(p=>({
    name:p.name,company:p.company,team:'unknown',title:p.title||'',linkedin:p.linkedin,
    relationshipStatus:p.relationshipStatus,connectedOn:p.connectedOn||'',
    inviteDirection:p.inviteDirection||'',inviteSentAt:p.inviteSentAt||'',
    sentMessages:p.sentMessages||0,receivedMessages:p.receivedMessages||0,
    lastMessageAt:p.lastMessageAt||'',lastVerified:'2026-10-01',confidence:'review'
  }))
};
fs.writeFileSync(path.join(outputDir,'linkedin-sync.js'),`window.MASTER_LINKED_LINKEDIN_SYNC=${JSON.stringify(syncPayload)};\n`);

// Publish only the target-company subset used by the shared workbench. The full
// LinkedIn export, non-target contacts and message bodies remain under private-data.
const sharedDir=path.resolve(projectRoot,'shared-data');
fs.mkdirSync(sharedDir,{recursive:true});
const sharedPayload={
  generatedAt:syncPayload.generatedAt,
  summary:{
    targetCompanies:syncPayload.summary.targetCompanies,
    targetPeople:syncPayload.targetPeople.length
  },
  targetPeople:syncPayload.targetPeople.map(({name,company,team,title,linkedin,relationshipStatus,lastVerified,confidence})=>({
    name,company,team,title,linkedin,relationshipStatus,lastVerified,confidence
  }))
};
fs.writeFileSync(path.join(sharedDir,'target-company-sync.js'),`window.MASTER_LINKED_LINKEDIN_SYNC=${JSON.stringify(sharedPayload)};\n`);
console.log(JSON.stringify(summary,null,2));
