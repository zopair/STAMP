import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  DB: D1Database
  SITE_ORIGIN: string
  RESEND_API_KEY: string
  EMAIL_FROM: string
  META_ACCESS_TOKEN: string
  META_PHONE_NUMBER_ID: string
  META_GRAPH_VERSION: string
  SESSION_SECRET: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_MONTHLY: string
  STRIPE_PRICE_YEARLY: string
  STRIPE_PRICE_LIFETIME: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
}
type Vars = { userId: string }
const app = new Hono<{ Bindings: Env; Variables: Vars }>()
const json = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } })
const encoder = new TextEncoder()
async function hash(value: string) { const b = await crypto.subtle.digest('SHA-256', encoder.encode(value)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('') }
function randomCode() { return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6,'0') }
function cookie(name: string, value: string, maxAge: number) { return `${name}=${value}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${maxAge}` }
app.use('/api/*', cors({ origin: (origin, c) => origin === c.env.SITE_ORIGIN ? origin : '', credentials: true, allowMethods: ['GET','POST','OPTIONS'], allowHeaders: ['Content-Type'] }))
app.get('/api/health', c => c.json({ ok: true, service: 'STAMP API', database: 'bound' }))
app.post('/api/auth/request-otp', async c => {
  const body = await c.req.json<{email?:string;phone?:string}>()
  const email = (body.email||'').trim().toLowerCase(), phone = (body.phone||'').replace(/[\s()-]/g,'')
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\+[1-9]\d{7,14}$/.test(phone)) return json('أدخل بريدًا صحيحًا ورقم هاتف دوليًا يبدأ بعلامة +')
  const now = Math.floor(Date.now()/1000), recent = await c.env.DB.prepare('SELECT COUNT(*) n FROM otp_codes WHERE email=? AND created_at>?').bind(email, now-900).first<{n:number}>()
  if ((recent?.n||0)>=3) return json('تم تجاوز عدد المحاولات. حاول بعد 15 دقيقة.',429)
  const code = randomCode(), codeHash = await hash(code + c.env.SESSION_SECRET)
  await c.env.DB.prepare('INSERT INTO otp_codes(email,phone,code_hash,expires_at,created_at) VALUES(?,?,?,?,?)').bind(email,phone,codeHash,now+600,now).run()
  const mail = await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${c.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:c.env.EMAIL_FROM,to:[email],subject:'Your STAMP verification code',html:`<p>Your STAMP verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. Do not share it.</p>`})})
  if (!mail.ok) return json('تعذر إرسال رمز البريد. تحقق من إعداد Resend.',502)
  const wa = await fetch(`https://graph.facebook.com/${c.env.META_GRAPH_VERSION}/${c.env.META_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{Authorization:`Bearer ${c.env.META_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:phone,type:'template',template:{name:'stamp_otp',language:{code:'en'},components:[{type:'body',parameters:[{type:'text',text:code}]}]}})})
  if (!wa.ok) return json('أرسلنا البريد لكن تعذر إرسال WhatsApp. راجع قالب WhatsApp Business المعتمد.',502)
  return c.json({ok:true,expiresIn:600})
})
app.post('/api/auth/verify-otp', async c => {
  const body=await c.req.json<{email?:string;phone?:string;code?:string}>(), email=(body.email||'').trim().toLowerCase(), phone=(body.phone||'').replace(/[\s()-]/g,'')
  if (!email || !phone || !/^\d{6}$/.test(body.code||'')) return json('بيانات التحقق غير مكتملة')
  const now=Math.floor(Date.now()/1000)
  const row=await c.env.DB.prepare('SELECT id,code_hash FROM otp_codes WHERE email=? AND phone=? AND expires_at>? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1').bind(email,phone,now).first<{id:number;code_hash:string}>()
  if (!row || await hash(body.code!+c.env.SESSION_SECRET)!==row.code_hash) return json('رمز التحقق غير صحيح أو منتهي الصلاحية',401)
  await c.env.DB.prepare('UPDATE otp_codes SET consumed_at=? WHERE id=?').bind(now,row.id).run()
  const id=crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO users(id,email,phone,created_at) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET phone=excluded.phone').bind(id,email,phone,now).run()
  const user=await c.env.DB.prepare('SELECT id,email,phone FROM users WHERE email=?').bind(email).first<{id:string;email:string;phone:string}>()
  const token=crypto.randomUUID()+crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await hash(token+c.env.SESSION_SECRET),user!.id,now+2592000).run()
  return new Response(JSON.stringify({ok:true,user}),{headers:{'Content-Type':'application/json','Set-Cookie':cookie('stamp_session',token,2592000)}})
})
app.use('/api/*',async(c,next)=>{
  if (['/api/health','/api/auth/request-otp','/api/auth/verify-otp','/api/billing/webhook'].includes(new URL(c.req.url).pathname)) return next()
  const raw=c.req.header('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('stamp_session='))?.slice(14)
  if(!raw)return json('Authentication required',401)
  const session=await c.env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').bind(await hash(raw+c.env.SESSION_SECRET),Math.floor(Date.now()/1000)).first<{user_id:string}>()
  if(!session)return json('Session expired',401)
  c.set('userId',session.user_id); return next()
})
app.get('/api/me',async c=>{
  const user=await c.env.DB.prepare('SELECT u.id,u.email,u.phone,s.plan,s.status paymentStatus,s.current_period_end renewAt,p.repo_url repoUrl,p.web_url webUrl FROM users u LEFT JOIN subscriptions s ON s.user_id=u.id LEFT JOIN projects p ON p.user_id=u.id WHERE u.id=? ORDER BY s.created_at DESC LIMIT 1').bind(c.get('userId')).first()
  return c.json({user})
})
app.post('/api/billing/checkout',async c=>{
  const {plan}=await c.req.json<{plan:string}>(), price=({monthly:c.env.STRIPE_PRICE_MONTHLY,yearly:c.env.STRIPE_PRICE_YEARLY,lifetime:c.env.STRIPE_PRICE_LIFETIME} as Record<string,string>)[plan]
  if(!price)return json('Unknown plan')
  const user=await c.env.DB.prepare('SELECT email FROM users WHERE id=?').bind(c.get('userId')).first<{email:string}>()
  const form=new URLSearchParams({mode:'payment',success_url:c.env.SITE_ORIGIN+'/?payment=success',cancel_url:c.env.SITE_ORIGIN+'/?payment=cancelled','line_items[0][price]':price,'line_items[0][quantity]':'1',customer_email:user!.email,'client_reference_id':c.get('userId')})
  if(plan!=='lifetime')form.set('mode','subscription')
  const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${c.env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body:form})
  const data=await response.json() as {url?:string;error?:{message?:string}}
  if(!response.ok||!data.url)return json(data.error?.message||'Stripe checkout unavailable',502)
  return c.json({url:data.url})
})
app.post('/api/auth/logout',async c=>{
  const raw=c.req.header('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('stamp_session='))?.slice(14)
  if(raw)await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(raw+c.env.SESSION_SECRET)).run()
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':cookie('stamp_session','',0)}})
})
app.post('/api/billing/webhook',async c=>{
  // Payment state must only be activated after Stripe signature verification.
  // Configure Stripe webhook signing and event reconciliation before accepting paid entitlements.
  return c.json({error:'Webhook verification is not configured; entitlements remain inactive.'},501)
})
app.onError((err,c)=>{console.error('STAMP API error',err);return c.json({error:'Internal server error'},500)})
export default app
