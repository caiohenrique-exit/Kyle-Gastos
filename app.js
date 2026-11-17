// ---------- Estado e utilidades ----------

const state = { data: null, view: 'home', month: ymNow(), filtroCat: null, filtroPessoa: null, filtroTipo: null, busca: '', filtrosAbertos: false };

const ICONS = { plane: 'ti-plane', car: 'ti-car', chart: 'ti-chart-line', shield: 'ti-shield-check', home: 'ti-home', laptop: 'ti-device-laptop', gift: 'ti-gift', school: 'ti-school' };
const ICON_LABELS = { plane: 'Viagem', car: 'Carro', chart: 'Investimentos', shield: 'Reserva', home: 'Casa', laptop: 'Tecnologia', gift: 'Presente', school: 'Estudos' };
const COLORS = [['#5EE7F5', 'Ciano'], ['#F472B6', 'Rosa'], ['#FDE68A', 'Amarelo'], ['#818CF8', 'Violeta'], ['#86EFAC', 'Verde'], ['#FB923C', 'Laranja'], ['#E879F9', 'Lilás'], ['#A9B3E6', 'Cinza']];

// Palavras comuns que indicam a categoria no registro rápido
const PALAVRAS = {
  alimentacao: ['mercado', 'supermercado', 'padaria', 'ifood', 'restaurante', 'lanche'],
  transporte: ['uber', 'gasolina', 'onibus', 'metro', 'combustivel', 'estacionamento'],
  moradia: ['aluguel', 'luz', 'agua', 'condominio', 'internet'],
  assinaturas: ['netflix', 'spotify', 'youtube', 'icloud'],
  saude: ['farmacia', 'remedio', 'consulta', 'dentista'],
  lazer: ['cinema', 'bar', 'show'],
};

const ITEM_H = 44; // altura de cada linha do rolete de data

function $(sel) { return document.querySelector(sel); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function brl(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function localISO(d = new Date()) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
function todayISO() { return localISO(); }
function ymNow() { return todayISO().slice(0, 7); }
function shiftMonth(ym, delta) { const [y, m] = ym.split('-').map(Number); return localISO(new Date(y, m - 1 + delta, 1)).slice(0, 7); }
function monthLabel(ym) { const [y, m] = ym.split('-').map(Number); const t = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); }
function monthIndex(ym) { const [y, m] = ym.split('-').map(Number); return y * 12 + (m - 1); }
function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function sum(arr) { return arr.reduce((t, x) => t + x, 0); }

// "1.234,50" -> 1234.5 | "6.200" -> 6200 | "186.40" -> 186.4
function parseAmount(s) {
  let t = String(s || '').replace(/R\$/i, '').replace(/\s/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return isNaN(n) ? 0 : n;
}
function toDisplay(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
function fromDisplay(s) {
  const m = String(s).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]), mes = Number(m[2]), ano = Number(m[3]);
  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
// Soma meses a uma data ISO, mantendo o dia (ou o último dia do mês, se não existir)
function addMonthsISO(iso, k) {
  const [y, m, d] = iso.split('-').map(Number);
  const ref = new Date(y, m - 1 + k, 1);
  const ultimo = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`;
}

function txOfMonth(ym) { return state.data.transactions.filter(t => t.date.startsWith(ym)); }
function spendOf(list, categoryId) { return sum(list.filter(t => t.type === 'despesa' && t.categoryId === categoryId).map(t => t.amount)); }
function totalOf(list, tipo) { return sum(list.filter(t => t.type === tipo).map(t => t.amount)); }
function catById(id) { return state.data.categories.find(c => c.id === id); }
function monthsUntil(iso) {
  const agora = new Date();
  const [y, m] = iso.slice(0, 7).split('-').map(Number);
  return Math.max(1, (y - agora.getFullYear()) * 12 + (m - (agora.getMonth() + 1)));
}

// Responsável: 'caio', 'esposa' ou 'casa'. Lançamentos antigos sem campo recebem um padrão.
function txOwner(t) { return t.owner || (t.type === 'receita' ? 'caio' : 'casa'); }
function goalOwner(g) { return g.owner || 'casa'; }
function nomeDe(p) { return p === 'casa' ? 'Casa' : (state.data.settings.nomes[p] || p); }
function tagDono(p) { return `<span class="owner owner-${p}">${esc(nomeDe(p))}</span>`; }
// Receitas só podem ser de uma pessoa; despesas também podem ser da casa
function ownerOptions(tipo) {
  const base = [['caio', nomeDe('caio')], ['esposa', nomeDe('esposa')]];
  return tipo === 'receita' ? base : [...base, ['casa', 'Casa']];
}

// Conta parcelada só aparece nos meses das suas parcelas; conta fixa aparece todo mês
function billActive(b, mes) {
  if (!b.parcelas) return true;
  const i = monthIndex(mes) - monthIndex(b.inicio || mes);
  return i >= 0 && i < b.parcelas;
}

function billStatus(b) {
  const hojeDia = Number(todayISO().slice(8, 10));
  if (b.paidMonth === ymNow()) return { paid: true };
  const diff = b.dueDay - hojeDia;
  const label = diff < 0 ? 'Atrasada' : diff === 0 ? 'Vence hoje' : `Vence em ${diff} dia${diff > 1 ? 's' : ''}`;
  return { paid: false, diff, label };
}

// Divisão do mês: quanto cada pessoa gasta da casa e quanto sobra para as metas dela
function calcularDivisao(ym) {
  const tx = txOfMonth(ym);
  const pessoas = ['caio', 'esposa'];
  const receitas = {};
  pessoas.forEach(p => { receitas[p] = sum(tx.filter(t => t.type === 'receita' && txOwner(t) === p).map(t => t.amount)); });
  const totalRec = receitas.caio + receitas.esposa;
  const casa = sum(tx.filter(t => t.type === 'despesa' && txOwner(t) === 'casa').map(t => t.amount));

  const resultado = {};
  pessoas.forEach(p => {
    const share = state.data.settings.divisao === 'metade' || totalRec === 0 ? 0.5 : receitas[p] / totalRec;
    const pessoais = sum(tx.filter(t => t.type === 'despesa' && txOwner(t) === p).map(t => t.amount));
    const parte = casa * share;
    resultado[p] = { receita: receitas[p], pessoais, parte, share, sobra: receitas[p] - pessoais - parte };
  });
  return { casa, resultado, sobraTotal: resultado.caio.sobra + resultado.esposa.sobra };
}

// Salva no arquivo e redesenha a tela
function commit(fn) {
  fn(state.data);
  window.api.salvar(state.data);
  render();
}

// ---------- Início ----------

function init() {
  window.api.carregar().then(dados => {
    state.data = dados;
    if (!state.data.settings) state.data.settings = { nomes: { caio: 'Caio', esposa: 'Esposa' }, divisao: 'renda' };
    document.querySelectorAll('.sidebar [data-view]').forEach(b => {
      b.addEventListener('click', () => {
        state.view = b.dataset.view;
        render();
      });
    });
    if ($('#quickForm')) $('#quickForm').addEventListener('submit', onQuick);
    $('#btnNew').addEventListener('click', () => openTx());
    document.addEventListener('click', onAction);
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-wheel]');
      if (b) abrirRoleta(b.previousElementSibling, b);
    });
    // Busca atualiza só a lista, para o campo não perder o foco
    document.addEventListener('input', e => {
      if (e.target.id === 'busca') { state.busca = e.target.value; atualizarListaTx(); }
    });
    // Lembra se a caixa de filtros estava aberta
    document.addEventListener('toggle', e => {
      if (e.target.id === 'filtros') state.filtrosAbertos = e.target.open;
    }, true);
    render();
  }).catch(err => {
    alert('Não consegui abrir os dados salvos: ' + err.message);
  });
}
document.addEventListener('DOMContentLoaded', init);

function render() {
  document.querySelectorAll('.sidebar [data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
  const telas = { home: viewHome, transactions: viewTransactions, casal: viewCasal, bills: viewBills, goals: viewGoals, reports: viewReports, categories: viewCategories, settings: viewSettings };
  $('#view').innerHTML = telas[state.view]();
}

// ---------- Registro rápido por frase ----------

function parseQuick(texto) {
  const r = { amount: 0, date: todayISO(), type: 'despesa', categoryId: null, owner: null, note: [] };
  const nomeCaio = norm(nomeDe('caio'));
  const nomeEsposa = norm(nomeDe('esposa'));

  for (const raw of texto.split(/\s+/)) {
    const t = norm(raw);
    if (!t || t === 'r$' || t === 'r') continue;
    if (t === 'hoje') { r.date = todayISO(); continue; }
    if (t === 'ontem') { const d = new Date(); d.setDate(d.getDate() - 1); r.date = localISO(d); continue; }
    if (['receita', 'recebi', 'entrada', '+'].includes(t)) { r.type = 'receita'; continue; }
    if (['despesa', 'gastei', 'paguei'].includes(t)) { r.type = 'despesa'; continue; }

    if (t === nomeCaio) { r.owner = 'caio'; continue; }
    if (t === nomeEsposa) { r.owner = 'esposa'; continue; }
    if (t === 'casa') { r.owner = 'casa'; continue; }

    const dm = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (dm) {
      let ano = dm[3] || String(new Date().getFullYear());
      if (ano.length === 2) ano = '20' + ano;
      r.date = `${ano}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
      continue;
    }

    const valorTxt = raw.replace(/^r\$/i, '');
    if (r.amount === 0 && /^(\d{1,3}(\.\d{3})+|\d+)([.,]\d{1,2})?$/.test(valorTxt)) {
      r.amount = parseAmount(valorTxt);
      continue;
    }

    if (!r.categoryId && t.length >= 3) {
      const cat = state.data.categories.find(c => norm(c.name).startsWith(t));
      if (cat) { r.categoryId = cat.id; continue; }
      const chave = Object.keys(PALAVRAS).find(id => PALAVRAS[id].includes(t) && catById(id));
      if (chave) { r.categoryId = chave; continue; }
    }
    r.note.push(raw);
  }

  if (!r.owner) r.owner = r.type === 'receita' ? 'caio' : 'casa';
  if (r.type === 'receita' && r.owner === 'casa') r.owner = 'caio';
  if (!r.categoryId) {
    const padrao = catById('outros') || state.data.categories[0];
    r.categoryId = padrao ? padrao.id : null;
  }
  r.note = r.note.join(' ');
  return r;
}

