import {gtBackers, GT_RENDERER_VERSION} from '../public/cards/gt-backers.js';
import {API_SECURITY_HEADERS} from './community/security.js';

const escapeXML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const finite = value => typeof value === 'number' && Number.isFinite(value);
function outline(component, {x, y, width, height, align = 'center', scale = true}) {
  const bounds = component?.bounds;
  if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(finite) || bounds[2] <= 0 || bounds[3] <= 0 ||
      !Array.isArray(component.paths) || !component.paths.length || component.paths.length > 500 ||
      ![x,y,width,height].every(finite) || width <= 0 || height <= 0) throw Error('Invalid native backer component.');
  const [left,top,w,h] = bounds;
  const s = scale ? Math.min(1,width/w,height/h) : 1;
  if (!scale && (w > width + 0.01 || h > height + 0.01)) throw Error('Backer power text does not fit the approved power box.');
  const tx = align === 'right' ? x+width-w*s : x+(width-w*s)/2;
  const ty = align === 'top' ? y : y+(height-h*s)/2;
  const paths = component.paths.map(path => {
    if (!path || typeof path.d !== 'string' || path.d.length > 1000000 || !/^[MmZzLlHhVvCcSsQqTtAa0-9eE+.,\s-]+$/.test(path.d) || !/^#[a-f0-9]{6}$/i.test(path.fill)) throw Error('Invalid native vector path.');
    return `<path d="${path.d}" fill="${path.fill}" fill-rule="${path.fillRule === 'evenodd' ? 'evenodd' : 'nonzero'}"/>`;
  }).join('');
  return `<g transform="translate(${tx} ${ty}) scale(${s}) translate(${-left} ${-top})">${paths}</g>`;
}

export function renderGTComposite(resolved, baseDataURI, download = false) {
  if (!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(baseDataURI)) throw Error('Invalid base card image.');
  const {card,backer,inherit,native,render,stages} = resolved;
  const rows = render.stageSlots;
  if (!Array.isArray(rows) || rows.length !== stages.length) throw Error('GT stage slots do not match the printed card.');
  let overlay = '';
  for (const i of inherit.stages) overlay += outline(native.stages[i], {...rows[i],align:'right'});
  if (inherit.pur) overlay += outline(native.pur, render.pur);
  if (inherit.power) overlay += outline(native.power, {...render.power,align:'top',scale:false});
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${download?2120:1060}" height="${download?2968:1484}" viewBox="0 0 1060 1484" role="img"><title>${escapeXML(card.name)} — ${escapeXML(backer.name)}</title><image width="1060" height="1484" href="${baseDataURI}"/>${overlay}</svg>`;
}
function toBase64(bytes) {
  let binary = '';
  for (let i=0;i<bytes.length;i+=16384) binary += String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(binary);
}
const reply = (status,message) => Response.json({error:message},{status,headers:{...API_SECURITY_HEADERS,'Cache-Control':'no-store'}});
export async function gtCompositeRequest(request, {loadAsset,cache,context,system=gtBackers} = {}) {
  if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  const url = new URL(request.url), hi = url.searchParams.get('hiTech'), backing = url.searchParams.get('backer'), tokui = url.searchParams.get('tokui') || '';
  if (!hi || !backing || hi.length>160 || backing.length>160 || tokui.length>30) return reply(400,'Choose a Hi-Tech and Backer.');
  let resolved;
  try { resolved=system.resolve(hi,backing,tokui); } catch(e) { return reply(400,e.message); }
  const download=url.searchParams.get('size')==='download';
  const source=download?resolved.card.downloadImage:resolved.card.image;
  const identity=JSON.stringify([GT_RENDERER_VERSION,resolved.card.gtHiTech,resolved.backer.gtBacker,source,download]);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity)))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const etag=`"${hash}"`,headers={...API_SECURITY_HEADERS,'Content-Type':'image/svg+xml; charset=utf-8',ETag:etag,
    'Cache-Control':'public, max-age=300','Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'none'; sandbox",'X-Content-Type-Options':'nosniff'};
  if (request.headers.get('If-None-Match')===etag) return new Response(null,{status:304,headers});
  const cacheKey=new Request(url.origin+'/__gt_composite_cache/'+hash);
  if (cache) {
    const hit=await cache.match(cacheKey).catch(()=>null);
    if (hit) return new Response(request.method==='HEAD'?null:hit.body,{headers});
  }
  try {
    const asset=await loadAsset(new Request(new URL(source,url.origin)));
    if (!asset.ok || !asset.headers.get('Content-Type')?.startsWith('image/webp')) return reply(503,'The base card image is temporarily unavailable.');
    const declared=Number(asset.headers.get('Content-Length')||0);
    if (declared>16*1024*1024) return reply(503,'The base card image exceeds the render limit.');
    const bytes=new Uint8Array(await asset.arrayBuffer());
    if (bytes.length>16*1024*1024) return reply(503,'The base card image exceeds the render limit.');
    const svg=renderGTComposite(resolved,'data:image/webp;base64,'+toBase64(bytes),download);
    const rendered=new Response(svg,{headers});
    if (cache && context?.waitUntil) context.waitUntil(cache.put(cacheKey,rendered.clone()).catch(()=>{}));
    return request.method==='HEAD'?new Response(null,{headers}):rendered;
  } catch { return reply(503,'This combination is awaiting its approved image components.'); }
}
