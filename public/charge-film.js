export const CHARGE_FILM_DURATION=8.4;
const ease=t=>{if(t<=0)return 0;if(t>=1-1e-12)return 1;return Math.max(0,Math.min(1,t*t*t*(t*(t*6-15)+10)));};
// One clock directs the camera and connector so neither can run ahead of the other.
export function chargeFilmAt(seconds){
 const t=Math.max(0,seconds);
 return {
  stage:t<.8?'wide':t<3.2?'approach':t<4.6?'insert':t<6.2?'hold':t<8.4?'return':'done',
  close:ease((t-.8)/2.4),
  retreat:ease((t-6.2)/2.2),
  approach:ease((t-.8)/2.4),
  insertion:ease((t-3.2)/1.4),
  seated:t>=4.6,
  done:t>=CHARGE_FILM_DURATION
 };
}