function onQuick(e) {
  e.preventDefault();
  const texto = $('#quickInput').value.trim();
  if (!texto) return;
  openTx(null, parseQuick(texto));
  $('#quickInput').value = '';
}

// ---------- Ações (cliques) ----------

function onAction(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id, delta, cat, pessoa, tipo, view } = el.dataset;
  switch (action) {
    case 'go': state.view = view; render(); break;
    case 'month': state.month = shiftMonth(state.month, Number(delta)); render(); break;
    case 'filter': state.filtroCat = cat || null; render(); break;
    case 'filter-pessoa': state.filtroPessoa = pessoa || null; render(); break;
    case 'filter-tipo': state.filtroTipo = tipo || null; render(); break;
    case 'edit-tx': openTx(state.data.transactions.find(t => t.id === id)); break;
    case 'toggle-bill': commit(d => {
      const b = d.bills.find(x => x.id === id);
      b.paidMonth = b.paidMonth === ymNow() ? undefined : ymNow();
    }); break;
    case 'new-bill': openBill(); break;
    case 'edit-bill': openBill(state.data.bills.find(b => b.id === id)); break;
    case 'new-goal': openGoal(); break;
    case 'edit-goal': openGoal(state.data.goals.find(g => g.id === id)); break;
    case 'deposit': openDeposit(state.data.goals.find(g => g.id === id)); break;
    case 'new-cat': openCat(); break;
    case 'edit-cat': openCat(state.data.categories.find(c => c.id === id)); break;
    case 'toggle-split': commit(d => { d.settings.divisao = d.settings.divisao === 'renda' ? 'metade' : 'renda'; }); break;
    case 'edit-names': openNames(); break;
    case 'export': exportarBackup(); break;
    case 'import': importarBackup(); break;
  }
}

// ---------- Rolete de data (estilo relógio de alarme do iPhone) ----------

function dateField(nome, rotulo, iso) {
  return `<div class="field"><span>${rotulo}</span><input type="hidden" name="${nome}" value="${esc(iso || '')}" /><button type="button" class="date-btn" data-wheel>${iso ? esc(toDisplay(iso)) : 'Escolher data'}</button></div>`;
}

