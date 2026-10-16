export const fashionPreviewCss=`
.fs-fashion-gallery{margin:16px 0;color:var(--text-primary);container-type:inline-size}
.fs-fashion-gallery__head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px}
.fs-fashion-gallery__head h3{margin:0;font-size:14px;font-weight:600}
.fs-fashion-gallery__head span{font-size:12px;color:var(--text-tertiary)}
.fs-fashion-gallery__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr));gap:12px}
.fs-fashion-card{margin:0;min-width:0;border:1px solid var(--border-default);border-radius:8px;overflow:hidden;background:var(--bg-secondary)}
.fs-fashion-card__head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px;font-size:13px;font-weight:600}
.fs-fashion-card__head figcaption{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fs-fashion-badge{flex:none;font-size:11px;font-weight:400;padding:3px 7px;border-radius:4px;background:var(--bg-tertiary);color:var(--text-secondary)}
.fs-fashion-card__media{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:4/5;background:var(--bg-tertiary);border:0;padding:8px;box-sizing:border-box;cursor:zoom-in}
.fs-fashion-card__media img{display:block;width:100%;height:100%;object-fit:contain}
.fs-fashion-card__media p{font-size:12px;color:var(--text-secondary);padding:16px;text-align:center}
.fs-fashion-card__body{padding:12px}
.fs-fashion-card__meta{font-size:11px;color:var(--text-tertiary);margin:0 0 8px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.fs-fashion-card__actions{display:flex;gap:8px;flex-wrap:wrap}
.fs-fashion-button{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:32px;flex:1;padding:5px 10px;font:inherit;font-size:12px;border:1px solid var(--border-default);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);cursor:pointer;white-space:nowrap}
.fs-fashion-button:hover{background:var(--bg-hover)}
.fs-fashion-button--primary{background:var(--fs-button-start);color:var(--fs-on-accent);border-color:var(--fs-button-start)}
.fs-fashion-button--primary:hover{background:var(--fs-button-end)}
.fs-fashion-button:disabled{opacity:.55;cursor:wait}
.fs-fashion-button:focus-visible,.fs-fashion-card__media:focus-visible{outline:2px solid var(--accent-primary);outline-offset:2px}
.fs-fashion-card__note{font-size:11px;color:var(--text-secondary);margin:8px 0 0;overflow-wrap:anywhere}
.fs-fashion-card__error{font-size:12px;color:var(--error);white-space:pre-wrap;overflow-wrap:anywhere;padding:12px}
.fs-fashion-dialog{width:min(960px,92vw);max-height:90vh;box-sizing:border-box;padding:16px;border:1px solid var(--border-default);border-radius:12px;background:var(--bg-elevated);color:var(--text-primary)}
.fs-fashion-dialog::backdrop{background:var(--fs-shadow)}
.fs-fashion-dialog__head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:16px}
.fs-fashion-dialog__head .fs-fashion-button{flex:none}
.fs-fashion-dialog__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.fs-fashion-dialog__grid--single{grid-template-columns:1fr}
.fs-fashion-dialog figure{margin:0;min-width:0}
.fs-fashion-dialog figcaption{font-size:12px;color:var(--text-secondary);margin:0 0 8px}
.fs-fashion-dialog img{display:block;width:100%;height:min(62vh,650px);object-fit:contain;background:var(--bg-tertiary)}
.fs-fashion-dialog__note{font-size:12px;color:var(--text-secondary);margin-bottom:0}
@container(max-width:560px){.fs-fashion-gallery__grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.fs-fashion-card__head,.fs-fashion-card__body{padding:8px}.fs-fashion-card__actions{flex-direction:column}.fs-fashion-button{min-height:44px}.fs-fashion-gallery__head{align-items:flex-start;flex-direction:column;gap:4px}}
@container(max-width:360px){.fs-fashion-gallery__grid{grid-template-columns:1fr}}
@media(max-width:560px){.fs-fashion-dialog__grid{grid-template-columns:1fr}.fs-fashion-dialog img{height:38vh}}
`
