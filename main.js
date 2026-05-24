const numbersDiv = document.querySelector('.numbers');
const generateBtn = document.querySelector('#generate');

function generateNumbers() {
    const numbers = new Set();
    while (numbers.size < 6) {
        numbers.add(Math.floor(Math.random() * 45) + 1);
    }

    numbersDiv.innerHTML = '';
    const sortedNumbers = Array.from(numbers).sort((a, b) => a - b);

    for (const number of sortedNumbers) {
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('number');
        numberDiv.textContent = number;
        numbersDiv.appendChild(numberDiv);
    }
}

generateBtn.addEventListener('click', generateNumbers);

generateNumbers();