function abrirRoleta(hidden, btn) {
  if (!hidden) return;
  const dlg = $('#modal');
  const [a0, m0, d0] = (hidden.value || todayISO()).split('-').map(Number);
  const anoMin = 2020;
  const anoMax = Math.max(2040, a0 + 5);

  const folha = document.createElement('div');
  folha.className = 'wheel-sheet';
  folha.innerHTML = `
    <div class="wheel-head"><button type="button" class="ghost" data-w="cancel">Cancelar</button><b>Escolher data</b><button type="button" class="primary" data-w="ok">Pronto</button></div>
    <div class="wheel-body">
      <div class="wheel-band"></div>
      <div class="wheel-col" data-col="dia"></div>
      <div class="wheel-col" data-col="mes"></div>
      <div class="wheel-col" data-col="ano"></div>
    </div>`;
  dlg.appendChild(folha);

  const col = { dia: folha.querySelector('[data-col=dia]'), mes: folha.querySelector('[data-col=mes]'), ano: folha.querySelector('[data-col=ano]') };
  const indice = c => Math.round(c.scrollTop / ITEM_H);
  const valor = {
    dia: () => indice(col.dia) + 1,
    mes: () => indice(col.mes) + 1,
    ano: () => anoMin + indice(col.ano),
  };
  const marcar = c => [...c.children].forEach((el, k) => el.classList.toggle('sel', k === indice(c)));
  const irPara = (c, idx) => { c.scrollTop = idx * ITEM_H; marcar(c); };
  const preencher = (c, valores, rotulo) => { c.innerHTML = valores.map(v => `<div class="wheel-item">${rotulo(v)}</div>`).join(''); };
  const dois = n => String(n).padStart(2, '0');
  const diasDoMes = () => new Date(valor.ano(), valor.mes(), 0).getDate();

  // Ajusta a coluna de dias ao mês e ano escolhidos, mantendo o dia quando possível
  const montarDias = () => {
    const antes = valor.dia();
    const total = diasDoMes();
    preencher(col.dia, Array.from({ length: total }, (_, i) => i + 1), dois);
    irPara(col.dia, Math.min(antes, total) - 1);
  };

  preencher(col.dia, Array.from({ length: 31 }, (_, i) => i + 1), dois);
  irPara(col.dia, d0 - 1);
  preencher(col.mes, Array.from({ length: 12 }, (_, i) => i + 1), v => NOMES_MESES[v - 1]);
  irPara(col.mes, m0 - 1);
  preencher(col.ano, Array.from({ length: anoMax - anoMin + 1 }, (_, i) => anoMin + i), String);
  irPara(col.ano, a0 - anoMin);
  montarDias();

  let espera;
  Object.values(col).forEach(c => {
    c.addEventListener('scroll', () => {
      marcar(c);
      if (c !== col.dia) { clearTimeout(espera); espera = setTimeout(montarDias, 120); }
    }, { passive: true });
    c.addEventListener('click', e => {
      const el = e.target.closest('.wheel-item');
      if (el) irPara(c, [...c.children].indexOf(el));
    });
  });

  folha.addEventListener('click', e => {
    const b = e.target.closest('[data-w]');
    if (!b) return;
    if (b.dataset.w === 'ok') {
      const iso = `${valor.ano()}-${dois(valor.mes())}-${dois(valor.dia())}`;
      hidden.value = iso;
      btn.textContent = toDisplay(iso);
    }
    folha.remove();
  });
}
const NOMES_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// ---------- Janela de formulário ----------

function field(label, html) { return `<label class="field"><span>${label}</span>${html}</label>`; }
function opt(valor, rotulo, selecionado) { return `<option value="${esc(valor)}" ${valor === selecionado ? 'selected' : ''}>${esc(rotulo)}</option>`; }

function openForm({ title, body, onSubmit, onDelete }) {
  const dlg = $('#modal');
  const form = $('#modalForm');
  form.innerHTML = `
    <h2>${esc(title)}</h2>
    ${body}
    <p class="error" id="formError"></p>
    <div class="actions">
      ${onDelete ? '<button type="button" class="danger" id="btnDelete">Excluir</button>' : ''}
      <span class="spacer"></span>
      <button type="button" class="ghost" id="btnCancel">Cancelar</button>
      <button type="submit" class="primary">Salvar</button>
    </div>`;
  form.onsubmit = (e) => {
    e.preventDefault();
    const erro = onSubmit(Object.fromEntries(new FormData(form)));
    if (erro) { $('#formError').textContent = erro; return; }
    dlg.close();
  };
  $('#btnCancel').onclick = () => dlg.close();
  if (onDelete) {
    $('#btnDelete').onclick = () => {
      if (confirm('Excluir este item? Essa ação não pode ser desfeita.')) {
        onDelete();
        dlg.close();
      }
    };
  }
  dlg.showModal();
}

function openTx(tx, pre) {
  const v = tx || pre || { type: 'despesa', amount: 0, categoryId: state.data.categories[0]?.id, date: todayISO(), note: '' };
  const dono = tx ? txOwner(tx) : (pre ? pre.owner : (v.type === 'receita' ? 'caio' : 'casa'));
  const valor = v.amount ? String(v.amount).replace('.', ',') : '';
  openForm({
    title: tx ? 'Editar lançamento' : 'Novo lançamento',
    body:
      field('Tipo', `<select name="type">${opt('despesa', 'Despesa', v.type)}${opt('receita', 'Receita', v.type)}</select>`) +
      field('Responsável', `<select name="owner">${ownerOptions(v.type).map(([k, l]) => opt(k, l, dono)).join('')}</select>`) +
      field('Valor (R$)', `<input name="amount" value="${esc(valor)}" inputmode="decimal" />`) +
      `<div id="campoCategoria">${field('Categoria', `<select name="categoryId">${state.data.categories.map(c => opt(c.id, c.name, v.categoryId)).join('')}</select>`)}</div>` +
      dateField('date', 'Data', v.date) +
      (tx ? '' : '<label class="check"><input type="checkbox" name="repetir" /> Repetir todo mês (12 meses)</label>') +
      field('<span id="labelNota">Observação</span>', `<input name="note" value="${esc(v.note || '')}" />`),
    onSubmit: (f) => {
      const amount = parseAmount(f.amount);
      if (!(amount > 0)) return 'Digite um valor maior que zero.';
      const date = f.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Escolha uma data.';
      const owner = f.type === 'receita' && f.owner === 'casa' ? 'caio' : f.owner;
      const novo = { id: tx ? tx.id : uid(), type: f.type, amount, categoryId: f.type === 'receita' ? null : f.categoryId, date, owner, note: f.note.trim() || undefined };
      const copias = !tx && f.repetir ? Array.from({ length: 11 }, (_, k) => ({ ...novo, id: uid(), date: addMonthsISO(date, k + 1) })) : [];
      commit(d => {
        d.transactions = tx ? d.transactions.map(x => (x.id === tx.id ? novo : x)) : [novo, ...copias, ...d.transactions];
      });
      return null;
    },
    onDelete: tx ? () => commit(d => { d.transactions = d.transactions.filter(x => x.id !== tx.id); }) : null,
  });

  // Ao trocar o tipo, a lista de responsáveis acompanha (receita não aceita "Casa")
  const selTipo = $('#modalForm [name=type]');
  const selDono = $('#modalForm [name=owner]');
  const ajustarTipo = () => {
    const atual = selDono.value;
    selDono.innerHTML = ownerOptions(selTipo.value).map(([k, l]) => opt(k, l, atual)).join('');
    const receita = selTipo.value === 'receita';
    $('#campoCategoria').style.display = receita ? 'none' : '';
    $('#labelNota').textContent = receita ? 'Nome' : 'Observação';
  };
  selTipo.onchange = ajustarTipo;
  ajustarTipo();
}

