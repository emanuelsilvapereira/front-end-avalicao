/* --- BANCO DE DADOS SIMULADO --- */
const bancosDeProvas = {
    "WEB-2025": [
        { id: 1, disciplina: "HTML5", pergunta: "Qual elemento HTML é o contêiner correto para metadados de uma página (como título e links de CSS)?", opcoes: ["<body>", "<head>", "<meta>", "<header>"], correta: "B" },
        { id: 2, disciplina: "CSS3", pergunta: "No CSS, como você selecionaria todos os elementos <p> que estão dentro de uma <div>?", opcoes: ["div + p", "div > p", "div p", "div ~ p"], correta: "C" },
        { id: 3, disciplina: "JavaScript", pergunta: "Qual método é usado para converter um objeto JavaScript em uma string JSON?", opcoes: ["JSON.parse()", "JSON.toString()", "JSON.stringify()", "Object.toJSON()"], correta: "C" }
    ],
    "GERAL-2025": [
        { 
            id: 1, 
            disciplina: "Geografia", 
            pergunta: "Observe o mapa. O ponto vermelho indica a localização aproximada de qual capital brasileira?", 
            imagem: "https://st.depositphotos.com/1001526/4882/i/950/depositphotos_48823277-stock-photo-map-of-brasilia-brazil.jpg", 
            opcoes: ["Rio de Janeiro", "Salvador", "Brasília", "Manaus"], 
            correta: "C" 
        },
        { id: 2, disciplina: "História", pergunta: "Em que ano o homem pisou na Lua?", opcoes: ["1959", "1969", "1979", "1989"], correta: "B" },
        { id: 3, disciplina: "Tecnologia", pergunta: "O que significa a sigla 'CPU' em um computador?", opcoes: ["Central Process Unit", "Computer Personal Unit", "Central Power Unit", "Control Process Unit"], correta: "A" }
    ]
};

// Configuração do tempo de prova em minutos
const TEMPO_PROVA_MINUTOS = 15; 

// --- ESTADO DA APLICAÇÃO ---
let provaAtual = [];
let indiceQuestao = 0;
let respostasSalvas = {};
let questoesParaRevisar = new Set();
let contadorInfracoes = 0;
let timerInterval;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        if(localStorage.getItem('prova_ativa') === 'true') {
            window.location.href = 'prova.html';
        }
        loginForm.addEventListener('submit', realizarLogin);
    }

    const questionContainer = document.getElementById('question-container');
    if (questionContainer) {
        verificarAutenticacao();
        inicializarProva();
        configurarEventosUI();
        ativarSeguranca();
    }
});

/* --- FUNÇÕES DE LOGIN --- */
function realizarLogin(e) {
    e.preventDefault();
    const nomeInput = document.getElementById('student-name');
    const codigoInput = document.getElementById('exam-code');
    
    const nome = nomeInput.value.trim();
    const codigo = codigoInput.value.toUpperCase().trim();

    if (!nome) { alert("Por favor, insira seu nome."); return; }
    
    if (!bancosDeProvas[codigo]) {
        alert("Código de prova não encontrado. Tente 'WEB-2025' ou 'GERAL-2025'.");
        return;
    }

    localStorage.setItem('aluno_nome', nome);
    localStorage.setItem('prova_codigo', codigo);
    localStorage.setItem('prova_ativa', 'true');
    localStorage.removeItem('respostas_usuario');
    localStorage.removeItem('revisoes_usuario');
    localStorage.removeItem('tempo_fim_prova');

    window.location.href = 'prova.html';
}

/* --- CORE DA PROVA --- */
function verificarAutenticacao() {
    if(localStorage.getItem('prova_ativa') !== 'true') {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = 'index.html';
    }
}

