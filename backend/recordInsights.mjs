// Deterministic record insights, filtering and export. No provider calls.
export const INSIGHT_LABELS=["Reimbursement variance concentration", "Audit-readiness and evidence gaps", "Filing and reopening deadline queue"];
export function parseExportFormat(v){return v==="csv"||v==="json"?v:null;}
export function filterRecords(rows,{q="",status="",risk=""}={}){
 const needle=String(q).trim().toLowerCase();
 return (rows||[]).filter(r=>{
  const st=String(r.status??r.state??"");
  if(status && st!==status) return false;
  if(risk && String(r.risk??"")!==risk) return false;
  if(!needle) return true;
  const hay=[r.reference,r.title,r.subject,r.owner,st,r.risk,r.workflow_id,r.feature_id].map(x=>String(x??"").toLowerCase()).join(" ");
  const payload=typeof r.payload==="string"?r.payload:JSON.stringify(r.payload??{});
  return hay.includes(needle)||payload.toLowerCase().includes(needle);
 });
}
function csvCell(v){if(v==null)return "";const s=typeof v==="object"?JSON.stringify(v):String(v);return /[",\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}
export function recordsToCsv(rows){
 const keys=[...new Set((rows||[]).flatMap(r=>Object.keys(r||{})))];
 if(!keys.length) return "reference\n";
 return [keys.join(","),...(rows||[]).map(r=>keys.map(k=>csvCell(r?.[k])).join(","))].join("\n")+"\n";
}
export function buildRecordInsights(rows,labels=INSIGHT_LABELS){
 const list=rows||[]; const amt=r=>{const n=Number(r?.amount);return Number.isFinite(n)?n:0;};
 const total=list.reduce((s,r)=>s+amt(r),0);
 const high=list.filter(r=>["High","Critical"].includes(String(r.risk)));
 const open=list.filter(r=>!["Approved","Closed","closed","complete"].includes(String(r.status??r.state??"")));
 const now=Date.now(); const overdue=open.filter(r=>r.due_date && Date.parse(r.due_date)<now);
 const zero=list.filter(r=>amt(r)===0);
 const mk=(i,items,extra={})=>({id:`insight-${i+1}`,title:labels[i],label:"Deterministic fallback (offline)",aiGenerated:false,generatedBy:"deterministic fallback",count:items.length,amount:items.reduce((s,r)=>s+amt(r),0),references:items.slice(0,5).map(r=>r.reference??""),...extra});
 return {aiGenerated:false,generatedBy:"deterministic fallback",label:"Deterministic fallback (offline)",totalRecords:list.length,totalAmount:total,zeroAmountCount:zero.length,insights:[mk(0,[...list].sort((a,b)=>amt(b)-amt(a)).slice(0,5)),mk(1,high,{openCount:open.length}),mk(2,overdue.length?overdue:open.slice(0,5),{overdueCount:overdue.length,openCount:open.length})]};
}
