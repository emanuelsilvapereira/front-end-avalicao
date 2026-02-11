/* --- DADOS DAS PROVAS --- */
const bancosDeProvas = {
    "WEB-2025": [
        { id: 1, disciplina: "HTML5", pergunta: "Qual elemento HTML é o contêiner correto para metadados de uma página?", opcoes: ["<body>", "<head>", "<meta>", "<header>"], correta: "B", explicacao: "O <head> contém metadados, título e scripts." },
        { id: 2, disciplina: "CSS3", pergunta: "No CSS, como selecionar todos os elementos <p> dentro de uma <div>?", opcoes: ["div + p", "div > p", "div p", "div ~ p"], correta: "C", explicacao: "'div p' seleciona todos os descendentes p dentro de div." },
        { id: 3, disciplina: "JavaScript", pergunta: "Qual comando exibe uma mensagem no console?", opcoes: ["console.print()", "console.log()", "print()", "echo()"], correta: "B", explicacao: "console.log() é o método padrão para depuração." },
        { id: 4, disciplina: "CSS3", pergunta: "Qual propriedade altera a cor do texto?", opcoes: ["font-color", "text-color", "color", "fg-color"], correta: "C", explicacao: "'color' define a cor do texto." },
        { id: 5, disciplina: "HTML5", pergunta: "Tag para lista não ordenada?", opcoes: ["<ol>", "<ul>", "<li>", "<list>"], correta: "B", explicacao: "<ul> significa Unordered List." }
    ],
    "GERAL-2025": [
        { id: 1, disciplina: "Geografia", pergunta: "O ponto vermelho indica qual capital?", imagem: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Map_of_Brazil_with_flag.svg/250px-Map_of_Brazil_with_flag.svg.png", opcoes: ["Rio de Janeiro", "Salvador", "Brasília", "Manaus"], correta: "C", explicacao: "Brasília é a capital federal." },
        { id: 2, disciplina: "História", pergunta: "Ano do homem na Lua?", opcoes: ["1959", "1969", "1979", "1989"], correta: "B", explicacao: "Apollo 11 foi em 1969." },
        { id: 3, disciplina: "Ciência", pergunta: "Planeta mais próximo do Sol?", opcoes: ["Vênus", "Marte", "Mercúrio", "Terra"], correta: "C", explicacao: "Mercúrio é o primeiro planeta." },
        { id: 4, disciplina: "Química", pergunta: "Fórmula da água?", opcoes: ["H2O", "CO2", "O2", "NaCl"], correta: "A", explicacao: "Dois hidrogênios e um oxigênio." },
        { id: 5, disciplina: "História", pergunta: "Primeiro presidente do Brasil?", opcoes: ["Vargas", "Deodoro", "Dom Pedro II", "JK"], correta: "B", explicacao: "Deodoro da Fonseca, 1889." }
    ],
    "LOGICA-2025": [
        { id: 1, disciplina: "Algoritmos", pergunta: "A=10, B=20. C=A+B*2. Valor de C?", opcoes: ["60", "50", "40", "30"], correta: "B", explicacao: "20*2=40, 10+40=50." },
        { id: 2, disciplina: "Lógica", pergunta: "Operador que exige ambas verdadeiras?", opcoes: ["OR", "NOT", "AND", "XOR"], correta: "C", explicacao: "AND (E) exige tudo verdadeiro." }
    ]
};

const TEMPO_PROVA_MIN = 20;
let provaAtual = [];
let indiceQuestao = 0;
let respostas = {};
let revisao = new Set();
let timerInterval;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');

    const toggleBtns = document.querySelectorAll('#theme-toggle, #theme-toggle-exam, .login-theme-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
    });

    if (document.getElementById('login-form')) initLogin();
    if (document.getElementById('real-content')) initProva();
});

// --- LOGIN ---
function initLogin() {
    localStorage.removeItem('prova_ativa');
    
    // Função global para cards
    window.selecionarProva = function(element, codigo) {
        document.querySelectorAll('.exam-card').forEach(card => card.classList.remove('selected'));
        element.classList.add('selected');
        document.getElementById('selected-exam-code').value = codigo;
    };

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const codigo = document.getElementById('selected-exam-code').value;
        const nome = document.getElementById('student-name').value.trim();

        if (!bancosDeProvas[codigo]) { alert("Erro: Prova inválida."); return; }

        localStorage.setItem('aluno_nome', nome);
        localStorage.setItem('prova_codigo', codigo);
        localStorage.setItem('prova_ativa', 'true');
        localStorage.removeItem('respostas');
        localStorage.removeItem('tempo_fim');
        window.location.href = 'prova.html';
    });
}

