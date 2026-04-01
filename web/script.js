let games = {};
let currentGame = null;
let userSolution = [];
let focusedSlotIndex = 0;

// Elements
const word1Container = document.getElementById('word1');
const word2Container = document.getElementById('word2');
const solutionContainer = document.getElementById('solution');
const difficultySelect = document.getElementById('difficulty');
const vocabularySelect = document.getElementById('vocabulary');
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
    const vocabType = vocabularySelect.value;
    const lengthGames = games[length];

    if (!lengthGames) {
        showMessage('Aucun jeu disponible pour cette longueur.', 'error');
        return;
    }

    let possibleGames = [];
    Object.values(lengthGames).forEach(variations => {
        variations.forEach(g => {
            if (vocabType === 'all' || g.is_common) {
                possibleGames.push(g);
            }
        });
    });

    if (possibleGames.length === 0) {
        showMessage('Aucun mot trouvé pour ce niveau de vocabulaire.', 'error');
        return;
    }

    currentGame = possibleGames[Math.floor(Math.random() * possibleGames.length)];

    // Store original forms but we will use normalized letters for play
    currentGame.normW1 = normalize(currentGame.w1);
    currentGame.normW2 = normalize(currentGame.w2);
    currentGame.normR = normalize(currentGame.R);

    userSolution = new Array(length).fill('');
    focusedSlotIndex = 0;

    renderGame();
    showMessage('', '');
}

function getAvailableLetters() {
    const combined = (currentGame.normW1 + currentGame.normW2).split('');
    const used = userSolution.map(c => normalize(c)).filter(c => c !== '');

    // Calculate counts of each letter
    const counts = {};
    combined.forEach(c => counts[c] = (counts[c] || 0) + 1);
    used.forEach(c => {
        if (counts[c]) counts[c]--;
    });

    return counts;
}

function renderGame() {
    const available = getAvailableLetters();
    const combinedList1 = currentGame.normW1.split('');
    const combinedList2 = currentGame.normW2.split('');

    // We need to track which specific letter instances are "used"
    // To be stable, we'll mark them from left to right
    const usedStatus1 = new Array(combinedList1.length).fill(false);
    const usedStatus2 = new Array(combinedList2.length).fill(false);

    const usedLetters = userSolution.map(c => normalize(c)).filter(c => c !== '');
    usedLetters.forEach(char => {
        let found = false;
        for (let i = 0; i < combinedList1.length; i++) {
            if (combinedList1[i] === char && !usedStatus1[i]) {
                usedStatus1[i] = true;
                found = true;
                break;
            }
        }
        if (!found) {
            for (let i = 0; i < combinedList2.length; i++) {
                if (combinedList2[i] === char && !usedStatus2[i]) {
                    usedStatus2[i] = true;
                    break;
                }
            }
        }
    });

    renderWord(word1Container, combinedList1, usedStatus1);
    renderWord(word2Container, combinedList2, usedStatus2);

    solutionContainer.innerHTML = '';
    userSolution.forEach((char, index) => {
        const slot = document.createElement('div');
        slot.className = 'letter-slot' + (char ? ' filled' : '') + (index === focusedSlotIndex ? ' focused' : '');
        slot.textContent = char.toUpperCase();
        slot.addEventListener('click', () => {
            focusedSlotIndex = index;
            renderGame();
        });

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
            const available = getAvailableLetters();
            if (available[normalize(char)] > 0) {
                userSolution[index] = char;
                focusedSlotIndex = (index + 1) % userSolution.length;
                renderGame();
            }
        };

        solutionContainer.appendChild(slot);
    });
}

function renderWord(container, letters, usedStatus) {
    container.innerHTML = '';
    letters.forEach((char, index) => {
        const letter = document.createElement('div');
        const isUsed = usedStatus[index];
        letter.className = 'letter' + (isUsed ? ' used' : '');
        letter.textContent = char.toUpperCase(); // No accents displayed

        if (!isUsed) {
            letter.draggable = true;
            letter.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', char);
                letter.classList.add('dragging');
            };
            letter.ondragend = () => {
                letter.classList.remove('dragging');
            };
            letter.onclick = () => {
                userSolution[focusedSlotIndex] = char;
                focusedSlotIndex = (focusedSlotIndex + 1) % userSolution.length;
                renderGame();
            };
        }

        container.appendChild(letter);
    });
}

function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
}

function checkSolution() {
    const proposition = userSolution.join('').toLowerCase();
    if (proposition.length < currentGame.normR.length || userSolution.includes('')) {
        showMessage('Le mot n\'est pas complet.', 'error');
        return;
    }

    const normProp = normalize(proposition);
    const length = currentGame.normR.length;
    const sortedKey = normProp.split('').sort().join('');

    if (games[length][sortedKey]) {
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
        if (normalize(userSolution[i]) !== currentGame.normR[i]) {
            userSolution[i] = currentGame.normR[i];
            focusedSlotIndex = (i + 1) % userSolution.length;
            renderGame();
            break;
        }
    }
}

// Event Listeners
newGameBtn.addEventListener('click', startNewGame);
difficultySelect.addEventListener('change', startNewGame);
vocabularySelect.addEventListener('change', startNewGame);
checkBtn.addEventListener('click', checkSolution);
hintBtn.addEventListener('click', giveHint);
resetBtn.addEventListener('click', () => {
    userSolution = new Array(currentGame.normR.length).fill('');
    focusedSlotIndex = 0;
    renderGame();
    showMessage('', '');
});

// Keyboard support
window.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
        if (userSolution[focusedSlotIndex] !== '') {
            userSolution[focusedSlotIndex] = '';
        } else if (focusedSlotIndex > 0) {
            focusedSlotIndex--;
            userSolution[focusedSlotIndex] = '';
        }
        renderGame();
    } else if (e.key === 'Enter') {
        checkSolution();
    } else if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
        const char = normalize(e.key);
        const available = getAvailableLetters();
        if (available[char] > 0) {
            userSolution[focusedSlotIndex] = char;
            focusedSlotIndex = (focusedSlotIndex + 1) % userSolution.length;
            renderGame();
        }
    } else if (e.key === 'ArrowLeft') {
        focusedSlotIndex = Math.max(0, focusedSlotIndex - 1);
        renderGame();
    } else if (e.key === 'ArrowRight') {
        focusedSlotIndex = (focusedSlotIndex + 1) % userSolution.length;
        renderGame();
    }
});

init();
