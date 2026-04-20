import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Table, Badge, Row, Col, Modal, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import AnalyticsTab from '../components/AnalyticsTab';

// Alfabe listesi - şık harfleri için
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Boş soru formu fabrika fonksiyonu (2 şıkla başlar)
const emptyQuestionForm = () => ({
  _id: null,       // düzenleme modunda dolu olur
  soru: '',
  grup: '',
  cevap: 'A',
  options: [       // [{letter:'A', value:''}, {letter:'B', value:''}]
    { letter: 'A', value: '' },
    { letter: 'B', value: '' },
  ]
});

// Vertiabandan gelen soruyu form yapısına dönüştürür
function questionToForm(q) {
  // secenekler Map ise: q.secenekler entries, simple object ise Object.entries
  let entries = [];
  if (q.secenekler instanceof Map) {
    entries = [...q.secenekler.entries()];
  } else if (typeof q.secenekler === 'object') {
    entries = Object.entries(q.secenekler);
  }
  // Harfe göre sırala
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return {
    _id: q._id,
    soru: q.soru,
    grup: q.grup || '',
    cevap: q.cevap,
    options: entries.map(([letter, value]) => ({ letter, value }))
  };
}

// Form state'ini backend payload'a dönüştürür
function formToPayload(form) {
  const secenekler = {};
  form.options.forEach(opt => {
    secenekler[opt.letter] = opt.value;
  });
  return {
    soru: form.soru,
    grup: form.grup,
    cevap: form.cevap,
    secenekler
  };
}

