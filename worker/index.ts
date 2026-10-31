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
  BINANCE_PAY_API_KEY: string
  BINANCE_PAY_SECRET_KEY: string
  BINANCE_PAY_PUBLIC_KEY: string
  INSTAPAY_RECIPIENT: string
  ADMIN_REVIEW_SECRET: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
}
type Vars = { userId: string }
const app = new Hono<{ Bindings: Env; Variables: Vars }>()
const json = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } })
const encoder = new TextEncoder()
async function hash(value: string) { const b = await crypto.subtle.digest('SHA-256', encoder.encode(value)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('') }
async function allowOtpRequest(db: D1Database, scope: 'email'|'phone'|'ip', subject: string, limit: number, now: number, secret: string) {
  const subjectHash = await hash(subject + secret)
  const row = await db.prepare(`INSERT INTO otp_rate_limits(scope,subject_hash,window_start,request_count)
    VALUES(?,?,?,1)
    ON CONFLICT(scope,subject_hash) DO UPDATE SET
      window_start=CASE WHEN otp_rate_limits.window_start<=excluded.window_start-900 THEN excluded.window_start ELSE otp_rate_limits.window_start END,
      request_count=CASE WHEN otp_rate_limits.window_start<=excluded.window_start-900 THEN 1 ELSE otp_rate_limits.request_count+1 END
    RETURNING request_count`).bind(scope,subjectHash,now).first<{request_count:number}>()
  return (row?.request_count ?? limit+1) <= limit
}
async function signBinanceRequest(timestamp: string, nonce: string, body: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}\n${nonce}\n${body}\n`))
  return [...new Uint8Array(signature)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase()
}
function constantTimeEqual(a: string, b: string) {
  const aa=encoder.encode(a), bb=encoder.encode(b)
  let diff=aa.length ^ bb.length
  for(let i=0;i<Math.max(aa.length,bb.length);i++) diff |= (aa[i]||0) ^ (bb[i]||0)
  return diff===0
}
async function verifyBinanceWebhook(body: string, timestamp: string, nonce: string, signature: string, pem: string) {
  const clean=pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g,'')
  const binary=atob(clean), der=Uint8Array.from(binary,ch=>ch.charCodeAt(0))
  const key=await crypto.subtle.importKey('spki',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify'])
  const sig=Uint8Array.from(atob(signature),ch=>ch.charCodeAt(0))
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,sig,encoder.encode(`${timestamp}\n${nonce}\n${body}\n`))
}
async function activateSubscription(db: D1Database, userId: string, plan: string, now: number, paymentOrderId: string) {
  const end=plan==='monthly'?now+30*86400:plan==='yearly'?now+365*86400:null
  await db.prepare("INSERT INTO subscriptions(id,user_id,plan,status,current_period_end,created_at,payment_order_id) VALUES(?,?,?,'active',?,?,?) ON CONFLICT(payment_order_id) DO NOTHING")
    .bind(crypto.randomUUID(),userId,plan,end,now,paymentOrderId).run()
}
function randomCode() { return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6,'0') }
function cookie(name: string, value: string, maxAge: number) { return `${name}=${value}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${maxAge}` }
app.use('/api/*', cors({ origin: (origin, c) => origin === c.env.SITE_ORIGIN ? origin : '', credentials: true, allowMethods: ['GET','POST','OPTIONS'], allowHeaders: ['Content-Type'] }))
app.get('/api/health', c => c.json({ ok: true, service: 'STAMP API', database: 'bound' }))
app.post('/api/auth/request-otp', async c => {
  const body = await c.req.json<{email?:string;phone?:string}>()
  const email = (body.email||'').trim().toLowerCase(), phone = (body.phone||'').replace(/[\s()-]/g,'')
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\+[1-9]\d{7,14}$/.test(phone)) return json('أدخل بريدًا صحيحًا ورقم هاتف دوليًا يبدأ بعلامة +')
  const now = Math.floor(Date.now()/1000)
  const ip = c.req.header('CF-Connecting-IP') || ''
  const checks = await Promise.all([
    allowOtpRequest(c.env.DB,'email',email,3,now,c.env.SESSION_SECRET),
    allowOtpRequest(c.env.DB,'phone',phone,3,now,c.env.SESSION_SECRET),
    ...(ip ? [allowOtpRequest(c.env.DB,'ip',ip,15,now,c.env.SESSION_SECRET)] : [])
  ])
  if (checks.some(allowed=>!allowed)) return json('تم تجاوز عدد المحاولات. حاول بعد 15 دقيقة.',429)
  await Promise.all([
    c.env.DB.prepare('DELETE FROM otp_codes WHERE created_at<?').bind(now-86400).run(),
    c.env.DB.prepare('DELETE FROM otp_rate_limits WHERE window_start<?').bind(now-86400).run()
  ])
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
  const row=await c.env.DB.prepare('SELECT id,code_hash,attempts FROM otp_codes WHERE email=? AND phone=? AND expires_at>? AND consumed_at IS NULL AND attempts<5 ORDER BY id DESC LIMIT 1').bind(email,phone,now).first<{id:number;code_hash:string;attempts:number}>()
  if (!row) return json('رمز التحقق غير صحيح أو منتهي الصلاحية',401)
  if (await hash(body.code!+c.env.SESSION_SECRET)!==row.code_hash) {
    await c.env.DB.prepare('UPDATE otp_codes SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND attempts<5').bind(row.id).run()
    return json('رمز التحقق غير صحيح أو منتهي الصلاحية',401)
  }
  const consumed=await c.env.DB.prepare('UPDATE otp_codes SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND expires_at>? AND attempts<5').bind(now,row.id,now).run()
  if ((consumed.meta?.changes||0)!==1) return json('تم استخدام الرمز بالفعل. اطلب رمزًا جديدًا.',409)
  const id=crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO users(id,email,phone,created_at) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET phone=excluded.phone').bind(id,email,phone,now).run()
  const user=await c.env.DB.prepare('SELECT id,email,phone FROM users WHERE email=?').bind(email).first<{id:string;email:string;phone:string}>()
  const token=crypto.randomUUID()+crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await hash(token+c.env.SESSION_SECRET),user!.id,now+2592000).run()
  return new Response(JSON.stringify({ok:true,user}),{headers:{'Content-Type':'application/json','Set-Cookie':cookie('stamp_session',token,2592000)}})
})
app.use('/api/*',async(c,next)=>{
  if (['/api/health','/api/auth/request-otp','/api/auth/verify-otp','/api/billing/binance/webhook','/api/admin/payments/instapay/review'].includes(new URL(c.req.url).pathname)) return next()
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
const planPrices = { monthly: 5, yearly: 50, lifetime: 100 } as const
app.post('/api/billing/intent', async c => {
  const body=await c.req.json<{plan?:string;method?:string}>()
  const plan=body.plan as keyof typeof planPrices
  const method=body.method
  if (!(plan in planPrices) || !['binance','instapay'].includes(method||'')) return json('خطة أو وسيلة دفع غير صحيحة')
  const usd=planPrices[plan], egp=usd*55, now=Math.floor(Date.now()/1000), id=crypto.randomUUID()
  const merchantTradeNo=id.replace(/-/g,'').slice(0,32)
  if (method==='binance') {
    if (!c.env.BINANCE_PAY_API_KEY || !c.env.BINANCE_PAY_SECRET_KEY) return json('الدفع عبر Binance Pay غير مهيأ بعد. لم يتم إنشاء طلب أو تحصيل أي مبلغ.',503)
    const timestamp=String(Date.now()), nonce=crypto.randomUUID().replace(/-/g,'')
    const payload=JSON.stringify({
      env:{terminalType:'WEB'},merchantTradeNo,orderAmount:usd,currency:'USDT',
      description:`STAMP ${plan} subscription`,
      goodsDetails:[{goodsType:'02',goodsCategory:'D000',referenceGoodsId:id,goodsName:`STAMP ${plan}`,goodsDetail:'Digital evidence subscription'}]
    })
    const signature=await signBinanceRequest(timestamp,nonce,payload,c.env.BINANCE_PAY_SECRET_KEY)
    const response=await fetch('https://bpay.binanceapi.com/binancepay/openapi/v3/order',{
      method:'POST',headers:{'Content-Type':'application/json','BinancePay-Timestamp':timestamp,'BinancePay-Nonce':nonce,'BinancePay-Certificate-SN':c.env.BINANCE_PAY_API_KEY,'BinancePay-Signature':signature},body:payload
    })
    const result=await response.json() as {status?:string;code?:string;data?:{prepayId?:string;checkoutUrl?:string};errorMessage?:string}
    if (!response.ok || result.status!=='SUCCESS' || !result.data?.checkoutUrl || !result.data?.prepayId) return json('تعذر إنشاء طلب Binance Pay. لم يتم تفعيل الاشتراك.',502)
    let checkoutUrl=''
    try { const url=new URL(result.data.checkoutUrl); if(url.protocol!=='https:'||url.hostname!=='pay.binance.com') throw new Error(); checkoutUrl=url.toString() } catch { return json('رابط الدفع الذي أعادته Binance غير صالح.',502) }
    await c.env.DB.prepare('INSERT INTO payment_orders(id,user_id,merchant_trade_no,plan,method,amount_minor,currency,usd_amount_cents,exchange_rate,status,provider_order_id,checkout_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id,c.get('userId'),merchantTradeNo,plan,method,usd*100,'USDT',usd*100,55,'pending',result.data.prepayId,checkoutUrl,now,now).run()
    return c.json({orderId:id,method,amount:usd,currency:'USDT',checkoutUrl})
  }
  if (!c.env.INSTAPAY_RECIPIENT) return json('بيانات استقبال InstaPay غير مهيأة على الخادم. لم يتم إنشاء طلب.',503)
  await c.env.DB.prepare('INSERT INTO payment_orders(id,user_id,merchant_trade_no,plan,method,amount_minor,currency,usd_amount_cents,exchange_rate,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id,c.get('userId'),merchantTradeNo,plan,'instapay',egp*100,'EGP',usd*100,55,'pending',now,now).run()
  return c.json({orderId:id,method:'instapay',amount:egp,currency:'EGP',exchangeRate:55,recipient:c.env.INSTAPAY_RECIPIENT,status:'pending'})
})
app.get('/api/billing/order/:id',async c=>{
  const row=await c.env.DB.prepare('SELECT id,plan,method,amount_minor,currency,status,transfer_reference,created_at,paid_at FROM payment_orders WHERE id=? AND user_id=?')
    .bind(c.req.param('id'),c.get('userId')).first<{id:string;plan:string;method:string;amount_minor:number;currency:string;status:string;transfer_reference:string|null;created_at:number;paid_at:number|null}>()
  if(!row)return json('طلب الدفع غير موجود',404)
  return c.json({order:{...row,amount:row.amount_minor/100}})
})
app.post('/api/billing/instapay/submit',async c=>{
  const body=await c.req.json<{orderId?:string;transferReference?:string}>()
  const ref=(body.transferReference||'').trim()
  if(!body.orderId||ref.length<6||ref.length>100||!/^[A-Za-z0-9._/-]+$/.test(ref))return json('أدخل مرجع تحويل صحيحاً (6 إلى 100 حرف/رقم).')
  const updated=await c.env.DB.prepare("UPDATE payment_orders SET transfer_reference=?,status='submitted',updated_at=? WHERE id=? AND user_id=? AND method='instapay' AND status='pending'")
    .bind(ref,Math.floor(Date.now()/1000),body.orderId,c.get('userId')).run()
  if((updated.meta?.changes||0)!==1)return json('طلب الدفع غير متاح للإرسال أو سبق إرساله.',409)
  return c.json({ok:true,status:'submitted',message:'تم استلام مرجع التحويل. سيظل الاشتراك معلقاً حتى مراجعة التحويل وتأكيد وصول المبلغ.'})
})
app.post('/api/admin/payments/instapay/review',async c=>{
  if(!c.env.ADMIN_REVIEW_SECRET||!constantTimeEqual(c.req.header('X-Admin-Review-Secret')||'',c.env.ADMIN_REVIEW_SECRET))return json('Unauthorized',401)
  const body=await c.req.json<{orderId?:string;approve?:boolean}>()
  if(!body.orderId||typeof body.approve!=='boolean')return json('Invalid review request')
  const row=await c.env.DB.prepare("SELECT user_id,plan,status FROM payment_orders WHERE id=? AND method='instapay'").bind(body.orderId).first<{user_id:string;plan:string;status:string}>()
  if(!row)return json('Order not found',404)
  const now=Math.floor(Date.now()/1000)
  if(row.status==='paid'&&body.approve){await activateSubscription(c.env.DB,row.user_id,row.plan,now,body.orderId);return c.json({ok:true,status:'paid'})}
  if(row.status!=='submitted')return json('Order is not awaiting review',409)
  const result=await c.env.DB.prepare("UPDATE payment_orders SET status=?,paid_at=?,updated_at=? WHERE id=? AND status='submitted'")
    .bind(body.approve?'paid':'rejected',body.approve?now:null,now,body.orderId).run()
  if((result.meta?.changes||0)!==1)return json('Order review conflict',409)
  if(body.approve)await activateSubscription(c.env.DB,row.user_id,row.plan,now,body.orderId)
  return c.json({ok:true,status:body.approve?'paid':'rejected'})
})
app.post('/api/billing/binance/webhook',async c=>{
  if(!c.env.BINANCE_PAY_PUBLIC_KEY)return json('Webhook verification is not configured',503)
  const body=await c.req.text(),timestamp=c.req.header('BinancePay-Timestamp')||'',nonce=c.req.header('BinancePay-Nonce')||'',signature=c.req.header('BinancePay-Signature')||''
  if(!timestamp||!nonce||!signature||Math.abs(Date.now()-Number(timestamp))>5*60*1000)return json('Invalid webhook headers',401)
  let valid=false
  try{valid=await verifyBinanceWebhook(body,timestamp,nonce,signature,c.env.BINANCE_PAY_PUBLIC_KEY)}catch{valid=false}
  if(!valid)return json('Invalid webhook signature',401)
  let event:{bizType?:string;bizStatus?:string;data?:string}
  try{event=JSON.parse(body)}catch{return json('Invalid webhook payload')}
  if(event.bizType!=='PAY'||event.bizStatus!=='PAY_SUCCESS'||!event.data)return c.json({returnCode:'SUCCESS',returnMessage:null})
  let data:{merchantTradeNo?:string;totalFee?:number|string;currency?:string;transactionId?:string}
  try{data=JSON.parse(event.data)}catch{return json('Invalid payment event data')}
  if(!data.merchantTradeNo||!data.transactionId||data.currency!=='USDT')return json('Payment event is incomplete')
  const row=await c.env.DB.prepare('SELECT id,user_id,plan,amount_minor,status,provider_transaction_id FROM payment_orders WHERE merchant_trade_no=? AND method=\'binance\'')
    .bind(data.merchantTradeNo).first<{id:string;user_id:string;plan:string;amount_minor:number;status:string;provider_transaction_id:string|null}>()
  if(!row||Math.round(Number(data.totalFee)*100)!==row.amount_minor)return json('Payment does not match the order',409)
  const now=Math.floor(Date.now()/1000)
  if(row.status==='paid'&&row.provider_transaction_id===data.transactionId){await activateSubscription(c.env.DB,row.user_id,row.plan,now,row.id);return c.json({returnCode:'SUCCESS',returnMessage:null})}
  if(row.status!=='pending')return json('Payment order is not pending',409)
  const updated=await c.env.DB.prepare("UPDATE payment_orders SET status='paid',provider_transaction_id=?,paid_at=?,updated_at=? WHERE id=? AND status='pending'")
    .bind(data.transactionId,now,now,row.id).run()
  if((updated.meta?.changes||0)!==1)return c.json({returnCode:'SUCCESS',returnMessage:null})
  await c.env.DB.prepare('INSERT OR IGNORE INTO payments(id,user_id,provider_event_id,amount,currency,status,created_at) VALUES(?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),row.user_id,data.transactionId,row.amount_minor,'USDT','paid',now).run()
  await activateSubscription(c.env.DB,row.user_id,row.plan,now,row.id)
  return c.json({returnCode:'SUCCESS',returnMessage:null})
})
app.post('/api/auth/logout',async c=>{
  const raw=c.req.header('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('stamp_session='))?.slice(14)
  if(raw)await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(raw+c.env.SESSION_SECRET)).run()
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':cookie('stamp_session','',0)}})
})
app.onError((err,c)=>{console.error('STAMP API error',err);return c.json({error:'Internal server error'},500)})
export default app
