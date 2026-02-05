/* --- BANCO DE DADOS SIMULADO (Array de Objetos) --- */
const bancoDeQuestoes = [
    {
        id: 1,
        disciplina: "Lógica de Programação",
        pergunta: "Para declarar uma variável em JavaScript que não pode ter seu valor reatribuído, qual palavra-chave devemos utilizar?",
        opcoes: ["var", "let", "const", "static", "fixed"]
    },
    {
        id: 2,
        disciplina: "Desenvolvimento de Sistemas",
        pergunta: "Qual das seguintes tecnologias é utilizada principalmente para estilização de páginas web?",
        opcoes: ["HTML", "Python", "CSS", "Java", "SQL"]
    },
    {
        id: 3,
        disciplina: "Banco de Dados",
        pergunta: "Qual comando SQL é utilizado para extrair dados de um banco de dados?",
        opcoes: ["GET", "OPEN", "EXTRACT", "SELECT", "PULL"]
    },
    {
        id: 4,
        disciplina: "Engenharia de Software",
        pergunta: "Um sistema ainda em estágio de desenvolvimento apresentou erros. Foi decidido lançar uma versão prévia para parceiros. Qual o nome dado a essa versão?",
        opcoes: ["Alfa", "Beta", "Gold", "Open Beta", "Release Candidate"]
    }
];

// Estado da Aplicação
let indiceAtual = 0;
let respostasUsuario = {}; // Guarda as respostas: { 0: 'A', 1: 'C' }

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DA TELA DE LOGIN ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('student-name').value;
            const codigo = document.getElementById('exam-code').value;

            if (nome && codigo) {
                // Salva no armazenamento do navegador
                localStorage.setItem('alunoNome', nome);
                localStorage.setItem('provaCodigo', codigo);
                
                // Redireciona para a prova
                window.location.href = 'prova.html';
            }
        });
    }

    // --- LÓGICA DA TELA DE PROVA ---
    const questionContainer = document.getElementById('question-container');
    if (questionContainer) {
        carregarDadosUsuario();
        iniciarTimer(120 * 60); // 120 minutos em segundos
        renderizarQuestao();
        gerarSidebar();
        
        // Eventos dos Botões
        document.getElementById('btn-next').addEventListener('click', proximaQuestao);
        document.getElementById('btn-prev').addEventListener('click', questaoAnterior);
        document.getElementById('btn-clear').addEventListener('click', limparResposta);
        document.getElementById('btn-finish').addEventListener('click', finalizarProva);
    }
});

/* --- FUNÇÕES AUXILIARES --- */

function carregarDadosUsuario() {
    const nome = localStorage.getItem('alunoNome');
    if (nome) {
        document.getElementById('user-name-display').textContent = nome;
    } else {
        // Se não tiver nome, manda voltar pro login (segurança básica)
        alert("Por favor, faça login primeiro.");
        window.location.href = 'index.html';
    }
}

function renderizarQuestao() {
    const questao = bancoDeQuestoes[indiceAtual];
    
    // Atualiza Textos
    document.getElementById('q-number').textContent = `Questão ${indiceAtual + 1}`;
    document.getElementById('q-discipline').textContent = questao.disciplina;
    document.getElementById('q-text').textContent = questao.pergunta;

    // Gera Opções
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; // Limpa anteriores

    questao.opcoes.forEach((opcao, index) => {
        const letra = String.fromCharCode(65 + index); // A, B, C, D...
        const isChecked = respostasUsuario[indiceAtual] === letra ? 'checked' : '';

        const html = `
            <div class="option-item">
                <input type="radio" name="questao_atual" id="opt-${index}" value="${letra}" ${isChecked} onchange="salvarResposta('${letra}')">
                <label class="option-label" for="opt-${index}">
                    <span class="radio-circle"></span>
                    <span style="font-weight:bold; margin-right:10px;">${letra})</span> ${opcao}
                </label>
            </div>
        `;
        optionsContainer.innerHTML += html;
    });

    // Atualiza Botões
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');

    btnPrev.disabled = indiceAtual === 0;
    
    if (indiceAtual === bancoDeQuestoes.length - 1) {
        btnNext.style.display = 'none';
        btnFinish.style.display = 'inline-block';
    } else {
        btnNext.style.display = 'inline-block';
        btnFinish.style.display = 'none';
    }

    atualizarSidebar();
    atualizarBarraProgresso();
}

function salvarResposta(letra) {
    respostasUsuario[indiceAtual] = letra;
    atualizarSidebar();
    atualizarBarraProgresso();
}

function limparResposta() {
    delete respostasUsuario[indiceAtual];
    const radios = document.getElementsByName('questao_atual');
    radios.forEach(r => r.checked = false);
    atualizarSidebar();
    atualizarBarraProgresso();
}

function proximaQuestao() {
    if (indiceAtual < bancoDeQuestoes.length - 1) {
        indiceAtual++;
        renderizarQuestao();
    }
}

function questaoAnterior() {
    if (indiceAtual > 0) {
        indiceAtual--;
        renderizarQuestao();
    }
}

function gerarSidebar() {
    const nav = document.getElementById('question-nav');
    nav.innerHTML = '';
    
    bancoDeQuestoes.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.className = 'q-btn';
        btn.textContent = i + 1;
        btn.onclick = () => {
            indiceAtual = i;
            renderizarQuestao();
        };
        nav.appendChild(btn);
    });
    atualizarSidebar();
}

function atualizarSidebar() {
    const btns = document.querySelectorAll('.q-btn');
    btns.forEach((btn, i) => {
        btn.className = 'q-btn'; // Reseta
        if (i === indiceAtual) btn.classList.add('active');
        if (respostasUsuario[i]) btn.classList.add('answered');
    });
}

function atualizarBarraProgresso() {
    const total = bancoDeQuestoes.length;
    const respondidas = Object.keys(respostasUsuario).length;
    const pct = (respondidas / total) * 100;
    document.getElementById('progress-bar').style.width = `${pct}%`;
}

function iniciarTimer(segundos) {
    const display = document.getElementById('timer-display');
    
    const intervalo = setInterval(() => {
        const h = Math.floor(segundos / 3600);
        const m = Math.floor((segundos % 3600) / 60);
        const s = segundos % 60;
        
        display.textContent = `Restam: ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        
        if (segundos <= 0) {
            clearInterval(intervalo);
            alert("Tempo esgotado!");
            finalizarProva();
        }
        segundos--;
    }, 1000);
}

function finalizarProva() {
    const total = bancoDeQuestoes.length;
    const respondidas = Object.keys(respostasUsuario).length;
    alert(`Prova finalizada!\nVocê respondeu ${respondidas} de ${total} questões.\n\n(Aqui os dados seriam enviados ao servidor)`);
    window.location.href = 'index.html';
}