import {ImageResponse} from "next/og";

export const socialImageSize={width:1200,height:630};

export function socialCard(){
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",position:"relative",overflow:"hidden",background:"#17120d",color:"#f1d589",fontFamily:"Arial, sans-serif"}}>
      <div style={{display:"flex",position:"absolute",width:"540px",height:"540px",right:"-40px",top:"-180px",borderRadius:"999px",background:"#df5724",opacity:.82}}/>
      <div style={{display:"flex",position:"absolute",width:"250px",height:"250px",right:"105px",top:"55px",borderRadius:"999px",background:"#e7bd48"}}/>
      <div style={{display:"flex",position:"absolute",left:"0",right:"0",bottom:"0",height:"150px",background:"#58bbe3"}}/>
      <div style={{display:"flex",position:"absolute",left:"0",right:"0",bottom:"88px",height:"78px",borderRadius:"50% 50% 0 0",background:"#fff8e8",opacity:.92}}/>
      <div style={{display:"flex",position:"absolute",left:"66px",top:"218px",alignItems:"baseline",letterSpacing:"-5px"}}>
        <span style={{fontSize:"88px",fontWeight:800}}>DuckDive</span>
        <span style={{marginLeft:"7px",fontSize:"30px",fontWeight:800,color:"#df5724",letterSpacing:"-1px"}}>.gold</span>
      </div>
    </div>,
    socialImageSize,
  );
}
