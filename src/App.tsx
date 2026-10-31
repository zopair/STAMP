import { useEffect, useMemo, useRef, useState } from 'react'

type Proof = { fileName: string; fileSize: number; sha256: string; createdAt: string }
type User = { id: string; email: string; phone?: string; plan?: string; renewAt?: string; paymentStatus?: string; webUrl?: string; repoUrl?: string }
type ApiError = { error?: string; message?: string }
const API = (import.meta as any).env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''
const plans = [
  { id: 'monthly', name: 'شهري', price: '$5', period: '/ شهر', detail: 'توثيق وسجل أدلة أساسي', perks: ['بصمات وملفات غير محدودة*', 'سجل تحقق قابل للمشاركة', 'لوحة تحكم شخصية'] },
  { id: 'yearly', name: 'سنوي', price: '$50', period: '/ سنة', detail: 'وفّر أكثر واحصل على SEO', perks: ['كل مزايا الشهري', 'تحسين SEO مجاناً', 'صفحة عامة قابلة للفهرسة'], featured: true },
  { id: 'lifetime', name: 'مدى الحياة', price: '$100', period: 'دفعة واحدة', detail: 'كل الأدوات ومحتوى الإطلاق', perks: ['كل مزايا السنوي', 'وصف تسويقي شامل', 'مقترح فيديو قصير للسوشيال', 'توصيات منصات النشر'] },
]
const money = (n: number) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API) throw new Error('الخدمات الخلفية غير مربوطة بعد. يلزم نشر API وربط عنوانه قبل تفعيل الحسابات والدفع.')
  const res = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, credentials: 'include' })
  const data = await res.json().catch(() => ({})) as ApiError
  if (!res.ok) throw new Error(data.error || data.message || 'تعذر إكمال الطلب')
  return data as T
}

