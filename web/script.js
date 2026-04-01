let games = {};
let currentGame = null;
let userSolution = [];
let focusedSlotIndex = 0;

// Elements
const word1Container = document.getElementById('word1');
const word2Container = document.getElementById('word2');
const solutionContainer = document.getElementById('solution');
const difficultySelect = document.getElementById('difficulty');
const newGameBtn = document.getElementById('new-game');
const checkBtn = document.getElementById('check-btn');
const hintBtn = document.getElementById('hint-btn');
const resetBtn = document.getElementById('reset-btn');
const messageEl = document.getElementById('message');

// Normalize function (remove accents)
function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Initialize
async function init() {
    try {
        const response = await fetch('games.json');
        games = await response.json();
        startNewGame();
    } catch (error) {
        console.error('Failed to load games:', error);
        showMessage('Erreur lors du chargement des données.', 'error');
    }
}

function startNewGame() {
    const length = parseInt(difficultySelect.value);
    const lengthGames = games[length];

    if (!lengthGames) {
        showMessage('Aucun jeu disponible pour cette longueur.', 'error');
        return;
    }

    const gameKeys = Object.keys(lengthGames);
    const randomKey = gameKeys[Math.floor(Math.random() * gameKeys.length)];
    const variations = lengthGames[randomKey];
    currentGame = variations[Math.floor(Math.random() * variations.length)];

    userSolution = new Array(length).fill('');
    focusedSlotIndex = 0;

    renderGame();
    showMessage('', '');
}

function renderGame() {
    // Render source words
    renderWord(word1Container, currentGame.w1);
    renderWord(word2Container, currentGame.w2);

    // Render solution slots
    solutionContainer.innerHTML = '';
    userSolution.forEach((char, index) => {
        const slot = document.createElement('div');
        slot.className = 'letter-slot' + (char ? ' filled' : '') + (index === focusedSlotIndex ? ' focused' : '');
        slot.textContent = char.toUpperCase();
        slot.addEventListener('click', () => {
            focusedSlotIndex = index;
            renderGame();
        });

        // Drag and Drop: Drop target
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.style.borderColor = '#2ecc71';
        });

        slot.addEventListener('dragleave', () => {
            slot.style.borderColor = '#34495e';
        });

        slot.ondrop = (e) => {
            e.preventDefault();
            const char = e.dataTransfer.getData('text/plain');
            userSolution[index] = char;
            focusedSlotIndex = (index + 1) % userSolution.length;
            renderGame();
        };

        solutionContainer.appendChild(slot);
    });
}

function renderWord(container, word) {
    container.innerHTML = '';
    word.split('').forEach(char => {
        const letter = document.createElement('div');
        letter.className = 'letter';
        letter.textContent = char.toUpperCase();
        letter.draggable = true;

        // Drag and Drop: Drag source
        letter.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', char);
            letter.classList.add('dragging');
        };

        letter.ondragend = () => {
            letter.classList.remove('dragging');
        };

        // Click to add to current focused slot
        letter.onclick = () => {
            userSolution[focusedSlotIndex] = char;
            focusedSlotIndex = (focusedSlotIndex + 1) % userSolution.length;
            renderGame();
        };

        container.appendChild(letter);
    });
}

function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
}

function checkSolution() {
    const proposition = userSolution.join('').toLowerCase();
    if (proposition.length < currentGame.R.length || userSolution.includes('')) {
        showMessage('Le mot n\'est pas complet.', 'error');
        return;
    }

    const normProp = normalize(proposition);
    const normW1 = normalize(currentGame.w1);
    const normW2 = normalize(currentGame.w2);

    const combined = (normW1 + normW2).split('').sort().join('');
    const sortedProp = normProp.split('').sort().join('');

    if (combined !== sortedProp) {
        showMessage('Les lettres ne correspondent pas.', 'error');
        return;
    }

    const length = currentGame.R.length;
    const sortedKey = sortedProp;

    if (games[length][sortedKey]) {
        // Any word that exists in the game data for this key is a valid solution
        const found = games[length][sortedKey].find(g => normalize(g.R) === normProp);
        if (found) {
            showMessage(`Bravo ! "${proposition.toUpperCase()}" est correct.`, 'success');
        } else {
            showMessage(`Presque ! "${proposition.toUpperCase()}" utilise les bonnes lettres mais n'est pas la solution attendue.`, 'error');
        }
    } else {
        showMessage('Ce mot n\'est pas dans notre dictionnaire.', 'error');
    }
}

function giveHint() {
    for (let i = 0; i < userSolution.length; i++) {
        if (normalize(userSolution[i]) !== normalize(currentGame.R[i])) {
            userSolution[i] = currentGame.R[i];
            focusedSlotIndex = (i + 1) % userSolution.length;
            renderGame();
            break;
        }
    }
}

// Event Listeners
newGameBtn.addEventListener('click', startNewGame);
checkBtn.addEventListener('click', checkSolution);
hintBtn.addEventListener('click', giveHint);
resetBtn.addEventListener('click', () => {
    userSolution = new Array(currentGame.R.length).fill('');
    focusedSlotIndex = 0;
    renderGame();
    showMessage('', '');
});

// Keyboard support
window.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
        userSolution[focusedSlotIndex] = '';
        focusedSlotIndex = Math.max(0, focusedSlotIndex - 1);
        renderGame();
    } else if (e.key === 'Enter') {
        checkSolution();
    } else if (e.key.length === 1 && e.key.match(/[a-zàâçéèêëîïôûùÿ-]/i)) {
        userSolution[focusedSlotIndex] = e.key;
        focusedSlotIndex = (focusedSlotIndex + 1) % userSolution.length;
        renderGame();
    } else if (e.key === 'ArrowLeft') {
        focusedSlotIndex = Math.max(0, focusedSlotIndex - 1);
        renderGame();
    } else if (e.key === 'ArrowRight') {
        focusedSlotIndex = Math.min(userSolution.length - 1, focusedSlotIndex + 1);
        renderGame();
    }
});

init();
