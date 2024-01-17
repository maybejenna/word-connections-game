// Replace with your actual API key
const apiKey = 'nl81+bAhCjD6JcRIgmO8UQ==JvvRnpMxVKhNGObZ';

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Function to fetch a random word
async function fetchRandomWord() {
    return new Promise((resolve, reject) => {
        $.ajax({
            method: 'GET',
            url: 'https://api.api-ninjas.com/v1/randomword',
            headers: { 'X-Api-Key': apiKey },
            contentType: 'application/json',
            success: function(response) {
                resolve(response.word);
            },
            error: function(xhr, status, error) {
                reject(new Error('Error fetching random word'));
            }
        });
    });
}

// Function to fetch synonyms for a word
async function fetchSynonyms(word) {
    return new Promise((resolve, reject) => {
        $.ajax({
            method: 'GET',
            url: 'https://api.api-ninjas.com/v1/thesaurus?word=' + word,
            headers: { 'X-Api-Key': apiKey },
            contentType: 'application/json',
            success: function(response) {
                resolve(response.synonyms);
            },
            error: function(xhr, status, error) {
                reject(new Error('Error fetching synonyms'));
            }
        });
    });
}

async function createSynonymGroup() {
    try {
        while (true) {
            const randomWord = await fetchRandomWord();
            const synonyms = await fetchSynonyms(randomWord);

            if (synonyms.length >= 4) {
                // Return the first 4 synonyms if the word has at least 4 synonyms
                return synonyms.slice(0, 4);
            }
            // If not enough synonyms, fetch another word
        }
    } catch (error) {
        console.error(error);
        return []; // Return an empty array or handle the error as needed
    }
}

// Function to shuffle an array (Fisher-Yates Shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Function to fill the grid with words from all synonym groups
async function fillGrid() {
    try {
        const allGroups = await Promise.all([
            createSynonymGroup(),
            createSynonymGroup(),
            createSynonymGroup(),
            createSynonymGroup()
        ]);

        let combinedGroups = [];
        allGroups.forEach((group, index) => {
            combinedGroups = combinedGroups.concat(group.map(word => ({ word, groupIndex: index })));
        });

        const shuffledWords = shuffleArray(combinedGroups).slice(0, 16);

        const gridContainer = document.getElementById('grid-container');
        gridContainer.innerHTML = ''; // Clear existing grid

        shuffledWords.forEach(item => {
            const gridItem = document.createElement('div');
            gridItem.classList.add('grid-item');
            gridItem.textContent = item.word;
            gridItem.dataset.groupIndex = item.groupIndex; // Store group index
            gridItem.addEventListener('click', () => handleWordClick(gridItem));
            gridContainer.appendChild(gridItem);
        });
    } catch (error) {
        console.error(error);
    }
}

function shuffleBoard() {
    // Get all grid items that are not part of a grouped word
    const nonGroupedItems = Array.from(document.querySelectorAll('.grid-item:not(.grouped-word)'));

    // Extract the words and their associated groupIndex
    let items = nonGroupedItems.map(item => {
        return { word: item.textContent, groupIndex: item.dataset.groupIndex, element: item };
    });

    // Shuffle the items
    items = shuffleArray(items);

    // Apply the shuffled words back to the grid items
    nonGroupedItems.forEach((item, index) => {
        item.textContent = items[index].word;
        item.dataset.groupIndex = items[index].groupIndex;
    });
}

document.getElementById('shuffle-btn').addEventListener('click', shuffleBoard);

let clickedWords = [];
let strikes = 0;

// Function to handle grid item clicks
function handleWordClick(gridItem) {
    if (gridItem.classList.contains('grouped-word')) {
        return; // Ignore clicks on already grouped words
    }
    // Toggle the 'clicked-word' class
    gridItem.classList.toggle('clicked-word');

    // Add or remove the clicked word from the clickedWords array
    if (gridItem.classList.contains('clicked-word')) {
        clickedWords.push(gridItem);
    } else {
        clickedWords = clickedWords.filter(item => item !== gridItem);
    }
}

function resetSelection() {
    clickedWords.forEach(item => item.classList.remove('clicked-word'));
    clickedWords = [];
}

document.getElementById('reset-btn').addEventListener('click', resetSelection);

document.getElementById('submit-btn').addEventListener('click', checkAndMoveWords);

function checkAndMoveWords() {
    if (clickedWords.length !== 4) {
        return;
    }

    const firstGroupIndex = clickedWords[0].dataset.groupIndex;

    if (clickedWords.every(item => item.dataset.groupIndex === firstGroupIndex)) {
        const groupColor = getRandomColor();

        // Sort clickedWords based on their current position in the grid
        clickedWords.sort((a, b) => {
            return Array.from(a.parentNode.children).indexOf(a) - Array.from(b.parentNode.children).indexOf(b);
        });

        clickedWords.forEach(item => {
            const gridContainer = document.getElementById('grid-container');
            gridContainer.prepend(item); // Move item to the top

            item.style.backgroundColor = groupColor;
            item.classList.add('grouped-word');
        });
    } else {
        giveStrike();
        resetSelection(); 
    }

    clickedWords = [];
}


function giveStrike() {
    strikes++;
    const strikesContainer = document.getElementById('strikes-container');
    const strikeElements = strikesContainer.getElementsByClassName('strike');
    
    if (strikes <= strikeElements.length) {
        strikeElements[strikes - 1].classList.add('strike-used');
    }

    // Check if the game is over
    if (strikes >= 5) {
        endGame();
    }
}

function endGame() {
    // 1. Disable further clicks
    const gridItems = document.querySelectorAll('.grid-item');
    gridItems.forEach(item => {
        item.removeEventListener('click', handleWordClick);
        item.classList.add('game-over'); // Add a class to indicate the game is over
    });

    // 2. Reveal synonym groups
    revealSynonymGroups();

    // 3. Display a game over message
    alert('Game Over! The correct groups have been revealed.');

    // 4. (Optional) Provide a restart option
    // You can add a button for restarting the game and attach an event listener to it
}

function revealSynonymGroups() {
    const gridItems = document.querySelectorAll('.grid-item');
    const groupColors = {};

    gridItems.forEach(item => {
        const groupIndex = item.dataset.groupIndex;

        // Check if the group is already revealed
        if (item.classList.contains('grouped-word')) {
            // If already revealed, use the existing color
            groupColors[groupIndex] = item.style.backgroundColor;
        } else {
            // Assign a color to each group if not already assigned
            if (!groupColors[groupIndex]) {
                groupColors[groupIndex] = getRandomColor();
            }

            // Apply the color to the item
            item.style.backgroundColor = groupColors[groupIndex];
        }
    });
}

// Run the fillGrid function to populate the grid
fillGrid();