// --- PROVA ---
function initProva() {
    if(localStorage.getItem('prova_ativa') !== 'true') { window.location.href = 'index.html'; return; }

    const codigo = localStorage.getItem('prova_codigo');
    provaAtual = bancosDeProvas[codigo];
    respostas = JSON.parse(localStorage.getItem('respostas')) || {};
    
    document.getElementById('user-name').textContent = localStorage.getItem('aluno_nome');
    
    document.getElementById('real-content').style.display = 'none';
    document.getElementById('skeleton-screen').style.display = 'block';
    setTimeout(() => {
        document.getElementById('skeleton-screen').style.display = 'none';
        document.getElementById('real-content').style.display = 'block';
    }, 800);

    configurarTimer();
    renderizarQuestao();
    gerarNavegacao();
    configurarEventosProva();
    setupAtalhos();
}

function escaparHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderizarQuestao() {
    const q = provaAtual[indiceQuestao];
    document.getElementById('q-badge').textContent = q.disciplina;
    document.getElementById('q-title').textContent = `Questão ${indiceQuestao + 1}`;
    document.getElementById('q-text').textContent = q.pergunta;

    const imgArea = document.getElementById('q-image-area');
    if(q.imagem) {
        document.getElementById('q-image').src = q.imagem;
        imgArea.style.display = 'block';
    } else { imgArea.style.display = 'none'; }
    
    const container = document.getElementById('options-box');
    container.innerHTML = '';

    q.opcoes.forEach((texto, i) => {
        const letra = String.fromCharCode(65 + i);
        const checked = respostas[indiceQuestao] === letra ? 'checked' : '';
        
        container.innerHTML += `
            <div class="option-wrapper">
                <input type="radio" name="opcao" id="opt-${i}" class="option-input" value="${letra}" ${checked} onchange="salvar('${letra}')">
                <label class="option-label" for="opt-${i}">
                    <div class="circle"></div>
                    <strong>${letra})</strong>&nbsp; ${escaparHTML(texto)}
                </label>
            </div>
        `;
    });

    document.getElementById('btn-prev').disabled = indiceQuestao === 0;
    const isLast = indiceQuestao === provaAtual.length - 1;
    document.getElementById('btn-next').style.display = isLast ? 'none' : 'block';
    document.getElementById('btn-finish').style.display = isLast ? 'block' : 'none';

    const btnRev = document.getElementById('btn-review');
    if(revisao.has(indiceQuestao)) {
        btnRev.classList.add('active');
        btnRev.innerHTML = '<span class="material-icons-round">flag</span> Revisar (Marcado)';
    } else {
        btnRev.classList.remove('active');
        btnRev.innerHTML = '<span class="material-icons-round">flag</span> Revisar';
    }
    atualizarSidebar();
}

function salvar(letra) {
    respostas[indiceQuestao] = letra;
    localStorage.setItem('respostas', JSON.stringify(respostas));
    atualizarSidebar();
}

function gerarNavegacao() {
    const grid = document.getElementById('nav-grid');
    grid.innerHTML = '';
    provaAtual.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.className = 'q-nav-btn';
        btn.textContent = i + 1;
        btn.onclick = () => { indiceQuestao = i; renderizarQuestao(); };
        grid.appendChild(btn);
    });
    atualizarSidebar();
}

function atualizarSidebar() {
    document.querySelectorAll('.q-nav-btn').forEach((btn, i) => {
        btn.className = 'q-nav-btn';
        if(i === indiceQuestao) btn.classList.add('active');
        if(respostas[i]) btn.classList.add('answered');
        if(revisao.has(i)) btn.classList.add('review');
    });
}

function configurarTimer() {
    const display = document.getElementById('timer');
    let fim = localStorage.getItem('tempo_fim');
    if(!fim) {
        fim = new Date().getTime() + TEMPO_PROVA_MIN * 60000;
        localStorage.setItem('tempo_fim', fim);
    }
    timerInterval = setInterval(() => {
        const resto = fim - new Date().getTime();
        if(resto <= 0) { clearInterval(timerInterval); finalizar(); return; }
        const m = Math.floor(resto / 60000);
        const s = Math.floor((resto % 60000) / 1000);
        display.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        if(m < 5) document.querySelector('.timer-badge').classList.add('urgent');
    }, 1000);
}