function openBill(b) {
  openForm({
    title: b ? 'Editar conta' : 'Nova conta',
    body:
      field('Nome', `<input name="name" value="${esc(b ? b.name : '')}" placeholder="Ex.: Aluguel" />`) +
      field('Valor (R$)', `<input name="amount" value="${b ? esc(String(b.amount).replace('.', ',')) : ''}" inputmode="decimal" />`) +
      field('Dia de vencimento (1 a 28)', `<input name="dueDay" value="${b ? esc(b.dueDay) : ''}" inputmode="numeric" />`) +
      field('Parcelas (1 = conta fixa, todo mês)', `<input name="parcelas" value="${esc(b && b.parcelas ? b.parcelas : 1)}" inputmode="numeric" />`),
    onSubmit: (f) => {
      const nome = f.name.trim();
      const valor = parseAmount(f.amount);
      const dia = Number(f.dueDay);
      const parcelas = Number(f.parcelas || 1);
      if (!nome) return 'Digite o nome da conta.';
      if (!(valor > 0)) return 'Digite um valor maior que zero.';
      if (!Number.isInteger(dia) || dia < 1 || dia > 28) return 'Use um dia entre 1 e 28.';
      if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 60) return 'Use de 1 a 60 parcelas.';
      const parcelada = parcelas > 1;
      commit(d => {
        if (b) Object.assign(b, { name: nome, amount: valor, dueDay: dia, parcelas: parcelada ? parcelas : undefined, inicio: parcelada ? (b.inicio || ymNow()) : undefined });
        else d.bills.push({ id: uid(), name: nome, amount: valor, dueDay: dia, parcelas: parcelada ? parcelas : undefined, inicio: parcelada ? ymNow() : undefined });
      });
      return null;
    },
    onDelete: b ? () => commit(d => { d.bills = d.bills.filter(x => x.id !== b.id); }) : null,
  });
}

function openGoal(g) {
  openForm({
    title: g ? 'Editar meta' : 'Nova meta',
    body:
      field('Nome', `<input name="name" value="${esc(g ? g.name : '')}" placeholder="Ex.: Viagem para Europa" />`) +
      field('De quem é a meta', `<select name="owner">${ownerOptions('despesa').map(([k, l]) => opt(k, l, g ? goalOwner(g) : 'caio')).join('')}</select>`) +
      field('Valor alvo (R$)', `<input name="target" value="${g ? esc(String(g.target).replace('.', ',')) : ''}" inputmode="decimal" />`) +
      field('Já guardado (R$)', `<input name="saved" value="${g ? esc(String(g.saved).replace('.', ',')) : '0'}" inputmode="decimal" />`) +
      dateField('deadline', 'Prazo (opcional)', g && g.deadline) +
      field('Reservar % da receita por mês (opcional)', `<input name="reservaPct" value="${g && g.reservaPct ? esc(String(g.reservaPct).replace('.', ',')) : ''}" inputmode="decimal" placeholder="Ex.: 20" />`) +
      field('Ícone', `<select name="icon">${Object.keys(ICONS).map(k => opt(k, ICON_LABELS[k], g ? g.icon : 'plane')).join('')}</select>`) +
      field('Cor', `<select name="color">${COLORS.map(([c, n]) => opt(c, n, g ? g.color : COLORS[0][0])).join('')}</select>`),
    onSubmit: (f) => {
      const nome = f.name.trim();
      const target = parseAmount(f.target);
      const saved = parseAmount(f.saved);
      const reservaPct = f.reservaPct.trim() ? parseAmount(f.reservaPct) : 0;
      if (!nome) return 'Digite o nome da meta.';
      if (!(target > 0)) return 'Digite um valor alvo maior que zero.';
      if (saved < 0) return 'O valor guardado não pode ser negativo.';
      if (reservaPct < 0 || reservaPct > 100) return 'A reserva deve ficar entre 0% e 100%.';
      let deadline = null;
      if (f.deadline.trim()) {
        deadline = f.deadline.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return 'Escolha uma data válida para o prazo.';
      }
      const dados = { name: nome, owner: f.owner, target, saved, deadline, reservaPct: reservaPct || undefined, icon: f.icon, color: f.color };
      commit(d => {
        if (g) Object.assign(g, dados);
        else d.goals.push({ id: uid(), ...dados });
      });
      return null;
    },
    onDelete: g ? () => commit(d => { d.goals = d.goals.filter(x => x.id !== g.id); }) : null,
  });
}

function openDeposit(g) {
  openForm({
    title: `Depositar em "${g.name}"`,
    body: field('Valor a adicionar (R$)', `<input name="amount" inputmode="decimal" placeholder="0,00" />`),
    onSubmit: (f) => {
      const v = parseAmount(f.amount);
      if (!(v > 0)) return 'Digite um valor maior que zero.';
      commit(() => { g.saved = Math.round((g.saved + v) * 100) / 100; });
      return null;
    },
  });
}

