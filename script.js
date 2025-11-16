// Storage helpers
const db = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  reset() {
    localStorage.clear();
    renderAll();
  }
};

// Models
// advogado: {id, nome, oab, email, esp}
// horario: {id, advId, datetimeISO, dur}
// agendamento: {id, advId, cli: {nome, email, tel}, horarioId, datetimeISO, dur}

function uid() { return Math.random().toString(36).slice(2, 9); }

function getAdvogados() { return db.get('advogados', []); }
function setAdvogados(list) { db.set('advogados', list); }

function getHorarios() { return db.get('horarios', []); }
function setHorarios(list) { db.set('horarios', list); }

function getAgend() { return db.get('agendamentos', []); }
function setAgend(list) { db.set('agendamentos', list); }

// Seed with example data if empty
(function seed() {
  if (getAdvogados().length === 0) {
    const a1 = { id: uid(), nome: "Dra. Ana Passos", esp: "Cível", oab: "OAB/ES 12345", email: "ana@passosesousa.com" };
    const a2 = { id: uid(), nome: "Dr. Bruno Sousa", esp: "Trabalhista", oab: "OAB/ES 67890", email: "bruno@passosesousa.com" };
    setAdvogados([a1, a2]);

    const today = new Date();
    today.setHours(0,0,0,0);
    const h1 = { id: uid(), advId: a1.id, datetimeISO: new Date(today.getFullYear(), today.getMonth(), today.getDate()+1, 10, 0).toISOString(), dur: 60 };
    const h2 = { id: uid(), advId: a1.id, datetimeISO: new Date(today.getFullYear(), today.getMonth(), today.getDate()+1, 14, 0).toISOString(), dur: 60 };
    const h3 = { id: uid(), advId: a2.id, datetimeISO: new Date(today.getFullYear(), today.getMonth(), today.getDate()+2, 9, 30).toISOString(), dur: 45 };
    setHorarios([h1, h2, h3]);
  }
})();

// UI bindings
const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// Admin: cadastrar advogado
document.getElementById('form-adv')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('adv-nome').value.trim();
  const oab = document.getElementById('adv-oab').value.trim();
  const esp = document.getElementById('adv-esp').value;
  const email = document.getElementById('adv-email').value.trim();
  const novo = { id: uid(), nome, oab, esp, email };
  setAdvogados([...getAdvogados(), novo]);
  (e.target).reset();
  renderAll();
});

document.getElementById('btn-reset-db')?.addEventListener('click', () => {
  if (confirm('Tem certeza que deseja limpar todos os dados do protótipo?')) {
    db.reset();
  }
});

// Admin: adicionar horário
document.getElementById('form-hor')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const advId = document.getElementById('sel-adv-hor').value;
  const data = document.getElementById('hor-data').value;
  const hora = document.getElementById('hor-hora').value;
  const dur = parseInt(document.getElementById('hor-dur').value, 10);
  if (!advId) { alert('Selecione o advogado.'); return; }
  const iso = new Date(`${data}T${hora}:00`).toISOString();
  const novo = { id: uid(), advId, datetimeISO: iso, dur };
  setHorarios([...getHorarios(), novo]);
  (e.target).reset();
  renderHorariosAdmin();
  renderCliente();
});

// Cliente: escolha advogado -> atualiza especialidade e horários
document.getElementById('cli-adv')?.addEventListener('change', () => {
  updateCliEspecialidade();
  updateCliHorarios();
});

document.getElementById('form-cli')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('cli-nome').value.trim();
  const email = document.getElementById('cli-email').value.trim();
  const tel = document.getElementById('cli-tel').value.trim();
  const advId = document.getElementById('cli-adv').value;
  const horarioId = document.getElementById('cli-hor').value;

  if (!advId || !horarioId) { alert('Selecione advogado e horário.'); return; }

  // Snapshot datetime/duration before removing slot
  const h = getHorarios().find(x => x.id === horarioId);
  const ag = { id: uid(), advId, horarioId, datetimeISO: h?.datetimeISO, dur: h?.dur, cli: { nome, email, tel } };
  console.log('Agendamento salvo:', ag);
  setAgend([...getAgend(), ag]);
  // remove horário da lista de disponíveis
  setHorarios(getHorarios().filter(h => h.id !== horarioId));
  (e.target).reset();
  renderAll();
  renderAgendamentosList();
  alert('Agendamento confirmado!');
});

