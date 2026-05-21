// ── Estado global ────────────────────────────────────────────────────────────
let dominios = {};

const REGEX_PROCESSO  = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
const REGEX_IP        = /^\d{1,10}-\d{5}\/\d{4}$/;
const FILTROS_KEY     = 'rp_filtros';
const ANO_PADRAO      = () => String(new Date().getFullYear());

// ── Persistência de filtros ───────────────────────────────────────────────────
function salvarFiltros() {
    const crimes = Array.from(document.querySelectorAll('.crime-check:checked')).map(cb => cb.value);
    localStorage.setItem(FILTROS_KEY, JSON.stringify({
        ano:        document.getElementById('fAno').value,
        mes:        document.getElementById('fMes').value,
        dataInicio: document.getElementById('fDataInicio').value,
        dataFim:    document.getElementById('fDataFim').value,
        vara_id:    document.getElementById('fVara').value,
        crimes,
        cidade_id:  document.getElementById('fCidade').value,
        status_id:  document.getElementById('fStatus').value,
    }));
}

function carregarFiltrosSalvos() {
    const raw = localStorage.getItem(FILTROS_KEY);
    if (!raw) return false;
    try {
        const f = JSON.parse(raw);
        if (f.ano)        document.getElementById('fAno').value    = f.ano;
        if (f.mes != null) document.getElementById('fMes').value   = f.mes;
        if (f.vara_id != null) document.getElementById('fVara').value   = f.vara_id;
        if (f.cidade_id != null) document.getElementById('fCidade').value = f.cidade_id;
        if (f.status_id != null) document.getElementById('fStatus').value = f.status_id;
        if (f.dataInicio) document.getElementById('fDataInicio').value = f.dataInicio;
        if (f.dataFim)    document.getElementById('fDataFim').value    = f.dataFim;
        if (f.dataInicio || f.dataFim) atualizarIntervalo();
        if (Array.isArray(f.crimes) && f.crimes.length) {
            f.crimes.forEach(id => {
                const cb = document.querySelector(`.crime-check[value="${id}"]`);
                if (cb) cb.checked = true;
            });
            atualizarLabelCrime();
        }
        return true;
    } catch { return false; }
}

function filtrosEstaoAtivos() {
    if (document.getElementById('fAno').value !== ANO_PADRAO())       return true;
    if (document.getElementById('fMes').value !== '')                  return true;
    if (document.getElementById('fDataInicio').value)                  return true;
    if (document.getElementById('fDataFim').value)                     return true;
    if (document.getElementById('fVara').value)                        return true;
    if (document.getElementById('fCidade').value)                      return true;
    if (document.getElementById('fStatus').value)                      return true;
    if (document.querySelectorAll('.crime-check:checked').length > 0)  return true;
    return false;
}

function atualizarBtnLimpar() {
    document.getElementById('btnLimpar').disabled = !filtrosEstaoAtivos();
}

