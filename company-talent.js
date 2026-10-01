(()=>{
  const root=document.querySelector('#company-talentView');
  if(!root)return;

  const KEY='master-linked-company-talent-v2';
  const LEGACY_KEY='master-linked-openai-talent-v1';
  const today=()=>new Date().toISOString().slice(0,10);
  const clean=v=>String(v??'').trim();
  const esc=v=>clean(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const canonicalLinkedIn=v=>clean(v).split('?')[0].replace(/\/$/,'').toLowerCase();
  const uuid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const OPENAI_SAMPLE='用户提供的 OpenAI Research Team 组织架构样本（2026-10-01 收录，待独立来源交叉验证）';

  const openAITeams=[
    ['frontier','前沿研究 / Frontier','Jakub Pachocki & Mark Chen','约 50–80','通用研发组合、前沿探索与新项目'],
    ['foundation','Foundation','Mark Chen','约 80–120','基础模型、多模态底座、预训练数据、Scaling law、Retrieval'],
    ['training','Training','Jakub Pachocki','约 40–60','大规模分布式训练、稳定性、GPU 集群与训练基础设施'],
    ['post-training','Post-training','Max Schwarzer','约 100–150','RLHF、指令微调、Reward Model、模型行为调优'],
    ['human-data','Human Data','Amelia (Mia) Glaese','约 40–70','人类反馈、数据标注、偏好比较与数据闭环'],
    ['alignment','Alignment','Jakub Pachocki & Mark Chen','约 50–80','AI 对齐、价值学习、风险建模与安全策略'],
    ['reasoning','Reasoning','Noam Brown','约 40–60','推理模型、数学证明、复杂代码、规划与长程推理'],
    ['multimodal','Multimodal','Aditya Ramesh','约 40–70','Sora、世界模型、视频生成、物理一致性与场景理解'],
    ['robotics','Robotics','Caitlin Kalinowski','约 10–30','机器人、具身智能、通用机器人与现实环境控制'],
    ['labs','OAI Labs','Joanne Jang','约 20–40','人机交互、模型行为与新型界面']
  ].map(([id,name,lead,size,focus])=>({id,companyId:'openai',name,lead,size,focus,confidence:'review',verificationStatus:'review',sourceLabel:OPENAI_SAMPLE,sourceUrl:'',lastVerified:'2026-10-01'}));

  // Microsoft does not publish dependable team-size figures. Keep size as unknown
  // and preserve the public pages used to validate the organization and leader.
  const microsoftTeams=[
    {id:'microsoft-ai',name:'Microsoft AI (MAI)',lead:'Mustafa Suleyman',size:'约 5,000–10,000 人',focus:'Copilot、MAI 自研模型与超级智能',sourceLabel:'Microsoft AI 官方主页',sourceUrl:'https://microsoft.ai/',sourceLabel2:'Microsoft AI 公开 LinkedIn',sourceUrl2:'https://www.linkedin.com/company/microsoft-ai'},
    {id:'microsoft-coreai',name:'CoreAI – Platform and Tools',lead:'Jay Parikh',size:'约 9,000–12,000 人',focus:'AI 平台、开发工具、基础设施与 GitHub Copilot',sourceLabel:'Microsoft 官方博客：Introducing CoreAI',sourceUrl:'https://blogs.microsoft.com/blog/2025/01/13/introducing-core-ai-platform-and-tools/',sourceLabel2:'公开组织图报道：CoreAI 约 10,000',sourceUrl2:'https://careerofbusiness.com/leaked-microsoft-org-chart-shows-the-team-jay-parikh-assembled-to-lead-coreai-full-of-fellow-ex-meta-execs/'},
    {id:'microsoft-ai-frontiers',name:'AI Frontiers',lead:'Ece Kamar',size:'约 40–60 人',focus:'语言模型、智能体、可靠性与安全研究',sourceLabel:'Microsoft Research：AI Frontiers People',sourceUrl:'https://www.microsoft.com/en-us/research/lab/ai-frontiers/people/',sourceLabel2:'AI Frontiers 公开 LinkedIn',sourceUrl2:'https://www.linkedin.com/company/msaifrontiers'},
    {id:'microsoft-msr-americas',name:'Microsoft Research Americas',lead:'Lili Cheng',size:'约 500–1,200 人',focus:'AI、系统、安全、健康、经济与社会研究',sourceLabel:'Microsoft Research：Lili Cheng',sourceUrl:'https://www.microsoft.com/en-us/research/people/lilich/',sourceLabel2:'Microsoft Research LinkedIn（全球 1,001–5,000）',sourceUrl2:'https://www.linkedin.com/showcase/microsoftresearch/'},
    {id:'microsoft-msr-cambridge',name:'Microsoft Research Cambridge',lead:'Aditya Nori',size:'约 100–250 人',focus:'AI 基础设施、机器智能与以人为本的 AI',sourceLabel:'Microsoft Research Cambridge',sourceUrl:'https://www.microsoft.com/en-us/research/lab/microsoft-research-cambridge/',sourceLabel2:'公开历史人员基线（CIO）',sourceUrl2:'https://www.cio.com/article/197992/microsoft-research-cambridge-md-on-r-d-open-source-cloud-and-more.html',verificationStatus:'review'},
    {id:'microsoft-msr-asia',name:'Microsoft Research Asia',lead:'Lidong Zhou',size:'约 180–350 人',focus:'前沿 AI、多模态、智能体与系统研究',sourceLabel:'Microsoft Research Asia Leadership',sourceUrl:'https://www.microsoft.com/en-us/research/lab/microsoft-research-asia/leadership/',sourceLabel2:'公开研究资料：超过 180 名研究人员',sourceUrl2:'https://citeseerx.ist.psu.edu/document?doi=bff3dc281915cc52c4605f9749913956f6b78081&repid=rep1&type=pdf'},
    {id:'microsoft-ai-science',name:'AI for Science',lead:'Bonnie Kruft',size:'约 60–150 人',focus:'材料、分子、生物医药与科学基础模型',sourceLabel:'Microsoft Research：AI for Science',sourceUrl:'https://www.microsoft.com/en-us/research/lab/microsoft-research-ai4science/',sourceLabel2:'Bonnie Kruft 负责人资料',sourceUrl2:'https://www.microsoft.com/en-us/research/people/bonniekruft/'},
    {id:'microsoft-mixed-reality-ai',name:'Mixed Reality & AI – Cambridge',lead:'Antonio Criminisi',size:'约 20–80 人',focus:'计算机视觉、数字人与混合现实',sourceLabel:'Microsoft Research：Mixed Reality & AI Lab',sourceUrl:'https://www.microsoft.com/en-us/research/lab/mixed-reality-ai-lab-cambridge/',sourceLabel2:'Microsoft UK Impact Report',sourceUrl2:'https://ukstories.microsoft.com/wp-content/uploads/2024/07/UK-Impact-Report-FINAL.pdf',verificationStatus:'review'}
  ].map(t=>({...t,companyId:'microsoft',confidence:t.verificationStatus||'verified',verificationStatus:t.verificationStatus||'verified',lastVerified:'2026-10-01',researchSeed:'ms-2026-10-01-v3'}));

  const seedTeams=[...openAITeams,...microsoftTeams];

  // Person-level enrichment is intentionally conservative: a team is assigned only
  // when a public company page names the lab/group. LinkedIn remains the relationship
  // source; the URLs below are the independent organization/role evidence.
  const personResearch={
    'https://www.linkedin.com/in/baolin-peng-6299266b':{teamId:'microsoft-msr-americas',title:'Principal Research Manager',location:'Redmond, Washington',focus:'LLM 智能体、复杂推理与规划',sourceUrl2:'https://www.microsoft.com/en-us/research/people/baolinpeng/',confidence:'verified'},
    'https://www.linkedin.com/in/chenglong-wang-x3':{teamId:'microsoft-msr-americas',title:'Senior Researcher',location:'Redmond, Washington',focus:'程序合成、编程工具、数据智能体',sourceUrl2:'https://www.microsoft.com/en-us/research/people/chenwang/',confidence:'verified'},
    'https://www.linkedin.com/in/handongge':{teamId:'microsoft-msr-cambridge',title:'Senior Researcher',location:'Cambridge, UK',focus:'LLM 智能体、生产力与应用效率',sourceUrl2:'https://www.microsoft.com/en-us/research/people/donggehan/',confidence:'verified'},
    'https://www.linkedin.com/in/fan-yang-75604077':{teamId:'microsoft-msr-asia',title:'Partner Research Manager',focus:'AI 系统、LLM 推理与训练基础设施',sourceUrl2:'https://www.microsoft.com/en-us/research/people/fanyang/',confidence:'verified'},
    'https://www.linkedin.com/in/hanze-dong':{teamId:'microsoft-msr-asia',title:'Senior Researcher',location:'Asia',focus:'LLM 训练与推理、强化学习、生成模型',sourceUrl2:'https://www.microsoft.com/en-us/research/people/hanzedong/',confidence:'verified'},
    'https://www.linkedin.com/in/haoyu-dong-745b0754':{teamId:'microsoft-msr-americas',title:'Senior Researcher',focus:'表格智能、工作场景 LLM、数据分析',sourceUrl2:'https://www.microsoft.com/en-us/research/people/hadong/',confidence:'verified'},
    'https://www.linkedin.com/in/lijuan-wang-56141438':{teamId:'microsoft-msr-americas',title:'Principal Research Manager',location:'Redmond, Washington',focus:'多模态感知、视觉语言预训练、计算机视觉',sourceUrl2:'https://www.microsoft.com/en-us/research/people/lijuanw/',confidence:'verified'},
    'https://www.linkedin.com/in/wentao-wu-72682814':{teamId:'microsoft-msr-americas',title:'Principal Researcher',location:'Redmond, Washington',focus:'数据库系统、查询优化、ML 系统',sourceUrl2:'https://www.microsoft.com/en-us/research/people/wentwu/',confidence:'verified'},
    'https://www.linkedin.com/in/xiaodong-liu-7a17a135':{teamId:'microsoft-msr-americas',focus:'大语言模型、强化学习、模型安全与高效训练',sourceUrl2:'https://www.microsoft.com/en-us/research/people/xiaodl/',confidence:'verified'}
  };

  const defaultState=()=>({
    version:2,
    companies:[
      {id:'openai',name:'OpenAI',description:'大模型研究、产品与基础设施人才地图',lastVerified:'2026-10-01'},
      {id:'microsoft',name:'Microsoft',description:'Microsoft Research、AI、云与基础设施目标团队',lastVerified:''}
    ],
    teams:seedTeams,
    people:[],
    movements:[],
    selectedCompany:'all',
    selectedTeam:'all'
  });

  function migrate(){
    const existing=JSON.parse(localStorage.getItem(KEY)||'null');
    if(existing)return normalize(existing);
    const next=defaultState(),legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');
    if(Array.isArray(legacy?.people))next.people=legacy.people.map(p=>({
      ...p,
      id:p.id||uuid(),
      companyId:/microsoft/i.test(p.company||'')?'microsoft':'openai',
      teamId:p.team||'unknown',
      relationshipStatus:p.status||'watch',
      confidence:p.confidence||'review',
      lastVerified:p.lastVerified||'',
      sourceUrl:p.sourceUrl||'',
      owner:p.owner||'',
      interactions:Array.isArray(p.interactions)?p.interactions:[]
    }));
    localStorage.setItem(KEY,JSON.stringify(next));
    return next;
  }

  function normalize(raw){
    const base=defaultState();
    const savedTeams=Array.isArray(raw.teams)?raw.teams:[];
    const microsoftSeedIds=new Set(microsoftTeams.map(t=>t.id));
    const retainedTeams=savedTeams.filter(t=>!microsoftSeedIds.has(t.id)||t.userEdited||!t.researchSeed);
    const retainedIds=new Set(retainedTeams.map(t=>t.id));
    return {
      ...base,...raw,
      companies:Array.isArray(raw.companies)&&raw.companies.length?raw.companies:base.companies,
      teams:[...retainedTeams,...base.teams.filter(t=>!retainedIds.has(t.id))],
      people:(Array.isArray(raw.people)?raw.people:[]).map(p=>({...p,id:p.id||uuid(),companyId:p.companyId||(/microsoft/i.test(p.company||'')?'microsoft':'openai'),teamId:p.teamId||p.team||'unknown',relationshipStatus:p.relationshipStatus||p.status||'watch',interactions:Array.isArray(p.interactions)?p.interactions:[]})),
      movements:Array.isArray(raw.movements)?raw.movements:[]
    };
  }

  let state=migrate();
  let activeView='overview';
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const company=id=>state.companies.find(c=>c.id===id);
  const team=id=>state.teams.find(t=>t.id===id);
  const teamsFor=id=>state.teams.filter(t=>t.companyId===id);
  const peopleFor=id=>state.people.filter(p=>p.companyId===id);
  const applied=p=>typeof p.invitationSent==='boolean'?p.invitationSent:['connect_sent','connected','contacted','engaged','screening','interview','offer'].includes(p.relationshipStatus);
  const connected=p=>typeof p.connectionConfirmed==='boolean'?p.connectionConfirmed:['connected','contacted','engaged','screening','interview','offer'].includes(p.relationshipStatus);
  const replied=p=>typeof p.replyConfirmed==='boolean'?p.replyConfirmed:['engaged','screening','interview','offer'].includes(p.relationshipStatus);
  const pct=(a,b)=>b?`${(a/b*100).toFixed(1)}%`:'—';
  const metrics=id=>{const ps=peopleFor(id),requests=ps.filter(applied).length,connections=ps.filter(connected).length,replies=ps.filter(replied).length;return{teams:teamsFor(id).length,identified:ps.length,requests,connections,replies,acceptRate:pct(connections,requests),replyRate:pct(replies,connections)};};
  const statusText={watch:'长期跟踪',target:'重点目标',connect_sent:'已申请连接',incoming_invite:'收到邀请',connected:'已连接',contacted:'已联系',engaged:'有回复',screening:'沟通中',interview:'面试中',offer:'Offer',closed:'暂不推进'};
  const verificationText={verified:'已交叉验证',review:'待交叉验证',stale:'需要复核'};

  root.innerHTML=`<div class="ct-shell">
    <section class="ct-hero"><div><h1>目标企业人才情报工作台</h1><p>按企业、团队、Leader、人员和联接漏斗持续维护。所有组织关系必须保留来源、核验日期和可信度。</p></div><div class="ct-actions"><label class="ct-button secondary">导入人才 CSV<input id="ctImport" type="file" accept=".csv,text/csv" multiple hidden></label><button id="ctExport" class="ct-button secondary">导出完整数据</button><button id="ctExportReport" class="ct-button secondary">导出汇报 CSV</button><button id="ctCopyReport" class="ct-button">复制汇报</button></div></section>
    <div class="ct-callout"><strong>验证规则：</strong>团队、Leader、人数与人员归属默认视为研究假设；两个独立公开来源一致后才标记“已交叉验证”。单一来源、来源冲突或超过 90 天未核验的记录进入复核队列。不要记录与招聘无关的敏感个人信息。</div>
    <nav id="ctTabs" class="ct-tabs"><button class="ct-tab active" data-company="all">企业总览</button>${state.companies.map(c=>`<button class="ct-tab" data-company="${c.id}">${esc(c.name)}</button>`).join('')}<button class="ct-tab" data-company="verification">核验队列</button><button class="ct-tab" data-company="movements">趋势与动向</button></nav>
    <div id="ctBody"></div>
    <div id="ctImportStatus" class="ct-import-status">支持包含 name、company、team、title、linkedin、status、sourceUrl、lastVerified 等字段的 CSV；按 LinkedIn 或“姓名+公司”去重。</div>
  </div>
  <dialog id="ctPersonDialog" class="ct-modal"><form id="ctPersonForm" method="dialog"><h2 id="ctPersonTitle">新增人才</h2><div class="ct-form">
    <label>姓名<input id="ctName" required></label><label>企业<select id="ctCompany"></select></label><label>所属团队<select id="ctTeam"></select></label><label>当前职位<input id="ctTitle"></label><label>所在地<input id="ctLocation"></label><label>技术方向<input id="ctFocus"></label><label>LinkedIn<input id="ctLinkedIn" type="url"></label><label>GitHub<input id="ctGitHub" type="url"></label><label>关系状态<select id="ctStatus">${Object.entries(statusText).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></label><label>负责人<input id="ctOwner" placeholder="内部 owner"></label><label>可信度<select id="ctConfidence"><option value="review">待交叉验证</option><option value="verified">已交叉验证</option><option value="stale">需要复核</option></select></label><label>最后核验日期<input id="ctLastVerified" type="date"></label><label class="wide">主要来源 URL<input id="ctSourceUrl" type="url"></label><label class="wide">下一步行动<input id="ctNextAction"></label><label class="wide">备注<textarea id="ctNotes"></textarea></label></div><menu><button value="cancel" class="ct-button secondary">取消</button><button id="ctPersonSave" value="default" class="ct-button">保存</button></menu></form></dialog>
  <dialog id="ctTeamDialog" class="ct-modal"><form id="ctTeamForm" method="dialog"><h2 id="ctTeamTitle">新增团队</h2><div class="ct-form"><label>企业<select id="ctTeamCompany"></select></label><label>团队名称<input id="ctTeamName" required></label><label>Leader<input id="ctTeamLead"></label><label>估算规模<input id="ctTeamSize" placeholder="例如：约 40–60"></label><label class="wide">技术方向<textarea id="ctTeamFocus"></textarea></label><label>核验状态<select id="ctTeamVerification"><option value="review">待交叉验证</option><option value="verified">已交叉验证</option><option value="stale">需要复核</option></select></label><label>最后核验日期<input id="ctTeamVerifiedAt" type="date"></label><label class="wide">来源 1 说明<input id="ctTeamSourceLabel"></label><label class="wide">来源 1 URL<input id="ctTeamSourceUrl" type="url"></label><label class="wide">来源 2 说明<input id="ctTeamSourceLabel2"></label><label class="wide">来源 2 URL<input id="ctTeamSourceUrl2" type="url"></label></div><menu><button value="cancel" class="ct-button secondary">取消</button><button value="default" class="ct-button">保存</button></menu></form></dialog>
  <dialog id="ctMovementDialog" class="ct-modal"><form id="ctMovementForm" method="dialog"><h2>新增趋势 / 动向</h2><div class="ct-form"><label>企业<select id="ctMoveCompany"></select></label><label>日期<input id="ctMoveDate" type="date" required></label><label>类型<select id="ctMoveType"><option>组织调整</option><option>Leader 变动</option><option>招聘动向</option><option>研究发布</option><option>产品发布</option><option>其他</option></select></label><label>可信度<select id="ctMoveConfidence"><option value="review">待交叉验证</option><option value="verified">已交叉验证</option></select></label><label class="wide">事件摘要<input id="ctMoveSummary" required></label><label class="wide">来源 URL<input id="ctMoveSource" type="url" required></label><label class="wide">影响与后续动作<textarea id="ctMoveImpact"></textarea></label></div><menu><button value="cancel" class="ct-button secondary">取消</button><button value="default" class="ct-button">保存</button></menu></form></dialog>`;

  const $=s=>root.querySelector(s);
  function companyOptions(selected){return state.companies.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.name)}</option>`).join('');}
  function teamOptions(companyId,selected){return `<option value="unknown">待确认</option>`+teamsFor(companyId).map(t=>`<option value="${t.id}" ${t.id===selected?'selected':''}>${esc(t.name)}</option>`).join('');}

  function renderOverview(){
    const totals=state.companies.reduce((a,c)=>{const m=metrics(c.id);Object.keys(a).forEach(k=>a[k]+=m[k]||0);return a;},{teams:0,identified:0,requests:0,connections:0,replies:0});
    $('#ctBody').innerHTML=`<section class="ct-section"><div class="ct-section-head"><div><h2>企业联接进展总览</h2><p>点击企业进入团队和人员明细；Invitations 与 Connections 由 LinkedIn 导出记录交叉匹配。</p></div></div><div class="ct-table-wrap"><table class="ct-table"><thead><tr><th>企业</th><th>团队</th><th>已识别人才</th><th>Invitations 发出邀请</th><th>最终 Connections</th><th>Replies 回复</th><th>连接通过率</th><th>回复率</th></tr></thead><tbody>${state.companies.map(c=>{const m=metrics(c.id);return`<tr class="ct-summary-row" data-open-company="${c.id}"><td><span class="ct-company-name">${esc(c.name)}<small>${esc(c.description)}</small></span></td><td class="ct-number">${m.teams}</td><td class="ct-number">${m.identified}</td><td class="ct-number">${m.requests}</td><td class="ct-number">${m.connections}</td><td class="ct-number">${m.replies}</td><td>${m.acceptRate}</td><td>${m.replyRate}</td></tr>`}).join('')}</tbody><tfoot><tr><td><strong>合计</strong></td><td class="ct-number">${totals.teams}</td><td class="ct-number">${totals.identified}</td><td class="ct-number">${totals.requests}</td><td class="ct-number">${totals.connections}</td><td class="ct-number">${totals.replies}</td><td>${pct(totals.connections,totals.requests)}</td><td>${pct(totals.replies,totals.connections)}</td></tr></tfoot></table></div></section><section class="ct-section"><div class="ct-section-head"><div><h2>管理层汇报摘要</h2><p>可直接复制到周报或会议材料。</p></div></div><div class="ct-report">${esc(buildReport())}</div></section>`;
    $('#ctBody').onclick=e=>{const row=e.target.closest('[data-open-company]');if(row)selectView(row.dataset.openCompany);};
  }

  function buildReport(){
    const rows=state.companies.map(c=>{const m=metrics(c.id);return`${c.name}：覆盖 ${m.teams} 个团队，累计识别 ${m.identified} 人，Invitations ${m.requests} 人，最终 Connections ${m.connections} 人，Replies ${m.replies} 人；连接通过率 ${m.acceptRate}，回复率 ${m.replyRate}。`;});
    const totalPeople=state.people.length,totalReq=state.people.filter(applied).length,totalCon=state.people.filter(connected).length,totalReply=state.people.filter(replied).length;
    return `目标企业人才联接进展（${today()}）\n${rows.join('\n')}\n合计：识别 ${totalPeople} 人，Invitations ${totalReq} 人，最终 Connections ${totalCon} 人，Replies ${totalReply} 人。下一阶段优先补齐低覆盖团队，并复核超过 90 天或缺少双来源的组织信息。`;
  }

  function teamMetrics(companyId,teamId){const ps=state.people.filter(p=>p.companyId===companyId&&p.teamId===teamId);return{identified:ps.length,requests:ps.filter(applied).length,connections:ps.filter(connected).length,replies:ps.filter(replied).length};}
  function filteredPeople(companyId){const q=clean($('#ctSearch')?.value).toLowerCase(),teamId=$('#ctTeamFilter')?.value||'all',status=$('#ctStatusFilter')?.value||'all',confidence=$('#ctConfidenceFilter')?.value||'all';return peopleFor(companyId).filter(p=>(teamId==='all'||p.teamId===teamId)&&(status==='all'||p.relationshipStatus===status)&&(confidence==='all'||p.confidence===confidence)&&[p.name,p.title,p.location,p.focus,p.owner,p.notes].join(' ').toLowerCase().includes(q)).sort((a,b)=>clean(a.name).localeCompare(clean(b.name)));}

  function renderCompany(companyId){
    const c=company(companyId),m=metrics(companyId),teams=teamsFor(companyId);
    const unassigned=peopleFor(companyId).filter(p=>!p.teamId||p.teamId==='unknown'),ux={identified:unassigned.length,requests:unassigned.filter(applied).length,connections:unassigned.filter(connected).length,replies:unassigned.filter(replied).length};
    const teamCards=teams.map(t=>{const x=teamMetrics(companyId,t.id);return`<article class="ct-team"><button data-team="${t.id}"><h3>${esc(t.name)}</h3><div class="lead">Leader：${esc(t.lead||'待确认')}</div><p>${esc(t.size||'规模待确认')} · ${esc(t.focus||'方向待补充')}</p><div class="ct-team-metrics"><span>识别 ${x.identified}</span><span>邀请 ${x.requests}</span><span>连接 ${x.connections}</span><span>回复 ${x.replies}</span></div></button></article>`}).join('')+(unassigned.length?`<article class="ct-team"><button data-team="unknown"><h3>团队待确认</h3><div class="lead">已识别、待核验具体归属</div><p>${unassigned.length} 人 · 不凭职位名称推测组织关系</p><div class="ct-team-metrics"><span>识别 ${ux.identified}</span><span>邀请 ${ux.requests}</span><span>连接 ${ux.connections}</span><span>回复 ${ux.replies}</span></div></button></article>`:'');
    $('#ctBody').innerHTML=`<section class="ct-kpis"><div class="ct-kpi"><span>目标团队</span><strong>${m.teams}</strong></div><div class="ct-kpi"><span>已识别人才</span><strong>${m.identified}</strong></div><div class="ct-kpi"><span>Invitations</span><strong>${m.requests}</strong></div><div class="ct-kpi"><span>最终 Connections</span><strong>${m.connections}</strong></div><div class="ct-kpi"><span>Replies</span><strong>${m.replies}</strong></div><div class="ct-kpi"><span>连接通过率</span><strong>${m.acceptRate}</strong></div></section>
    <section class="ct-section"><div class="ct-section-head"><div><h2>${esc(c.name)} 团队地图</h2><p>团队、负责人、规模与核心方向。</p></div><button id="ctAddTeam" class="ct-button secondary">新增团队</button></div><div class="ct-org">${teamCards||'<div class="ct-empty">尚未添加团队。点击“新增团队”建立第一条记录。</div>'}</div></section>
    <section class="ct-section"><div class="ct-section-head"><div><h2>人才名单与联接漏斗</h2><p id="ctResultCount"></p></div><button id="ctAddPerson" class="ct-button">新增人才</button></div><div class="ct-toolbar"><input id="ctSearch" placeholder="搜索姓名、职位、方向、owner"><select id="ctTeamFilter"><option value="all">全部团队</option>${teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}${unassigned.length?'<option value="unknown">团队待确认</option>':''}</select><select id="ctStatusFilter"><option value="all">全部状态</option>${Object.entries(statusText).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select><select id="ctConfidenceFilter"><option value="all">全部可信度</option><option value="verified">已交叉验证</option><option value="review">待交叉验证</option><option value="stale">需要复核</option></select></div><div id="ctPeopleTable" class="ct-table-wrap"></div></section>`;
    const rerenderPeople=()=>{const rows=filteredPeople(companyId);$('#ctResultCount').textContent=`${rows.length} 条记录`;$('#ctPeopleTable').innerHTML=rows.length?`<table class="ct-table"><thead><tr><th>姓名</th><th>团队</th><th>职位 / 地区</th><th>方向</th><th>状态</th><th>可信度</th><th>Owner / 下一步</th><th>操作</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${p.linkedin?`<a class="ct-link" href="${esc(p.linkedin)}" target="_blank" rel="noopener">${esc(p.name)}</a>`:esc(p.name)}</td><td>${esc(team(p.teamId)?.name||'待确认')}</td><td>${esc(p.title||'待补充')}<br><small>${esc(p.location||'')}</small></td><td>${esc(p.focus||'待补充')}</td><td><span class="ct-chip">${esc(statusText[p.relationshipStatus]||'长期跟踪')}</span></td><td><span class="ct-chip ${p.confidence||'review'}">${verificationText[p.confidence]||'待交叉验证'}</span><br><small>${esc(p.lastVerified||'未核验')}</small></td><td>${esc(p.owner||'未分配')}<br><small>${esc(p.nextAction||'待安排')}</small></td><td><div class="ct-row-actions"><button class="ct-button secondary" data-edit-person="${p.id}">编辑</button><button class="ct-button danger" data-delete-person="${p.id}">删除</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="ct-empty">当前筛选下暂无人才记录。</div>';};
    rerenderPeople();
    ['#ctSearch','#ctTeamFilter','#ctStatusFilter','#ctConfidenceFilter'].forEach(s=>$(s).addEventListener(s==='#ctSearch'?'input':'change',rerenderPeople));
    $('#ctAddPerson').onclick=()=>openPerson(null,companyId);
    $('#ctAddTeam').onclick=()=>openTeam(null,companyId);
    $('#ctBody').onclick=e=>{const editTeam=e.target.closest('[data-edit-team]');if(editTeam){openTeam(state.teams.find(t=>t.id===editTeam.dataset.editTeam),companyId);return;}const teamButton=e.target.closest('[data-team]');if(teamButton){$('#ctTeamFilter').value=teamButton.dataset.team;rerenderPeople();return;}const edit=e.target.closest('[data-edit-person]'),del=e.target.closest('[data-delete-person]');if(edit)openPerson(state.people.find(p=>p.id===edit.dataset.editPerson),companyId);if(del&&confirm('确定删除这条人才记录吗？')){state.people=state.people.filter(p=>p.id!==del.dataset.deletePerson);save();renderCompany(companyId);}};
  }

  function renderVerification(){
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);
    const rows=state.teams.map(t=>({...t,isStale:!t.lastVerified||new Date(t.lastVerified)<cutoff||t.verificationStatus!=='verified'||!t.sourceUrl||!t.sourceUrl2})).filter(t=>t.isStale);
    $('#ctBody').innerHTML=`<section class="ct-section"><div class="ct-section-head"><div><h2>组织信息核验队列</h2><p>缺少双来源、超过 90 天或来源冲突的团队都应在这里处理。</p></div><button id="ctVerifyAddTeam" class="ct-button secondary">新增团队记录</button></div><div class="ct-table-wrap">${rows.length?`<table class="ct-table"><thead><tr><th>企业</th><th>团队</th><th>Leader / 规模</th><th>状态</th><th>最后核验</th><th>来源</th><th>操作</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${esc(company(t.companyId)?.name)}</td><td>${esc(t.name)}</td><td>${esc(t.lead||'待确认')}<br><small>${esc(t.size||'规模待确认')}</small></td><td><span class="ct-chip ${t.verificationStatus||'review'}">${verificationText[t.verificationStatus]||'待交叉验证'}</span></td><td>${esc(t.lastVerified||'从未')}</td><td class="ct-evidence">${t.sourceUrl?`<a href="${esc(t.sourceUrl)}" target="_blank" rel="noopener">${esc(t.sourceLabel||'来源 1')}</a>`:'缺少来源 1'}<br>${t.sourceUrl2?`<a href="${esc(t.sourceUrl2)}" target="_blank" rel="noopener">${esc(t.sourceLabel2||'来源 2')}</a>`:'缺少来源 2'}</td><td><button class="ct-button secondary" data-edit-team="${t.id}">编辑核验</button></td></tr>`).join('')}</tbody></table>`:'<div class="ct-empty">当前没有待核验团队。</div>'}</div></section>`;
    $('#ctVerifyAddTeam').onclick=()=>openTeam(null,state.companies[0]?.id);
    $('#ctBody').onclick=e=>{const b=e.target.closest('[data-edit-team]');if(b)openTeam(state.teams.find(t=>t.id===b.dataset.editTeam));};
  }

  function renderMovements(){
    $('#ctBody').innerHTML=`<section class="ct-section"><div class="ct-section-head"><div><h2>企业趋势与组织动向</h2><p>所有动向都保留发生日期、来源和影响判断。</p></div><button id="ctAddMovement" class="ct-button">新增动向</button></div><div class="ct-table-wrap">${state.movements.length?`<table class="ct-table"><thead><tr><th>日期</th><th>企业</th><th>类型</th><th>事件</th><th>可信度</th><th>影响 / 下一步</th><th>来源</th></tr></thead><tbody>${[...state.movements].sort((a,b)=>clean(b.date).localeCompare(clean(a.date))).map(m=>`<tr><td>${esc(m.date)}</td><td>${esc(company(m.companyId)?.name)}</td><td>${esc(m.type)}</td><td>${esc(m.summary)}</td><td><span class="ct-chip ${m.confidence}">${verificationText[m.confidence]||'待交叉验证'}</span></td><td>${esc(m.impact||'待判断')}</td><td><a class="ct-link" href="${esc(m.sourceUrl)}" target="_blank" rel="noopener">查看来源</a></td></tr>`).join('')}</tbody></table>`:'<div class="ct-empty">尚未记录趋势或组织动向。</div>'}</div></section>`;
    $('#ctAddMovement').onclick=()=>{$('#ctMoveCompany').innerHTML=companyOptions(state.companies[0]?.id);$('#ctMoveDate').value=today();$('#ctMovementDialog').showModal();};
  }

  function selectView(view){activeView=view;root.querySelectorAll('.ct-tab').forEach(b=>b.classList.toggle('active',b.dataset.company===view));if(view==='all')renderOverview();else if(view==='verification')renderVerification();else if(view==='movements')renderMovements();else renderCompany(view);}
  $('#ctTabs').onclick=e=>{const b=e.target.closest('[data-company]');if(b)selectView(b.dataset.company);};

  function openPerson(p,companyId){
    const selectedCompany=p?.companyId||companyId||state.companies[0]?.id;$('#ctPersonDialog').dataset.id=p?.id||'';$('#ctPersonTitle').textContent=p?'编辑人才':'新增人才';$('#ctCompany').innerHTML=companyOptions(selectedCompany);$('#ctTeam').innerHTML=teamOptions(selectedCompany,p?.teamId);$('#ctCompany').onchange=()=>$('#ctTeam').innerHTML=teamOptions($('#ctCompany').value,'unknown');[['#ctName','name'],['#ctTitle','title'],['#ctLocation','location'],['#ctFocus','focus'],['#ctLinkedIn','linkedin'],['#ctGitHub','github'],['#ctOwner','owner'],['#ctSourceUrl','sourceUrl'],['#ctNextAction','nextAction'],['#ctNotes','notes']].forEach(([s,k])=>$(s).value=p?.[k]||'');$('#ctStatus').value=p?.relationshipStatus||'watch';$('#ctConfidence').value=p?.confidence||'review';$('#ctLastVerified').value=p?.lastVerified||'';$('#ctPersonDialog').showModal();
  }
  $('#ctPersonForm').onsubmit=e=>{e.preventDefault();if(e.submitter?.value==='cancel'){ $('#ctPersonDialog').close();return;}const id=$('#ctPersonDialog').dataset.id,data={name:clean($('#ctName').value),companyId:$('#ctCompany').value,teamId:$('#ctTeam').value,title:clean($('#ctTitle').value),location:clean($('#ctLocation').value),focus:clean($('#ctFocus').value),linkedin:canonicalLinkedIn($('#ctLinkedIn').value),github:clean($('#ctGitHub').value),relationshipStatus:$('#ctStatus').value,owner:clean($('#ctOwner').value),confidence:$('#ctConfidence').value,lastVerified:$('#ctLastVerified').value,sourceUrl:clean($('#ctSourceUrl').value),nextAction:clean($('#ctNextAction').value),notes:clean($('#ctNotes').value),updatedAt:new Date().toISOString(),userEdited:true};const old=state.people.find(p=>p.id===id);if(old)Object.assign(old,data);else state.people.unshift({id:uuid(),interactions:[],...data});save();$('#ctPersonDialog').close();selectView(data.companyId);};

  function openTeam(t,companyId){const selected=t?.companyId||companyId||state.companies[0]?.id;$('#ctTeamDialog').dataset.id=t?.id||'';$('#ctTeamTitle').textContent=t?'编辑团队与核验信息':'新增团队';$('#ctTeamCompany').innerHTML=companyOptions(selected);[['#ctTeamName','name'],['#ctTeamLead','lead'],['#ctTeamSize','size'],['#ctTeamFocus','focus'],['#ctTeamSourceLabel','sourceLabel'],['#ctTeamSourceUrl','sourceUrl'],['#ctTeamSourceLabel2','sourceLabel2'],['#ctTeamSourceUrl2','sourceUrl2']].forEach(([s,k])=>$(s).value=t?.[k]||'');$('#ctTeamVerification').value=t?.verificationStatus||'review';$('#ctTeamVerifiedAt').value=t?.lastVerified||'';$('#ctTeamDialog').showModal();}
  $('#ctTeamForm').onsubmit=e=>{e.preventDefault();if(e.submitter?.value==='cancel'){ $('#ctTeamDialog').close();return;}const id=$('#ctTeamDialog').dataset.id,data={companyId:$('#ctTeamCompany').value,name:clean($('#ctTeamName').value),lead:clean($('#ctTeamLead').value),size:clean($('#ctTeamSize').value),focus:clean($('#ctTeamFocus').value),verificationStatus:$('#ctTeamVerification').value,confidence:$('#ctTeamVerification').value,lastVerified:$('#ctTeamVerifiedAt').value,sourceLabel:clean($('#ctTeamSourceLabel').value),sourceUrl:clean($('#ctTeamSourceUrl').value),sourceLabel2:clean($('#ctTeamSourceLabel2').value),sourceUrl2:clean($('#ctTeamSourceUrl2').value),userEdited:true};if(data.verificationStatus==='verified'&&(!data.sourceUrl||!data.sourceUrl2||data.sourceUrl===data.sourceUrl2)){alert('标记“已交叉验证”需要两个不同的公开来源 URL。');return;}const old=state.teams.find(t=>t.id===id);if(old)Object.assign(old,data);else state.teams.push({id:`${data.companyId}-${clean(data.name).toLowerCase().replace(/[^a-z0-9]+/g,'-')||uuid()}`,...data});save();$('#ctTeamDialog').close();selectView(activeView==='verification'?'verification':data.companyId);};

  $('#ctMovementForm').onsubmit=e=>{e.preventDefault();if(e.submitter?.value==='cancel'){ $('#ctMovementDialog').close();return;}state.movements.push({id:uuid(),companyId:$('#ctMoveCompany').value,date:$('#ctMoveDate').value,type:$('#ctMoveType').value,confidence:$('#ctMoveConfidence').value,summary:clean($('#ctMoveSummary').value),sourceUrl:clean($('#ctMoveSource').value),impact:clean($('#ctMoveImpact').value),createdAt:new Date().toISOString()});save();$('#ctMovementDialog').close();selectView('movements');e.target.reset();};

  function parseCsv(text){const rows=[];let row=[],cell='',quote=false;for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1];if(ch==='"'&&quote&&next==='"'){cell+='"';i++;}else if(ch==='"')quote=!quote;else if(ch===','&&!quote){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quote){if(ch==='\r'&&next==='\n')i++;row.push(cell);if(row.some(x=>clean(x)))rows.push(row);row=[];cell='';}else cell+=ch;}row.push(cell);if(row.some(x=>clean(x)))rows.push(row);return rows;}
  $('#ctImport').onchange=async e=>{
    let added=0,updated=0,skipped=0;
    const files=[...e.target.files];
    if(!files.length)return;
    $('#ctImportStatus').textContent='正在导入，请稍候…';
    try{
      for(const file of files){
        const rows=parseCsv((await file.text()).replace(/^\uFEFF/,''));
        const headerAt=rows.findIndex(row=>{
          const hs=row.map(h=>clean(h).replace(/^\uFEFF/,'').toLowerCase());
          return (hs.includes('name')||hs.includes('full_name')||hs.includes('first name'))&&(hs.includes('company')||hs.includes('companyraw')||hs.includes('公司'));
        });
        if(headerAt<0){skipped+=Math.max(1,rows.length-1);continue;}
        const headers=rows[headerAt].map(h=>clean(h).replace(/^\uFEFF/,'').toLowerCase());
        const get=(r,...names)=>{const i=headers.findIndex(h=>names.includes(h));return i>=0?clean(r[i]):'';};
        for(const r of rows.slice(headerAt+1)){
          const first=get(r,'first name','first','名'),last=get(r,'last name','last','姓');
          const name=get(r,'name','姓名','full_name')||clean(`${first} ${last}`);
          const companyName=get(r,'company','companyraw','公司');
          if(!name||!/microsoft|openai/i.test(companyName)){skipped++;continue;}
          const companyId=/microsoft/i.test(companyName)?'microsoft':'openai';
          const linkedin=canonicalLinkedIn(get(r,'linkedin','linkedinurl','linkedin url','url','profile url'));
          const existing=state.people.find(p=>(linkedin&&p.linkedin===linkedin)||(!linkedin&&p.name===name&&p.companyId===companyId));
          const connectedOn=get(r,'connectedon','connected on','connection date','连接日期');
          const data={name,companyId,teamId:get(r,'teamid','team','团队')||'unknown',title:get(r,'title','position','职位'),location:get(r,'location','地区'),focus:get(r,'focus','方向'),linkedin,github:get(r,'github'),relationshipStatus:get(r,'status','relationshipstatus','关系状态')||(connectedOn?'connected':'watch'),owner:get(r,'owner','负责人'),sourceUrl:get(r,'sourceurl','source url','来源链接')||linkedin,lastVerified:get(r,'lastverified','last verified','最后核验日期')||today(),confidence:get(r,'confidence','可信度')||'review',nextAction:get(r,'nextaction','next action','下一步'),notes:get(r,'notes','备注')};
          if(existing){Object.keys(data).forEach(k=>{if(data[k])existing[k]=data[k];});updated++;}
          else{state.people.push({id:uuid(),interactions:[],...data});added++;}
        }
      }
      save();
      const result=`导入完成：新增 ${added}，更新 ${updated}${skipped?`，跳过 ${skipped}`:''}。`;
      $('#ctImportStatus').textContent=result;e.target.value='';selectView(activeView);alert(result);
    }catch(error){console.error(error);$('#ctImportStatus').textContent='导入失败：请确认文件为 CSV 格式。';e.target.value='';alert('导入失败：请确认文件为 CSV 格式。');}
  };
  $('#ctExport').onclick=()=>{const payload={version:2,exportedAt:new Date().toISOString(),state},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`company-talent-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);};
  $('#ctExportReport').onclick=()=>{const fields=['company','teams','identified','connectRequests','connected','replied','acceptRate','replyRate'],rows=state.companies.map(c=>{const m=metrics(c.id);return[c.name,m.teams,m.identified,m.requests,m.connections,m.replies,m.acceptRate,m.replyRate];}),csv='\ufeff'+[fields,...rows].map(r=>r.map(v=>`"${clean(v).replaceAll('"','""')}"`).join(',')).join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`company-talent-report-${today()}.csv`;a.click();URL.revokeObjectURL(a.href);};
  $('#ctCopyReport').onclick=async()=>{await navigator.clipboard?.writeText(buildReport());alert('企业进展汇报已复制。');};

  // Merge the latest local LinkedIn export. The source file is gitignored and never published.
  for(const item of window.MASTER_LINKED_LINKEDIN_SYNC?.targetPeople||[]){
    const companyId=item.company==='Microsoft'?'microsoft':item.company==='OpenAI'?'openai':'';
    if(!companyId)continue;
    const linkedin=canonicalLinkedIn(item.linkedin),existing=state.people.find(p=>(linkedin&&p.linkedin===linkedin)||(!linkedin&&p.name===item.name&&p.companyId===companyId));
    const research=personResearch[linkedin]||{};
    const data={name:item.name,companyId,teamId:research.teamId||item.team||'unknown',title:research.title||item.title||'',location:research.location||'',focus:research.focus||'',linkedin,relationshipStatus:item.relationshipStatus||'watch',invitationSent:item.invitationSent,connectionConfirmed:item.connectionConfirmed,replyConfirmed:item.replyConfirmed,confidence:research.confidence||item.confidence||'review',lastVerified:item.lastVerified||today(),sourceUrl:linkedin,sourceUrl2:research.sourceUrl2||'',notes:[item.connectedOn&&`连接 ${item.connectedOn}`,item.sentMessages&&`发 ${item.sentMessages}`,item.receivedMessages&&`回 ${item.receivedMessages}`].filter(Boolean).join('；'),linkedinSyncedAt:window.MASTER_LINKED_LINKEDIN_SYNC.generatedAt};
    if(existing){const preservedTeam=existing.userEdited&&existing.teamId?existing.teamId:'';Object.assign(existing,data);if(preservedTeam)existing.teamId=preservedTeam;}else state.people.push({id:uuid(),interactions:[],...data});
  }

  // Keep legacy OpenAI reference matching without making an unverified team assignment.
  state.people.forEach(p=>{if(p.linkedin&&window.OPENAI_REFERENCE_URLS?.has(canonicalLinkedIn(p.linkedin))){p.companyId='openai';const note='OpenAI 身份依据：LinkedIn URL 命中既有公开参考库';if(!clean(p.notes).includes(note))p.notes=[p.notes,note].filter(Boolean).join('\n');}});save();selectView('all');
})();
