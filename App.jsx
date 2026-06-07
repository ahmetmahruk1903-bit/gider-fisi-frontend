import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, FileText, Share2, BarChart3, ReceiptText, Settings } from 'lucide-react';
import './style.css';

const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const BASE_URL = import.meta.env.VITE_API_URL || `http://${API_HOST}:4000`;
const API = `${BASE_URL}/api`;

const emptyForm = {
  vendor_name: '',
  vendor_tax_number: '',
  receipt_date: '',
  receipt_time: '',
  receipt_no: '',
  workplace_no: '',
  terminal_no: '',
  card_last4: '',
  category: '',
  payment_type: '',
  currency: 'TRY',
  subtotal: '',
  vat_total: '',
  grand_total: '',
  vehicle_plate: '',
  note: '',
  ocr_raw_text: '',
image_url: ''
};

const labels = {
  vendor_name: 'Firma Adı',
  vendor_tax_number: 'Vergi No',
  receipt_date: 'Tarih',
  receipt_time: 'Saat',
  receipt_no: 'Fiş No',
  workplace_no: 'İşyeri No',
  terminal_no: 'Terminal No',
  card_last4: 'Kart Son 4 Hane',
  category: 'Kategori',
  payment_type: 'Ödeme Tipi',
  currency: 'Para Birimi',
  subtotal: 'Ara Toplam',
  vat_total: 'KDV',
  grand_total: 'Genel Toplam',
  vehicle_plate: 'Araç Plakası',
  note: 'Not',
  ocr_raw_text: 'OCR Ham Metin',
image_url: 'Fiş Görseli'
};

const monthOptions = [
  { label: 'Ocak', value: '1' },
  { label: 'Şubat', value: '2' },
  { label: 'Mart', value: '3' },
  { label: 'Nisan', value: '4' },
  { label: 'Mayıs', value: '5' },
  { label: 'Haziran', value: '6' },
  { label: 'Temmuz', value: '7' },
  { label: 'Ağustos', value: '8' },
  { label: 'Eylül', value: '9' },
  { label: 'Ekim', value: '10' },
  { label: 'Kasım', value: '11' },
  { label: 'Aralık', value: '12' }
];

function formatReportPeriod(month, year) {
  const selectedMonth = monthOptions.find(option => option.value === String(month));

  return `${selectedMonth?.label || month} ${year}`;
}

function normalizeForm(data) {
  const clean = { ...emptyForm };
  Object.keys(clean).forEach(key => {
    if (data && data[key] !== undefined && typeof data[key] !== 'object') {
      clean[key] = data[key];
    }
  });
  return clean;
}