function inicializarProva() {
    const codigo = localStorage.getItem('prova_codigo');
    document.getElementById('user-name-display').textContent = localStorage.getItem('aluno_nome') || 'Estudante';
    
    provaAtual = bancosDeProvas[codigo];
    respostasSalvas = JSON.parse(localStorage.getItem('respostas_usuario')) || {};
    const revisoesArray = JSON.parse(localStorage.getItem('revisoes_usuario')) || [];
    questoesParaRevisar = new Set(revisoesArray);

    gerarSidebar();
    carregarQuestaoNaTela();
    gerenciarCronometroPersistente();
}

// Função auxiliar para escapar caracteres HTML (CORREÇÃO DO BUG)
function escaparHTML(texto) {
    return texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function carregarQuestaoNaTela() {
    const questao = provaAtual[indiceQuestao];
    
    document.getElementById('q-discipline').textContent = questao.disciplina;
    document.getElementById('q-number').textContent = `Questão ${indiceQuestao + 1} de ${provaAtual.length}`;
    document.getElementById('q-text').textContent = questao.pergunta;

    const imgContainer = document.getElementById('q-image-area');
    const imgTag = document.getElementById('q-image');
    if(questao.imagem) {
        imgTag.src = questao.imagem;
        imgContainer.style.display = 'block';
    } else {
        imgContainer.style.display = 'none';
    }

    const btnReview = document.getElementById('btn-review');
    btnReview.classList.toggle('active', questoesParaRevisar.has(indiceQuestao));

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    questao.opcoes.forEach((textoOpcao, index) => {
        const letra = String.fromCharCode(65 + index);
        const estaMarcada = respostasSalvas[indiceQuestao] === letra;
        
        // AQUI ESTÁ A MÁGICA: escaparHTML(textoOpcao)
        optionsContainer.innerHTML += `
            <div class="option-item">
                <input type="radio" name="opcao_questao" id="opt-${index}" value="${letra}" ${estaMarcada ? 'checked' : ''}>
                <label class="option-label" for="opt-${index}">
                    <div class="radio-circle"></div>
                    <span style="font-weight: 600; margin-right: 8px;">${letra})</span>
                    <span>${escaparHTML(textoOpcao)}</span> 
                </label>
            </div>
        `;
    });

    document.querySelectorAll('input[name="opcao_questao"]').forEach(input => {
        input.addEventListener('change', (e) => salvarResposta(e.target.value));
    });

    atualizarBotoesNavegacao();
    atualizarSidebarStatus();
}

function salvarResposta(letra) {
    respostasSalvas[indiceQuestao] = letra;
    localStorage.setItem('respostas_usuario', JSON.stringify(respostasSalvas));
    atualizarSidebarStatus();
    atualizarBarraProgresso();
}

function limparRespostaAtual() {
    delete respostasSalvas[indiceQuestao];
    localStorage.setItem('respostas_usuario', JSON.stringify(respostasSalvas));
    const inputs = document.querySelectorAll('input[name="opcao_questao"]');
    inputs.forEach(input => input.checked = false);
    atualizarSidebarStatus();
    atualizarBarraProgresso();
}

function alternarRevisao() {
    if(questoesParaRevisar.has(indiceQuestao)) {
        questoesParaRevisar.delete(indiceQuestao);
    } else {
        questoesParaRevisar.add(indiceQuestao);
    }
    localStorage.setItem('revisoes_usuario', JSON.stringify([...questoesParaRevisar]));
    document.getElementById('btn-review').classList.toggle('active');
    atualizarSidebarStatus();
}

function atualizarBotoesNavegacao() {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');

    btnPrev.disabled = indiceQuestao === 0;
    const ehUltima = indiceQuestao === provaAtual.length - 1;
    btnNext.style.display = ehUltima ? 'none' : 'flex';
    btnFinish.style.display = ehUltima ? 'flex' : 'none';
}

function navegar(direcao) {
    if(direcao === 'proximo' && indiceQuestao < provaAtual.length - 1) {
        indiceQuestao++;
    } else if (direcao === 'anterior' && indiceQuestao > 0) {
        indiceQuestao--;
    }
    carregarQuestaoNaTela();
    fecharSidebarMobile();
}

function gerarSidebar() {
    const navContainer = document.getElementById('question-nav');
    navContainer.innerHTML = '';
    provaAtual.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.className = 'q-btn';
        btn.textContent = index + 1;
        btn.onclick = () => {
            indiceQuestao = index;
            carregarQuestaoNaTela();
            fecharSidebarMobile();
        }
        navContainer.appendChild(btn);
    });
}

