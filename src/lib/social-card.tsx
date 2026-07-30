import {ImageResponse} from "next/og";

export const socialImageSize={width:1200,height:630};

export function socialCard(){
  const bars=[44,58,52,72,68,92,108,126];
  const facts=["83 source files","88,422 observations","3 live Dives"];

  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",background:"#f7f5ef",color:"#20242a",fontFamily:"Arial, sans-serif",position:"relative",overflow:"hidden"}}>
      <div style={{display:"flex",position:"absolute",left:"64px",top:"48px",alignItems:"center",gap:"14px",color:"#20242a",fontSize:"23px",fontWeight:700}}>
        <span style={{display:"flex",width:"40px",height:"40px",borderRadius:"10px",alignItems:"center",justifyContent:"center",background:"#ffd84d",fontFamily:"Georgia, serif",fontSize:"26px"}}>D</span>
        <span>DuckDive Gold</span>
      </div>

      <div style={{display:"flex",position:"absolute",left:"64px",top:"146px",width:"780px",flexDirection:"column"}}>
        <div style={{display:"flex",fontFamily:"Georgia, serif",fontSize:"66px",lineHeight:1,letterSpacing:"-3px",color:"#20242a"}}>Explore the market.</div>
        <div style={{display:"flex",fontFamily:"Georgia, serif",fontSize:"66px",lineHeight:1,letterSpacing:"-3px",color:"#1177b8",marginTop:"8px"}}>Keep the meaning.</div>
        <div style={{display:"flex",fontSize:"22px",color:"#687078",marginTop:"28px"}}>Contract-first analytics for Victorian house sales.</div>
      </div>

      <div style={{display:"flex",position:"absolute",left:"64px",bottom:"62px",gap:"12px"}}>
        {facts.map(label=><div key={label} style={{display:"flex",padding:"11px 17px",border:"2px solid #d9d7cf",borderRadius:"99px",color:"#20242a",fontSize:"17px",fontWeight:700}}>{label}</div>)}
      </div>

      <div style={{display:"flex",position:"absolute",right:"55px",top:"72px",width:"270px",height:"480px",borderLeft:"2px solid #d9d7cf",flexDirection:"column",alignItems:"center",justifyContent:"space-between",paddingLeft:"38px"}}>
        <div style={{display:"flex",width:"178px",height:"178px",borderRadius:"999px",alignItems:"center",justifyContent:"center",background:"#d9effc",color:"#1177b8",fontFamily:"Georgia, serif",fontSize:"118px",lineHeight:1,paddingBottom:"12px"}}>⌂</div>
        <div style={{display:"flex",height:"170px",gap:"8px",alignItems:"flex-end",padding:"0 12px 13px",borderBottom:"4px solid #d9d7cf"}}>
          {bars.map((height,index)=><div key={index} style={{display:"flex",width:"18px",height:`${height}px`,background:index===bars.length-1?"#1177b8":"#73bce7",borderRadius:"4px 4px 0 0"}}/>)}
        </div>
      </div>
    </div>,
    socialImageSize,
  );
}
