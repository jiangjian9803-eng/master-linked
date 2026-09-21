(()=>{
  const root=document.querySelector('#openai-talentView');
  if(!root)return;
  const KEY='master-linked-openai-talent-v1';
  const teams=[
    {id:'frontier',name:'前沿研究 / Frontier',lead:'Jakub Pachocki & Mark Chen',size:'约 50–80',focus:'通用研发组合、前沿探索与新项目'},
    {id:'foundation',name:'Foundation',lead:'Mark Chen',size:'约 80–120',focus:'基础模型、多模态底座、预训练数据、Scaling law、Retrieval'},
    {id:'training',name:'Training',lead:'Jakub Pachocki',size:'约 40–60',focus:'大规模分布式训练、稳定性、GPU 集群、训练基础设施'},
    {id:'post-training',name:'Post-training',lead:'Max Schwarzer',size:'约 100–150',focus:'RLHF、指令微调、Reward Model、模型行为调优'},
    {id:'human-data',name:'Human Data',lead:'Amelia (Mia) Glaese',size:'约 40–70',focus:'人类反馈、数据标注、偏好比较、数据闭环'},
    {id:'alignment',name:'Alignment',lead:'Jakub & Mark Chen',size:'约 50–80',focus:'AI 对齐、价值学习、风险建模与安全策略'},
    {id:'reasoning',name:'Reasoning',lead:'Noam Brown',size:'约 40–60',focus:'推理模型、数学证明、复杂代码、规划与长程推理'},
    {id:'multimodal',name:'Multimodal',lead:'Aditya Ramesh',size:'约 40–70',focus:'Sora、世界模型、视频生成、物理一致性与场景理解'},
    {id:'robotics',name:'Robotics',lead:'Caitlin Kalinowski',size:'约 10–30',focus:'机器人、具身智能、通用机器人与现实环境控制'},
    {id:'labs',name:'OAI Labs',lead:'Joanne Jang',size:'约 20–40',focus:'人机交互、模型行为、新型界面与超越聊天框体验'}
  ];
  const clean=v=>String(v??'').trim();
  const esc=v=>clean(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const PAGE_SIZE=50;let currentPage=1;
  let state=JSON.parse(localStorage.getItem(KEY)||'null')||{people:[],selectedTeam:'all'};
  state.people=Array.isArray(state.people)?state.people:[];
  // Remove blank placeholder rows created by older import logic from account-level exports.
  state.people=state.people.filter(p=>!(p.name==='待补充姓名'&&!clean(p.linkedin)));
  state.people.forEach(p=>{if(!Array.isArray(p.interactions))p.interactions=[];});
  localStorage.setItem(KEY,JSON.stringify(state));
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const statusText={watch:'长期跟踪',target:'重点目标',connect_sent:'已申请 Connect',incoming_invite:'收到 Connect',connected:'已连接',contacted:'已联系',engaged:'有回复',screening:'沟通中',interview:'面试中',offer:'Offer',closed:'暂不推进'};
  root.innerHTML=`<div class="oai-shell">
    <section class="oai-hero"><div><h1>OpenAI 人才情报与招聘跟进</h1><p>面向华为加拿大研究所北美高端社招：按 OpenAI 团队、技术方向、关系状态和招聘阶段持续维护人才数据。</p></div><div class="oai-actions"><label class="oai-button secondary">批量导入 LinkedIn CSV<input id="oaiImport" type="file" accept=".csv,text/csv" multiple hidden></label><button id="oaiAdd" class="oai-button">新增人才</button><button id="oaiExport" class="oai-button secondary">导出 CSV</button></div></section>
    <div id="oaiImportStatus" class="oai-import-status"><strong>支持一次选择多个文件：</strong>Connections 和 Invitations 会创建真实联系人并按 LinkedIn URL / 姓名去重；Messages 会补充沟通记录。账号本人的 Education、Positions、Email Addresses 以及 Company Follows 不会被误建为候选人。</div>
    <div class="oai-callout"><strong>数据原则：</strong>只记录与招聘相关的公开职业信息和你本人产生的沟通记录；不要记录族裔推断、健康、宗教、政治观点等无关敏感信息。团队人数和负责人来自用户提供的架构图，属于研究假设，需定期核验。</div>
    <section class="oai-kpis"><div class="oai-kpi"><span>人才总数</span><strong id="oaiTotal">0</strong></div><div class="oai-kpi"><span>重点目标</span><strong id="oaiTargets">0</strong></div><div class="oai-kpi"><span>已申请 Connect</span><strong id="oaiRequested">0</strong></div><div class="oai-kpi"><span>已连接 / 有回复</span><strong id="oaiEngaged">0</strong></div><div class="oai-kpi"><span>19+ 潜力</span><strong id="oaiLevel19">0</strong></div></section>
    <section class="oai-section"><div class="oai-section-head"><div><h2>团队地图</h2><p>点击团队即可筛选人才；人数为架构图中的估算。</p></div><button id="oaiResetTeam" class="oai-button secondary">查看全部</button></div><div id="oaiOrg" class="oai-org"></div></section>
    <section class="oai-section"><div class="oai-section-head"><div><h2>人才库与招聘漏斗</h2><p id="oaiResultCount">0 条记录</p></div></div><div class="oai-toolbar"><input id="oaiSearch" placeholder="搜索姓名、公司、职位、技术方向、备注"><select id="oaiCompanyFilter"><option value="openai" selected>OpenAI 候选人</option><option value="other">其他公司</option><option value="unknown">公司待确认</option><option value="all">全部公司</option></select><select id="oaiTeamFilter"><option value="all">全部团队</option>${teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select><select id="oaiStatusFilter"><option value="all">全部状态</option>${Object.entries(statusText).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select><select id="oaiPriorityFilter"><option value="all">全部优先级</option><option value="A">A · 核心</option><option value="B">B · 重点</option><option value="C">C · 储备</option></select><select id="oaiLevelFilter"><option value="all">全部级别判断</option><option value="yes">19+ 潜力</option><option value="review">待判断</option><option value="no">暂不匹配</option></select></div><div id="oaiTable" class="oai-table-wrap"></div><div id="oaiPager" class="oai-pager"></div></section>
  </div><dialog id="oaiDialog" class="oai-modal"><form id="oaiForm" method="dialog"><h2 id="oaiDialogTitle">新增人才</h2><div class="oai-form">
    <label>姓名<input id="oaiName" required></label><label>LinkedIn URL<input id="oaiLinkedin" type="url" placeholder="https://www.linkedin.com/in/..."></label>
    <label>当前公司<input id="oaiCompany" placeholder="例如：OpenAI"></label><label>当前职位<input id="oaiTitle"></label><label>所在地<input id="oaiLocation"></label>
    <label>OpenAI 团队<select id="oaiTeam"><option value="unknown">待确认</option>${teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></label><label>技术方向<input id="oaiFocus" placeholder="Reasoning / RL / Infra / Multimodal"></label>
    <label>优先级<select id="oaiPriority"><option>A</option><option selected>B</option><option>C</option></select></label><label>19+ 判断<select id="oaiLevel19Field"><option value="review">待判断</option><option value="yes">有潜力</option><option value="no">暂不匹配</option></select></label>
    <label>关系 / 招聘状态<select id="oaiStatus">${Object.entries(statusText).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></label><label>最近联系日期<input id="oaiLastContact" type="date"></label>
    <label class="wide">下一步动作<input id="oaiNextAction" placeholder="例如：10 月 5 日跟进；请技术专家评估"></label><label class="wide">证据 / 来源<input id="oaiSource" placeholder="公开主页、论文、本人消息或内部沟通来源"></label>
    <label class="wide">招聘备注<textarea id="oaiNotes" placeholder="只记录与岗位匹配、沟通和跟进相关的信息"></textarea></label>
    <menu><button value="cancel" class="oai-button secondary">取消</button><button id="oaiSave" type="submit" class="oai-button">保存</button></menu></div></form></dialog>`;

  const $=s=>root.querySelector(s);
  const teamName=id=>teams.find(t=>t.id===id)?.name||'待确认';
  function renderOrg(){
    $('#oaiOrg').innerHTML=teams.map(t=>{const count=state.people.filter(p=>p.team===t.id).length;return `<article class="oai-team ${state.selectedTeam===t.id?'active':''}"><button data-team="${t.id}"><h3>${esc(t.name)}</h3><div class="lead">负责人：${esc(t.lead)}</div><span class="size">团队规模 ${esc(t.size)}</span><p>${esc(t.focus)}</p><p><strong>已录入 ${count} 人</strong></p></button></article>`}).join('');
  }
  function filtered(){const q=clean($('#oaiSearch').value).toLowerCase(),company=$('#oaiCompanyFilter').value,team=$('#oaiTeamFilter').value,status=$('#oaiStatusFilter').value,priority=$('#oaiPriorityFilter').value,level=$('#oaiLevelFilter').value,isOpenAI=p=>/\bopen\s*ai\b/i.test(p.company||'');return state.people.filter(p=>(company==='all'||company==='openai'&&isOpenAI(p)||company==='other'&&p.company&&!isOpenAI(p)||company==='unknown'&&!p.company)&&(team==='all'||p.team===team)&&(status==='all'||p.status===status)&&(priority==='all'||p.priority===priority)&&(level==='all'||p.level19===level)&&[p.name,p.company,p.title,p.location,p.focus,p.notes,p.nextAction].join(' ').toLowerCase().includes(q)).sort((a,b)=>Number(isOpenAI(b))-Number(isOpenAI(a))||clean(a.name).localeCompare(clean(b.name)));}
  function render(){
    const allRows=filtered(),pages=Math.max(1,Math.ceil(allRows.length/PAGE_SIZE));currentPage=Math.min(currentPage,pages);const rows=allRows.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
    $('#oaiTotal').textContent=state.people.length;$('#oaiTargets').textContent=state.people.filter(p=>p.priority==='A'||p.status==='target').length;$('#oaiRequested').textContent=state.people.filter(p=>p.status==='connect_sent').length;$('#oaiEngaged').textContent=state.people.filter(p=>['connected','engaged','screening','interview','offer'].includes(p.status)).length;$('#oaiLevel19').textContent=state.people.filter(p=>p.level19==='yes').length;$('#oaiResultCount').textContent=`${allRows.length} 条记录 · 第 ${currentPage}/${pages} 页`;
    $('#oaiTable').innerHTML=rows.length?`<table class="oai-table"><thead><tr><th>姓名</th><th>公司</th><th>团队</th><th>当前职位</th><th>方向</th><th>优先级</th><th>19+</th><th>状态</th><th>互动</th><th>下一步</th><th>操作</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${p.linkedin?`<a class="oai-link" href="${esc(p.linkedin)}" target="_blank" rel="noopener">${esc(p.name)}</a>`:esc(p.name)}</td><td><strong>${esc(p.company||'待确认')}</strong></td><td>${esc(teamName(p.team))}</td><td>${esc(p.title||'待补充')}<br><small>${esc(p.location||'')}</small></td><td>${esc(p.focus||'待补充')}</td><td><span class="oai-chip ${p.priority==='A'?'hot':''}">${esc(p.priority||'B')}</span></td><td>${p.level19==='yes'?'是':p.level19==='no'?'否':'待判断'}</td><td><span class="oai-chip">${esc(statusText[p.status]||statusText.watch)}</span></td><td>${(p.interactions||[]).length}</td><td>${esc(p.nextAction||'待安排')}</td><td><div class="oai-row-actions"><button class="secondary" data-edit="${p.id}">编辑</button><button class="danger" data-delete="${p.id}">删除</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="oai-empty">当前筛选下暂无记录。若刚导入旧版数据，请重新导入 Connections.csv 以补全公司。</div>';
    $('#oaiPager').innerHTML=allRows.length>PAGE_SIZE?`<button class="secondary" data-page="prev" ${currentPage===1?'disabled':''}>上一页</button><span>第 ${currentPage} / ${pages} 页，每页 ${PAGE_SIZE} 人</span><button class="secondary" data-page="next" ${currentPage===pages?'disabled':''}>下一页</button>`:'';
    renderOrg();
  }
  function openDialog(person){const p=person||{};$('#oaiDialog').dataset.id=p.id||'';$('#oaiDialogTitle').textContent=person?'编辑人才':'新增人才';[['#oaiName','name'],['#oaiLinkedin','linkedin'],['#oaiCompany','company'],['#oaiTitle','title'],['#oaiLocation','location'],['#oaiFocus','focus'],['#oaiLastContact','lastContact'],['#oaiNextAction','nextAction'],['#oaiSource','source'],['#oaiNotes','notes']].forEach(([s,k])=>$(s).value=p[k]||'');$('#oaiTeam').value=p.team||'unknown';$('#oaiPriority').value=p.priority||'B';$('#oaiLevel19Field').value=p.level19||'review';$('#oaiStatus').value=p.status||'watch';$('#oaiDialog').showModal();}
  $('#oaiAdd').onclick=()=>openDialog();
  $('#oaiForm').onsubmit=e=>{e.preventDefault();const id=$('#oaiDialog').dataset.id;const data={name:clean($('#oaiName').value),linkedin:clean($('#oaiLinkedin').value).replace(/\/$/,''),company:clean($('#oaiCompany').value),title:clean($('#oaiTitle').value),location:clean($('#oaiLocation').value),team:$('#oaiTeam').value,focus:clean($('#oaiFocus').value),priority:$('#oaiPriority').value,level19:$('#oaiLevel19Field').value,status:$('#oaiStatus').value,lastContact:$('#oaiLastContact').value,nextAction:clean($('#oaiNextAction').value),source:clean($('#oaiSource').value),notes:clean($('#oaiNotes').value),updatedAt:new Date().toISOString()};const existing=state.people.find(p=>p.id===id);if(existing)Object.assign(existing,data);else state.people.unshift({id:crypto.randomUUID(),interactions:[],...data});save();$('#oaiDialog').close();render();};
  $('#oaiTable').onclick=e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit)openDialog(state.people.find(p=>p.id===edit.dataset.edit));if(del){const p=state.people.find(x=>x.id===del.dataset.delete);if(p&&confirm(`删除 ${p.name}？`)){state.people=state.people.filter(x=>x.id!==p.id);save();render();}}};
  $('#oaiPager').onclick=e=>{const b=e.target.closest('[data-page]');if(!b)return;currentPage+=b.dataset.page==='next'?1:-1;render();};
  $('#oaiOrg').onclick=e=>{const b=e.target.closest('[data-team]');if(!b)return;state.selectedTeam=b.dataset.team;$('#oaiTeamFilter').value=b.dataset.team;render();};
  $('#oaiResetTeam').onclick=()=>{state.selectedTeam='all';$('#oaiTeamFilter').value='all';render();};
  ['#oaiSearch','#oaiCompanyFilter','#oaiTeamFilter','#oaiStatusFilter','#oaiPriorityFilter','#oaiLevelFilter'].forEach(s=>$(s).addEventListener(s==='#oaiSearch'?'input':'change',()=>{currentPage=1;if(s==='#oaiTeamFilter')state.selectedTeam=$(s).value;render();}));
  function parseCsv(text){
    const rows=[];let row=[],cell='',quoted=false;
    text=String(text||'').replace(/^\ufeff/,'');
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>clean(v)))rows.push(row);row=[];cell='';}else cell+=c;}
    row.push(cell);if(row.some(v=>clean(v)))rows.push(row);return rows;
  }
  const norm=v=>clean(v).toLowerCase().replace(/[\s_-]+/g,'');
  const normUrl=v=>clean(v).split('?')[0].replace(/\/$/,'').toLowerCase();
  const findPerson=(name,linkedin)=>state.people.find(p=>(linkedin&&normUrl(p.linkedin)===normUrl(linkedin))||(!linkedin&&name&&norm(p.name)===norm(name)));
  const addInteraction=(person,item)=>{person.interactions=Array.isArray(person.interactions)?person.interactions:[];const key=[item.type,item.date,item.direction,item.message].map(norm).join('|');if(!person.interactions.some(x=>[x.type,x.date,x.direction,x.message].map(norm).join('|')===key))person.interactions.push(item);};
  const rank={watch:0,target:1,connect_sent:2,incoming_invite:2,connected:3,contacted:4,engaged:5,screening:6,interview:7,offer:8,closed:9};
  function importFile(file,rows){
    if(rows.length<2)return {file:file.name,type:'空文件',rows:0,added:0,updated:0,skipped:0};
    const headerAt=rows.slice(0,12).findIndex(r=>{const h=r.map(norm);return h.includes('direction')||h.includes('connectedon')||h.includes('firstname')||h.includes('fullname')||h.includes('linkedinurl')||h.includes('conversationid');});
    if(headerAt>0)rows=rows.slice(headerAt);
    const headers=rows.shift().map(norm),get=(row,...keys)=>{for(const key of keys){const i=headers.indexOf(norm(key));if(i>=0&&clean(row[i]))return clean(row[i]);}return '';};
    const filename=file.name.toLowerCase();let type='候选人';
    if(filename.includes('invitation')||headers.includes('direction')&&headers.includes('inviterprofileurl'))type='邀请记录';
    else if(filename.includes('message')||headers.includes('conversationid')&&headers.includes('content'))type='消息记录';
    else if(filename.includes('connection')||headers.includes('connectedon'))type='连接人脉';
    else if(/company.?follows|education|positions|email.?addresses|registration|recommendations|endorsement|search/i.test(filename))type='非候选人资料';
    if(type==='非候选人资料')return {file:file.name,type,rows:rows.length,added:0,updated:0,skipped:rows.length};
    const verifiedOpenAI=headers.includes('openaimatchbasis');
    let added=0,updated=0,skipped=0,openaiMatched=0;
    for(const row of rows){
      let name='',linkedin='',data={},interaction=null,allowCreate=['候选人','邀请记录','连接人脉'].includes(type);
      if(type==='邀请记录'){
        const direction=get(row,'Direction').toUpperCase();name=get(row,direction==='OUTGOING'?'To':'From');linkedin=get(row,direction==='OUTGOING'?'inviteeProfileUrl':'inviterProfileUrl');
        data={status:direction==='OUTGOING'?'connect_sent':'incoming_invite',lastContact:get(row,'Sent At')};interaction={type:'LinkedIn invitation',date:get(row,'Sent At'),direction,message:get(row,'Message'),source:file.name};
      }else if(type==='消息记录'){
        name=get(row,'From','Sender');linkedin=get(row,'Sender Profile URL','Sender Profile Url');data={status:'contacted',lastContact:get(row,'Date')};interaction={type:'LinkedIn message',date:get(row,'Date'),direction:'MESSAGE',message:get(row,'Content','Message'),source:file.name};
      }else{
        name=[get(row,'First Name'),get(row,'Last Name')].filter(Boolean).join(' ')||get(row,'Name','Full Name','姓名');linkedin=get(row,'URL','LinkedIn URL','Profile URL','LinkedIn','领英链接');
        data={title:get(row,'Position','Title','Current Role','职位'),location:get(row,'Location','City','地区'),focus:get(row,'Focus','Skills','Research Function','方向'),company:get(row,'Company','公司'),team:get(row,'Team','OpenAI Team','团队')||'unknown',status:type==='连接人脉'?'connected':get(row,'Status')||'watch',lastContact:get(row,'Connected On','Last Contact','Invitation Date'),notes:get(row,'Notes','备注')};
        const teamConfidence=get(row,'Team Confidence'),teamEvidence=get(row,'Team Evidence');if(teamConfidence||teamEvidence)data.notes=[data.notes,`团队判断：${teamConfidence||'待核验'}；${teamEvidence||''}`].filter(Boolean).join('\n');
        if(verifiedOpenAI){data.company='OpenAI';openaiMatched++;}
        if(type==='连接人脉')interaction={type:'LinkedIn connection',date:data.lastContact,direction:'CONNECTED',message:'',source:file.name};
      }
      linkedin=clean(linkedin).replace(/\/$/,'');
      if(!name&&!linkedin){skipped++;continue;}
      let person=findPerson(name,linkedin);
      if(!person&&!allowCreate){skipped++;continue;}
      if(!person){person={id:crypto.randomUUID(),name:name||'待补充姓名',linkedin,company:'',title:'',location:'',team:'unknown',focus:'',priority:'B',level19:'review',status:'watch',source:file.name,notes:'',interactions:[],updatedAt:new Date().toISOString()};state.people.push(person);added++;}else updated++;
      ['name','linkedin','company','title','location','focus','notes'].forEach(k=>{if(data[k]&&!person[k])person[k]=data[k];});
      if(verifiedOpenAI){person.company='OpenAI';if(data.title)person.title=data.title;if(data.focus)person.focus=data.focus;if(data.team&&data.team!=='unknown')person.team=data.team;if(data.notes)person.notes=data.notes;}
      if(data.status&&(rank[data.status]??0)>(rank[person.status]??0))person.status=data.status;
      if(data.lastContact)person.lastContact=data.lastContact;person.source=[person.source,file.name].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join('; ');person.updatedAt=new Date().toISOString();if(interaction)addInteraction(person,interaction);
    }
    return {file:file.name,type,rows:rows.length,added,updated,skipped,openaiMatched};
  }
  $('#oaiImport').onchange=async e=>{const files=[...e.target.files];if(!files.length)return;const reports=[];for(const file of files){try{reports.push(importFile(file,parseCsv(await file.text())));}catch(err){reports.push({file:file.name,type:'读取失败',rows:0,added:0,updated:0,skipped:0,openaiMatched:0});}}save();render();e.target.value='';const totals=reports.reduce((a,r)=>({added:a.added+r.added,updated:a.updated+r.updated,skipped:a.skipped+r.skipped,openaiMatched:a.openaiMatched+(r.openaiMatched||0)}),{added:0,updated:0,skipped:0,openaiMatched:0});$('#oaiImportStatus').innerHTML=`<strong>导入完成：</strong>OpenAI 命中 ${totals.openaiMatched}，新增 ${totals.added}，更新 ${totals.updated}，跳过无关/未匹配 ${totals.skipped}。<br>${reports.map(r=>`${esc(r.file)}：${r.type}，${r.rows} 行，OpenAI ${r.openaiMatched||0}，新增 ${r.added}，更新 ${r.updated}，跳过 ${r.skipped}`).join('<br>')}`;};
  $('#oaiExport').onclick=()=>{const fields=['name','linkedin','company','title','location','team','focus','priority','level19','status','lastContact','nextAction','source','notes','updatedAt'],cell=v=>`"${clean(v).replaceAll('"','""')}"`;const csv=['\ufeff'+fields.join(','),...state.people.map(p=>fields.map(f=>cell(p[f])).join(','))].join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`openai-talent-pipeline-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);};
  render();
})();
