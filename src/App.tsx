import { useRef, useState } from 'react'

type Proof = {
  fileName: string
  fileSize: number
  sha256: string
  createdAt: string
  algorithm: 'SHA-256'
  note: string
}

const copy = {
  ar: {
    nav: 'بصمتك الرقمية تبدأ هنا',
    badge: 'حماية أبسط لأفكارك وأعمالك',
    titleA: 'شغلك له قيمة.',
    titleB: 'خلي له بصمة.',
    subtitle: 'أنشئ بصمة رقمية فريدة لملفاتك، واحتفظ ببياناتها في سجل واضح يمكنك الرجوع إليه والتحقق منه.',
    cta: 'ابدأ ببصمة ملفك',
    secondary: 'كيف يعمل STAMP؟',
    trusted: 'خطوات بسيطة. بدون تعقيد.',
    step1: 'ارفع الملف', step1d: 'اختر العمل الرقمي الذي تريد توثيق بصمته.',
    step2: 'أنشئ البصمة', step2d: 'نحسب SHA-256 محلياً دون رفع محتوى الملف.',
    step3: 'احتفظ بالسجل', step3d: 'نزّل إيصال البصمة واحتفظ به للتحقق لاحقاً.',
    uploadTitle: 'أنشئ بصمتك الأولى',
    uploadHint: 'اسحب ملفك هنا أو اضغط للاختيار',
    uploadSub: 'ملفاتك لا تغادر جهازك في هذه النسخة التجريبية.',
    choose: 'اختيار ملف',
    processing: 'جارٍ إنشاء البصمة...',
    result: 'تم إنشاء البصمة الرقمية',
    file: 'الملف', size: 'الحجم', hash: 'بصمة SHA-256', time: 'وقت الإنشاء على جهازك',
    download: 'تنزيل إيصال البصمة', reset: 'ملف آخر',
    disclaimer: 'مهم: البصمة الرقمية تساعد على إثبات تطابق الملف لاحقاً، لكنها وحدها لا تثبت الملكية القانونية أو وقت الإنشاء بشكل مستقل. هذه النسخة تحسب البصمة داخل المتصفح ولا تنشئ بعد سجلاً خارجياً موثقاً.',
    footer: 'STAMP — Your work. Your proof.',
    language: 'English',
    error: 'تعذر قراءة الملف. جرّب ملفاً آخر.',
    max: 'الحد الأقصى في هذه النسخة 100 ميجابايت.',
  },
  en: {
    nav: 'Your digital fingerprint starts here',
    badge: 'A simpler way to protect your work',
    titleA: 'Your work has value.',
    titleB: 'Give it a fingerprint.',
    subtitle: 'Create a unique digital fingerprint for your files and keep a clear record you can revisit and verify.',
    cta: 'Create your first stamp',
    secondary: 'How STAMP works',
    trusted: 'Simple steps. No complexity.',
    step1: 'Choose a file', step1d: 'Select the digital work you want to fingerprint.',
    step2: 'Create a fingerprint', step2d: 'SHA-256 is calculated locally. Your file is not uploaded.',
    step3: 'Keep your record', step3d: 'Download a fingerprint receipt for future verification.',
    uploadTitle: 'Create your first stamp',
    uploadHint: 'Drop your file here or click to browse',
    uploadSub: 'In this preview, your files never leave your device.',
    choose: 'Choose a file',
    processing: 'Creating fingerprint...',
    result: 'Digital fingerprint created',
    file: 'File', size: 'Size', hash: 'SHA-256 fingerprint', time: 'Created on your device at',
    download: 'Download fingerprint receipt', reset: 'Choose another file',
    disclaimer: 'Important: A digital fingerprint helps verify that a file has not changed. By itself, it does not establish legal ownership or independently prove when the file was created. This preview calculates locally and does not yet create an independently timestamped public record.',
    footer: 'STAMP — Your work. Your proof.',
    language: 'العربية',
    error: 'Could not read this file. Please try another.',
    max: 'The preview limit is 100 MB.',
  },
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const [proof, setProof] = useState<Proof | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const t = copy[lang]
  const rtl = lang === 'ar'

  async function processFile(file?: File) {
    if (!file) return
    setError('')
    setProof(null)
    if (file.size > 100 * 1024 * 1024) {
      setError(t.max)
      return
    }
    setBusy(true)
    try {
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
      setProof({
        fileName: file.name,
        fileSize: file.size,
        sha256: hash,
        createdAt: new Date().toISOString(),
        algorithm: 'SHA-256',
        note: 'Locally generated fingerprint. Client device time is not an independent trusted timestamp.',
      })
    } catch {
      setError(t.error)
    } finally {
      setBusy(false)
    }
  }

  function downloadReceipt() {
    if (!proof) return
    const blob = new Blob([JSON.stringify({ product: 'STAMP', version: '0.1-preview', ...proof }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'stamp-' + proof.sha256.slice(0, 12) + '.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} className={rtl ? 'app arabic' : 'app'}>
      <header className="topbar">
        <a className="brand" href="#" aria-label="STAMP home"><span className="brand-mark">S</span><span>STAMP<span className="brand-dot">.</span></span></a>
        <div className="top-actions">
          <span className="nav-note">{t.nav}</span>
          <button className="lang-button" onClick={() => setLang(rtl ? 'en' : 'ar')}>{t.language}</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" />{t.badge}</div>
          <h1>{t.titleA}<br /><span>{t.titleB}</span></h1>
          <p className="hero-subtitle">{t.subtitle}</p>
          <div className="hero-actions">
            <a className="primary-button" href="#stamp">{t.cta}<span aria-hidden="true">↗</span></a>
            <a className="text-button" href="#how">{t.secondary}<span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-proof"><span className="shield">✳</span><span>{t.trusted}</span></div>
        </div>
        <div className="visual-wrap" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="glow" />
          <div className="stamp-card">
            <div className="card-top"><span className="mini-mark">S</span><span>STAMP / DIGITAL PROOF</span><span className="live-dot" /></div>
            <div className="fingerprint"><div className="fp-ring ring-a" /><div className="fp-ring ring-b" /><div className="fp-ring ring-c" /><div className="fp-core">S</div></div>
            <div className="card-bottom"><span>SHA-256</span><span className="card-status">● READY TO VERIFY</span></div>
            <div className="hash-lines"><i /><i /><i /><i /></div>
          </div>
          <div className="float-chip chip-top"><span>✳</span> UNIQUE FINGERPRINT</div>
          <div className="float-chip chip-bottom"><span>✓</span> YOUR FILE. YOUR CONTROL.</div>
        </div>
      </section>

      <section className="steps" id="how">
        <div className="section-kicker">01 / THE PROCESS</div>
        <div className="steps-grid">
          {[{n:'01',title:t.step1,desc:t.step1d,icon:'↥'},{n:'02',title:t.step2,desc:t.step2d,icon:'⌘'},{n:'03',title:t.step3,desc:t.step3d,icon:'↧'}].map(item => (
            <article className="step" key={item.n}><div className="step-head"><span>{item.n}</span><b>{item.icon}</b></div><h3>{item.title}</h3><p>{item.desc}</p></article>
          ))}
        </div>
      </section>

      <section className="workspace" id="stamp">
        <div className="workspace-heading"><div><div className="section-kicker">02 / TRY IT NOW</div><h2>{t.uploadTitle}</h2></div><span className="secure-label"><i /> LOCAL PROCESSING</span></div>
        {!proof ? (
          <div className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void processFile(e.dataTransfer.files?.[0]) }}>
            <input ref={inputRef} type="file" hidden onChange={e => void processFile(e.target.files?.[0])} />
            <div className="upload-icon"><span>↑</span></div>
            <h3>{busy ? t.processing : t.uploadHint}</h3>
            <p>{t.uploadSub}</p>
            <button className="choose-button" disabled={busy} onClick={() => inputRef.current?.click()}>{t.choose}</button>
            {error && <p className="error-message" role="alert">{error}</p>}
            <div className="drop-meta"><span>SHA-256</span><span>MAX 100 MB</span><span>PRIVATE BY DESIGN</span></div>
          </div>
        ) : (
          <div className="proof-result">
            <div className="success-heading"><span className="success-icon">✓</span><div><h3>{t.result}</h3><p>{proof.fileName}</p></div></div>
            <div className="proof-grid">
              <div><span>{t.file}</span><strong>{proof.fileName}</strong></div>
              <div><span>{t.size}</span><strong>{formatSize(proof.fileSize)}</strong></div>
              <div className="hash-field"><span>{t.hash}</span><code>{proof.sha256}</code></div>
              <div><span>{t.time}</span><strong>{new Date(proof.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</strong></div>
            </div>
            <div className="result-actions"><button className="primary-button" onClick={downloadReceipt}>{t.download} <span>↓</span></button><button className="text-button" onClick={() => { setProof(null); if (inputRef.current) inputRef.current.value = '' }}>{t.reset}</button></div>
          </div>
        )}
        <p className="disclaimer">{t.disclaimer}</p>
      </section>

      <footer><a className="brand footer-brand" href="#"><span className="brand-mark">S</span><span>STAMP<span className="brand-dot">.</span></span></a><span>{t.footer}</span><span className="footer-version">PREVIEW 0.1</span></footer>
    </main>
  )
}