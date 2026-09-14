(()=>{
  const $=selector=>document.querySelector(selector);
  const split=value=>String(value||'').split(/[,，\n]/).map(item=>item.trim()).filter(Boolean);
  const build=()=>{
    const titles=split($('#coJobTitles')?.value),locations=split($('#coLocations')?.value),companies=split($('#coCompanies')?.value),skills=split($('#coSkills')?.value),limit=Number($('#coLimit')?.value)||25,reveal=$('#coReveal')?.checked;
    const status=$('#contactoutPromptStatus');
    if(!titles.length&&!skills.length){if(status)status.textContent='⚠ 请至少填写职位关键词或技能关键词。';status?.scrollIntoView({behavior:'smooth',block:'center'});return ''}
    const criteria=[];
    if(titles.length)criteria.push(`职位关键词：${titles.join('、')}`);
    if(locations.length)criteria.push(`地区：${locations.join('、')}`);
    if(companies.length)criteria.push(`当前公司：${companies.join('、')}`);
    if(skills.length)criteria.push(`技能：${skills.join('、')}`);
    return `请实际调用 ContactOut MCP 的 people-search 工具批量搜索候选人。\n筛选条件：\n- ${criteria.join('\n- ')}\n- 最多返回：${limit} 人\n- reveal_info：${reveal?'true（返回可用的邮箱和电话；允许消耗联系方式额度）':'false（不要揭示邮箱或电话）'}\n\n必须原样使用 ContactOut 工具的真实返回值，不要猜测、虚构或补全任何候选人和链接。如果工具不可用或没有结果，请直接说明。最后只输出一个 JSON 数组，不要 Markdown 代码块，不要解释。每位候选人使用这些字段：full_name, title, company, location, li_vanity, work_email, personal_email, phone, skills。没有值时使用空字符串；skills 使用字符串数组。`;
  };
  const button=$('#buildContactoutPrompt'),output=$('#contactoutPrompt'),status=$('#contactoutPromptStatus');
  if(!button||!output)return;
  button.addEventListener('click',async()=>{
    const prompt=build();if(!prompt)return;
    output.value=prompt;
    let copied=false;
    try{await navigator.clipboard.writeText(prompt);copied=true}catch{}
    if(status)status.textContent=copied?'✓ 已生成并复制。请到 ChatGPT 中选择 @ContactOut 后粘贴发送。':'✓ 指令已生成，请在下方手动复制。';
    button.textContent=copied?'✓ 已生成并复制':'✓ 已生成';
    output.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>button.textContent='生成并复制搜索指令',2500);
  });
})();
