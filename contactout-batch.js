(()=>{
  const $=selector=>document.querySelector(selector);
  const csvRows=text=>{
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1];if(ch==='"'){if(quoted&&next==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell=''}else cell+=ch}
    row.push(cell);if(row.some(value=>value.trim()))rows.push(row);return rows;
  };
  const cleanUrl=value=>{const match=String(value||'').trim().match(/https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[^\s,?"#]+/i);return match?match[0].replace(/\/+$/,''):''};
  const esc=value=>String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const csvCell=value=>`"${String(value??'').replaceAll('"','""')}"`;
  let people=[],finalRows=[];
  const status=message=>{const node=$('#coBatchStatus');if(node)node.textContent=message};
  const download=(name,rows)=>{const blob=new Blob(['\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)};
  const collect=async()=>{
    const values=[],$file=$('#coLinkedinFile'),pasted=$('#coLinkedinPaste')?.value||'';
    if($file?.files[0])csvRows(await $file.files[0].text()).flat().forEach(value=>values.push(value));
    pasted.split(/\s+/).forEach(value=>values.push(value));
    people=[...new Set(values.map(cleanUrl).filter(Boolean))].map(linkedin=>({linkedin,personal_email:'未公开',status:'未找到'}));
    return people;
  };
  $('#coBuildUploadCsv')?.addEventListener('click',async()=>{await collect();if(!people.length){status('⚠ 没有识别到有效的 LinkedIn 个人主页链接。');return}download('contactout-linkedin-upload.csv',[['linkedin_url'],...people.map(item=>[item.linkedin])]);status(`✓ 已识别并去重 ${people.length} 个 LinkedIn 链接，上传文件已下载。`) });
  $('#coMergeReturned')?.addEventListener('click',async()=>{
    if(!people.length)await collect();const file=$('#coReturnedFile')?.files[0];if(!people.length){status('⚠ 请先导入 LinkedIn 名单。');return}if(!file){status('⚠ 请选择 ContactOut 返回的 CSV。');return}
    const rows=csvRows(await file.text());if(rows.length<2){status('⚠ CSV 没有数据。');return}const headers=rows.shift().map(value=>value.trim().toLowerCase().replace(/[\s-]+/g,'_'));
    const find=(names)=>headers.findIndex(header=>names.includes(header)),urlAt=find(['linkedin_url','linkedin','profile_url','url']),emailAt=find(['personal_email','personal_emails','personalemail','personal_email_address']),nameAt=find(['name','full_name','fullname']);
    if(emailAt<0){status('⚠ 没找到 personal_email 列。请确认上传的是 ContactOut 返回文件。');return}
    const returned=new Map();rows.forEach(row=>{const url=urlAt>=0?cleanUrl(row[urlAt]):'',email=String(row[emailAt]||'').trim(),name=nameAt>=0?String(row[nameAt]||'').trim():'';if(url)returned.set(url.toLowerCase(),{email,name})});
    finalRows=people.map(item=>{const found=returned.get(item.linkedin.toLowerCase()),email=found?.email||'';return {name:found?.name||'',linkedin:item.linkedin,personal_email:email||'未公开',status:email?'已找到':'未找到'}});
    const foundCount=finalRows.filter(item=>item.status==='已找到').length;$('#coEmailResults').innerHTML=`<div class="co-table-wrap"><table class="co-table"><thead><tr><th>姓名</th><th>LinkedIn</th><th>私人邮箱</th><th>状态</th></tr></thead><tbody>${finalRows.map(item=>`<tr><td>${esc(item.name)||'—'}</td><td><a href="${esc(item.linkedin)}" target="_blank" rel="noopener">打开</a></td><td>${esc(item.personal_email)}</td><td>${esc(item.status)}</td></tr>`).join('')}</tbody></table></div>`;$('#coExportPersonalEmails').disabled=false;status(`✓ 已合并 ${finalRows.length} 人：找到 ${foundCount} 个私人邮箱，${finalRows.length-foundCount} 人标记为“未公开”。`)
  });
  $('#coExportPersonalEmails')?.addEventListener('click',()=>{if(finalRows.length)download('contactout-personal-emails.csv',[['name','linkedin_url','personal_email','status'],...finalRows.map(item=>[item.name,item.linkedin,item.personal_email,item.status])])});
})();
