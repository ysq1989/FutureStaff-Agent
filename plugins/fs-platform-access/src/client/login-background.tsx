import { createElement } from 'react'

// Fixed geometry stays stable across login phase changes.
const nodes = [[65,145],[205,85],[325,210],[110,330],[270,415],[405,340],[95,590],[305,650],[420,520],[845,115],[1010,80],[1160,225],[810,300],[990,360],[1135,440],[855,570],[1040,655],[1175,590]] as const
const connections = [[0,1],[1,2],[0,3],[2,3],[2,5],[3,4],[4,5],[3,6],[4,7],[5,8],[6,7],[7,8],[9,10],[10,11],[9,12],[11,13],[12,13],[13,14],[12,15],[13,15],[14,17],[15,16],[16,17]] as const

export function LoginBackground() {
  return createElement('div', { className: 'fs-login-scene', 'aria-hidden': true },
    createElement('div', { className: 'fs-login-glow' }),
    createElement('div', { className: 'fs-login-grid' }),
    createElement('svg', { className: 'fs-login-network', viewBox: '0 0 1240 760', preserveAspectRatio: 'xMidYMid slice', focusable: 'false' },
      createElement('g', { className: 'fs-login-links' }, connections.map(([from, to], index) =>
        createElement('line', { key: index, x1: nodes[from][0], y1: nodes[from][1], x2: nodes[to][0], y2: nodes[to][1] }))),
      ...nodes.map(([cx, cy], index) => createElement('g', { key: index },
        createElement('circle', { className: 'fs-login-node-halo', cx, cy, r: 15, style: { animationDelay: `${index % 6 * -1.4}s` } }),
        createElement('circle', { className: 'fs-login-node', cx, cy, r: index % 3 === 0 ? 3.5 : 2.5 }))),
    ),
    createElement('div', { className: 'fs-login-orbit' }),
  )
}

export const loginBackgroundCss = `
.futurestaff-login-gate{isolation:isolate;align-content:center}
.futurestaff-login-gate>.futurestaff-access{position:relative;z-index:1;margin:auto}
.fs-login-scene{position:fixed;inset:0;overflow:hidden;pointer-events:none;color:var(--accent-primary);z-index:0}
.fs-login-glow{position:absolute;inset:-15%;background:radial-gradient(ellipse at 18% 30%,color-mix(in srgb,var(--accent-primary) 20%,transparent),transparent 42%),radial-gradient(ellipse at 85% 70%,color-mix(in srgb,var(--accent-primary) 16%,transparent),transparent 44%);animation:fs-login-drift 20s ease-in-out infinite alternate}
.fs-login-grid{position:absolute;inset:0;opacity:.1;background-image:linear-gradient(currentColor 1px,transparent 1px),linear-gradient(90deg,currentColor 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(ellipse at center,transparent 20%,black 85%)}
.fs-login-network{position:absolute;width:100%;height:100%;opacity:.55;animation:fs-login-drift 26s ease-in-out infinite alternate-reverse}
.fs-login-links{stroke:currentColor;stroke-width:1;opacity:.28}
.fs-login-node{fill:currentColor;opacity:.75}
.fs-login-node-halo{fill:currentColor;opacity:.08;transform-box:fill-box;transform-origin:center;animation:fs-login-pulse 8s ease-in-out infinite}
.fs-login-orbit{position:absolute;width:min(82vw,920px);aspect-ratio:1;left:50%;top:50%;border:1px solid color-mix(in srgb,currentColor 12%,transparent);border-radius:50%;transform:translate(-50%,-50%)}
.fs-login-orbit::before{content:'';position:absolute;inset:-28px;border:1px dashed color-mix(in srgb,currentColor 16%,transparent);border-radius:50%;animation:fs-login-orbit 100s linear infinite}
.futurestaff-login-gate .fs-state-copy>svg{justify-self:center}
@keyframes fs-login-drift{from{transform:translate3d(-1%,-1%,0)}to{transform:translate3d(1%,2%,0)}}
@keyframes fs-login-pulse{0%,100%{transform:scale(.6);opacity:.05}50%{transform:scale(1.3);opacity:.16}}
@keyframes fs-login-orbit{to{transform:rotate(360deg)}}
@media(max-width:640px){.fs-login-network{opacity:.3}.fs-login-orbit{width:130vw}.futurestaff-login-gate{padding:20px}}
@media(prefers-reduced-motion:reduce){.fs-login-scene *,.fs-login-scene *::before{animation:none!important}}
`