function openCat(c) {
  const usada = c ? state.data.transactions.some(t => t.categoryId === c.id) : false;
  openForm({
    title: c ? 'Editar categoria' : 'Nova categoria',
    body:
      field('Nome', `<input name="name" value="${esc(c ? c.name : '')}" />`) +
      field('Cor', `<select name="color">${COLORS.map(([col, n]) => opt(col, n, c ? c.color : COLORS[0][0])).join('')}</select>`) +
      field('Limite mensal (opcional, R$)', `<input name="limit" value="${c && c.monthlyLimit ? esc(String(c.monthlyLimit).replace('.', ',')) : ''}" inputmode="decimal" placeholder="Sem limite" />`) +
      (usada ? '<p class="muted small">Esta categoria tem lançamentos, por isso não pode ser excluída.</p>' : ''),
    onSubmit: (f) => {
      const nome = f.name.trim();
      if (!nome) return 'Digite o nome da categoria.';
      const limite = parseAmount(f.limit);
      const dados = { name: nome, color: f.color, monthlyLimit: limite > 0 ? limite : undefined };
      commit(d => {
        if (c) Object.assign(c, dados);
        else d.categories.push({ id: uid(), ...dados });
      });
      return null;
    },
    onDelete: c && !usada ? () => commit(d => { d.categories = d.categories.filter(x => x.id !== c.id); }) : null,
  });
}

function openNames() {
  const nomes = state.data.settings.nomes;
  openForm({
    title: 'Nomes do casal',
    body:
      field('Seu nome', `<input name="caio" value="${esc(nomes.caio)}" />`) +
      field('Nome da sua esposa', `<input name="esposa" value="${esc(nomes.esposa)}" />`),
    onSubmit: (f) => {
      const a = f.caio.trim();
      const b = f.esposa.trim();
      if (!a || !b) return 'Preencha os dois nomes.';
      commit(d => { d.settings.nomes = { caio: a, esposa: b }; });
      return null;
    },
  });
}

// ---------- Backup ----------

function exportarBackup() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kyle-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importarBackup() {
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = '.json,application/json';
  entrada.style.display = 'none';
  document.body.appendChild(entrada);
  entrada.onchange = () => {
    const arquivo = entrada.files[0];
    entrada.remove();
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      let novo = null;
      try { novo = JSON.parse(leitor.result); } catch (err) { novo = null; }
      if (!novo || !Array.isArray(novo.transactions) || !Array.isArray(novo.categories) || !Array.isArray(novo.bills) || !Array.isArray(novo.goals)) {
        alert('Este arquivo não é um backup do Kyle Contabilidade.');
        return;
      }
      if (!confirm('Isso substitui todos os dados atuais. Continuar?')) return;
      novo.settings = novo.settings || { nomes: { caio: 'Caio', esposa: 'Esposa' }, divisao: 'renda' };
      state.data = novo;
      window.api.salvar(state.data);
      render();
    };
    leitor.readAsText(arquivo);
  };
  entrada.click();
}

// ---------- Gráficos ----------

function sparkline(ym) {
  const [y, m] = ym.split('-').map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  const txs = txOfMonth(ym);
  const diario = Array.from({ length: ultimo }, (_, i) => {
    const dia = `${ym}-${String(i + 1).padStart(2, '0')}`;
    return txs.filter(t => t.date === dia).reduce((s, t) => s + (t.type === 'receita' ? t.amount : -t.amount), 0);
  });
  let acumulado = 0;
  const pontos = diario.map(v => (acumulado += v));
  const min = Math.min(0, ...pontos);
  const max = Math.max(0, ...pontos);
  const faixa = (max - min) || 1;
  const W = 300, H = 60;
  const linha = pontos.map((v, i) => `${(i / Math.max(ultimo - 1, 1)) * W},${H - ((v - min) / faixa) * H}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="spark" preserveAspectRatio="none"><polyline points="${linha}" fill="none" stroke-width="2.5" stroke-linejoin="round" style="stroke: var(--accent)"/></svg>`;
}

function donut(itens, total) {
  if (!total) return '<p class="muted">Sem despesas neste mês.</p>';
  const C = 2 * Math.PI * 40;
  let acc = 0;
  const segmentos = itens.map(({ c, v }) => {
    const tamanho = (v / total) * C;
    const s = `<circle cx="50" cy="50" r="40" fill="none" stroke="${c.color}" stroke-width="12" stroke-dasharray="${tamanho} ${C - tamanho}" stroke-dashoffset="${-acc}" transform="rotate(-90 50 50)"/>`;
    acc += tamanho;
    return s;
  }).join('');
  const legenda = itens.map(({ c, v }) => `<li><span class="dot" style="background:${c.color}"></span> ${esc(c.name)} <span class="muted small">${Math.round((v / total) * 100)}%</span></li>`).join('');
  return `<div class="donut"><svg viewBox="0 0 100 100" width="140" height="140">${segmentos}<text x="50" y="52" text-anchor="middle" class="donut-total">${brl(total)}</text></svg><ul class="legend">${legenda}</ul></div>`;
}

function heatmap(ym) {
  const [y, m] = ym.split('-').map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  const despesas = txOfMonth(ym).filter(t => t.type === 'despesa');
  const diario = Array.from({ length: ultimo }, (_, i) => {
    const dia = `${ym}-${String(i + 1).padStart(2, '0')}`;
    return sum(despesas.filter(t => t.date === dia).map(t => t.amount));
  });
  const max = Math.max(...diario, 1);
  const celulas = diario.map((v, i) => {
    const nivel = v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4));
    return `<div class="cell l${nivel}" title="Dia ${i + 1}: ${brl(v)}"></div>`;
  }).join('');
  return `<div class="heat">${celulas}</div><p class="muted small">Quanto mais claro, mais você gastou no dia.</p>`;
}

