// ── Estado global ────────────────────────────────────────────────────────────
let dominios = {};

const REGEX_PROCESSO = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
const REGEX_IP       = /^\d{1,10}-\d{5}\/\d{4}$/;

// ── Inicialização ────────────────────────────────────────────────────────────
async function init() {
    await carregarDominios();
    preencherFiltrosAno();
    definirFiltrosIniciais();
    await carregarRepresentacoes();
    initMobile();

    document.getElementById('fProcesso').addEventListener('input', onProcessoInput);
    document.getElementById('fIp').addEventListener('input', onIpInput);
    document.getElementById('btnFiltrar').addEventListener('click', carregarRepresentacoes);
    document.getElementById('btnLimpar').addEventListener('click', limparFiltros);
    document.getElementById('btnNovo').addEventListener('click', abrirModalNovo);
    document.getElementById('btnCancelar').addEventListener('click', fecharModal);
    document.getElementById('btnFecharModal').addEventListener('click', fecharModal);
    document.getElementById('formRep').addEventListener('submit', salvarRepresentacao);
    document.getElementById('fSemSenha').addEventListener('change', toggleSenha);
    document.getElementById('fNumPedidos').addEventListener('change', () => {
        const n = Number(document.getElementById('fNumPedidos').value);
        renderPedidoFields(n);
    });
}

// ── Mobile: filtros + modo de visualização ───────────────────────────────────
function initMobile() {
    document.getElementById('btnToggleFiltros').addEventListener('click', () => {
        const bar = document.getElementById('filtrosBar');
        const btn = document.getElementById('btnToggleFiltros');
        const aberto = bar.classList.toggle('aberto');
        btn.classList.toggle('ativo', aberto);
    });

    document.getElementById('btnModoSimp').addEventListener('click', () => setModo('simples'));
    document.getElementById('btnModoComp').addEventListener('click', () => setModo('completo'));
}

function setModo(modo) {
    const wrapper = document.getElementById('tabelaWrapper');
    wrapper.classList.toggle('modo-simples',   modo === 'simples');
    wrapper.classList.toggle('modo-completo',  modo === 'completo');
    document.getElementById('btnModoSimp').classList.toggle('ativo', modo === 'simples');
    document.getElementById('btnModoComp').classList.toggle('ativo', modo === 'completo');
}

// ── Domínios ─────────────────────────────────────────────────────────────────
async function carregarDominios() {
    const resp = await fetch('/api/dominios');
    dominios = await resp.json();

    preencherSelect('fVara',      dominios.varas);
    preencherSelect('fCrime',     dominios.crimes);
    preencherSelect('fCidade',    dominios.cidades);
    preencherSelect('fStatus',    dominios.statusList);
    preencherSelect('fVaraForm',  dominios.varas,      true);
    preencherSelect('fCrimeForm', dominios.crimes,      true);
    preencherSelect('fCidadeForm',dominios.cidades,     true);
    preencherSelect('fStatusForm',dominios.statusList,  true);
}

function preencherSelect(id, lista, semVazio = false) {
    const el = document.getElementById(id);
    if (!semVazio) el.innerHTML = '<option value="">Todos</option>';
    else           el.innerHTML = '<option value="">— selecione —</option>';
    lista.forEach(({ id: val, nome }) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = nome;
        el.appendChild(opt);
    });
}

// ── Campos dinâmicos de pedido ────────────────────────────────────────────────
function renderPedidoFields(num, valores = []) {
    const container = document.getElementById('pedidosContainer');
    const opcoesHTML = dominios.tiposPedido.map(t =>
        `<option value="${t.id}">${esc(t.nome)}</option>`
    ).join('');

    container.innerHTML = '';
    for (let i = 0; i < num; i++) {
        const v        = valores[i] || {};
        const label    = num > 1 ? ` ${i + 1}` : '';
        const row      = document.createElement('div');
        row.className  = 'pedido-row';
        row.innerHTML  = `
            <div class="field">
                <label>Tipo de Pedido${label} *</label>
                <select id="fTipoPedido_${i}" required>
                    <option value="">— selecione —</option>
                    ${opcoesHTML}
                </select>
            </div>
            <div class="field">
                <label>Qtd. Alvos${label} *</label>
                <input id="fAlvosPedido_${i}" type="number" min="0" value="${v.qtd_alvos ?? 0}" required>
            </div>
        `;
        container.appendChild(row);
        if (v.tipo_pedido_id) {
            row.querySelector(`#fTipoPedido_${i}`).value = v.tipo_pedido_id;
        }
    }
}

