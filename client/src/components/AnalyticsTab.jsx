import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Nav, ProgressBar } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import api from '../services/api';

const GRADE_COLORS = {
  AA:'#1a7431', BA:'#155724', BB:'#0c5460',
  CB:'#004085', CC:'#856404', DC:'#856404',
  DD:'#721c24', FF:'#721c24'
};

// Başarı oranına göre renk
function rateColor(rate) {
  if (rate >= 75) return '#198754';
  if (rate >= 50) return '#ffc107';
  return '#dc3545';
}

// Zorluk badge
function DiffBadge({ diff }) {
  const bg = diff > 60 ? 'danger' : diff > 35 ? 'warning' : 'success';
  return <Badge bg={bg}>%{diff} Hata</Badge>;
}

// Mini progress bar ile başarı göstergesi
function RateBar({ rate }) {
  const variant = rate >= 75 ? 'success' : rate >= 50 ? 'warning' : 'danger';
  return (
    <div className="d-flex align-items-center gap-2">
      <ProgressBar variant={variant} now={rate} style={{ height: '10px', flex: 1, minWidth: '80px' }} />
      <span className="fw-bold" style={{ color: rateColor(rate), fontSize: '0.9rem', minWidth: '36px' }}>%{rate}</span>
    </div>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedBirim, setExpandedBirim] = useState(null);
  const [expandedGorev, setExpandedGorev] = useState(null);

  useEffect(() => {
    api.get('/admin/analytics').then(res => setData(res.data)).catch(console.error);
  }, []);

  if (!data) return <div className="p-5 text-center text-muted">📊 Analiz verileri yükleniyor...</div>;

  const { basicStats, questionStats, groupStats, birimStats, gorevStats, top5Hardest, top5MostSolved } = data;

  const passFailData = [
    { name: 'Başarılı', value: basicStats.passedCount },
    { name: 'Başarısız', value: basicStats.failedCount }
  ];

  const groupChartData = (groupStats || []).map(g => ({
    name: g.grup.length > 20 ? g.grup.substring(0, 20) + '…' : g.grup,
    Başarı: g.successRate,
    Hata: 100 - g.successRate,
    fullName: g.grup
  }));

  return (
    <div>
      {/* ── NAVİGASYON ── */}
      <Nav variant="tabs" className="mb-4 border-bottom">
        {[
          { key: 'overview',  label: '📋 Genel Bakış' },
          { key: 'groups',    label: '📚 Konu Analizi' },
          { key: 'birim',     label: '🏢 Birim Analizi' },
          { key: 'gorev',     label: '👔 Görev Analizi' },
          { key: 'questions', label: '❓ Soru İstatistikleri' },
        ].map(item => (
          <Nav.Item key={item.key}>
            <Nav.Link
              active={activeSection === item.key}
              onClick={() => setActiveSection(item.key)}
              className="fw-semibold"
            >
              {item.label}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {/* ══════════════════ GENEL BAKIŞ ══════════════════ */}
      {activeSection === 'overview' && (
        <div>
          <Row className="mb-4 g-3">
            <Col md={3}>
              <Card className="text-center shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg,#0d6efd,#0a58ca)', color: '#fff' }}>
                <Card.Body className="py-4">
                  <div style={{ fontSize: '2.5rem' }}>🗂️</div>
                  <h2 className="display-5 fw-bold mb-0">{basicStats.totalTests}</h2>
                  <p className="mb-0 opacity-75">Toplam Çözülen Sınav</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg,#20c997,#0ca678)', color: '#fff' }}>
                <Card.Body className="py-4">
                  <div style={{ fontSize: '2.5rem' }}>📊</div>
                  <h2 className="display-5 fw-bold mb-0">{basicStats.averageScore}</h2>
                  <p className="mb-0 opacity-75">Kurum Ortalama Puanı</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg,#198754,#146c43)', color: '#fff' }}>
                <Card.Body className="py-4">
                  <div style={{ fontSize: '2.5rem' }}>✅</div>
                  <h2 className="display-5 fw-bold mb-0">{basicStats.passedCount}</h2>
                  <p className="mb-0 opacity-75">Başarılı (60 ve üzeri)</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg,#dc3545,#b02a37)', color: '#fff' }}>
                <Card.Body className="py-4">
                  <div style={{ fontSize: '2.5rem' }}>❌</div>
                  <h2 className="display-5 fw-bold mb-0">{basicStats.failedCount}</h2>
                  <p className="mb-0 opacity-75">Başarısız</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            {/* Başarı/Başarısız Pie */}
            <Col md={4}>
              <Card className="shadow-sm border-0 h-100">
                <Card.Body>
                  <Card.Title className="fw-bold mb-3">Geçti / Kaldı Dağılımı</Card.Title>
                  <div style={{ height: '220px' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={passFailData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} stroke="none">
                          <Cell fill="#198754" />
                          <Cell fill="#dc3545" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="d-flex justify-content-center gap-4 mt-2">
                    <span><span style={{ background:'#198754', display:'inline-block', width:12, height:12, borderRadius:3, marginRight:4 }}></span>Başarılı</span>
                    <span><span style={{ background:'#dc3545', display:'inline-block', width:12, height:12, borderRadius:3, marginRight:4 }}></span>Başarısız</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* En Çok Hata Top5 */}
            <Col md={8}>
              <Card className="shadow-sm border-0 h-100">
                <Card.Body>
                  <Card.Title className="fw-bold mb-3">🔴 En Çok Hata Yapılan 5 Soru</Card.Title>
                  {(top5Hardest || []).length > 0 ? (
                    <Table size="sm" className="align-middle mb-0">
                      <thead className="table-light"><tr><th>#</th><th>Konu</th><th>Soru</th><th className="text-center">Hata Oranı</th></tr></thead>
                      <tbody>
                        {(top5Hardest || []).map((q, i) => (
                          <tr key={q._id}>
                            <td><Badge bg="danger" pill>{i + 1}</Badge></td>
                            <td><Badge bg="secondary" style={{ fontSize: '0.72rem' }}>{q.grup}</Badge></td>
                            <td style={{ maxWidth: 300 }}><small>{q.soru.substring(0, 80)}{q.soru.length > 80 ? '…' : ''}</small></td>
                            <td className="text-center"><DiffBadge diff={q.difficulty} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : <p className="text-muted">Yeterli veri yok.</p>}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* En Çok Çözülen Top5 */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">🏆 En Çok Çözülen 5 Soru</Card.Title>
              {(top5MostSolved || []).length > 0 ? (
                <Table size="sm" className="align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>#</th><th>Konu</th><th>Soru</th><th className="text-center">Sorulma</th><th className="text-center">Doğru</th><th className="text-center">Yanlış</th></tr>
                  </thead>
                  <tbody>
                    {(top5MostSolved || []).map((q, i) => (
                      <tr key={q._id}>
                        <td><Badge bg="primary" pill>{i + 1}</Badge></td>
                        <td><Badge bg="secondary" style={{ fontSize: '0.72rem' }}>{q.grup}</Badge></td>
                        <td style={{ maxWidth: 320 }}><small>{q.soru.substring(0, 90)}{q.soru.length > 90 ? '…' : ''}</small></td>
                        <td className="text-center fw-bold">{q.timesAsked}</td>
                        <td className="text-center text-success fw-bold">{q.correctCount}</td>
                        <td className="text-center text-danger fw-bold">{q.incorrectCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : <p className="text-muted">Yeterli veri yok.</p>}
            </Card.Body>
          </Card>
        </div>
      )}

      {/* ══════════════════ KONU ANALİZİ ══════════════════ */}
      {activeSection === 'groups' && (
        <div>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <Card.Title className="fw-bold mb-4">📚 Konu Başlıklarına Göre Başarı Oranı</Card.Title>
              {(groupStats || []).length > 0 ? (
                <div style={{ height: '320px' }}>
                  <ResponsiveContainer>
                    <BarChart data={groupChartData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `%${v}`} />
                      <YAxis type="category" dataKey="name" width={200} style={{ fontSize: '0.8rem' }} />
                      <Tooltip formatter={(v, name) => [`%${v}`, name]} />
                      <Legend />
                      <Bar dataKey="Başarı" stackId="a" fill="#198754" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Hata"   stackId="a" fill="#dc3545" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-muted">Henüz veri yok.</p>}
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">Konu Detayları</Card.Title>
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Konu Başlığı</th>
                    <th className="text-center">Toplam Soru Yanıtlandı</th>
                    <th className="text-center">Doğru</th>
                    <th className="text-center">Yanlış</th>
                    <th style={{ minWidth: '160px' }}>Başarı Oranı</th>
                  </tr>
                </thead>
                <tbody>
                  {(groupStats || []).map(g => (
                    <tr key={g.grup}>
                      <td className="fw-semibold">{g.grup}</td>
                      <td className="text-center">{g.timesAsked}</td>
                      <td className="text-center text-success fw-bold">{g.correctCount}</td>
                      <td className="text-center text-danger fw-bold">{g.incorrectCount}</td>
                      <td><RateBar rate={g.successRate} /></td>
                    </tr>
                  ))}
                  {(groupStats || []).length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">Veri yok.</td></tr>}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* ══════════════════ BİRİM ANALİZİ ══════════════════ */}
      {activeSection === 'birim' && (
        <div>
          <p className="text-muted mb-3">Her birimin ortalama sınavı skor, geçme oranı ve konu kırılımları aşağıda gösterilmektedir. Satıra tıklayın konu detaylarını genişletin.</p>
          {(birimStats || []).length === 0 ? (
            <Card className="shadow-sm border-0"><Card.Body className="text-center text-muted py-5">Henüz tamamlanmış sınav verisi yok.</Card.Body></Card>
          ) : (birimStats || []).map(b => (
            <Card key={b.birim} className="shadow-sm border-0 mb-3">
              <Card.Body
                className="py-3 px-4"
                style={{ cursor: 'pointer' }}
                onClick={() => setExpandedBirim(expandedBirim === b.birim ? null : b.birim)}
              >
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <h5 className="mb-1 fw-bold">🏢 {b.birim}</h5>
                    <small className="text-muted">{b.totalTests} sınav tamamlandı · {b.passed} başarılı, {b.failed} başarısız</small>
                  </div>
                  <div className="d-flex gap-4 align-items-center">
                    <div className="text-center">
                      <div className="fw-bold fs-4" style={{ color: rateColor(b.passRate) }}>{b.avgScore}</div>
                      <small className="text-muted">Ort. Puan</small>
                    </div>
                    <div className="text-center" style={{ minWidth: '130px' }}>
                      <RateBar rate={b.passRate} />
                      <small className="text-muted">Geçme Oranı</small>
                    </div>
                    <div className="text-secondary" style={{ fontSize: '1.2rem' }}>{expandedBirim === b.birim ? '▲' : '▼'}</div>
                  </div>
                </div>
              </Card.Body>
              {expandedBirim === b.birim && (
                <Card.Body className="pt-0 px-4 pb-3 border-top">
                  <h6 className="text-secondary fw-bold text-uppercase mb-2">Konu Bazlı Başarı Dağılımı</h6>
                  <Table size="sm" className="align-middle mb-0">
                    <thead className="table-light"><tr><th>Konu</th><th className="text-center">Yanıtlanan</th><th style={{ minWidth: '160px' }}>Başarı Oranı</th><th>Değerlendirme</th></tr></thead>
                    <tbody>
                      {b.groupBreakdown.map(gb => (
                        <tr key={gb.grup}>
                          <td>{gb.grup}</td>
                          <td className="text-center text-muted">{gb.total}</td>
                          <td><RateBar rate={gb.successRate} /></td>
                          <td>
                            {gb.successRate >= 75
                              ? <Badge bg="success">Güçlü Alan</Badge>
                              : gb.successRate >= 50
                                ? <Badge bg="warning" text="dark">Orta Alan</Badge>
                                : <Badge bg="danger">Zayıf Alan</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ══════════════════ GÖREV ANALİZİ ══════════════════ */}
      {activeSection === 'gorev' && (
        <div>
          <p className="text-muted mb-3">Her görev tanımının konu bazlı başarı ve zayıflık analizi.</p>
          {(gorevStats || []).length === 0 ? (
            <Card className="shadow-sm border-0"><Card.Body className="text-center text-muted py-5">Henüz tamamlanmış sınav verisi yok.</Card.Body></Card>
          ) : (gorevStats || []).map(g => (
            <Card key={g.gorev} className="shadow-sm border-0 mb-3">
              <Card.Body
                className="py-3 px-4"
                style={{ cursor: 'pointer' }}
                onClick={() => setExpandedGorev(expandedGorev === g.gorev ? null : g.gorev)}
              >
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <h5 className="mb-1 fw-bold">👔 {g.gorev}</h5>
                    <small className="text-muted">{g.totalTests} sınav · {g.passed} başarılı, {g.failed} başarısız</small>
                  </div>
                  <div className="d-flex gap-4 align-items-center">
                    <div className="text-center">
                      <div className="fw-bold fs-4" style={{ color: rateColor(g.passRate) }}>{g.avgScore}</div>
                      <small className="text-muted">Ort. Puan</small>
                    </div>
                    <div className="text-center" style={{ minWidth: '130px' }}>
                      <RateBar rate={g.passRate} />
                      <small className="text-muted">Geçme Oranı</small>
                    </div>
                    <div className="text-secondary" style={{ fontSize: '1.2rem' }}>{expandedGorev === g.gorev ? '▲' : '▼'}</div>
                  </div>
                </div>
              </Card.Body>
              {expandedGorev === g.gorev && (
                <Card.Body className="pt-0 px-4 pb-3 border-top">
                  <h6 className="text-secondary fw-bold text-uppercase mb-2">Konu Bazlı Başarı Dağılımı</h6>
                  <Table size="sm" className="align-middle mb-0">
                    <thead className="table-light"><tr><th>Konu</th><th className="text-center">Yanıtlanan</th><th style={{ minWidth: '160px' }}>Başarı Oranı</th><th>Değerlendirme</th></tr></thead>
                    <tbody>
                      {g.groupBreakdown.map(gb => (
                        <tr key={gb.grup}>
                          <td>{gb.grup}</td>
                          <td className="text-center text-muted">{gb.total}</td>
                          <td><RateBar rate={gb.successRate} /></td>
                          <td>
                            {gb.successRate >= 75
                              ? <Badge bg="success">Güçlü Alan</Badge>
                              : gb.successRate >= 50
                                ? <Badge bg="warning" text="dark">Orta Alan</Badge>
                                : <Badge bg="danger">Zayıf Alan</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ══════════════════ SORU İSTATİSTİKLERİ ══════════════════ */}
      {activeSection === 'questions' && (
        <div>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title className="fw-bold mb-0">Tüm Soruların Detaylı Analizi</Card.Title>
                <Badge bg="secondary" pill>{questionStats.length} soru kaydı</Badge>
              </div>
              <Table responsive hover size="sm" className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '40%' }}>Soru Metni</th>
                    <th>Grup</th>
                    <th className="text-center">Sorulma</th>
                    <th className="text-center text-success">Doğru</th>
                    <th className="text-center text-danger">Yanlış</th>
                    <th style={{ minWidth: '160px' }}>Başarı Oranı</th>
                    <th className="text-center">Zorluk</th>
                  </tr>
                </thead>
                <tbody>
                  {questionStats.map(qs => {
                    const successRate = qs.timesAsked ? Math.round((qs.correctCount / qs.timesAsked) * 100) : 0;
                    return (
                      <tr key={qs._id}>
                        <td><small>{qs.soru.substring(0, 80)}{qs.soru.length > 80 ? '…' : ''}</small></td>
                        <td><Badge bg="secondary" style={{ fontSize: '0.7rem' }}>{qs.grup}</Badge></td>
                        <td className="text-center">{qs.timesAsked}</td>
                        <td className="text-center text-success fw-bold">{qs.correctCount}</td>
                        <td className="text-center text-danger fw-bold">{qs.incorrectCount}</td>
                        <td><RateBar rate={successRate} /></td>
                        <td className="text-center"><DiffBadge diff={qs.difficulty} /></td>
                      </tr>
                    );
                  })}
                  {questionStats.length === 0 && (
                    <tr><td colSpan="7" className="text-center py-5 text-muted">Henüz çözülmüş test verisi yok.</td></tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
}

export default AnalyticsTab;
