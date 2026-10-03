import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const executable = process.argv[2]
if (!executable) throw new Error('Pass a Chrome executable')
const base = process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174/'
const profile = await mkdtemp(join(tmpdir(), 'fairy-mobile-play-'))
const browser = spawn(executable, ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], {windowsHide:true,stdio:'ignore'})
const delay = ms => new Promise(resolve => setTimeout(resolve,ms))
let ws
try {
  let tabs
  for (let i=0;i<60;i++) { try { tabs=await(await fetch(`http://127.0.0.1:${(await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]}/json`)).json(); break } catch { await delay(250) } }
  if (!tabs) throw new Error('Browser did not start')
  ws = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject})
  let id=0
  const pending=new Map(), errors=[]
  ws.onmessage=({data})=>{
    const m=JSON.parse(data)
    if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails)
    if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(m.error):p?.resolve(m.result)}
  }
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const key=++id, timeout=setTimeout(()=>{pending.delete(key);reject(new Error(`Timeout: ${method}`))},60000)
    pending.set(key,{resolve:v=>{clearTimeout(timeout);resolve(v)},reject:e=>{clearTimeout(timeout);reject(e)}})
    ws.send(JSON.stringify({id:key,method,params}))
  })
  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
  const assert=async(expression,message)=>{if(!await evaluate(expression))throw new Error(message)}
  await send('Runtime.enable');await send('Page.enable')
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.requestAnimationFrame = cb => { window.stepFrame = cb; return 1 };
    window.pump = (frames=2) => {
      const gl=document.querySelector('#scene canvas').getContext('webgl2');
      const draw=gl.drawElements, instanced=gl.drawElementsInstanced;
      window.frameTime ??= performance.now();
      try { gl.drawElements=()=>{}; gl.drawElementsInstanced=()=>{};
        for(let i=0;i<frames;i++){window.frameTime+=1000/60;window.stepFrame(window.frameTime)}
      } finally { gl.drawElements=draw;gl.drawElementsInstanced=instanced }
    };
  `})
  // Worlds opens a world with its sticker, and a new book opens only Earth, Blossom Haven and the Moon.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('fairy-sticker-book', JSON.stringify({ arrived: ['mars'] }))` })
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5})
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true})
  await send('Page.navigate',{url:new URL('?test',base).href})
  for(let i=0;i<160;i++){if(await evaluate('!!window.__fairyTest'))break;await delay(250)}
  await assert('!!window.__fairyTest','Game failed to initialize')
  await mkdir('artifacts.local/mobile-play',{recursive:true})
  const layouts=[]
  for(const [label,width,height] of [['phone',390,844],['small-phone',320,568],['phone-landscape',844,390],['small-landscape',568,320],['ipad',820,1180],['ipad-landscape',1180,820],['ipad-window',600,820]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true})
    await evaluate('pump()')
    await assert(`(()=>{const r=document.querySelector('#welcome').getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight+1})()`,`${label}: welcome is clipped`)
    await evaluate(`document.querySelector('#begin-button').click();pump()`)
    if (label==='phone') await delay(750)
    await assert(`(()=>{const selectors=['.touch-controls button','.touch-actions button','#menu-toggle','#open-map','#pause-toggle'];return selectors.every(s=>[...document.querySelectorAll(s)].every(b=>{const r=b.getBoundingClientRect();return getComputedStyle(b).visibility==='visible'&&r.width>=48&&r.height>=48&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}))})()`,`${label}: unreachable/small controls`)
    await evaluate('window.frameTime+=17;window.stepFrame(window.frameTime)')
    const shot=await send('Page.captureScreenshot',{format:'png'})
    await writeFile(`artifacts.local/mobile-play/${label}.png`,Buffer.from(shot.data,'base64'))
    layouts.push({label,width,height,controlsReachable:true})
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await evaluate('pump()')
  const point=async(selector,id)=>({...await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`),id})
  const up=await point('[data-key="ArrowUp"]',1),left=await point('[data-key="ArrowLeft"]',2),boost=await point('[data-key="ShiftLeft"]',3)
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[up,left,boost]})
  await evaluate('pump(30)')
  await assert('window.__fairyTest.snapshot().input.length===3 && window.__fairyTest.snapshot().boosted','Multi-touch climb/turn/boost failed')
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[boost]})
  await evaluate('pump()')
  await assert('window.__fairyTest.snapshot().input.length===2 && !window.__fairyTest.snapshot().boosted','Boost release canceled the wrong input')
  await send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]})
  await assert('window.__fairyTest.snapshot().input.length===0','Canceled touch left input held')
  await assert(`(()=>{const e=new Event('selectstart',{bubbles:true,cancelable:true});document.querySelector('.touch-controls').dispatchEvent(e);return e.defaultPrevented})()`,'Long press on the controls can start a selection')
  await assert(`(()=>{const s=getSelection();s.selectAllChildren(document.body);const text=s.toString().trim();s.removeAllRanges();return text===''})()`,'Game text is selectable')
  // Headless Chrome does not pinch-zoom, so check each zoom guard directly.
  await assert(`/maximum-scale=1/.test(document.querySelector('meta[name=viewport]').content) && ['html','body','.game-shell'].every(s=>getComputedStyle(document.querySelector(s)).touchAction==='pan-x pan-y')`,'Double-tap or pinch zoom is allowed')
  await assert(`(()=>{const e=new Event('gesturestart',{bubbles:true,cancelable:true});document.dispatchEvent(e);return e.defaultPrevented})()`,'WebKit pinch gesture is not canceled')
  await evaluate(`window.pinchCanceled=null;window.addEventListener('touchmove',e=>{window.pinchCanceled=e.defaultPrevented},{once:true})`)
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[up,left]})
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...up,x:up.x+30},{...left,x:left.x-30}]})
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await assert('window.pinchCanceled===true','Two-finger move is not canceled')
  await assert('window.__fairyTest.snapshot().input.length===0','Two-finger check left input held')
  await evaluate(`document.querySelector('#hover-toggle').click();pump(30)`)
  await assert('window.__fairyTest.snapshot().hoverHeld && document.querySelector("#speed-value").textContent==="0"','Hover failed')
  await evaluate(`document.querySelector('#hover-toggle').click();pump(30)`)
  await assert('!window.__fairyTest.snapshot().hoverHeld && Number(document.querySelector("#speed-value").textContent)>0','Fly after hover failed')
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[boost]})
  await evaluate(`document.querySelector('#menu-toggle').click();pump()`)
  await assert('window.__fairyTest.snapshot().menuOpen && window.__fairyTest.snapshot().input.length===0','Menu must clear held input')
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await assert('window.__fairyTest.snapshot().menuOpen','Releasing old input dismissed the menu')
  await evaluate('window.beforeMenu=window.__fairyTest.snapshot().elapsed;pump(60)')
  await assert('window.beforeMenu===window.__fairyTest.snapshot().elapsed','Menu advanced play time')
  await evaluate(`document.querySelector('#customize-toggle').click();pump()`)
  await assert('!document.querySelector("#flight-menu").open && document.querySelector("#customizer").classList.contains("is-open")','Customization did not open from menu')
  await evaluate(`document.querySelector('[data-custom="hair"][data-value="bob"]').click();document.querySelector('#customizer-close').click();document.querySelector('#open-map').click();pump()`)
  await assert('document.querySelector("#world-map").open','Worlds did not open from HUD')
  await evaluate(`document.querySelector('[data-world="mars"]').click();document.querySelector('#world-fly').click()`);await delay(50)
  await evaluate('pump()')
  await assert('!window.__fairyTest.snapshot().mapOpen','World travel did not close map')
  await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));pump();Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));pump()`)
  await assert('window.__fairyTest.snapshot().paused && window.__fairyTest.snapshot().input.length===0','Background return must remain paused with no input')
  await evaluate('window.beforePause=window.__fairyTest.snapshot().elapsed;pump(60)')
  await assert('window.beforePause===window.__fairyTest.snapshot().elapsed','Paused game advanced')
  await evaluate(`document.querySelector('#resume-flight').click();pump(5)`)
  await assert('!window.__fairyTest.snapshot().paused && window.__fairyTest.snapshot().elapsed>window.beforePause','Explicit resume failed')
  await evaluate(`window.contextExtension=document.querySelector('#scene canvas').getContext('webgl2').getExtension('WEBGL_lose_context');window.contextExtension.loseContext()`)
  await delay(150)
  await assert('!document.querySelector(".graphics-message").hidden && window.__fairyTest.snapshot().paused','Context loss must pause with recovery feedback')
  await evaluate('window.contextExtension.restoreContext()');await delay(300)
  await assert('document.querySelector(".graphics-message").hidden && window.__fairyTest.snapshot().paused','Context restoration must wait for explicit resume')
  await send('Page.reload');await delay(500)
  for(let i=0;i<160;i++){if(await evaluate('!!window.__fairyTest'))break;await delay(250)}
  await assert('JSON.parse(localStorage.getItem("fairy-look")).hair==="bob" && document.querySelector(\'[data-custom="hair"][data-value="bob"]\').getAttribute("aria-pressed")==="true"','Appearance was not restored')
  const snapshot=await evaluate('window.__fairyTest.snapshot()')
  await writeFile('artifacts.local/mobile-play/results.json',JSON.stringify({layouts,snapshot,errors,method:'Desktop Chrome touch emulation, synthetic visibility change, frozen/controlled animation. Not a hardware performance or WebKit test.'},null,2))
  if(errors.length)throw new Error(JSON.stringify(errors))
  // iPad WebKit can show the page at a scale other than 1, for example in the desktop mode of Chrome.
  // Headless Chrome does not zoom this page, so report a scaled visual viewport inside a 1180×820 layout.
  await send('Emulation.setDeviceMetricsOverride',{width:1180,height:820,deviceScaleFactor:1,mobile:true})
  const scaledView=await send('Page.addScriptToEvaluateOnNewDocument',{source:`const view=Object.assign(new EventTarget(),{offsetLeft:100,offsetTop:68,width:980,height:683,scale:1.2});Object.defineProperty(window,'visualViewport',{configurable:true,get:()=>view})`})
  await send('Page.reload');await delay(500)
  for(let i=0;i<160;i++){if(await evaluate('!!window.__fairyTest'))break;await delay(250)}
  await evaluate(`document.querySelector('#begin-button').click();pump()`)
  const insideView=selector=>`[...document.querySelectorAll(${JSON.stringify(selector)})].every(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=99.5&&r.top>=67.5&&r.right<=1080.5&&r.bottom<=751.5})`
  await assert(`(()=>{const s=document.querySelector('.game-shell').getBoundingClientRect(),c=document.querySelector('#scene canvas').getBoundingClientRect();return [s.left,s.top,s.width,s.height,c.width,c.height].map(Math.round).join()==='100,68,980,683,980,683'})()`,'Scaled view: the shell or the canvas does not fill the visible area')
  await assert(['.touch-controls button','.touch-actions button','#menu-toggle','#open-map','#pause-toggle'].map(insideView).join('&&'),'Scaled view: controls are outside the visible area')
  await evaluate(`document.querySelector('#menu-toggle').click();pump()`)
  await assert(insideView('#flight-menu'),'Scaled view: the menu is outside the visible area')
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:scaledView.identifier})
  if(errors.length)throw new Error(JSON.stringify(errors))
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`const getContext=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:getContext.call(this,type,...args)}`})
  await send('Page.reload');await delay(500)
  for(let i=0;i<80;i++){if(await evaluate('!!document.querySelector("#retry-graphics")'))break;await delay(100)}
  await assert('!!document.querySelector("#retry-graphics") && !document.querySelector("#scene canvas")','Missing WebGL 2 should show a useful fallback')
  if(errors.length)throw new Error(JSON.stringify(errors))
  console.log('Mobile play passed: seven viewports, a scaled iPad view, multi-touch boost/release/cancel, no text selection, zoom guards, hover, menu, saved customization, Worlds, background pause/resume, context recovery and WebGL fallback.')
} finally {ws?.close();browser.kill()}
