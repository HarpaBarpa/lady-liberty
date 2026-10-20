import {RULES,payoutTotal,calculateEntry,money,ordinal} from "./rules.mjs";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
$$("[data-fee]").forEach(el=>el.textContent=RULES.feeBasisPoints/100+"%");
$$("[data-interval]").forEach(el=>el.textContent=RULES.drawMinutes+" minutes");
$$("[data-total]").forEach(el=>el.textContent=payoutTotal+"%");
$$("[data-remainder]").forEach(el=>el.textContent=(100-payoutTotal)+"%");
$(".weight-track span").style.width=(100-RULES.feeBasisPoints/100)+"%";
const menu=$(".menu-toggle"),nav=$("#main-nav");
function setMenu(open){menu.setAttribute("aria-expanded",String(open));nav.classList.toggle("open",open);}
menu.addEventListener("click",()=>setMenu(menu.getAttribute("aria-expanded")!=="true"));
nav.addEventListener("click",event=>{if(event.target.closest("a"))setMenu(false);});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&menu.getAttribute("aria-expanded")==="true"){setMenu(false);menu.focus();}});
document.addEventListener("click",event=>{if(!event.target.closest(".site-header"))setMenu(false);});
const assetInfo={
 AAPLx:"AAPLx represents a tokenized Apple holding in this concept.",
 NVDAx:"NVDAx represents a tokenized NVIDIA holding in this concept.",
 TSLAx:"TSLAx represents a tokenized Tesla holding in this concept.",
 SPYx:"SPYx represents a tokenized S&P 500 fund holding in this concept."
};
$$("[data-asset]").forEach(button=>button.addEventListener("click",()=>{
 $$("[data-asset]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
 $("#asset-explanation").textContent=assetInfo[button.dataset.asset]+" The live allow-list will be confirmed before launch.";
}));
const amount=$("#deposit-amount"),error=$("#amount-error");
function updateCalculator(){
 const result=calculateEntry(amount.value);
 amount.setAttribute("aria-invalid",String(!result));
 error.hidden=!!result;
 error.textContent=result?"":"Enter a value from $0.01 to $10,000, with at most two decimal places.";
 $("#fee-value").textContent=result?"−"+money(result.feeCents):"—";
 $("#net-value").textContent=result?money(result.netCents):"—";
 $(".weight-track").style.opacity=result?"1":".3";
 $$("[data-preset]").forEach(button=>button.setAttribute("aria-pressed",String(result?.grossCents===Number(button.dataset.preset)*100)));
}
amount.addEventListener("input",updateCalculator);
$$("[data-preset]").forEach(button=>button.addEventListener("click",()=>{amount.value=button.dataset.preset;updateCalculator();}));
updateCalculator();
const rows=$("#payout-rows");
RULES.payouts.forEach((share,index)=>{
 const button=document.createElement("button");
 button.className="payout-row";button.type="button";button.dataset.rank=String(index+1);
 button.setAttribute("aria-pressed",String(index===0));button.setAttribute("aria-label",ordinal(index+1)+" place, "+share+" percent draft share");
 button.innerHTML='<span>'+ordinal(index+1)+'</span><span class="payout-track" aria-hidden="true"><span style="--share:'+(share/RULES.payouts[0]*100)+'%"></span></span><span>'+share+'%</span>';
 button.addEventListener("click",()=>{
  $$(".payout-row").forEach(row=>row.setAttribute("aria-pressed",String(row===button)));
  $("#selected-rank").textContent=ordinal(index+1)+" place, draft share";
  $("#selected-share").textContent=share+"%";
  $("#share-sentence").textContent="A "+share+"% share of every asset in the prize vault.";
 });
 rows.append(button);
});
const quips=["I’m only here to diversify the breadcrumbs.","Copper hands? I have excellent claws.","The vault is empty. My snack fund understands."];
let quipIndex=0;
$("#pigeon-button").addEventListener("click",()=>{
 const bubble=$("#pigeon-quip");bubble.hidden=false;bubble.textContent=quips[quipIndex++%quips.length];
});
const dialog=$("#launch-dialog");let opener=null;
$$("[data-open-launch]").forEach(button=>button.addEventListener("click",()=>{opener=button;dialog.showModal();}));
$(".dialog-close").addEventListener("click",()=>dialog.close());
$(".dialog-done").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener("close",()=>opener?.focus());