// ── Inicialização ────────────────────────────────────────────────────────────
async function init() {
    await carregarDominios();
    preencherFiltrosAno();
    if (!carregarFiltrosSalvos()) definirFiltrosIniciais();
    await carregarRepresentacoes();
    initMobile();

    document.getElementById('fProcesso').addEventListener('input', onProcessoInput);
    document.getElementById('fIp').addEventListener('input', onIpInput);
    document.getElementById('btnImportarCSV').addEventListener('click', abrirImportacao);
    document.getElementById('inputCSV').addEventListener('change', processarCSV);
    document.getElementById('btnCancelarImport').addEventListener('click', fecharModalImport);
    document.getElementById('btnFecharImport').addEventListener('click', fecharModalImport);
    document.getElementById('btnConfirmarImport').addEventListener('click', confirmarImportacao);
    document.getElementById('btnFiltrar').addEventListener('click', carregarRepresentacoes);
    document.getElementById('btnLimpar').addEventListener('click', limparFiltros);
    document.getElementById('fDataInicio').addEventListener('change', () => { atualizarIntervalo(); atualizarBtnLimpar(); });
    document.getElementById('fDataFim').addEventListener('change',    () => { atualizarIntervalo(); atualizarBtnLimpar(); });

    // Atualiza botão Limpar em tempo real ao mudar qualquer filtro
    ['fAno','fMes','fVara','fCidade','fStatus'].forEach(id =>
        document.getElementById(id).addEventListener('change', atualizarBtnLimpar)
    );
    document.getElementById('menuCrime').addEventListener('change', atualizarBtnLimpar);

    // Dropdown crime: abre/fecha
    document.getElementById('btnDropdownCrime').addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('menuCrime').classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
        document.getElementById('menuCrime').classList.add('hidden');
    });
    document.getElementById('menuCrime').addEventListener('click', e => e.stopPropagation());
    document.getElementById('btnNovo').addEventListener('click', abrirModalNovo);
    document.getElementById('btnCancelar').addEventListener('click', fecharModal);
    document.getElementById('btnFecharModal').addEventListener('click', fecharModal);
    document.getElementById('btnFecharSenha').addEventListener('click', fecharModalSenha);
    document.getElementById('btnCopiarSenha').addEventListener('click', copiarSenha);
    document.getElementById('formRep').addEventListener('submit', salvarRepresentacao);
    document.getElementById('fSemSenha').addEventListener('change', toggleSenha);
    document.getElementById('fNumPedidos').addEventListener('change', () => {
        const n = Number(document.getElementById('fNumPedidos').value);
        renderPedidoFields(n, coletarPedidos());
    });
}

// ── Mobile: filtros + modo de visualização ───────────────────────────────────
function initMobile() {
    // Desktop ≥1360px: começa no modo completo
    if (window.innerWidth >= 1360) {
        setModo('completo');
    }

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

    // Crime: dropdown com checkboxes
    const menuCrime = document.getElementById('menuCrime');
    menuCrime.innerHTML = '';
    dominios.crimes.forEach(({ id: val, nome }) => {
        const lbl = document.createElement('label');
        lbl.className = 'dropdown-check-item';
        lbl.innerHTML = `<input type="checkbox" class="crime-check" value="${val}"> ${esc(nome)}`;
        lbl.querySelector('input').addEventListener('change', atualizarLabelCrime);
        menuCrime.appendChild(lbl);
    });

    // Status: mantém "Todos" e "Todos (menos concluídos)" do HTML, adiciona os do banco
    const fStatus = document.getElementById('fStatus');
    dominios.statusList.forEach(({ id: val, nome }) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = nome;
        fStatus.appendChild(opt);
    });

    preencherSelect('fVara',      dominios.varas);
    preencherSelect('fCidade',    dominios.cidades);
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
    const pedidos = [];
    let i = 0;
    while (document.getElementById(`fTipoPedido_${i}`)) {
        pedidos.push({
            tipo_pedido_id: document.getElementById(`fTipoPedido_${i}`).value,
            qtd_alvos:      Number(document.getElementById(`fAlvosPedido_${i}`).value) || 0,
        });
        i++;
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
    document.getElementById('fAno').value = new Date().getFullYear();
    document.getElementById('fMes').value = '';
}

