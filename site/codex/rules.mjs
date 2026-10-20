export const RULES=Object.freeze({feeBasisPoints:200,drawMinutes:10,payouts:Object.freeze([35,20,12,8,6,5,4,3,2,1])});
export const payoutTotal=RULES.payouts.reduce((a,b)=>a+b,0);
export function calculateEntry(raw){
 const text=String(raw).trim();
 if(!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
 const [whole,fraction=""]=text.split(".");
 const grossCents=Number(whole)*100+Number(fraction.padEnd(2,"0"));
 if(!Number.isSafeInteger(grossCents)||grossCents<1||grossCents>1000000)return null;
 // Illustrative display convention: round the fee to the nearest cent.
 // Final on-chain precision and rounding are not specified by the draft.
 const feeCents=Math.round(grossCents*RULES.feeBasisPoints/10000);
 return {grossCents,feeCents,netCents:grossCents-feeCents};
}
export const money=cents=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);
export const ordinal=n=>n===1?"1st":n===2?"2nd":n===3?"3rd":n+"th";