// Receitas e despesas dos últimos 6 meses, até o mês escolhido
function graficoSeisMeses(mes) {
  const dados = [5, 4, 3, 2, 1, 0].map(n => {
    const m = shiftMonth(mes, -n);
    const tx = txOfMonth(m);
    const receita = totalOf(tx, 'receita');
    const despesa = totalOf(tx, 'despesa');
    return { m, sobra: receita - despesa, despesa };
  });
  const todos = dados.flatMap(x => [x.sobra, x.despesa, 0]);
  const min = Math.min(...todos), max = Math.max(...todos);
  const faixa = (max - min) || 1;
  const W = 300, H = 150;
  const px = i => 14 + i * ((W - 28) / 5);
  const py = v => (H - 24) - ((v - min) / faixa) * (H - 40);
  const linhaSobra = dados.map((x, i) => `${px(i)},${py(x.sobra)}`).join(' ');
  const linhaDesp = dados.map((x, i) => `${px(i)},${py(x.despesa)}`).join(' ');
  const rotulos = dados.map((x, i) => `<text x="${px(i)}" y="${H - 4}" text-anchor="middle" class="eixo">${esc(monthLabel(x.m).split(' ')[0].slice(0, 3))}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart6"><polyline points="${linhaSobra}" fill="none" style="stroke: var(--green)" stroke-width="3" stroke-linejoin="round"/><polyline points="${linhaDesp}" fill="none" style="stroke: var(--red)" stroke-width="3" stroke-linejoin="round"/>${rotulos}</svg>
    <div class="legenda-linha"><span><i style="background:var(--green)"></i> Sobra</span><span><i style="background:var(--red)"></i> Despesas</span></div>`;
}

function goalLine(g) {
  const pct = g.target ? Math.min(100, (g.saved / g.target) * 100) : 0;
  return `<div class="grow" style="margin-bottom:8px"><div class="rowb"><span>${esc(g.name)}</span><span class="muted small">${brl(g.saved)} de ${brl(g.target)}</span></div><div class="track"><div class="fill" style="width:${pct}%;background:${g.color}"></div></div></div>`;
}

// Avisos: contas que vencem em até 7 dias e categorias perto ou acima do limite
function avisosHTML(mes) {
  const itens = [];
  if (mes === ymNow()) {
    state.data.bills.filter(b => billActive(b, mes)).map(b => ({ b, st: billStatus(b) }))
      .filter(x => !x.st.paid && x.st.diff <= 7)
      .forEach(({ b, st }) => itens.push(`<div class="row-line"><span>${esc(b.name)}</span><span class="tag ${st.diff < 0 ? 'red' : st.diff === 0 ? 'amber' : ''}">${st.label}</span></div>`));
  }
  const tx = txOfMonth(mes);
  state.data.categories.filter(c => c.monthlyLimit).forEach(c => {
    const pct = (spendOf(tx, c.id) / c.monthlyLimit) * 100;
    if (pct >= 85) itens.push(`<div class="row-line"><span>${esc(c.name)}</span><span class="tag ${pct >= 100 ? 'red' : 'amber'}">${pct >= 100 ? 'Acima do limite' : Math.round(pct) + '% do limite'}</span></div>`);
  });
  return itens.length ? itens.join('') : '<p class="muted">Nenhum aviso neste mês.</p>';
}

// ---------- Telas ----------

function viewHome() {
  const mes = state.month;
  const tx = txOfMonth(mes);
  const receitas = totalOf(tx, 'receita');
  const despesas = totalOf(tx, 'despesa');
  const porCat = state.data.categories.map(c => ({ c, v: spendOf(tx, c.id) })).filter(x => x.v > 0);

  return `
    <div class="head">
      <button class="ghost" data-action="month" data-delta="-1"><i class="ti ti-chevron-left"></i></button>
      <h1>${monthLabel(mes)}</h1>
      <button class="ghost" data-action="month" data-delta="1"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="grid-2">
      <div class="card">
        <span class="muted small">Saldo do mês</span>
        <strong class="big">${brl(receitas - despesas)}</strong>
        <div class="two">
          <div><span class="muted small">Receitas</span><b class="green">${brl(receitas)}</b></div>
          <div><span class="muted small">Despesas</span><b class="red">${brl(despesas)}</b></div>
        </div>
        ${sparkline(mes)}
      </div>
      <div class="card">
        <h3>Gastos por categoria</h3>
        ${donut(porCat, despesas)}
      </div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>Dias do mês</h3>${heatmap(mes)}</div>
      <div class="card">
        <h3>Avisos</h3>
        ${avisosHTML(mes)}
      </div>
    </div>
    <div class="card">
      <h3>Metas</h3>
      ${state.data.goals.length ? state.data.goals.map(goalLine).join('') : '<p class="muted">Crie metas na aba Metas.</p>'}
    </div>`;
}

// Lista de lançamentos, já com busca e filtros aplicados
function listaTxHTML() {
  const q = norm(state.busca || '').trim();
  let lista = txOfMonth(state.month).sort((a, b) => b.date.localeCompare(a.date));
  if (state.filtroCat) lista = lista.filter(t => t.categoryId === state.filtroCat);
  if (state.filtroPessoa) lista = lista.filter(t => txOwner(t) === state.filtroPessoa);
  if (state.filtroTipo) lista = lista.filter(t => t.type === state.filtroTipo);
  if (q) {
    lista = lista.filter(t => {
      const c = catById(t.categoryId);
      const alvo = norm(`${t.note || ''} ${c ? c.name : ''}`);
      return alvo.includes(q) || String(t.amount).includes(q.replace(',', '.'));
    });
  }
  const linhas = lista.map(t => {
    const c = catById(t.categoryId);
    return `<div class="tx" data-action="edit-tx" data-id="${t.id}">
      <span class="dot" style="background:${c ? c.color : '#A9B3E6'}"></span>
      <div class="grow"><div>${esc(t.note || (c ? c.name : 'Sem categoria'))}</div><div class="muted small">${esc(c ? c.name : '')} · ${toDisplay(t.date)}</div></div>
      ${tagDono(txOwner(t))}
      <b class="${t.type === 'receita' ? 'green' : ''}">${t.type === 'receita' ? '+ ' : '- '}${brl(t.amount)}</b>
    </div>`;
  }).join('');
  return linhas || '<p class="muted">Nenhum lançamento neste filtro.</p>';
}

function atualizarListaTx() {
  const el = $('#listaTx');
  if (el) el.innerHTML = listaTxHTML();
}

function viewTransactions() {
  const mes = state.month;
  const pessoas = [['caio', nomeDe('caio')], ['esposa', nomeDe('esposa')], ['casa', 'Casa']];
  return `
    <div class="head">
      <button class="ghost" data-action="month" data-delta="-1"><i class="ti ti-chevron-left"></i></button>
      <h1>${monthLabel(mes)}</h1>
      <button class="ghost" data-action="month" data-delta="1"><i class="ti ti-chevron-right"></i></button>
    </div>
    <details class="card filtros" id="filtros" ${state.filtrosAbertos ? 'open' : ''}>
      <summary>Filtros e busca</summary>
      <input id="busca" class="busca" placeholder="Buscar por nome, categoria ou valor" value="${esc(state.busca || '')}" />
      <div class="chips">
        <button class="chip ${!state.filtroTipo ? 'on' : ''}" data-action="filter-tipo">Todos</button>
        <button class="chip ${state.filtroTipo === 'receita' ? 'on' : ''}" data-action="filter-tipo" data-tipo="receita">Receitas</button>
        <button class="chip ${state.filtroTipo === 'despesa' ? 'on' : ''}" data-action="filter-tipo" data-tipo="despesa">Despesas</button>
      </div>
      <div class="chips">
        <button class="chip ${!state.filtroPessoa ? 'on' : ''}" data-action="filter-pessoa">Todos</button>
        ${pessoas.map(([k, l]) => `<button class="chip ${state.filtroPessoa === k ? 'on' : ''}" data-action="filter-pessoa" data-pessoa="${k}">${esc(l)}</button>`).join('')}
      </div>
      <div class="chips">
        <button class="chip ${!state.filtroCat ? 'on' : ''}" data-action="filter">Todas as categorias</button>
        ${state.data.categories.map(c => `<button class="chip ${state.filtroCat === c.id ? 'on' : ''}" data-action="filter" data-cat="${esc(c.id)}">${esc(c.name)}</button>`).join('')}
      </div>
    </details>
    <div class="card list" id="listaTx">${listaTxHTML()}</div>`;
}

function viewCasal() {
  const mes = state.month;
  const d = calcularDivisao(mes);
  const r = d.resultado;
  const pct = p => Math.round(r[p].share * 100);
  const modo = state.data.settings.divisao === 'metade' ? 'Metade a metade' : 'Proporcional à renda';
  const cartaoPessoa = (p, cor) => `
    <div class="card">
      <p style="margin:0;font-size:14px;font-weight:500;color:${cor}">${esc(nomeDe(p))}</p>
      <div class="kv"><span>Receita</span><b>${brl(r[p].receita)}</b></div>
      <div class="kv"><span>Parte da casa (${pct(p)}%)</span><b class="red">- ${brl(r[p].parte)}</b></div>
      <div class="kv"><span>Gastos pessoais</span><b class="red">- ${brl(r[p].pessoais)}</b></div>
      <div class="sep"></div>
      <span class="muted small">Sobra para as suas metas</span>
      <strong class="big" style="color:${cor}">${brl(r[p].sobra)}</strong>
    </div>`;
  const metasCasa = state.data.goals.filter(g => goalOwner(g) === 'casa');

  return `
    <div class="head">
      <button class="ghost" data-action="month" data-delta="-1"><i class="ti ti-chevron-left"></i></button>
      <h1>${monthLabel(mes)}</h1>
      <button class="ghost" data-action="month" data-delta="1"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="card">
      <div class="rowb"><h3>Gastos da casa</h3><b>${brl(d.casa)}</b></div>
      <div class="split-bar"><div style="width:${pct('caio')}%;background:var(--accent)"></div><div style="width:${pct('esposa')}%;background:var(--red)"></div></div>
      <div class="rowb small muted"><span>${esc(nomeDe('caio'))} ${pct('caio')}%</span><span>${esc(nomeDe('esposa'))} ${pct('esposa')}%</span></div>
      <div class="rowb"><span class="muted small">Divisão: ${modo}</span><button class="ghost" data-action="toggle-split">Trocar divisão</button></div>
    </div>
    <div class="grid-2">
      ${cartaoPessoa('caio', 'var(--accent)')}
      ${cartaoPessoa('esposa', 'var(--red)')}
    </div>
    <div class="card">
      <h3>Metas em conjunto</h3>
      ${metasCasa.length ? metasCasa.map(goalLine).join('') : '<p class="muted small">Nenhuma meta da casa. Crie uma em Metas e escolha "Casa" como responsável.</p>'}
    </div>
    <div class="card">
      <span class="muted small">Sobra total para vocês dois</span>
      <strong class="big">${brl(d.sobraTotal)}</strong>
    </div>
    <div class="rowb"><button class="ghost" data-action="edit-names">Editar nomes</button></div>`;
}

function viewBills() {
  const mes = ymNow();
  const lista = state.data.bills.filter(b => billActive(b, mes)).sort((a, b) => a.dueDay - b.dueDay);
  const pendente = sum(lista.filter(b => b.paidMonth !== mes).map(b => b.amount));
  const linhas = lista.map(b => {
    const st = billStatus(b);
    const parcela = b.parcelas ? ` · Parcela ${monthIndex(mes) - monthIndex(b.inicio || mes) + 1} de ${b.parcelas}` : '';
    return `<div class="tx">
      <div class="grow" data-action="edit-bill" data-id="${b.id}">
        <div class="${st.paid ? 'strike' : ''}">${esc(b.name)}</div>
        <div class="muted small">${b.parcelas ? 'Vence dia ' + b.dueDay : 'Vence todo dia ' + b.dueDay}${st.paid ? '' : ' · ' + st.label}${parcela}</div>
      </div>
      <b>${brl(b.amount)}</b>
      <button class="chip ${st.paid ? 'on-green' : ''}" data-action="toggle-bill" data-id="${b.id}">${st.paid ? 'Paga' : 'Marcar como paga'}</button>
    </div>`;
  }).join('');

  return `
    <div class="head"><h1>Contas da casa</h1></div>
    <div class="card"><span class="muted small">A pagar neste mês</span><strong class="big">${brl(pendente)}</strong></div>
    <div class="card list">${linhas || '<p class="muted">Nenhuma conta cadastrada. Adicione aluguel, luz, internet e outras contas fixas.</p>'}</div>
    <button class="primary" data-action="new-bill">+ Nova conta</button>`;
}

// Quanto reservar por mês, com base na receita do responsável da meta (só sugestão, o depósito continua manual)
function reservaSugestao(g) {
  if (!g.reservaPct) return '';
  const tx = txOfMonth(ymNow());
  const base = goalOwner(g) === 'casa'
    ? totalOf(tx, 'receita')
    : sum(tx.filter(t => t.type === 'receita' && txOwner(t) === goalOwner(g)).map(t => t.amount));
  return `<div class="muted small">Sugestão: reservar ${brl(base * g.reservaPct / 100)} por mês (${String(g.reservaPct).replace('.', ',')}% da receita)</div>`;
}

function goalCard(g) {
  const ic = ICONS[g.icon] || 'ti-target';
  const pct = g.target ? Math.min(100, (g.saved / g.target) * 100) : 0;
  return `
    <div class="card goal">
      <div class="rowb">
        <div class="row">
          <span class="iconbox" style="background:${g.color}33"><i class="ti ${ic}" style="color:${g.color}"></i></span>
          <div>
            <div>${esc(g.name)} ${tagDono(goalOwner(g))}</div>
            <div class="muted small">${g.deadline ? 'Prazo: ' + toDisplay(g.deadline) : 'Sem prazo'}</div>
          </div>
        </div>
        <button class="ghost" data-action="edit-goal" data-id="${g.id}">Editar</button>
      </div>
      <div class="rowb small muted"><span>${brl(g.saved)} guardados</span><span>de ${brl(g.target)}</span></div>
      <div class="track"><div class="fill" style="width:${pct}%;background:${g.color}"></div></div>
      ${reservaSugestao(g)}
      <div><button class="chip" data-action="deposit" data-id="${g.id}">+ Depositar</button></div>
    </div>`;
}

function viewGoals() {
  const metas = state.data.goals;
  const necessario = sum(metas.filter(g => g.deadline).map(g => Math.max(0, g.target - g.saved) / monthsUntil(g.deadline)));
  return `
    <div class="head"><h1>Metas</h1></div>
    <div class="card">
      <span class="muted small">Para cumprir os prazos, guarde por mês</span>
      <strong class="big">${brl(necessario)}</strong>
      <span class="muted small">Considera só as metas que têm prazo definido.</span>
    </div>
    ${metas.length ? metas.map(goalCard).join('') : '<p class="muted">Crie sua primeira meta: viagem, carro, investimentos...</p>'}
    <button class="primary" data-action="new-goal">+ Nova meta</button>`;
}

// Projeção: média de receitas e despesas dos 3 meses anteriores ao mês escolhido
function projecao(mes) {
  const anteriores = [1, 2, 3].map(n => txOfMonth(shiftMonth(mes, -n)));
  const receita = sum(anteriores.map(tx => totalOf(tx, 'receita'))) / 3;
  const despesa = sum(anteriores.map(tx => totalOf(tx, 'despesa'))) / 3;
  return { receita, despesa, sobra: receita - despesa };
}

function viewReports() {
  const mes = state.month;
  const ant = shiftMonth(mes, -1);
  const txA = txOfMonth(mes);
  const txB = txOfMonth(ant);
  const totalA = totalOf(txA, 'despesa');
  const totalB = totalOf(txB, 'despesa');
  const diff = totalA - totalB;
  const linhas = state.data.categories
    .map(c => ({ c, a: spendOf(txA, c.id), b: spendOf(txB, c.id) }))
    .sort((x, y) => y.a - x.a);
  const maior = Math.max(...linhas.map(l => l.a), 1);
  const resumo = diff === 0
    ? `Igual ao mês anterior (${monthLabel(ant)})`
    : `${diff > 0 ? 'Acima' : 'Abaixo'} do mês anterior em ${brl(Math.abs(diff))}`;
  const proj = projecao(mes);

  return `
    <div class="head">
      <button class="ghost" data-action="month" data-delta="-1"><i class="ti ti-chevron-left"></i></button>
      <h1>${monthLabel(mes)}</h1>
      <button class="ghost" data-action="month" data-delta="1"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="card">
      <span class="muted small">Total de despesas</span>
      <strong class="big">${brl(totalA)}</strong>
      <span class="${diff > 0 ? 'red' : 'green'} small">${resumo}</span>
    </div>
    <div class="card">
      <h3>Projeção de ${monthLabel(mes)}</h3>
      <span class="muted small">Média dos 3 meses anteriores</span>
      <div class="two">
        <div><span class="muted small">Receitas</span><b class="green">${brl(proj.receita)}</b></div>
        <div><span class="muted small">Despesas</span><b class="red">${brl(proj.despesa)}</b></div>
      </div>
      <div class="rowb"><span>Sobra prevista</span><strong class="big ${proj.sobra >= 0 ? 'green' : 'red'}">${brl(proj.sobra)}</strong></div>
    </div>
    <div class="card">
      <h3>Últimos 6 meses</h3>
      ${graficoSeisMeses(mes)}
    </div>
    <div class="card list">
      ${linhas.map(({ c, a, b }) => `
        <div class="tx" style="flex-direction:column;align-items:stretch;gap:6px">
          <div class="rowb"><span class="row"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</span><b>${brl(a)}</b></div>
          <div class="track"><div class="fill" style="width:${(a / maior) * 100}%;background:${c.color}"></div></div>
          <span class="muted small">Mês anterior: ${brl(b)}</span>
        </div>`).join('')}
    </div>`;
}

function viewCategories() {
  const tx = txOfMonth(state.month);
  const linhas = state.data.categories.map(c => {
    const gasto = spendOf(tx, c.id);
    const pct = c.monthlyLimit ? Math.min(100, (gasto / c.monthlyLimit) * 100) : 0;
    const cor = !c.monthlyLimit ? c.color : gasto >= c.monthlyLimit ? 'var(--red)' : gasto >= c.monthlyLimit * 0.85 ? 'var(--amber)' : c.color;
    return `
    <div class="tx" data-action="edit-cat" data-id="${c.id}" style="flex-direction:column;align-items:stretch;gap:6px">
      <div class="rowb"><span class="row"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</span><span class="muted small">${c.monthlyLimit ? `${brl(gasto)} de ${brl(c.monthlyLimit)}` : `${brl(gasto)} · sem limite`}</span></div>
      ${c.monthlyLimit ? `<div class="track"><div class="fill" style="width:${pct}%;background:${cor}"></div></div>` : ''}
    </div>`;
  }).join('');
  return `
    <div class="head"><h1>Categorias</h1></div>
    <p class="muted small">Gastos de ${monthLabel(state.month)}. Para trocar o mês, use Início.</p>
    <div class="card list">${linhas}</div>
    <button class="primary" data-action="new-cat">+ Nova categoria</button>`;
}

function viewSettings() {
  return `
    <div class="head"><h1>Ajustes</h1></div>
    <div class="card list">
      <div class="tx" data-action="edit-names">
        <div class="grow">Nomes do casal</div>
        <span class="muted small">${esc(nomeDe('caio'))} e ${esc(nomeDe('esposa'))}</span>
      </div>
      <div class="tx" data-action="export">
        <div class="grow">Exportar backup</div>
        <span class="muted small">Salva um arquivo com tudo</span>
      </div>
      <div class="tx" data-action="import">
        <div class="grow">Importar backup</div>
        <span class="muted small">Substitui os dados atuais</span>
      </div>
    </div>
    <p class="muted small">O backup guarda lançamentos, contas, metas, categorias e nomes. Guarde o arquivo em um lugar seguro, como o Drive ou o iCloud Drive.</p>`;
}