export default function App() {
  const [lang, setLang] = useState<'ar'|'en'>('ar')
  const [file, setFile] = useState<File | null>(null)
  const [proof, setProof] = useState<Proof | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('home')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [stars, setStars] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const rtl = lang === 'ar'
  const labels = useMemo(() => lang === 'ar' ? {
    home:'الرئيسية', evidence:'توثيق ملف', plans:'الباقات', account:'حسابي', sign:'الدخول / إنشاء حساب',
    eyebrow:'بصمة رقمية. سجل يمكن التحقق منه.', headline:'أثبت بصمة عملك.\nواحتفظ بسجلّه.', desc:'STAMP يحوّل ملفاتك الرقمية إلى أدلة قابلة للتحقق، مع سجل زمني وروابط واضحة لأعمالك — من مكان واحد.', start:'أنشئ بصمة الآن', see:'استكشف الباقات', protocol:'بروتوكول توثيق واضح', fileTitle:'أنشئ بصمة ملفك', drop:'اسحب الملف هنا أو اختره من جهازك', local:'يتم حساب SHA-256 داخل متصفحك؛ لا يتم رفع الملف في هذه الخطوة.', choose:'اختيار ملف', hashing:'جارٍ الحساب…', hash:'بصمة SHA-256', save:'تنزيل إيصال JSON', another:'ملف جديد', proof:'تم حساب البصمة', loginTitle:'بوابتك إلى لوحة STAMP', loginDesc:'أدخل بريدك ورقم هاتفك لطلب رمز تحقق. لا يتم تسجيل الدخول قبل تأكيد الرمز من الخادم.', email:'البريد الإلكتروني', phone:'رقم الهاتف مع مفتاح الدولة', send:'إرسال رمز التحقق', code:'رمز التحقق', verify:'تأكيد الرمز والدخول', dashboard:'لوحة التحكم', status:'حالة المشروع', stars:'نجوم المستودع', repo:'مستودع GitHub', web:'رابط الويب', renewal:'تاريخ التجديد', payment:'حالة الدفع', noData:'ستظهر بيانات حسابك هنا بعد تفعيل الخدمة الخلفية.', subscribe:'اختيار الباقة', unavailable:'يلزم ربط خدمة الحسابات الخلفية أولاً.', secure:'خصوصيتك وأمانك أولاً', footer:'STAMP — Your work. Your proof.'
  } : {
    home:'Home',evidence:'Fingerprint',plans:'Plans',account:'Account',sign:'Sign in / Sign up',
    eyebrow:'Digital fingerprint. Verifiable record.',headline:'Prove your work.\nKeep its record.',desc:'STAMP turns digital files into verifiable evidence, with a clear history and links to your work — in one place.',start:'Create a fingerprint',see:'Explore plans',protocol:'A transparent evidence protocol',fileTitle:'Create a file fingerprint',drop:'Drop a file here or choose from your device',local:'SHA-256 is calculated in your browser. This step does not upload your file.',choose:'Choose file',hashing:'Calculating…',hash:'SHA-256 fingerprint',save:'Download JSON receipt',another:'Choose another file',proof:'Fingerprint calculated',loginTitle:'Your STAMP dashboard access',loginDesc:'Enter your email and phone to request a verification code. Server confirmation is required to sign in.',email:'Email address',phone:'Phone with country code',send:'Send verification code',code:'Verification code',verify:'Verify and sign in',dashboard:'Dashboard',status:'Project status',stars:'Repository stars',repo:'GitHub repository',web:'Web app URL',renewal:'Renewal date',payment:'Payment status',noData:'Your account data will appear here when the backend is connected.',subscribe:'Choose a plan',unavailable:'The account backend must be connected first.',secure:'Privacy and security first',footer:'STAMP — Your work. Your proof.'
  }, [lang])

  useEffect(() => { fetch('https://api.github.com/repos/zopair/STAMP').then(r => r.ok ? r.json() : null).then(d => { if (d) setStars(d.stargazers_count) }).catch(() => {}) }, [])
  useEffect(() => { if (API) request<{user:User}>('/api/me').then(d => setUser(d.user)).catch(() => {}) }, [])

  async function fingerprint(f: File) {
    setError(''); setProof(null); setFile(f)
    if (f.size > 100 * 1024 * 1024) { setError('الحد الأقصى الحالي 100 ميجابايت'); return }
    setBusy(true)
    try {
      const digest = await crypto.subtle.digest('SHA-256', await f.arrayBuffer())
      const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('')
      setProof({ fileName:f.name, fileSize:f.size, sha256, createdAt:new Date().toISOString() })
    } catch { setError('تعذر قراءة الملف') } finally { setBusy(false) }
  }
  function receipt() {
    if (!proof) return
    const blob = new Blob([JSON.stringify({ product:'STAMP', version:'0.2', ...proof, timestampType:'client-device-time; not independently trusted' },null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='STAMP-'+proof.sha256.slice(0,12)+'.json'; a.click(); URL.revokeObjectURL(url)
  }
  async function sendOtp() {
    setError(''); setNotice('')
    try { await request('/api/auth/request-otp',{method:'POST',body:JSON.stringify({email,phone})}); setOtpSent(true); setNotice('تم إرسال الرمز. تحقق من البريد والهاتف.') }
    catch(e) { setError((e as Error).message) }
  }
  async function verifyOtp() {
    setError('')
    try { const d=await request<{user:User}>('/api/auth/verify-otp',{method:'POST',body:JSON.stringify({email,phone,code:otp})}); setUser(d.user); setTab('account') }
    catch(e) { setError((e as Error).message) }
  }
  async function checkout(plan: string) {
    setError('')
    try { const d=await request<{url:string}>('/api/billing/checkout',{method:'POST',body:JSON.stringify({plan})}); window.location.assign(d.url) }
    catch(e) { setError((e as Error).message) }
  }
  async function loadDashboard() {
    if (!user) { setTab('account'); return }
    try { const d=await request<{user:User}>('/api/me'); setUser(d.user); setTab('account') }
    catch(e) { setError((e as Error).message); setTab('account') }
  }

  async function logout() {
    setError('')
    try {
      await request('/api/auth/logout',{method:'POST'})
      setUser(null); setOtpSent(false); setOtp(''); setNotice('')
    } catch(e) {
      setError((e as Error).message)
    }
  }

  return <main className="shell" dir={rtl?'rtl':'ltr'}>
    <div className="ambient ambient-a"/><div className="ambient ambient-b"/>
    <header className="nav glass">
      <a className="logo" href="#home" onClick={()=>setTab('home')}><span className="logo-symbol">S</span> STAMP<span className="neon">.</span></a>
      <nav><button className={tab==='home'?'active':''} onClick={()=>setTab('home')}>{labels.home}</button><button className={tab==='evidence'?'active':''} onClick={()=>setTab('evidence')}>{labels.evidence}</button><button className={tab==='plans'?'active':''} onClick={()=>setTab('plans')}>{labels.plans}</button><button className={tab==='account'?'active':''} onClick={loadDashboard}>{labels.account}</button></nav>
      <div className="nav-right"><button className="lang" onClick={()=>setLang(rtl?'en':'ar')}>{rtl?'EN':'عربي'}</button><button className="nav-cta" onClick={()=>setTab(user?'account':'account')}>{user?'لوحة التحكم':labels.sign}</button><button className="menu" onClick={()=>setTab('account')}>☰</button></div>
    </header>

    {tab==='home' && <>
      <section className="hero">
        <div className="hero-copy"><div className="kicker"><i/> {labels.eyebrow}</div><h1>{labels.headline.split('\n')[0]}<br/><span>{labels.headline.split('\n')[1]}</span></h1><p>{labels.desc}</p>
          <div className="hero-actions"><button className="btn-primary" onClick={()=>setTab('evidence')}>{labels.start}<b>↗</b></button><button className="btn-ghost" onClick={()=>setTab('plans')}>{labels.see} <b>⌄</b></button></div>
          <div className="trust-row"><span>◈ {labels.protocol}</span><span>SHA-256</span><span>GITHUB READY</span></div>
        </div>
        <div className="hero-visual"><div className="orbit orbit-1"/><div className="orbit orbit-2"/><div className="holo-card glass"><div className="holo-top"><span>STAMP / EVIDENCE CORE</span><i/></div><div className="holo-emblem"><div className="emblem-ring r1"/><div className="emblem-ring r2"/><div className="emblem-ring r3"/><b>S</b></div><div className="holo-hash"><span>SHA-256</span><strong>8F3A · 91C2 · A0D7 · 4E11</strong></div><div className="holo-bottom"><span>● SECURE RECORD</span><span>V. 02</span></div></div><div className="float-tag tag-one">✳ UNIQUE FINGERPRINT</div><div className="float-tag tag-two">⌁ YOUR WORK / YOUR CONTROL</div></div>
      </section>
      <section className="metrics"><div><strong>01</strong><span>ملفك لا يغادر جهازك أثناء حساب البصمة</span></div><div><strong>256</strong><span>بت من بصمة SHA-256</span></div><div><strong>{stars===null?'—':stars}</strong><span>GitHub Stars للمستودع العام</span></div></section>
      <section className="feature-section"><div className="section-head"><div className="kicker">THE STAMP WORKFLOW / 01</div><h2>من الملف إلى <span>دليل قابل للتحقق</span></h2><p>مسار واضح، من دون ادعاء قانوني مضلل أو خطوات مخفية.</p></div><div className="feature-grid"><article className="feature glass"><b>01 / INPUT</b><div className="feature-icon">↥</div><h3>أضف عملك الرقمي</h3><p>اختر الملف الذي تريد إنشاء بصمته الرقمية.</p></article><article className="feature glass"><b>02 / FINGERPRINT</b><div className="feature-icon">⌘</div><h3>احسب بصمة فريدة</h3><p>يُحسب SHA-256 محلياً، ويمكن استخدامه لمقارنة تطابق الملف لاحقاً.</p></article><article className="feature glass"><b>03 / EVIDENCE</b><div className="feature-icon">◫</div><h3>احتفظ بسجل واضح</h3><p>النسخة الكاملة تضيف سجلاً خادمياً وختم وقت مستقل وروابط قابلة للتحقق.</p></article></div></section>
      <section className="cta-panel glass"><div><div className="kicker">READY WHEN YOU ARE</div><h2>ابدأ ببصمتك الأولى</h2><p>جرّب حساب البصمة الآن، ثم استكشف خيارات الاشتراك.</p></div><button className="btn-primary" onClick={()=>setTab('evidence')}>ابدأ الآن <b>↗</b></button></section>
    </>}

    {tab==='evidence' && <section className="page-section"><div className="kicker">01 / FILE EVIDENCE</div><h1 className="page-title">{labels.fileTitle}</h1><p className="page-sub">حساب محلي سريع. لا يتم رفع محتوى الملف إلى الخادم في هذه الخطوة.</p><div className="upload-panel glass" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) void fingerprint(f)}}><input ref={input} type="file" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void fingerprint(f)}}/><div className="upload-symbol">⇧</div><h2>{busy?labels.hashing:proof?labels.proof:labels.drop}</h2><p>{file?file.name:labels.local}</p>{!proof?<button className="btn-primary" disabled={busy} onClick={()=>input.current?.click()}>{labels.choose} <b>＋</b></button>:<div className="proof-data"><div><small>{labels.hash}</small><code>{proof.sha256}</code></div><div><small>FILE / SIZE</small><strong>{proof.fileName} · {money(proof.fileSize)}</strong></div><div><small>CLIENT TIME</small><strong>{new Date(proof.createdAt).toLocaleString()}</strong></div><div className="proof-buttons"><button className="btn-primary" onClick={receipt}>{labels.save} ↓</button><button className="btn-ghost" onClick={()=>{setProof(null);setFile(null);if(input.current)input.current.value=''}}>{labels.another}</button></div></div>}{error&&<p className="error">{error}</p>}</div><p className="legal-note">تنبيه: SHA-256 يثبت تطابق محتوى الملف مع بصمة محفوظة، لكنه وحده لا يثبت المؤلف أو الملكية القانونية أو وقت الإنشاء. وقت الإيصال الحالي هو وقت جهازك وليس ختمًا زمنياً مستقلاً.</p></section>}

    {tab==='plans' && <section className="page-section"><div className="kicker">02 / MEMBERSHIP</div><h1 className="page-title">اختر مستوى <span>حماية أعمالك</span></h1><p className="page-sub">أسعار واضحة. لا يتم تحصيل أي مبلغ قبل ربط بوابة الدفع الحقيقية وتأكيد العملية.</p><div className="plans-grid">{plans.map(p=><article className={'plan glass '+(p.featured?'featured':'')} key={p.id}>{p.featured&&<div className="popular">الأكثر قيمة</div>}<div className="plan-name">{p.name}</div><div className="price">{p.price}<small>{p.period}</small></div><p>{p.detail}</p><ul>{p.perks.map(x=><li key={x}><i>✓</i>{x}</li>)}</ul><button className={p.featured?'btn-primary':'btn-outline'} onClick={()=>void checkout(p.id)}>اشترك الآن <b>↗</b></button></article>)}</div><p className="legal-note">* تخضع حدود الاستخدام وسياسة الاحتفاظ بالملفات لحزمة الخدمة الفعلية. لا توجد معالجة دفع مفعلة في هذه النسخة المنشورة حتى يتم إعداد حساب بوابة الدفع ومفاتيحها.</p></section>}

    {tab==='account' && <section className="page-section"><div className="kicker">03 / PERSONAL CONSOLE</div><h1 className="page-title">{user?labels.dashboard:labels.loginTitle}</h1><p className="page-sub">{user?'حالة مشروعك واشتراكك وروابطك في مكان واحد.':labels.loginDesc}</p>{!user?<div className="auth-panel glass"><label>{labels.email}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>{labels.phone}<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+20 1X XXX XXXX"/></label>{otpSent&&<label>{labels.code}<input inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value)} placeholder="000000" maxLength={6}/></label>}<button className="btn-primary full" onClick={()=>void(otpSent?verifyOtp():sendOtp())}>{otpSent?labels.verify:labels.send} ↗</button>{notice&&<p className="notice">{notice}</p>}{error&&<p className="error">{error}</p>}<p className="legal-note">{API?'الاتصال بالخادم متاح.':'الخادم غير مربوط حالياً؛ لن يتم عرض تسجيل دخول وهمي أو قبول رمز غير متحقق منه.'}</p></div>:<><div className="dashboard-grid"><article className="dash-card glass"><small>{labels.status}</small><strong>{user.plan||'لم يتم تفعيل باقة'}</strong><span>● {user.paymentStatus||'بانتظار الاشتراك'}</span></article><article className="dash-card glass"><small>{labels.stars}</small><strong>{stars===null?'—':stars}</strong><span>GitHub / STAMP</span></article><article className="dash-card glass"><small>{labels.renewal}</small><strong>{user.renewAt||'—'}</strong><span>{labels.payment}: {user.paymentStatus||'—'}</span></article></div><div className="links-panel glass"><div><small>{labels.repo}</small><a href={user.repoUrl||'https://github.com/zopair/STAMP'} target="_blank" rel="noreferrer">{user.repoUrl||'https://github.com/zopair/STAMP'} ↗</a></div><div><small>{labels.web}</small><a href={user.webUrl||'https://zopair.github.io/STAMP/'} target="_blank" rel="noreferrer">{user.webUrl||'https://zopair.github.io/STAMP/'} ↗</a></div></div><button className="btn-outline" onClick={()=>void logout()}>تسجيل الخروج</button></>}</section>}
    {error&&tab!=='account'&&<div className="global-error">{error}</div>}
    <footer className="footer"><a className="logo" href="#home" onClick={()=>setTab('home')}><span className="logo-symbol">S</span> STAMP<span className="neon">.</span></a><span>{labels.footer}</span><span className="footer-status"><i/> SYSTEM PREVIEW / 0.2</span></footer>
  </main>
}