// Render helpers
function renderAdvogadosGrid() {
  const grid = document.getElementById('grid-advogados');
  if (!grid) return;
  const advs = getAdvogados();
  grid.innerHTML = '';
  advs.forEach(a => {
    const card = document.createElement('div');
    card.className = 'col-md-6 col-xl-4';
    card.innerHTML = `
      <div class="card h-100 adv-card">
        <div class="card-body">
          <h3 class="h6 mb-1">${a.nome}</h3>
          <div class="text-secondary small mb-2">${a.oab || ''}</div>
          <span class="badge rounded-pill">${a.esp}</span>
          <div class="small mt-2">${a.email || ''}</div>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

function renderSelAdvHor() {
  const sel = document.getElementById('sel-adv-hor');
  if (!sel) return;
  const advs = getAdvogados();
  sel.innerHTML = '<option value="" disabled selected>Selecione</option>' + advs.map(a => `<option value="${a.id}">${a.nome} — ${a.esp}</option>`).join('');
}

function renderHorariosAdmin() {
  const target = document.getElementById('lista-horarios');
  const advId = document.getElementById('sel-adv-hor')?.value;
  if (!target) return;
  target.innerHTML = '';
  if (!advId) return;
  const list = getHorarios().filter(h => h.advId === advId).sort((a,b) => a.datetimeISO.localeCompare(b.datetimeISO));
  if (list.length === 0) {
    target.innerHTML = '<li class="list-group-item text-secondary">Nenhum horário cadastrado.</li>';
    return;
  }
  list.forEach(h => {
    const dt = new Date(h.datetimeISO);
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<span>${dt.toLocaleDateString()} às ${dt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} — ${h.dur} min</span>
                    <button class="btn btn-sm btn-outline-danger">Excluir</button>`;
    li.querySelector('button').addEventListener('click', () => {
      setHorarios(getHorarios().filter(x => x.id !== h.id));
      renderHorariosAdmin();
      renderCliente();
    });
    target.appendChild(li);
  });
}

// cliente side
function updateCliEspecialidade() {
  const advId = document.getElementById('cli-adv').value;
  const a = getAdvogados().find(x => x.id === advId);
  document.getElementById('cli-esp').textContent = a ? `Especialidade: ${a.esp}` : '';
}

function updateCliHorarios() {
  const sel = document.getElementById('cli-hor');
  const advId = document.getElementById('cli-adv').value;
  const list = getHorarios().filter(h => h.advId === advId).sort((a,b)=>a.datetimeISO.localeCompare(b.datetimeISO));
  sel.innerHTML = list.length ? list.map(h => {
    const dt = new Date(h.datetimeISO);
    return `<option value="${h.id}">${dt.toLocaleDateString()} — ${dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} (${h.dur} min)</option>`;
  }).join('') : '<option disabled selected>Nenhum horário disponível</option>';
}

function renderAgendamentosList(){
  const ul = document.getElementById('lista-agendamentos');
  if (!ul) return;
  const list = getAgend();
  ul.innerHTML = '';
  if (!list.length) {
    ul.innerHTML = '<li class="list-group-item text-secondary">Nenhum agendamento efetuado.</li>';
    return;
  }
  list.forEach(ag => {
    const a = getAdvogados().find(x => x.id === ag.advId);
    const dt = ag.datetimeISO ? new Date(ag.datetimeISO) : null;
    const when = dt ? `${dt.toLocaleDateString()} — ${dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : '(data indisponível)';
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.innerHTML = `<div class="d-flex justify-content-between align-items-start">
      <div>
        <div class="fw-semibold">${a ? a.nome : 'Advogado(a) removido(a)'}</div>
        <div class="small text-secondary">${when} — ${ag.dur || ''} min</div>
        <div class="small">${ag.cli.nome} — ${ag.cli.email} — ${ag.cli.tel}</div>
      </div>
      <button class="btn btn-sm btn-outline-danger">Cancelar</button>
    </div>`;
    li.querySelector('button').addEventListener('click', () => {
      if (confirm('Cancelar este agendamento?')) {
        // devolver horário para disponibilidade
        setHorarios([...getHorarios(), { id: ag.horarioId, advId: ag.advId, datetimeISO: ag.datetimeISO, dur: ag.dur }]);
        setAgend(getAgend().filter(x => x.id !== ag.id));
        renderAll();
      }
    });
    ul.appendChild(li);
  });
}

function renderCliente() {
  // preencher advogados
  const selAdv = document.getElementById('cli-adv');
  const advs = getAdvogados();
  if (!selAdv) return;
  const current = selAdv.value;
  selAdv.innerHTML = '<option value="" disabled selected>Selecione</option>' + advs.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
  selAdv.value = current;
  updateCliEspecialidade();
  updateCliHorarios();
}

function renderAll() {
  renderAdvogadosGrid();
  renderSelAdvHor();
  renderHorariosAdmin();
  renderCliente();
  renderAgendamentosList();
}
renderAll();

// Atualiza lista de horários quando muda advogado selecionado no admin
document.getElementById('sel-adv-hor')?.addEventListener('change', renderHorariosAdmin);