function coletarPedidos() {
    const num    = Number(document.getElementById('fNumPedidos').value);
    const pedidos = [];
    for (let i = 0; i < num; i++) {
        pedidos.push({
            tipo_pedido_id: document.getElementById(`fTipoPedido_${i}`).value,
            qtd_alvos:      Number(document.getElementById(`fAlvosPedido_${i}`).value) || 0,
        });
    }
    return pedidos;
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function preencherFiltrosAno() {
    const sel = document.getElementById('fAno');
    const anoAtual = new Date().getFullYear();
    for (let a = anoAtual; a >= anoAtual - 5; a--) {
        const opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a;
        sel.appendChild(opt);
    }
}

function definirFiltrosIniciais() {
    const hoje = new Date();
    document.getElementById('fAno').value = hoje.getFullYear();
    document.getElementById('fMes').value = hoje.getMonth() + 1;
}

function limparFiltros() {
    definirFiltrosIniciais();
    ['fVara','fCrime','fCidade','fStatus'].forEach(id => {
        document.getElementById(id).value = '';
    });
    carregarRepresentacoes();
}

// ── Tabela ────────────────────────────────────────────────────────────────────
async function carregarRepresentacoes() {
    const params = new URLSearchParams({
        ano:       document.getElementById('fAno').value    || '',
        mes:       document.getElementById('fMes').value    || '',
        vara_id:   document.getElementById('fVara').value   || '',
        crime_id:  document.getElementById('fCrime').value  || '',
        cidade_id: document.getElementById('fCidade').value || '',
        status_id: document.getElementById('fStatus').value || '',
    });

    const resp = await fetch(`/api/representacoes?${params}`);
    const lista = await resp.json();

    const tbody    = document.getElementById('tbodyRep');
    const msgVazia = document.getElementById('msgVazia');
    tbody.innerHTML = '';

    if (!lista.length) {
        msgVazia.classList.remove('hidden');
        return;
    }
    msgVazia.classList.add('hidden');
    lista.forEach(r => tbody.appendChild(criarLinha(r)));
}

function criarLinha(r) {
    const tr = document.createElement('tr');
    tr.dataset.status = r.status;

    // Monta lista de pedidos: "Prisão preventiva (2) • Busca e apreensão (1)"
    const nomes  = r.pedidos_nomes ? r.pedidos_nomes.split('||') : [];
    const alvos  = r.pedidos_alvos ? r.pedidos_alvos.split(',')  : [];
    const pedidosHTML = nomes.length
        ? nomes.map((n, i) => `<span class="pedido-tag">${esc(n)} <b>(${alvos[i] ?? 0})</b></span>`).join('')
        : '—';

    const dataEnvio = formatarData(r.data_envio);
    const dataVerif = r.data_ultima_verificacao ? formatarData(r.data_ultima_verificacao) : '—';
    const sigilo    = r.tipo_sigilo === 'sigilo_absoluto' ? 'Sigilo Absoluto' : 'Segredo de Justiça';

    tr.innerHTML = `
        <td class="col-simples">${esc(r.numero_processo)}</td>
        <td class="col-simples">${esc(r.numero_ip)}</td>
        <td class="col-detalhe">${esc(r.vara)}</td>
        <td class="col-detalhe">${esc(r.peticionante)}</td>
        <td class="col-detalhe">${esc(r.crime)}</td>
        <td class="col-detalhe">${esc(r.cidade)}</td>
        <td class="col-detalhe pedidos-cell">${pedidosHTML}</td>
        <td class="col-detalhe" style="text-align:center">${r.qtd_alvos_total}</td>
        <td class="col-detalhe">${sigilo}</td>
        <td class="col-simples">${r.senha_processo ? '••••••' : '<span style="color:#94a3b8">—</span>'}</td>
        <td class="col-detalhe">${dataEnvio}</td>
        <td class="col-detalhe">${dataVerif}</td>
        <td class="col-simples">
          <span class="badge-status" style="background:${r.status_cor};color:#1e293b">
            ${esc(r.status)}
          </span>
        </td>
        <td class="col-simples" style="white-space:nowrap">
            <button class="btn btn-sm btn-edit"   onclick="abrirModalEditar(${r.id})">Editar</button>
            <button class="btn btn-sm btn-delete" onclick="excluir(${r.id})">Excluir</button>
        </td>
    `;
    return tr;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function abrirModalNovo() {
    document.getElementById('modalTitulo').textContent = 'Nova Representação';
    document.getElementById('formRep').reset();
    document.getElementById('fId').value = '';
    document.getElementById('fNumPedidos').value = '1';
    document.getElementById('fSenha').disabled = false;
    document.getElementById('fDataEnvio').value = new Date().toISOString().slice(0, 10);
    document.getElementById('formErro').classList.add('hidden');
    renderPedidoFields(1);
    document.getElementById('modal').classList.remove('hidden');
}

async function abrirModalEditar(id) {
    document.getElementById('modalTitulo').textContent = 'Editar Representação';
    document.getElementById('formErro').classList.add('hidden');

    const resp = await fetch(`/api/representacoes/${id}`);
    const r    = await resp.json();

    document.getElementById('fId').value             = r.id;
    document.getElementById('fProcesso').value        = r.numero_processo;
    document.getElementById('fIp').value              = r.numero_ip;
    document.getElementById('fVaraForm').value        = r.vara_id;
    document.getElementById('fPeticionante').value    = r.peticionante;
    document.getElementById('fCrimeForm').value       = r.crime_id;
    document.getElementById('fCidadeForm').value      = r.cidade_id;
    document.getElementById('fAlvosTotal').value      = r.qtd_alvos_total;
    document.getElementById('fSigilo').value          = r.tipo_sigilo;
    document.getElementById('fSenha').value           = r.senha_processo || '';
    document.getElementById('fSemSenha').checked      = !r.senha_processo;
    document.getElementById('fSenha').disabled        = !r.senha_processo;
    document.getElementById('fDataEnvio').value       = r.data_envio?.slice(0, 10) || '';
    document.getElementById('fDataVerificacao').value = r.data_ultima_verificacao?.slice(0, 10) || '';
    document.getElementById('fStatusForm').value      = r.status_id;

    const pedidos = r.pedidos || [];
    document.getElementById('fNumPedidos').value = String(Math.max(pedidos.length, 1));
    renderPedidoFields(Math.max(pedidos.length, 1), pedidos);

    document.getElementById('modal').classList.remove('hidden');
}

function fecharModal() {
    document.getElementById('modal').classList.add('hidden');
}

function toggleSenha() {
    const semSenha   = document.getElementById('fSemSenha').checked;
    const campoSenha = document.getElementById('fSenha');
    campoSenha.disabled = semSenha;
    if (semSenha) campoSenha.value = '';
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
async function salvarRepresentacao(e) {
    e.preventDefault();
    const erroEl = document.getElementById('formErro');
    erroEl.classList.add('hidden');

    const processo = document.getElementById('fProcesso').value.trim();
    const ip       = document.getElementById('fIp').value.trim();

    if (!REGEX_PROCESSO.test(processo)) {
        erroEl.textContent = 'Nº do Processo inválido. Formato esperado: 0200874-18.2026.8.06.0302';
        erroEl.classList.remove('hidden');
        document.getElementById('fProcesso').focus();
        return;
    }
    if (!REGEX_IP.test(ip)) {
        erroEl.textContent = 'Nº do IP inválido. Formato esperado: 479-00350/2026';
        erroEl.classList.remove('hidden');
        document.getElementById('fIp').focus();
        return;
    }

    const pedidos = coletarPedidos();
    if (pedidos.some(p => !p.tipo_pedido_id)) {
        erroEl.textContent = 'Selecione o tipo de pedido para todos os itens.';
        erroEl.classList.remove('hidden');
        return;
    }

    const id = document.getElementById('fId').value;
    const payload = {
        numero_processo:         document.getElementById('fProcesso').value.trim(),
        numero_ip:               document.getElementById('fIp').value.trim(),
        vara_id:                 document.getElementById('fVaraForm').value,
        peticionante:            document.getElementById('fPeticionante').value.trim(),
        crime_id:                document.getElementById('fCrimeForm').value,
        cidade_id:               document.getElementById('fCidadeForm').value,
        pedidos,
        qtd_alvos_total:         document.getElementById('fAlvosTotal').value,
        tipo_sigilo:             document.getElementById('fSigilo').value,
        senha_processo:          document.getElementById('fSemSenha').checked
                                    ? null
                                    : document.getElementById('fSenha').value || null,
        data_envio:              document.getElementById('fDataEnvio').value,
        data_ultima_verificacao: document.getElementById('fDataVerificacao').value || null,
        status_id:               document.getElementById('fStatusForm').value,
    };

    const url    = id ? `/api/representacoes/${id}` : '/api/representacoes';
    const method = id ? 'PUT' : 'POST';

    const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!resp.ok) {
        const { erro } = await resp.json();
        erroEl.textContent = erro || 'Erro ao salvar.';
        erroEl.classList.remove('hidden');
        return;
    }

    fecharModal();
    carregarRepresentacoes();
}

async function excluir(id) {
    if (!confirm('Confirma a exclusão desta representação?')) return;
    await fetch(`/api/representacoes/${id}`, { method: 'DELETE' });
    carregarRepresentacoes();
}

// ── Máscaras de entrada ───────────────────────────────────────────────────────
function onProcessoInput(e) {
    const el     = e.target;
    const start  = el.selectionStart;
    const before = el.value.length;
    const digits = el.value.replace(/\D/g, '').slice(0, 20);

    let result = '';
    for (let i = 0; i < digits.length; i++) {
        if (i === 7)  result += '-';
        if (i === 9)  result += '.';
        if (i === 13) result += '.';
        if (i === 14) result += '.';
        if (i === 16) result += '.';
        result += digits[i];
    }

    el.value = result;
    // Reposiciona cursor ajustando pelos separadores inseridos
    const added = result.length - before;
    el.setSelectionRange(start + added, start + added);
}

function onIpInput(e) {
    e.target.value = e.target.value.replace(/[^\d\-\/]/g, '');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatarData(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}

// ── Start ─────────────────────────────────────────────────────────────────────
init().catch(console.error);