function App() {
  const [tab, setTab] = useState('dashboard');
  const [receipts, setReceipts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem('gider_auth');
    return raw ? JSON.parse(raw) : null;
  });

  function authHeaders(extra = {}) {
    return {
      ...extra,
      Authorization: `Bearer ${auth?.token || ''}`
    };
  }

  async function login(username, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Giriş yapılamadı');

    const nextAuth = { token: data.token, user: data.user };
    localStorage.setItem('gider_auth', JSON.stringify(nextAuth));
    setAuth(nextAuth);
  }

  function logout() {
    localStorage.removeItem('gider_auth');
    setAuth(null);
  }

  async function loadReceipts() {
    if (!auth?.token) return;

    const res = await fetch(`${API}/receipts`, {
      headers: authHeaders()
    });
    setReceipts(await res.json());
  }

  useEffect(() => { loadReceipts(); }, [auth?.token]);

  async function uploadReceipt(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const fd = new FormData();
    fd.append('receipt', file);

    try {
      const res = await fetch(`${API}/receipts/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: fd
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || 'Fiş okunamadı');
        return;
      }

      setForm(normalizeForm(data.analyzed));
      setTab('add');
    } catch (err) {
      alert('Bağlantı hatası: ' + err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  async function saveReceipt() {
    if (editingId) {
      await fetch(`${API}/receipts/${editingId}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(form)
      });
  
      setEditingId(null);
    } else {
      await fetch(`${API}/receipts`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(form)
      });
    }
  
    setForm(emptyForm);
    await loadReceipts();
    setTab('list');
  }
  function editReceipt(receipt) {
    setForm({
      ...emptyForm,
      ...receipt
    });
    setEditingId(receipt.id);
    setTab('add');
  }
  
  async function deleteReceipt(id) {
    const ok = window.confirm('Bu fişi iptal etmek istediğine emin misin?');
    if (!ok) return;
  
    await fetch(`${API}/receipts/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
  
    await loadReceipts();
  }

  const total = receipts.reduce((s, r) => s + Number(r.grand_total || 0), 0);
  const vat = receipts.reduce((s, r) => s + Number(r.vat_total || 0), 0);

  if (!auth?.token) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="brand-icon"><ReceiptText size={24} /></div>
          <div>
            <h2>Gider Fişi</h2>
            <p>Sürekli · Dijital · Güvenilir</p>
          </div>
        </div>

        <button onClick={() => setTab('dashboard')}><BarChart3 size={18}/> Dashboard</button>
        <button onClick={() => setTab('upload')}><Camera size={18}/> Fiş Yükle</button>
        <button onClick={() => setTab('add')}><FileText size={18}/> Manuel Kayıt</button>
        <button onClick={() => setTab('list')}><FileText size={18}/> Fiş Listesi</button>
        <button onClick={() => setTab('share')}><Share2 size={18}/> Muhasebeci Linki</button>
        <button onClick={() => setTab('settings')}><Settings size={18}/> Ayarlar</button>
        <button onClick={logout}><FileText size={18}/> Çıkış</button>
      </aside>

      <main>
        <div className="topbar">
          <div>
            <h1>{tab === 'dashboard' ? 'Gider Yönetim Paneli' : tab === 'upload' ? 'Fiş Yükle' : tab === 'list' ? 'Fiş Listesi' : tab === 'share' ? 'Muhasebeci Paylaşımı' : tab === 'settings' ? 'Ayarlar' : 'Fiş Bilgileri'}</h1>
            <p>Fişleri dijital olarak kaydet, takip et ve muhasebeciyle paylaş.</p>
          </div>
        </div>

        {tab === 'dashboard' && (
  <>
    <div className="cards">
      <div className="card"><span>Toplam Gider</span><b>{total.toLocaleString('tr-TR')} TL</b></div>
      <div className="card"><span>Toplam KDV</span><b>{vat.toLocaleString('tr-TR')} TL</b></div>
      <div className="card"><span>Fiş Sayısı</span><b>{receipts.length}</b></div>
    </div>

    <div className="export-buttons">
      <button type="button" onClick={() => setTab('share')}>
        Rapor Oluştur
      </button>
    </div>
  </>
)}

        {tab === 'upload' && (
          <label className="upload">
            <Camera size={42} />
            <strong>{loading ? 'Fiş okunuyor, bekle...' : 'Fiş Fotoğrafı Yükle'}</strong>
            <span>Fotoğraf seç veya kameradan çek. Yanlış alanları manuel düzeltebilirsin.</span>
            <input type="file" accept="image/*,.pdf" capture="environment" onChange={uploadReceipt} disabled={loading}/>
          </label>
        )}

        {tab === 'add' && (
          <>
            <div className="form">
            {Object.keys(emptyForm).filter(key => key !== 'image_url').map(key => (
                <label key={key} className={key === 'ocr_raw_text' ? 'full-width' : ''}>
                  {labels[key]}
                  {key === 'ocr_raw_text' || key === 'note' ? (
                    <textarea
                      value={form[key] || ''}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      rows={key === 'ocr_raw_text' ? 6 : 3}
                    />
                  ) : (
                    <input
                      type={key === 'receipt_date' ? 'date' : 'text'}
                      value={form[key] || ''}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                    />
                  )}
                </label>
              ))}
            </div>
            <button type="button" className="primary" onClick={saveReceipt}>Kaydet</button>
          </>
        )}

{tab === 'list' && (
  <div className="receipt-list">
    {receipts.map((r) => (
      <div className="receipt" key={r.id}>
        <div>
          <b>{r.vendor_name || 'Firma adı girilmedi'}</b>
          <span>
            {r.receipt_date || 'Tarih yok'} · {r.category || 'Kategori yok'}
          </span>
        </div>

        <div className="receipt-actions">
          <strong>{Number(r.grand_total || 0).toLocaleString('tr-TR')} TL</strong>

          <button type="button" onClick={() => editReceipt(r)}>
            Düzelt
          </button>

          <button type="button" onClick={() => deleteReceipt(r.id)}>
            İptal
          </button>

          {r.image_url && (
            <a href={r.image_url} target="_blank" rel="noreferrer">
              Fişi Gör
            </a>
          )}
               </div>
      </div>
    ))}
  </div>
)}

        {tab === 'share' && <Share token={auth.token} />}
        {tab === 'settings' && <SettingsPanel token={auth.token} />}

      </main>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('gider@gm.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-icon"><ReceiptText size={28} /></div>
        <h1>Gider Fişi Takip</h1>
        <label>
          Kullanıcı adı
          <input value={username} onChange={e => setUsername(e.target.value)} autoCapitalize="none" />
        </label>
        <label>
          Şifre
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button className="primary" type="submit" disabled={loading}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}

function Share({ token }) {
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [link, setLink] = useState('');
  const reportPeriod = formatReportPeriod(month, year);
  const reportQuery = `month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}&auth=${encodeURIComponent(token)}&t=${Date.now()}`;

  async function createLink() {
    const res = await fetch(`${API}/share-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ month, year })
    });

    const data = await res.json();
    setLink(`${API}/public/report/${data.token}`);
  }

  function changeMonth(value) {
    setMonth(value);
    setLink('');
  }

  function changeYear(value) {
    setYear(value);
    setLink('');
  }

  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '18px',
      maxWidth: '620px',
      boxShadow: '0 8px 25px #0000000d',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{ marginTop: 0 }}>Muhasebeci Rapor Linki Oluştur</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <label>
          Ay
          <select value={month} onChange={e => changeMonth(e.target.value)}>
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          Yıl
          <input value={year} onChange={e => changeYear(e.target.value)} />
        </label>
      </div>

      <p className="report-period">Rapor Dönemi: {reportPeriod}</p>

      <button className="primary" onClick={createLink}>
        Link Oluştur
      </button>

      <div className="export-buttons">
        <a href={`${API}/export/pdf?${reportQuery}`} target="_blank" rel="noreferrer">
          PDF Aç
        </a>
        <a href={`${API}/export/excel?${reportQuery}`} target="_blank" rel="noreferrer">
          Excel Aç
        </a>
      </div>

      {link && (
        <div style={{ marginTop: '18px' }}>
          <p>Oluşturulan link:</p>
          <a href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ token }) {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');

  async function loadUsers() {
    const res = await fetch(`${API}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }

  useEffect(() => { loadUsers(); }, []);

  async function addUser(e) {
    e.preventDefault();
    setMessage('');

    const res = await fetch(`${API}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || 'Kullanıcı eklenemedi');
      return;
    }

    setUsername('');
    setPassword('');
    setMessage('Kullanıcı eklendi');
    await loadUsers();
  }

  async function changePassword(e) {
    e.preventDefault();
    setMessage('');

    const res = await fetch(`${API}/users/me/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(passwordForm)
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || 'Şifre değiştirilemedi');
      return;
    }

    setPasswordForm({ currentPassword: '', newPassword: '' });
    setMessage('Şifre değiştirildi');
  }

  return (
    <div className="settings-grid">
      <div>
        <form className="settings-card" onSubmit={addUser}>
          <h3>Yeni Kullanıcı</h3>
          <label>
            Kullanıcı adı
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="ornek@mail.com" />
          </label>
          <label>
            Şifre
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button className="primary" type="submit">Kullanıcı Ekle</button>
        </form>

        <form className="settings-card" onSubmit={changePassword}>
          <h3>Şifre Değiştir</h3>
          <label>
            Mevcut şifre
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            />
          </label>
          <label>
            Yeni şifre
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            />
          </label>
          {message && <p className="small-note">{message}</p>}
          <button className="primary" type="submit">Şifreyi Güncelle</button>
        </form>
      </div>

      <div className="settings-card">
        <h3>Kullanıcılar</h3>
        {users.map(user => (
          <div className="user-row" key={user.id}>
            <b>{user.username}</b>
            <span>{user.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