function limparFiltros() {
    localStorage.removeItem(FILTROS_KEY);
    definirFiltrosIniciais();
    ['fVara','fCidade','fStatus'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.querySelectorAll('.crime-check').forEach(cb => cb.checked = false);
    atualizarLabelCrime();
    document.getElementById('fDataInicio').value = '';
    document.getElementById('fDataFim').value = '';
    atualizarIntervalo();
    carregarRepresentacoes();
}

function atualizarLabelCrime() {
    const n = document.querySelectorAll('.crime-check:checked').length;
    document.getElementById('labelCrime').textContent =
        n === 0 ? 'Todos' : `${n} selecionado${n > 1 ? 's' : ''}`;
}

function atualizarIntervalo() {
    const inicio = document.getElementById('fDataInicio').value;
    const fim    = document.getElementById('fDataFim').value;
    const ativo  = inicio || fim;
    const fMes   = document.getElementById('fMes');
    const fAno   = document.getElementById('fAno');

    if (ativo) {
        fMes.disabled = true;
        fAno.disabled = true;
        if (!fMes.querySelector('option[value="personalizado"]')) {
            const opt = document.createElement('option');
            opt.value = 'personalizado';
            opt.textContent = 'Personalizado';
            fMes.prepend(opt);
        }
        fMes.value = 'personalizado';
    } else {
        fMes.disabled = false;
        fAno.disabled = false;
        const opt = fMes.querySelector('option[value="personalizado"]');
        if (opt) opt.remove();
        fMes.value = '';
    }
}

// ── Tabela ────────────────────────────────────────────────────────────────────
async function carregarRepresentacoes() {
    const params = new URLSearchParams();

    // Intervalo de datas tem prioridade sobre ano/mês
    const dataInicio = document.getElementById('fDataInicio').value;
    const dataFim    = document.getElementById('fDataFim').value;
    if (dataInicio || dataFim) {
        if (dataInicio) params.set('data_inicio', dataInicio);
        if (dataFim)    params.set('data_fim',    dataFim);
    } else {
        params.set('ano', document.getElementById('fAno').value || '');
        params.set('mes', document.getElementById('fMes').value || '');
    }

    params.set('vara_id',   document.getElementById('fVara').value   || '');
    params.set('cidade_id', document.getElementById('fCidade').value || '');
    params.set('status_id', document.getElementById('fStatus').value || '');

    // Crimes: checkboxes marcados
    document.querySelectorAll('.crime-check:checked')
        .forEach(cb => params.append('crime_id', cb.value));

    const resp = await fetch(`/api/representacoes?${params}`);
    const lista = await resp.json();

    const tbody    = document.getElementById('tbodyRep');
    const msgVazia = document.getElementById('msgVazia');
    tbody.innerHTML = '';

    salvarFiltros();
    atualizarBtnLimpar();

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

    tr.innerHTML = `
        <td class="col-simples">${esc(r.numero_processo)}</td>
        <td class="col-simples">${esc(r.numero_ip)}</td>
        <td class="col-detalhe">${esc(r.vara)}</td>
        <td class="col-detalhe">${esc(r.peticionante)}</td>
        <td class="col-detalhe">${esc(r.crime)}</td>
        <td class="col-detalhe">${esc(r.cidade)}</td>
        <td class="col-detalhe pedidos-cell">${pedidosHTML}</td>
        <td class="col-detalhe" style="text-align:center">${r.qtd_alvos_total}</td>
        <td class="col-simples col-obs">${r.observacoes ? esc(r.observacoes) : '<span style="color:#94a3b8">—</span>'}</td>
        <td class="col-detalhe">${dataEnvio}</td>
        <td class="col-detalhe">${dataVerif}</td>
        <td class="col-simples">
          <span class="badge-status" style="background:${r.status_cor};color:#1e293b">
            ${esc(r.status)}
          </span>
        </td>
        <td class="col-simples td-acoes">
            <div class="acoes-icons">
                <button class="btn btn-sm btn-edit"   data-action="editar"  title="Editar" aria-label="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn btn-sm btn-delete" data-action="excluir" title="Excluir" aria-label="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                </button>
            </div>
            ${r.senha_processo ? `<button class="btn btn-sm btn-senha" data-action="senha">Ver senha</button>` : ''}
        </td>
    `;

    tr.querySelector('[data-action="editar"]').addEventListener('click', () => abrirModalEditar(r.id));
    tr.querySelector('[data-action="excluir"]').addEventListener('click', () => excluir(r.id));
    if (r.senha_processo) {
        tr.querySelector('[data-action="senha"]').addEventListener('click', () => abrirModalSenha(r.senha_processo));
    }

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
    document.getElementById('fObservacoes').value      = r.observacoes || '';
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

function abrirModalSenha(senha) {
    document.getElementById('senhaValor').textContent = senha;
    document.getElementById('senhaCopiadaMsg').classList.add('hidden');
    document.getElementById('modalSenha').classList.remove('hidden');
}

function fecharModalSenha() {
    document.getElementById('modalSenha').classList.add('hidden');
}

async function copiarSenha() {
    const senha = document.getElementById('senhaValor').textContent;
    await navigator.clipboard.writeText(senha);
    const msg = document.getElementById('senhaCopiadaMsg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2500);
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
        observacoes:             document.getElementById('fObservacoes').value.trim() || null,
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

// ── Importação CSV ────────────────────────────────────────────────────────────
let linhasCSV = [];

function abrirImportacao() {
    document.getElementById('inputCSV').value = '';
    document.getElementById('inputCSV').click();
}

async function processarCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const texto  = await file.text();
    const matriz = parsearCSV(texto);

    if (matriz.length < 2) {
        alert('O arquivo CSV está vazio ou no formato incorreto.');
        return;
    }

    const cabecalho = matriz[0].map(c => normalizarChave(c));
    const idx       = mapearColunas(cabecalho);

    if (idx.numeroProcesso === -1) {
        alert('Coluna "Número do processo" não encontrada no CSV.');
        return;
    }

    linhasCSV = [];
    for (let i = 1; i < matriz.length; i++) {
        const row  = matriz[i];
        const proc = row[idx.numeroProcesso]?.trim();
        if (!proc) continue;
        linhasCSV.push({
            numero_processo:   proc,
            data_envio:        converterData(idx.dataHora >= 0 ? row[idx.dataHora]?.trim() : ''),
            assunto_principal: idx.assuntoPrincipal >= 0 ? row[idx.assuntoPrincipal]?.trim() : '',
            situacao:          idx.situacao >= 0 ? row[idx.situacao]?.trim() : '',
            classe:            idx.classe >= 0 ? row[idx.classe]?.trim() : '',
        });
    }

    if (linhasCSV.length === 0) {
        alert('Nenhuma linha válida encontrada no arquivo.');
        return;
    }

    renderPreviewImportacao();
    document.getElementById('importErro').classList.add('hidden');
    document.getElementById('modalImport').classList.remove('hidden');
}

function normalizarChave(str) {
    return str.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .trim();
}

function mapearColunas(cab) {
    const idx = { dataHora: -1, numeroProcesso: -1, classe: -1, assuntoPrincipal: -1, situacao: -1 };
    cab.forEach((h, i) => {
        if (/data|hora/.test(h))                    idx.dataHora         = i;
        if (/numero.*processo|processo/.test(h))    idx.numeroProcesso   = i;
        if (/^classe$/.test(h))                     idx.classe           = i;
        if (/assunto/.test(h))                      idx.assuntoPrincipal = i;
        if (/situac/.test(h))                       idx.situacao         = i;
    });
    return idx;
}

function converterData(str) {
    if (!str) return null;
    const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    return null;
}

function parsearCSV(texto) {
    texto = texto.replace(/^﻿/, '');
    const primeiraLinha = texto.split(/\r?\n/)[0];
    const sep = (primeiraLinha.match(/;/g)?.length ?? 0) > (primeiraLinha.match(/,/g)?.length ?? 0) ? ';' : ',';

    const linhas = [];
    let dentro = false, campo = '', linha = [];

    for (let i = 0; i < texto.length; i++) {
        const c = texto[i];
        if (c === '"') {
            if (dentro && texto[i + 1] === '"') { campo += '"'; i++; }
            else dentro = !dentro;
        } else if (c === sep && !dentro) {
            linha.push(campo); campo = '';
        } else if ((c === '\n' || c === '\r') && !dentro) {
            if (c === '\r' && texto[i + 1] === '\n') i++;
            linha.push(campo);
            if (linha.some(c => c.trim())) linhas.push(linha);
            linha = []; campo = '';
        } else {
            campo += c;
        }
    }
    if (linha.length) { linha.push(campo); if (linha.some(c => c.trim())) linhas.push(linha); }

    return linhas;
}

function renderPreviewImportacao() {
    // Verifica quais linhas são cautelares reconhecidas (client-side preview)
    const nomesTipos = new Set(dominios.tiposPedido.map(t => t.nome.toLowerCase().trim()));
    const cautelares = linhasCSV.filter(l => nomesTipos.has((l.classe || '').toLowerCase().trim()));
    const ignoradas  = linhasCSV.length - cautelares.length;

    const resumo = document.getElementById('importResumo');
    resumo.innerHTML =
        `<strong>${linhasCSV.length}</strong> linha${linhasCSV.length !== 1 ? 's' : ''} lida${linhasCSV.length !== 1 ? 's' : ''} — ` +
        `<strong>${cautelares.length}</strong> pedido${cautelares.length !== 1 ? 's' : ''} cautelar${cautelares.length !== 1 ? 'es' : ''} serão importados` +
        (ignoradas > 0 ? `, <strong>${ignoradas}</strong> ignorado${ignoradas !== 1 ? 's' : ''} (não são cautelares)` : '') + '.';
    resumo.classList.remove('hidden');

    const rows = linhasCSV.map(l => {
        const cautelar = nomesTipos.has((l.classe || '').toLowerCase().trim());
        const badge    = cautelar
            ? '<span class="badge-cautelar-sim">✓ Cautelar</span>'
            : '<span class="badge-cautelar-nao">✗ Ignorar</span>';
        return `
        <tr class="${cautelar ? '' : 'import-row-ignorada'}">
            <td>${badge}</td>
            <td>${esc(l.numero_processo)}</td>
            <td>${l.data_envio ? formatarData(l.data_envio) : '—'}</td>
            <td>${esc(l.classe || '—')}</td>
            <td>${esc(l.assunto_principal || '—')}</td>
        </tr>`;
    }).join('');

    document.getElementById('importTabela').innerHTML = `
        <table>
            <thead>
                <tr>
                    <th></th>
                    <th>Nº do Processo</th>
                    <th>Data de Envio</th>
                    <th>Classe (Tipo de Pedido)</th>
                    <th>Assunto Principal</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

async function confirmarImportacao() {
    const erroEl = document.getElementById('importErro');
    const btn    = document.getElementById('btnConfirmarImport');

    btn.disabled    = true;
    btn.textContent = 'Importando…';
    erroEl.classList.add('hidden');

    try {
        const resp = await fetch('/api/representacoes/importar', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ linhas: linhasCSV }),
        });
        const dados = await resp.json();

        if (!resp.ok) {
            erroEl.textContent = dados.erro || 'Erro ao importar.';
            erroEl.classList.remove('hidden');
            return;
        }

        fecharModalImport();
        await carregarDominios();
        await carregarRepresentacoes();
        const partes = [
            `criados: ${dados.criados}`,
            `atualizados: ${dados.atualizados}`,
            `sem alteração: ${dados.sem_alteracao}`,
        ];
        if (dados.ignorados    > 0) partes.push(`ignorados (não cautelares): ${dados.ignorados}`);
        if (dados.crimes_novos > 0) partes.push(`crimes cadastrados automaticamente: ${dados.crimes_novos}`);
        mostrarToast('Importação concluída — ' + partes.join(', ') + '.');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Confirmar Importação';
    }
}

function fecharModalImport() {
    document.getElementById('modalImport').classList.add('hidden');
    document.getElementById('importTabela').innerHTML = '';
    document.getElementById('importResumo').classList.add('hidden');
    linhasCSV = [];
}

function mostrarToast(msg) {
    const t = document.createElement('div');
    t.className   = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 6000);
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