function setupAtalhos() {
    document.addEventListener('keydown', (e) => {
        if(document.querySelector('.modal-overlay[style*="flex"]')) return;
        if(e.key === 'ArrowRight' && indiceQuestao < provaAtual.length - 1) { indiceQuestao++; renderizarQuestao(); }
        if(e.key === 'ArrowLeft' && indiceQuestao > 0) { indiceQuestao--; renderizarQuestao(); }
        const key = e.key.toUpperCase();
        if(['A','B','C','D','E'].includes(key)) {
            const inputs = document.querySelectorAll('input[name="opcao"]');
            inputs.forEach(input => { if(input.value === key) input.click(); });
        }
    });
}

function configurarEventosProva() {
    document.getElementById('btn-next').onclick = () => { indiceQuestao++; renderizarQuestao(); };
    document.getElementById('btn-prev').onclick = () => { indiceQuestao--; renderizarQuestao(); };
    document.getElementById('btn-clear').onclick = () => { delete respostas[indiceQuestao]; salvar(null); renderizarQuestao(); };
    document.getElementById('btn-review').onclick = () => {
        if(revisao.has(indiceQuestao)) revisao.delete(indiceQuestao);
        else revisao.add(indiceQuestao);
        renderizarQuestao();
    };
    
    document.getElementById('btn-finish').onclick = confirmarFinalizacao;
    
    document.getElementById('focus-mode-toggle').onclick = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else if (document.exitFullscreen) document.exitFullscreen();
    };
    
    const sidebar = document.querySelector('.sidebar');
    document.getElementById('menu-toggle').onclick = () => sidebar.classList.add('open');
    document.getElementById('close-menu').onclick = () => sidebar.classList.remove('open');
}

function confirmarFinalizacao() {
    const respondidas = Object.values(respostas).filter(r => r).length;
    const total = provaAtual.length;
    if (respondidas < total) {
        const faltam = total - respondidas;
        document.getElementById('aviso-texto').textContent = `Você tem ${faltam} questão(ões) em aberto.`;
        document.getElementById('modal-aviso').style.display = 'flex';
    } else {
        finalizar();
    }
}

window.fecharModalAviso = () => document.getElementById('modal-aviso').style.display = 'none';
window.confirmarEFinalizar = () => { fecharModalAviso(); finalizar(); };

function finalizar() {
    clearInterval(timerInterval);
    localStorage.removeItem('prova_ativa');
    
    let acertos = 0;
    let feedback = '';
    
    provaAtual.forEach((q, i) => {
        const userResp = respostas[i];
        const ok = userResp === q.correta;
        if(ok) acertos++;
        feedback += `<div class="fb-item ${ok ? 'correct' : 'wrong'}">
            <strong>Q${i+1})</strong> ${ok ? 'Correto!' : `Errou (Sua: ${userResp||'-'} | Certa: ${q.correta})`}
            <div style="font-size:0.85rem; margin-top:4px; color:#555">${q.explicacao || ''}</div>
        </div>`;
    });

    document.getElementById('final-score').textContent = `${acertos} / ${provaAtual.length}`;
    document.getElementById('feedback-area').innerHTML = feedback;
    document.getElementById('msg-resultado').textContent = acertos >= provaAtual.length/2 ? "Aprovado!" : "Reprovado";
    document.getElementById('modal-resultado').style.display = 'flex';

    if(acertos >= provaAtual.length/2) {
        document.getElementById('btn-download-pdf').style.display = 'block';
        dispararConfetes();
    }

    const ctx = document.getElementById('scoreChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Acertos', 'Erros'],
            datasets: [{ data: [acertos, provaAtual.length - acertos], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function dispararConfetes() {
    const end = Date.now() + 3000;
    (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#005caa', '#22c55e'] });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#005caa', '#22c55e'] });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

function gerarCertificado() {
    const nome = localStorage.getItem('aluno_nome');
    const curso = localStorage.getItem('prova_codigo');
    const nota = document.getElementById('final-score').textContent;
    
    document.getElementById('cert-name').textContent = nome.toUpperCase();
    document.getElementById('cert-course').textContent = curso;
    document.getElementById('cert-score').textContent = nota;
    document.getElementById('cert-date').textContent = new Date().toLocaleDateString('pt-BR');
    
    const element = document.getElementById('certificate-template');
    element.style.display = 'flex'; 
    
    const opt = {
        margin: 10,
        filename: `Certificado_SENAI_${nome.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.display = 'none';
    });
}

function sair() {
    localStorage.clear();
    window.location.href = 'index.html';
}