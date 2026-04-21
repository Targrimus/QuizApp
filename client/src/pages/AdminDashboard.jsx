import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Table, Badge, Row, Col, Modal, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import AnalyticsTab from '../components/AnalyticsTab';

const Icons = {
  Assign: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>,
  Results: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  Questions: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Analytics: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  Batches: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2l9 4.9V17L12 22l-9-4.9V7z"/><path d="M12 22L12 12"/><path d="M12 12l9-4.9"/><path d="M12 12L3 7.1"/></svg>,
  Menu: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  Logo: <svg width="24" height="24" fill="none" stroke="#ffc107" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
};

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
  const [activeTab, setActiveTab] = useState(localStorage.getItem('adminActiveTab') || 'assign');
  const [users, setUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedResultIds, setSelectedResultIds] = useState([]);
  const [batches, setBatches] = useState([]);
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

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  // Modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const fetchBatches = async () => {
    try {
      const res = await api.get('/admin/assigned-batches');
      setBatches(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchUsers();
    fetchResults();
    fetchQuestions();
    fetchGroups();
    fetchBatches();
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
      fetchBatches();
      setSelectedQuestionIds([]);
      setActiveTab('batches');
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

  const handleResultToggle = (id) => {
    setSelectedResultIds(prev =>
      prev.includes(id) ? prev.filter(resId => resId !== id) : [...prev, id]
    );
  };

  const handleSelectAllResults = () => {
    if (selectedResultIds.length === results.length && results.length > 0) {
      setSelectedResultIds([]);
    } else {
      setSelectedResultIds(results.map(r => r._id));
    }
  };

  const handleBulkDeleteResults = async () => {
    if (selectedResultIds.length === 0) return;
    if (!window.confirm(`Seçili ${selectedResultIds.length} adet sınav kaydını kalıcı olarak silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await api.post('/admin/remove-tests-bulk', { ids: selectedResultIds });
      fetchResults();
      setSelectedResultIds([]);
      toast.success(res.data.message || 'Seçili sınavlar silindi.');
    } catch (err) {
      toast.error('Toplu silme işleminde bir hata oluştu.');
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
      <div 
        className="bg-white d-flex flex-column border-end shadow-sm" 
        style={{ 
          width: isSidebarOpen ? '280px' : '88px', 
          flexShrink: 0, 
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          zIndex: 10
        }}
      >
        <div className="p-4 border-bottom pb-4 text-center">
          <h3 className="mb-1 fw-bold d-flex align-items-center justify-content-center text-primary">
            <span style={{ marginRight: isSidebarOpen ? '10px' : '0px' }}>{Icons.Logo}</span> 
            {isSidebarOpen && <span className="text-dark">AksaQuiz</span>}
          </h3>
          {isSidebarOpen && <small className="text-muted fw-semibold" style={{letterSpacing: '1px', fontSize: '0.75rem'}}>YÖNETİCİ PANELİ</small>}
        </div>

        <ul className="nav nav-pills flex-column mb-auto p-3 gap-2">
          {[
            { key: 'assign', icon: Icons.Assign, label: 'Sınav Ata / Planla' },
            { key: 'batches', icon: Icons.Batches, label: 'Sınav Oturumları' },
            { key: 'results', icon: Icons.Results, label: 'Ayrıntılı Sonuçlar' },
            { key: 'questions', icon: Icons.Questions, label: 'Soru Havuzu Yönetimi' },
            { key: 'analytics', icon: Icons.Analytics, label: 'İstatistik & Analiz' },
          ].map(item => (
            <li key={item.key} className="nav-item">
              <a
                href="#"
                className={`nav-link border-0 d-flex align-items-center py-3 px-3 mb-1 ${activeTab === item.key ? 'active bg-primary bg-opacity-10 text-primary fw-bold shadow-sm' : 'text-secondary hover-bg-light'} rounded-3`}
                onClick={(e) => { 
                  e.preventDefault(); 
                  setActiveTab(item.key); 
                  localStorage.setItem('adminActiveTab', item.key);
                  if(window.innerWidth <= 768) setIsSidebarOpen(false); 
                }}
                style={{ transition: 'all 0.2s ease', justifyContent: isSidebarOpen ? 'flex-start' : 'center' }}
                title={!isSidebarOpen ? item.label : ''}
              >
                <span className={isSidebarOpen ? "me-3" : "mx-auto"}>{item.icon}</span> 
                {isSidebarOpen && <span className="flex-grow-1">{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>

        <div className="p-4 border-top">
          <Button 
            variant="outline-danger" 
            className="w-100 py-2 fw-bold d-flex align-items-center justify-content-center" 
            onClick={handleLogout}
            title={!isSidebarOpen ? 'Çıkış Yap' : ''}
          >
            <span className={isSidebarOpen ? "me-2" : "mx-auto"}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </span>
            {isSidebarOpen && <span>Çıkış Yap</span>}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow-1 bg-light d-flex flex-column" style={{ overflow: 'hidden' }}>
        
        {/* Toggle Header Menu */}
        <div className="bg-white p-3 border-bottom d-flex align-items-center shadow-sm">
          <Button 
            variant="light" 
            className="p-2 border-0 d-flex align-items-center justify-content-center text-primary" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ borderRadius: '8px' }}
          >
            {Icons.Menu}
          </Button>
          <span className="ms-3 fw-bold text-secondary fs-5">Aksa Doğalgaz | Sınav Yönetim Sistemi</span>
        </div>

        {/* Scrollable Page Body */}
        <div className="p-4 px-md-5 pb-5" style={{ overflowY: 'auto', flexGrow: 1 }}>

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
                              <Form.Label className="fw-semibold text-secondary">Birim Filtresi</Form.Label>
                              <Form.Select className="form-select-lg border-0 bg-light shadow-none rounded-3" value={filterBirim} onChange={e => setFilterBirim(e.target.value)}>
                                <option value="">Tüm Kurum Personeli</option>
                                {uniqueBirimler.map((b, i) => <option key={i} value={b}>{b}</option>)}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-semibold text-secondary">Görev Filtresi</Form.Label>
                              <Form.Select className="form-select-lg border-0 bg-light shadow-none rounded-3" value={filterGorev} onChange={e => setFilterGorev(e.target.value)}>
                                <option value="">Tüm Unvanlar</option>
                                {uniqueGorevler.map((g, i) => <option key={i} value={g}>{g}</option>)}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </>
                      )}

                      {userSelectionMode === 'manual' && (
                        <Col md={12}>
                          <div className="border rounded p-3 bg-white shadow-sm" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <h6 className="mb-3 text-secondary text-uppercase fw-bold d-flex justify-content-between align-items-center">
                              <span>Personel Listesi ({users.length})</span>
                              <Badge bg="primary" pill>{selectedUserIds.length} Seçildi</Badge>
                            </h6>
                            {users.map(u => (
                              <div 
                                key={u._id} 
                                className="d-flex align-items-center p-2 mb-1 border-bottom rounded" 
                                style={{ cursor: 'pointer', transition: 'background-color 0.2s', backgroundColor: selectedUserIds.includes(u._id) ? '#e9ecef' : 'transparent' }}
                                onClick={() => handleUserToggle(u._id)}
                              >
                                <Form.Check type="checkbox" id={`u-${u._id}`}
                                  checked={selectedUserIds.includes(u._id)}
                                  onChange={() => {}}
                                  className="me-3" 
                                  style={{ pointerEvents: 'none' }}
                                />
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

                      <Col md={12} className="mt-4">
                        <Form.Group>
                          <Form.Label className="fw-semibold text-secondary">Sınav Geçerlilik Süresi (Saat)</Form.Label>
                          <Form.Control className="form-control-lg border-0 bg-light shadow-none rounded-3 w-25" type="number"
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
                            <Form.Label className="fw-semibold text-secondary">Soru Adedi</Form.Label>
                            <Form.Control className="form-control-lg border-0 bg-light shadow-none rounded-3" type="number"
                              value={questionCount} onChange={e => setQuestionCount(e.target.value)} min="1" required />
                          </Form.Group>
                        </Col>
                        {selectionMode === 'group' && (
                          <Col md={9}>
                            <Form.Group>
                              <Form.Label className="fw-semibold text-secondary">Hedef Soru Grubu</Form.Label>
                              <Form.Select className="form-select-lg border-0 bg-primary bg-opacity-10 text-primary shadow-none rounded-3"
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
                          <div 
                            key={q._id} 
                            className="d-flex align-items-start mb-2 p-2 border-bottom rounded"
                            style={{ cursor: 'pointer', transition: 'background-color 0.2s', backgroundColor: selectedQuestionIds.includes(q._id) ? '#e9ecef' : 'transparent' }}
                            onClick={() => handleQuestionToggle(q._id)}
                          >
                            <div className="me-3 mt-1">
                              <Form.Check type="checkbox" id={`q-${q._id}`}
                                checked={selectedQuestionIds.includes(q._id)}
                                onChange={() => {}} 
                                style={{ pointerEvents: 'none' }}
                              />
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

           {/* ── SINAV OTURUMLARI (BATCHES) ── */}
          {activeTab === 'batches' && (
            <div>
              <h3 className="mb-4 text-dark fw-bold border-bottom pb-2">Toplu Sınav Oturumları</h3>
              <p className="text-muted mb-4">Sisteme atanan tüm toplu sınav oturumları (grupları), hedef kitle ve ortalama başarı analizleri burada listelenir.</p>
              
              <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                  <Table responsive hover className="align-middle mb-0 border-white">
                    <thead className="bg-light text-secondary" style={{ borderBottom: '2px solid #e9ecef' }}>
                      <tr>
                        <th className="px-4 py-3 fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Oluşturma Tarihi</th>
                        <th className="py-3 fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Hedef Kitle Özeti</th>
                        <th className="py-3 text-center fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Katılımcı Sayısı</th>
                        <th className="py-3 text-center fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Tamamlanma</th>
                        <th className="px-4 py-3 text-center fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Ortalama Puan</th>
                      </tr>
                    </thead>
                    <tbody className="border-top-0">
                      {batches.map((batch, index) => {
                        const ortalama = batch.completedCount ? Math.round(batch.totalScore / batch.completedCount) : 0;
                        const isExpired = new Date() > new Date(batch.expiresAt);
                        return (
                          <tr key={index}>
                            <td className="px-4">
                              <div className="fw-bold">{new Date(batch.createdAt).toLocaleDateString('tr-TR')}</div>
                              <small className="text-muted">{new Date(batch.createdAt).toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'})}</small>
                            </td>
                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {batch.birimler.map(b => b ? <Badge bg="primary" key={b} style={{fontSize: '0.75rem'}}>{b}</Badge> : null)}
                                {batch.gorevler.map(g => g ? <Badge bg="secondary" key={g} style={{fontSize: '0.75rem'}}>{g}</Badge> : null)}
                              </div>
                            </td>
                            <td className="text-center fw-bold fs-5 text-dark">
                              {batch.targetCount} <span style={{fontSize:'0.8rem'}} className="text-muted fw-normal">kişi</span>
                            </td>
                            <td className="text-center">
                              {batch.completedCount >= batch.targetCount ? (
                                <Badge bg="success" pill>Tümü Tamamlandı</Badge>
                              ) : isExpired ? (
                                <Badge bg="danger" pill>Süre Doldu ({batch.completedCount}/{batch.targetCount})</Badge>
                              ) : (
                                <div className="text-warning fw-bold">{batch.completedCount} / {batch.targetCount}</div>
                              )}
                            </td>
                            <td className="px-4 text-center">
                              {batch.completedCount > 0 ? (
                                <span className="fs-4 fw-bold" style={{color: ortalama >= 60 ? '#198754' : '#dc3545'}}>{ortalama}</span>
                              ) : <span className="text-muted">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                      {batches.length === 0 && (
                        <tr><td colSpan="5" className="text-center py-5 text-muted">Henüz atanan bir sınav oturumu bulunmamaktadır.</td></tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </div>
          )}

          {/* ── SINAV SONUÇLARI ── */}
          {activeTab === 'results' && (
            <div>
              <h3 className="mb-4 text-dark fw-bold border-bottom pb-2">Sınav Sonuçları</h3>
              
              {selectedResultIds.length > 0 && (
                <div className="mb-3 p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-3 d-flex justify-content-between align-items-center shadow-sm">
                  <span className="text-danger fw-bold">🗑️ {selectedResultIds.length} Sınav Kaydı Seçildi</span>
                  <Button variant="danger" className="fw-bold px-4 shadow-sm" onClick={handleBulkDeleteResults}>
                    Seçili Olanları Sil
                  </Button>
                </div>
              )}

              <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                  <Table responsive hover className="align-middle mb-0 border-white">
                    <thead className="bg-light text-secondary" style={{ borderBottom: '2px solid #e9ecef' }}>
                      <tr>
                        <th className="px-4 py-3 fw-semibold border-0" style={{ width: '40px' }}>
                          <Form.Check 
                            type="checkbox" 
                            checked={results.length > 0 && selectedResultIds.length === results.length}
                            onChange={handleSelectAllResults}
                          />
                        </th>
                        <th className="py-3 fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Atama Tarihi</th>
                        <th className="py-3 fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Personel</th>
                        <th className="py-3 fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Birim / Görev</th>
                        <th className="py-3 fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Durum</th>
                        <th className="py-3 text-center fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Puan</th>
                        <th className="py-3 text-center fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Harf Notu</th>
                        <th className="py-3 fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Tamamlanma</th>
                        <th className="py-3 fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Durum (Neden) & IP</th>
                        <th className="px-4 py-3 text-end fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="border-top-0">
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
                          <tr key={res._id} style={{ backgroundColor: selectedResultIds.includes(res._id) ? 'rgba(220, 53, 69, 0.05)' : 'transparent', transition: 'background-color 0.2s' }}>
                            <td className="px-4">
                              <Form.Check 
                                type="checkbox" 
                                checked={selectedResultIds.includes(res._id)}
                                onChange={() => handleResultToggle(res._id)}
                              />
                            </td>
                            <td className="py-3">
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
                            <td>
                              {res.terminationReason && res.terminationReason.includes('Kopya') ? (
                                <Badge bg="danger" className="mb-1 d-block"><span className="me-1">🚨</span>{res.terminationReason}</Badge>
                              ) : res.terminationReason ? (
                                <Badge bg="warning" text="dark" className="mb-1 d-block">{res.terminationReason}</Badge>
                              ) : res.isCompleted ? (
                                <Badge bg="success" className="mb-1 d-block">Normal Bitiş</Badge>
                              ) : <span className="text-muted">—</span>}
                              
                              {res.ipAddress && (
                                <small className="text-muted d-block mt-1">IP: {res.ipAddress}</small>
                              )}
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

              <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                  <Table responsive hover className="align-middle mb-0 border-white">
                    <thead className="bg-light text-secondary" style={{ borderBottom: '2px solid #e9ecef' }}>
                      <tr>
                        <th className="px-4 py-3 fw-semibold border-0 text-uppercase" style={{ width: '70px', fontSize:'0.8rem', letterSpacing:'0.5px' }}>ID</th>
                        <th className="py-3 fw-semibold border-0 text-uppercase" style={{ width: '180px', fontSize:'0.8rem', letterSpacing:'0.5px' }}>Grup</th>
                        <th className="py-3 fw-semibold border-0 text-uppercase" style={{fontSize:'0.8rem', letterSpacing:'0.5px'}}>Soru Metni</th>
                        <th className="py-3 text-center fw-semibold border-0 text-uppercase" style={{ width: '100px', fontSize:'0.8rem', letterSpacing:'0.5px' }}>Cevap</th>
                        <th className="py-3 text-center fw-semibold border-0 text-uppercase" style={{ width: '80px', fontSize:'0.8rem', letterSpacing:'0.5px' }}>Şık</th>
                        <th className="px-4 py-3 text-end fw-semibold border-0 text-uppercase" style={{ width: '140px', fontSize:'0.8rem', letterSpacing:'0.5px' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="border-top-0">
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
      {/* Right Sidebar (Cart / Selection Manager) */}
      <div 
        className="bg-white border-start d-flex flex-column shadow-sm"
        style={{
          width: activeTab === 'assign' ? '340px' : '0px',
          flexShrink: 0,
          transition: 'width 0.3s ease',
          overflow: 'hidden'
        }}
      >
        <div className="p-4 border-bottom bg-primary bg-opacity-10 text-primary d-flex align-items-center gap-2">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <h5 className="mb-0 fw-bold">Sınav Atanacaklar</h5>
        </div>
        
        <div className="p-3 flex-grow-1" style={{ overflowY: 'auto' }}>
          {userSelectionMode === 'manual' ? (
            selectedUserIds.length === 0 ? (
              <div className="text-muted text-center mt-5 p-3">
                <span className="d-block mb-3" style={{fontSize: '3rem'}}>👈</span>
                Listeden personel seçtiğinizde burada görünecektir.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-bold text-dark">Toplam Seçim:</span>
                  <Badge bg="primary">{selectedUserIds.length} Kişi</Badge>
                </div>
                {users.filter(u => selectedUserIds.includes(u._id)).map((u, i) => (
                  <div key={'rs-' + u._id} className="d-flex justify-content-between align-items-center p-2 bg-light border rounded">
                    <div className="d-flex align-items-center" style={{minWidth: 0}}>
                      <Badge bg="secondary" className="me-2 rounded-circle flex-shrink-0" style={{width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i+1}</Badge>
                      <div className="text-truncate">
                        <div className="fw-bold text-truncate" style={{fontSize: '0.95rem'}}>{u.ad} {u.soyad}</div>
                        <div className="text-muted text-truncate" style={{fontSize: '0.8rem'}}>{u.birim}</div>
                      </div>
                    </div>
                    <Button variant="outline-danger" size="sm" className="rounded-circle p-1 d-flex align-items-center justify-content-center flex-shrink-0 ms-2" style={{width:'28px', height:'28px'}} onClick={() => handleUserToggle(u._id)} title="Listeden Çıkar">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </Button>
                  </div>
                ))}
              </div>
            )
          ) : (
            // FILTER MODE (Toplu Gönderim)
            (() => {
              const matched = users.filter(u => (!filterBirim || u.birim === filterBirim) && (!filterGorev || u.gorev === filterGorev));
              if (matched.length === 0) {
                return (
                  <div className="text-muted text-center mt-5 p-3">
                    <span className="d-block mb-3" style={{fontSize: '3rem'}}>⚠️</span>
                    Şu anki filtrelere uyan personel bulunmuyor.
                  </div>
                );
              }
              const grouped = matched.reduce((acc, u) => {
                const b = u.birim || 'Atanmamış Birim';
                if (!acc[b]) acc[b] = [];
                acc[b].push(u);
                return acc;
              }, {});

              return (
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between mb-1 pb-2 border-bottom">
                    <span className="fw-bold text-dark">Eşleşen Hedef Kitle:</span>
                    <Badge bg="success" className="fs-6 px-3">{matched.length} Kişi</Badge>
                  </div>
                  {Object.keys(grouped).sort().map(birim => (
                     <div key={birim} className="mb-1">
                       <div className="bg-secondary bg-opacity-10 text-secondary fw-bold px-2 py-1 rounded mb-2 text-uppercase d-flex justify-content-between align-items-center" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>
                         <span>{birim}</span>
                         <Badge bg="secondary" pill>{grouped[birim].length}</Badge>
                       </div>
                       {grouped[birim].map((u, i) => (
                          <div key={'f-' + u._id} className="d-flex align-items-center p-2 bg-light border rounded mb-1">
                            <Badge bg="dark" bg-opacity-25 className="me-2 rounded-circle flex-shrink-0 text-white" style={{width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i+1}</Badge>
                            <div className="text-truncate">
                              <div className="fw-bold text-truncate text-dark" style={{fontSize: '0.9rem'}}>{u.ad} {u.soyad}</div>
                              <div className="text-muted text-truncate" style={{fontSize: '0.75rem'}}>{u.gorev || 'Unvansız'}</div>
                            </div>
                          </div>
                       ))}
                     </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </div>

    </div>
  );
}

export default AdminDashboard;