function atualizarSidebarStatus() {
    const btns = document.querySelectorAll('.q-btn');
    btns.forEach((btn, index) => {
        btn.className = 'q-btn';
        if(index === indiceQuestao) btn.classList.add('active');
        if(respostasSalvas[index]) btn.classList.add('answered');
        if(questoesParaRevisar.has(index)) btn.classList.add('review');
    });
}

function atualizarBarraProgresso() {
    const total = provaAtual.length;
    const respondidas = Object.keys(respostasSalvas).length;
    const porcentagem = (respondidas / total) * 100;
    document.getElementById('progress-bar').style.width = `${porcentagem}%`;
}

function configurarEventosUI() {
    document.getElementById('btn-prev').onclick = () => navegar('anterior');
    document.getElementById('btn-next').onclick = () => navegar('proximo');
    document.getElementById('btn-clear').onclick = limparRespostaAtual;
    document.getElementById('btn-review').onclick = alternarRevisao;
    document.getElementById('btn-finish').onclick = confirmarFinalizacao;

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    document.getElementById('menu-toggle').onclick = () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    };
    document.getElementById('close-menu').onclick = fecharSidebarMobile;
    overlay.onclick = fecharSidebarMobile;

    document.getElementById('theme-toggle').onclick = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    };
}

function fecharSidebarMobile() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

function gerenciarCronometroPersistente() {
    const timerDisplay = document.getElementById('timer-display');
    const timerBox = document.getElementById('timer-box');
    let tempoFim = localStorage.getItem('tempo_fim_prova');

    if (!tempoFim) {
        const agora = new Date().getTime();
        tempoFim = agora + (TEMPO_PROVA_MINUTOS * 60 * 1000);
        localStorage.setItem('tempo_fim_prova', tempoFim);
    }

    timerInterval = setInterval(() => {
        const agora = new Date().getTime();
        const tempoRestante = tempoFim - agora;

        if (tempoRestante <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = "00:00";
            timerBox.classList.add('urgent');
            alert("O tempo da prova acabou! Suas respostas serão enviadas.");
            finalizarProva();
            return;
        }

        const minutos = Math.floor((tempoRestante % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((tempoRestante % (1000 * 60)) / 1000);
        timerDisplay.textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

        if (minutos < 2) {
            timerBox.classList.add('urgent');
        }
    }, 1000);
}

function ativarSeguranca() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            contadorInfracoes++;
            document.title = `⚠️ ALERTA (${contadorInfracoes}) - Retorne à prova!`;
        } else {
            document.title = "Realizando Prova - SENAI";
        }
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
}

function confirmarFinalizacao() {
    const total = provaAtual.length;
    const respondidas = Object.keys(respostasSalvas).length;
    if(respondidas < total) {
        if(!confirm(`Atenção: Você respondeu ${respondidas} de ${total} questões.\nDeseja realmente finalizar?`)) {
            return;
        }
    }
    finalizarProva();
}

function finalizarProva() {
    clearInterval(timerInterval);
    localStorage.setItem('prova_ativa', 'false');

    let acertos = 0;
    provaAtual.forEach((questao, index) => {
        if(respostasSalvas[index] === questao.correta) {
            acertos++;
        }
    });

    document.getElementById('score-number').textContent = `${acertos}/${provaAtual.length}`;
    document.getElementById('cheat-count').textContent = contadorInfracoes;
    document.getElementById('modal-resultado').style.display = 'flex';
}

function sairDoSistema() {
    localStorage.removeItem('prova_ativa');
    localStorage.removeItem('tempo_fim_prova');
    window.location.href = 'index.html';
}