function QuestionModal({ show, onHide, groups, onSaved, editingQuestion }) {
  const isEdit = !!editingQuestion;
  const [form, setForm] = useState(emptyQuestionForm());

  useEffect(() => {
    if (show) {
      if (isEdit && editingQuestion) {
        setForm(questionToForm(editingQuestion));
      } else {
        setForm(emptyQuestionForm());
      }
    }
  }, [show, editingQuestion]);

  const handleAddOption = () => {
    const usedLetters = form.options.map(o => o.letter);
    const nextLetter = ALPHABET.find(l => !usedLetters.includes(l));
    if (!nextLetter) {
      toast.warn('Maksimum 26 şık eklenebilir.');
      return;
    }
    setForm(prev => ({
      ...prev,
      options: [...prev.options, { letter: nextLetter, value: '' }]
    }));
  };

  const handleRemoveOption = (idx) => {
    if (form.options.length <= 2) {
      toast.warn('En az 2 şık olmalıdır.');
      return;
    }
    const newOptions = form.options
      .filter((_, i) => i !== idx)
      .map((opt, i) => ({ ...opt, letter: ALPHABET[i] })); // harfleri yeniden ata

    // Eğer silinen şık doğru cevap ise cevabı A'ya resetle
    const removedLetter = form.options[idx].letter;
    const newCevap = newOptions.find(o => o.letter === form.cevap)
      ? form.cevap
      : newOptions[0].letter;

    setForm(prev => ({ ...prev, options: newOptions, cevap: newCevap }));
  };

  const handleOptionChange = (idx, value) => {
    setForm(prev => {
      const newOptions = [...prev.options];
      newOptions[idx] = { ...newOptions[idx], value };
      return { ...prev, options: newOptions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.options.some(o => !o.value.trim())) {
      toast.error('Tüm şıkların doldurulması zorunludur.');
      return;
    }
    try {
      const payload = formToPayload(form);
      if (isEdit) {
        await api.put(`/admin/questions/${form._id}`, payload);
        toast.success('Soru başarıyla güncellendi!');
      } else {
        await api.post('/admin/questions', payload);
        toast.success('Yeni soru havuza eklendi!');
      }
      onSaved();
      onHide();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bir hata oluştu.');
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          {isEdit ? '✏️ Soruyu Düzenle' : '➕ Yeni Soru Ekle'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Soru Kategorisi / Grubu</Form.Label>
                <Form.Control
                  type="text"
                  list="groupSuggestions"
                  value={form.grup}
                  onChange={e => setForm({ ...form, grup: e.target.value })}
                  placeholder="Örn: Mevzuat veya Fiyatlandırma"
                  required
                />
                <datalist id="groupSuggestions">
                  {groups.map((g, idx) => <option key={idx} value={g} />)}
                </datalist>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-success">Doğru Cevap Şıkkı</Form.Label>
                <Form.Select
                  className="border-success border-2"
                  value={form.cevap}
                  onChange={e => setForm({ ...form, cevap: e.target.value })}
                >
                  {form.options.map(opt => (
                    <option key={opt.letter} value={opt.letter}>{opt.letter} Şıkkı</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">Soru Metni</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={form.soru}
              onChange={e => setForm({ ...form, soru: e.target.value })}
              required
            />
          </Form.Group>

          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold text-secondary text-uppercase mb-0">
              Cevap Şıkları ({form.options.length} adet)
            </h6>
            <Button
              variant="outline-primary"
              size="sm"
              type="button"
              onClick={handleAddOption}
            >
              + Yeni Şık Ekle
            </Button>
          </div>

          <div className="border rounded p-3 bg-light" style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {form.options.map((opt, idx) => (
              <div key={idx} className="d-flex align-items-center gap-2 mb-2">
                <Badge
                  bg={opt.letter === form.cevap ? 'success' : 'secondary'}
                  className="fs-6 px-2 py-2"
                  style={{ width: '36px', textAlign: 'center', flexShrink: 0 }}
                >
                  {opt.letter}
                </Badge>
                <Form.Control
                  type="text"
                  value={opt.value}
                  onChange={e => handleOptionChange(idx, e.target.value)}
                  placeholder={`${opt.letter} şıkkının içeriği...`}
                  className="flex-grow-1"
                />
                <Button
                  variant="outline-danger"
                  size="sm"
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  style={{ flexShrink: 0 }}
                  disabled={form.options.length <= 2}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>

          <div className="text-end mt-4 pt-2 border-top">
            <Button variant="secondary" className="me-2" onClick={onHide}>İptal</Button>
            <Button variant={isEdit ? 'primary' : 'success'} type="submit" className="fw-bold px-4">
              {isEdit ? '💾 Değişiklikleri Kaydet' : '✅ Havuza Ekle'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

// ============================================================
// Ana AdminDashboard bileşeni
// ============================================================
function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('assign');
  const [users, setUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [groups, setGroups] = useState([]);

  const [filterBirim, setFilterBirim] = useState('');
  const [filterGorev, setFilterGorev] = useState('');
  const [hoursToExpire, setHoursToExpire] = useState(24);

  const [selectionMode, setSelectionMode] = useState('random');
  const [questionCount, setQuestionCount] = useState(25);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');

  const [userSelectionMode, setUserSelectionMode] = useState('filter');
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null); // null → ekleme, obje → düzenleme

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchResults = async () => {
    try {
      const res = await api.get('/admin/results');
      setResults(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchQuestions = async () => {
    try {
      const res = await api.get('/admin/questions');
      setAllQuestions(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/admin/question-groups');
      setGroups(res.data);
      if (res.data.length > 0) setSelectedGroup(res.data[0]);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchUsers();
    fetchResults();
    fetchQuestions();
    fetchGroups();
  }, []);

  const handleQuestionToggle = (qId) => {
    setSelectedQuestionIds(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleUserToggle = (uId) => {
    setSelectedUserIds(prev =>
      prev.includes(uId) ? prev.filter(id => id !== uId) : [...prev, uId]
    );
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (selectionMode === 'manual' && selectedQuestionIds.length === 0) {
      toast.error('Lütfen listeden en az bir soru seçin.');
      return;
    }
    if (userSelectionMode === 'manual' && selectedUserIds.length === 0) {
      toast.error('Lütfen listeden en az bir personel seçin.');
      return;
    }
    try {
      const payload = {
        filterBirim, filterGorev, hoursToExpire,
        ...(userSelectionMode === 'manual' ? { userIds: selectedUserIds } : {}),
        ...(selectionMode === 'manual' ? { selectedQuestionIds } : { questionCount }),
        ...(selectionMode === 'group' ? { groupName: selectedGroup } : {})
      };
      const res = await api.post('/admin/assign-test', payload);
      toast.success(res.data.message);
      fetchResults();
      setSelectedQuestionIds([]);
      setActiveTab('results');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Test atama başarısız.');
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Bu sınav atanmasını kalıcı olarak iptal edip silmek istediğinize emin misiniz?')) return;
    try {
      const res = await api.delete(`/admin/remove-test/${id}`);
      fetchResults();
      toast.success(res.data.message || 'Sınav silindi.');
    } catch (err) {
      toast.error('Sınav silinirken bir hata oluştu');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Bu soruyu veritabanından kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/admin/questions/${id}`);
      fetchQuestions();
      fetchGroups();
      toast.success('Soru kalıcı olarak silindi.');
    } catch (err) {
      toast.error('Soru silinirken hata oluştu.');
    }
  };

  const openAddModal = () => {
    setEditingQuestion(null);
    setShowQuestionModal(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setShowQuestionModal(true);
  };

  const handleModalSaved = () => {
    fetchQuestions();
    fetchGroups();
  };

  const uniqueBirimler = [...new Set(users.map(u => u.birim))].filter(Boolean);
  const uniqueGorevler = [...new Set(users.map(u => u.gorev))].filter(Boolean);

  // Bir sorunun secenekler'ini liste olarak döndürür (Map veya object uyumlu)
  const getSecenekEntries = (secenekler) => {
    if (!secenekler) return [];
    if (secenekler instanceof Map) return [...secenekler.entries()];
    return Object.entries(secenekler).sort((a, b) => a[0].localeCompare(b[0]));
  };

  return (
    <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div className="bg-primary text-white d-flex flex-column shadow-lg" style={{ width: '280px', flexShrink: 0 }}>
        <div className="p-4 border-bottom border-light border-opacity-25 pb-3">
          <h2 className="mb-0 fw-bold d-flex align-items-center">
            <span style={{ color: '#ffc107', marginRight: '10px' }}>⚡</span> AksaQuiz
          </h2>
          <small className="opacity-75">Yönetici Paneli</small>
        </div>

        <ul className="nav nav-pills flex-column mb-auto p-3 gap-2">
          {[
            { key: 'assign', icon: '📋', label: 'Sınav Ata / Planla' },
            { key: 'results', icon: '📊', label: 'Sınav Sonuçları' },
            { key: 'questions', icon: '📚', label: 'Soru Havuzu Yönetimi' },
            { key: 'analytics', icon: '📈', label: 'İstatistik & Analiz' },
          ].map(item => (
            <li key={item.key} className="nav-item">
              <a
                href="#"
                className={`nav-link border-0 text-start py-3 ${activeTab === item.key ? 'active bg-white text-primary shadow-sm fw-bold rounded-3' : 'text-white opacity-75'}`}
                onClick={(e) => { e.preventDefault(); setActiveTab(item.key); }}
              >
                <span className="me-2">{item.icon}</span> {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="p-3 border-top border-light border-opacity-25">
          <Button variant="outline-light" className="w-100 py-2 fw-bold" onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1 bg-light pb-5" style={{ overflowY: 'auto' }}>
        <div className="p-4 px-5">

          {/* ── SINAV ATA ── */}
          {activeTab === 'assign' && (
            <div>
              <h3 className="mb-4 text-dark fw-bold border-bottom pb-2">Sınav Planlayıcısı</h3>
              <Alert variant="info" className="d-flex align-items-center mb-4 border-0 shadow-sm">
                <div className="me-3 fs-3">ℹ️</div>
                <div>
                  <strong>Puanlama Sistemi:</strong> Her <strong>4 yanlış 1 doğruyu</strong> götürmektedir. Boş bırakılan sorular puanı etkilemez.
                </div>
              </Alert>

              <Card className="shadow-sm border-0 rounded-4 mb-4">
                <Card.Body className="p-4">
                  <Form onSubmit={handleAssign}>
                    {/* Kullanıcı Seçimi */}
                    <h5 className="fw-bold text-dark mb-3">Hedef Kitle</h5>
                    <Row className="mb-4">
                      <Col md={12}>
                        <div className="d-flex gap-4 mb-3 bg-white p-3 rounded-3 shadow-sm border">
                          <Form.Check type="radio" label="Toplu Gönderim (Birim / Görev filtresi)" name="userSelMode"
                            checked={userSelectionMode === 'filter'} onChange={() => setUserSelectionMode('filter')}
                            id="usr-filter" className="fw-medium text-dark" />
                          <Form.Check type="radio" label="Kişisel Hedef (Tek Tek Seç)" name="userSelMode"
                            checked={userSelectionMode === 'manual'} onChange={() => setUserSelectionMode('manual')}
                            id="usr-man" className="fw-medium text-dark" />
                        </div>
                      </Col>

                      {userSelectionMode === 'filter' && (
                        <>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Birim</Form.Label>
                              <Form.Select className="form-select-lg border bg-light" value={filterBirim} onChange={e => setFilterBirim(e.target.value)}>
                                <option value="">Tüm Kurum Personeli</option>
                                {uniqueBirimler.map((b, i) => <option key={i} value={b}>{b}</option>)}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Görev</Form.Label>
                              <Form.Select className="form-select-lg border bg-light" value={filterGorev} onChange={e => setFilterGorev(e.target.value)}>
                                <option value="">Tüm Unvanlar</option>
                                {uniqueGorevler.map((g, i) => <option key={i} value={g}>{g}</option>)}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </>
                      )}

                      {userSelectionMode === 'manual' && (
                        <Col md={12}>
                          <div className="border rounded p-3 bg-white shadow-sm" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <h6 className="mb-3 text-secondary text-uppercase fw-bold">
                              Personel Listesi ({selectedUserIds.length} seçildi)
                            </h6>
                            {users.map(u => (
                              <div key={u._id} className="d-flex align-items-center p-2 mb-1 border-bottom">
                                <Form.Check type="checkbox" id={`u-${u._id}`}
                                  checked={selectedUserIds.includes(u._id)}
                                  onChange={() => handleUserToggle(u._id)}
                                  className="me-3" />
                                <div>
                                  <Badge bg="info" className="me-2">{u.sicil || '—'}</Badge>
                                  <span className="fw-bold me-2">{u.ad} {u.soyad}</span>
                                  <span className="text-muted" style={{ fontSize: '0.85em' }}>({u.birim} - {u.gorev})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Col>
                      )}

                      <Col md={12} className="mt-3">
                        <Form.Group>
                          <Form.Label className="fw-semibold">Sınav Geçerlilik Süresi (Saat)</Form.Label>
                          <Form.Control className="form-control-lg border bg-light w-25" type="number"
                            value={hoursToExpire} onChange={e => setHoursToExpire(e.target.value)} min="1" max="72" required />
                        </Form.Group>
                      </Col>
                    </Row>

                    <hr className="my-4" />

                    {/* Soru Seçimi */}
                    <h5 className="fw-bold text-dark mb-3">Soru Seçim Kriterleri</h5>
                    <div className="d-flex gap-4 mb-4 bg-light p-3 rounded-3 flex-wrap">
                      <Form.Check type="radio" label={`Rastgele (Havuzdan · ${allQuestions.length} soru)`}
                        name="selMode" checked={selectionMode === 'random'} onChange={() => setSelectionMode('random')}
                        id="chk-rand" className="fw-medium" />
                      <Form.Check type="radio" label="Gruba Göre"
                        name="selMode" checked={selectionMode === 'group'} onChange={() => setSelectionMode('group')}
                        id="chk-group" className="fw-medium" />
                      <Form.Check type="radio" label="Manuel / Tek Tek Seç"
                        name="selMode" checked={selectionMode === 'manual'} onChange={() => setSelectionMode('manual')}
                        id="chk-man" className="fw-medium" />
                    </div>

                    {(selectionMode === 'random' || selectionMode === 'group') && (
                      <Row className="mb-4">
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Soru Adedi</Form.Label>
                            <Form.Control className="form-control-lg border-0 bg-light" type="number"
                              value={questionCount} onChange={e => setQuestionCount(e.target.value)} min="1" required />
                          </Form.Group>
                        </Col>
                        {selectionMode === 'group' && (
                          <Col md={9}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Hedef Grup</Form.Label>
                              <Form.Select className="form-select-lg border-primary border-2 bg-light"
                                value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                                {groups.map((g, i) => <option key={i} value={g}>{g}</option>)}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        )}
                      </Row>
                    )}

                    {selectionMode === 'manual' && (
                      <div className="mb-4 border rounded p-3 bg-white shadow-sm" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        <h6 className="mb-3 text-secondary text-uppercase fw-bold">
                          Soru Havuzu ({selectedQuestionIds.length} seçili)
                        </h6>
                        {allQuestions.map((q, idx) => (
                          <div key={q._id} className="d-flex align-items-start mb-2 p-2 border-bottom">
                            <div className="me-3 mt-1">
                              <Form.Check type="checkbox" id={`q-${q._id}`}
                                checked={selectedQuestionIds.includes(q._id)}
                                onChange={() => handleQuestionToggle(q._id)} />
                            </div>
                            <div>
                              <Badge bg="secondary" className="me-2">{q.grup}</Badge>
                              <strong>#{idx + 1}</strong> <span className="ms-1">{q.soru}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-end mt-4">
                      <Button variant="primary" type="submit" size="lg" className="px-5 shadow-sm fw-bold">
                        🚀 Sınavı Gönder
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </div>
          )}

          {/* ── SINAV SONUÇLARI ── */}
          {activeTab === 'results' && (
            <div>
              <h3 className="mb-4 text-dark fw-bold border-bottom pb-2">Sınav Sonuçları</h3>
              <Card className="shadow-sm border-0 rounded-4">
                <Card.Body className="p-0">
                  <Table hover responsive className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="px-4 py-3">Atama Tarihi</th>
                        <th className="py-3">Personel</th>
                        <th className="py-3">Birim / Görev</th>
                        <th className="py-3">Durum</th>
                        <th className="py-3 text-center">Puan</th>
                        <th className="py-3 text-center">Harf Notu</th>
                        <th className="py-3">Tamamlanma</th>
                        <th className="px-4 py-3 text-end">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(res => {
                        const isExpired = new Date() > new Date(res.expiresAt);
                        const passed = res.score >= 60;
                        const gradeColors = {
                          AA:'#1a7431',BA:'#155724',BB:'#0c5460',
                          CB:'#004085',CC:'#856404',DC:'#856404',
                          DD:'#721c24',FF:'#721c24'
                        };
                        const gradeBgs = {
                          AA:'#d4edda',BA:'#c3e6cb',BB:'#d1ecf1',
                          CB:'#cce5ff',CC:'#fff3cd',DC:'#fff3cd',
                          DD:'#f8d7da',FF:'#f5c6cb'
                        };
                        return (
                          <tr key={res._id}>
                            <td className="px-4">
                              <div>{new Date(res.createdAt).toLocaleDateString('tr-TR')}</div>
                              <small className="text-muted">{new Date(res.createdAt).toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'})}</small>
                            </td>
                            <td><div className="fw-bold">{res.personel ? `${res.personel.ad} ${res.personel.soyad}` : '—'}</div></td>
                            <td className="text-muted" style={{fontSize:'0.88rem'}}>{res.personel ? `${res.personel.birim} / ${res.personel.gorev}` : '—'}</td>
                            <td>
                              {res.isCompleted
                                ? <Badge bg={passed ? 'success' : 'danger'} pill>{passed ? 'Başarılı' : 'Başarısız'}</Badge>
                                : isExpired
                                  ? <Badge bg="secondary" pill>Süresi Doldu</Badge>
                                  : <Badge bg="warning" text="dark" pill>Bekliyor</Badge>}
                            </td>
                            <td className="text-center">
                              {res.isCompleted
                                ? <span className="fw-bold fs-5" style={{color: passed ? '#198754' : '#dc3545'}}>{res.score}</span>
                                : <span className="text-muted">—</span>}
                            </td>
                            <td className="text-center">
                              {res.isCompleted && res.letterGrade ? (
                                <span style={{
                                  fontWeight: 900,
                                  fontSize: '1.1rem',
                                  color: gradeColors[res.letterGrade] || '#333',
                                  background: gradeBgs[res.letterGrade] || '#f8f9fa',
                                  borderRadius: '8px',
                                  padding: '2px 10px',
                                  display: 'inline-block'
                                }}>{res.letterGrade}</span>
                              ) : <span className="text-muted">—</span>}
                            </td>
                            <td>
                              {res.completedAt
                                ? <div>
                                    <div style={{fontSize:'0.88rem'}}>{new Date(res.completedAt).toLocaleDateString('tr-TR')}</div>
                                    <small className="text-muted">{new Date(res.completedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</small>
                                  </div>
                                : <span className="text-muted">—</span>}
                            </td>
                            <td className="px-4 text-end">
                              <div className="d-flex gap-2 justify-content-end">
                                {res.isCompleted && (
                                  <Button variant="outline-info" size="sm" onClick={() => navigate(`/admin/test-details/${res._id}`)}>
                                    İncele
                                  </Button>
                                )}
                                <Button variant="outline-danger" size="sm" onClick={() => handleDeleteAssignment(res._id)}>Sil</Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {results.length === 0 && (
                        <tr><td colSpan="8" className="text-center py-5 text-muted">Henüz atanmış bir sınav yok.</td></tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </div>
          )}


          {/* ── SORU HAVUZU ── */}
          {activeTab === 'questions' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                <div>
                  <h3 className="text-dark fw-bold mb-0">Soru Havuzu Yönetimi</h3>
                  <small className="text-muted">{allQuestions.length} soru · {groups.length} grup</small>
                </div>
                <Button variant="success" className="fw-bold shadow-sm" onClick={openAddModal}>
                  ➕ Yeni Soru Ekle
                </Button>
              </div>

              <Card className="shadow-sm border-0 rounded-4">
                <Card.Body className="p-0">
                  <Table hover responsive className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="px-4 py-3" style={{ width: '70px' }}>ID</th>
                        <th className="py-3" style={{ width: '180px' }}>Grup</th>
                        <th className="py-3">Soru Metni</th>
                        <th className="py-3 text-center" style={{ width: '100px' }}>Cevap</th>
                        <th className="py-3 text-center" style={{ width: '80px' }}>Şık</th>
                        <th className="px-4 py-3 text-end" style={{ width: '140px' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allQuestions.map(q => {
                        const entryCount = getSecenekEntries(q.secenekler).length;
                        return (
                          <tr key={q._id}>
                            <td className="px-4 text-muted">#{q.id}</td>
                            <td><Badge bg="secondary">{q.grup}</Badge></td>
                            <td>
                              <div style={{
                                maxWidth: '400px',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {q.soru}
                              </div>
                            </td>
                            <td className="text-center">
                              <Badge bg="success" className="fs-6">{q.cevap}</Badge>
                            </td>
                            <td className="text-center text-muted">{entryCount} şık</td>
                            <td className="px-4 text-end">
                              <div className="d-flex gap-1 justify-content-end">
                                <Button variant="outline-primary" size="sm" onClick={() => openEditModal(q)}>Düzenle</Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDeleteQuestion(q._id)}>Sil</Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {allQuestions.length === 0 && (
                        <tr><td colSpan="6" className="text-center py-5 text-muted">Havuza henüz soru eklenmemiş.</td></tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </div>
          )}

          {/* ── ANALİTİK ── */}
          {activeTab === 'analytics' && (
            <div>
              <h3 className="mb-4 text-dark fw-bold border-bottom pb-2">Şirket Genel Başarı Analizi</h3>
              <AnalyticsTab />
            </div>
          )}

        </div>
      </div>

      {/* Soru Ekle / Düzenle Modalı */}
      <QuestionModal
        show={showQuestionModal}
        onHide={() => setShowQuestionModal(false)}
        groups={groups}
        onSaved={handleModalSaved}
        editingQuestion={editingQuestion}
      />
    </div>
  );
}

export default AdminDashboard;
