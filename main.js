const board = document.getElementById("sudoku-board");
const timerDisplay = document.getElementById("timer");
const diffButtons = document.querySelectorAll(".diff-btn");
const newPuzzleBtn = document.getElementById("new-puzzle-btn");
const numberButtons = document.querySelectorAll(".num-btn");

let cells = [];
let selectedIndex = null;
let givenIndices = new Set();
let timerInterval = null;
let startTime = null;
let solutionBoard = [];
let pencilMode = false;


// ---------- Create board ----------
while (board.firstChild) board.removeChild(board.firstChild);

cells = [];
for (let i = 0; i < 81; i++) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("cell-wrapper");

// --- Pencil container (3×3 grid) ---
const pencilContainer = document.createElement("div");
pencilContainer.classList.add("pencil-container");

for (let n = 1; n <= 9; n++) {
    const p = document.createElement("div");
    p.classList.add("pencil-num");
    p.dataset.value = n;
    pencilContainer.appendChild(p);
}

wrapper.appendChild(pencilContainer);


    const input = document.createElement("input");
    input.setAttribute("maxlength", "1");
    input.readOnly = true;
    wrapper.appendChild(input);

    input.addEventListener("focus", () => {
        selectedIndex = i;
        highlightSelected(selectedIndex);
    });

    input.addEventListener("input", (e) => handleInput(i, e.target.value));

    board.appendChild(wrapper);
cells.push({ wrapper, input, number: 0, pencil: new Set(), pencilContainer });

}

// ---------- Highlight ----------
function highlightSelected(index) {
    cells.forEach((c, i) => {
        c.wrapper.classList.remove("selected", "related");
        const row1 = Math.floor(index / 9);
        const col1 = index % 9;
        const row2 = Math.floor(i / 9);
        const col2 = i % 9;
        if (i === index) c.wrapper.classList.add("selected");
        else if (row1 === row2 || col1 === col2) c.wrapper.classList.add("related");
    });
}

// ---------- Timer ----------
function startTimer() {
    startTime = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const sec = Math.floor((Date.now() - startTime) / 1000);
        timerDisplay.textContent = `Time: ${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
    }, 1000);
}
function stopTimer() { if (timerInterval) clearInterval(timerInterval); }

// ---------- Handle input ----------
function handleInput(index, val) {
    const cell = cells[index];
    val = val.replace(/[^1-9]/, "");
    if (val === "") { cell.number = 0; cell.input.value = ""; }
    else { cell.number = parseInt(val); cell.input.value = val; }
    checkMistakes();
    checkCompletion();
}

// ---------- Mistake checking ----------
function checkMistakes() {
    cells.forEach(c => c.wrapper.classList.remove("mistake"));
    const boardArray = cells.map(c => c.number);
    for (let i = 0; i < 81; i++) {
        const val = boardArray[i]; if (val === 0) continue;
        const row = Math.floor(i / 9), col = i % 9;

        for (let c = 0; c < 9; c++) if (c !== col && boardArray[row*9+c] === val) cells[i].wrapper.classList.add("mistake");
        for (let r = 0; r < 9; r++) if (r !== row && boardArray[r*9+col] === val) cells[i].wrapper.classList.add("mistake");

        const br = Math.floor(row/3)*3, bc = Math.floor(col/3)*3;
        for (let r=0;r<3;r++) for (let c2=0;c2<3;c2++) {
            const idx = (br+r)*9 + (bc+c2);
            if (idx !== i && boardArray[idx]===val) cells[i].wrapper.classList.add("mistake");
        }
    }
}

// ---------- Completion ----------
function checkCompletion() {
    if (cells.every(c=>c.number>0)) {
        stopTimer();
        alert(`Puzzle complete! Time: ${timerDisplay.textContent.slice(6)}`);
    }
}

// ---------- Sudoku generator ----------
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function isSafe(board,index,num){
    const row=Math.floor(index/9), col=index%9;
    for(let c=0;c<9;c++) if(board[row*9+c]===num) return false;
    for(let r=0;r<9;r++) if(board[r*9+col]===num) return false;
    const br=Math.floor(row/3)*3, bc=Math.floor(col/3)*3;
    for(let r=0;r<3;r++) for(let c2=0;c2<3;c2++) if(board[(br+r)*9+(bc+c2)]===num) return false;
    return true;
}
function generateFullBoard(){
    const board=Array(81).fill(0);
    function backtrack(pos=0){
        if(pos===81) return true;
        const nums=shuffle([1,2,3,4,5,6,7,8,9]);
        for(let n of nums){
            if(isSafe(board,pos,n)){
                board[pos]=n;
                if(backtrack(pos+1)) return true;
                board[pos]=0;
            }
        }
        return false;
    }
    backtrack(); return board;
}
function countSolutions(boardIn, limit=2){
    const board=boardIn.slice(); let count=0;
    function backtrack(pos=0){
        while(pos<81 && board[pos]!==0) pos++;
        if(pos===81){ count++; return count>=limit; }
        for(let n=1;n<=9;n++){
            if(isSafe(board,pos,n)){
                board[pos]=n;
                if(backtrack(pos+1)) return true;
                board[pos]=0;
            }
        }
        return false;
    }
    backtrack(); return count;
}
function makePuzzleFromSolution(solutionBoard, clues=36){
    const puzzle=solutionBoard.slice(); const indices=shuffle([...Array(81).keys()]);
    const removalsTarget=81-clues; let removalsDone=0;
    for(let idx of indices){
        const backup=puzzle[idx]; puzzle[idx]=0;
        if(countSolutions(puzzle,2)!==1) puzzle[idx]=backup;
        else{ removalsDone++; if(removalsDone>=removalsTarget) break; }
    }
    const given=[]; for(let i=0;i<81;i++) if(puzzle[i]!==0) given.push(i);
    return {puzzle,given};
}

// ---------- New Puzzle ----------
function newPuzzle(clues=36){
    clues=Math.max(22,Math.min(50,clues));
    solutionBoard=generateFullBoard();
    const {puzzle,given}=makePuzzleFromSolution(solutionBoard,clues);
    givenIndices.clear();
    for(let i=0;i<81;i++){
        const cell=cells[i];
        cell.number=puzzle[i];
        cell.input.value=puzzle[i]===0 ? "" : String(puzzle[i]);
        cell.wrapper.classList.remove("given","mistake");
        if(given.includes(i)){
            cell.wrapper.classList.add("given");
            givenIndices.add(i);
        }
    }
    startTimer();
    selectedIndex=null;
    highlightSelected(-1);
}

// ---------- Buttons ----------
diffButtons.forEach(btn=>btn.addEventListener("click",()=>{ const clues=parseInt(btn.dataset.clues,10); newPuzzle(clues); }));
newPuzzleBtn.addEventListener("click",()=>newPuzzle(36));

// ---------- Pencil Marks ----------
const pencilBtn = document.getElementById("pencil-btn");
pencilBtn.addEventListener("click", () => {
    pencilMode = !pencilMode;
    pencilBtn.textContent = pencilMode ? "Pencil: On" : "Pencil: Off";
});


// ---------- Number pad ----------
numberButtons.forEach(btn => btn.addEventListener("click", () => {
    if (selectedIndex === null) return;

    const cell = cells[selectedIndex];

    // ERASE BUTTON
    if (btn.classList.contains("erase")) {
        cell.number = 0;
        cell.input.value = "";
        cell.pencil.clear();
        updatePencilDisplay(cell);
        checkMistakes();
        return;
    }

    const val = parseInt(btn.textContent);

    // ---------- PENCIL MODE ----------
    if (pencilMode) {
        // Cannot pencil into a given cell
        if (givenIndices.has(selectedIndex)) return;

        if (cell.number !== 0) return; // cannot pencil over a placed number

        // Toggle pencil mark on/off
        if (cell.pencil.has(val)) cell.pencil.delete(val);
        else cell.pencil.add(val);

        updatePencilDisplay(cell);
        return;
    }

    // ---------- NORMAL NUMBER ENTRY ----------
    cell.number = val;
    cell.input.value = val;
    cell.pencil.clear();
    updatePencilDisplay(cell);
    checkMistakes();
    checkCompletion();
}));

// ---------- Pencil Mark Function ----------
function updatePencilDisplay(cell) {
    const nums = cell.pencil;
    const pencilEls = cell.pencilContainer.querySelectorAll(".pencil-num");

    pencilEls.forEach(el => {
        const n = parseInt(el.dataset.value);
        el.textContent = nums.has(n) ? n : "";
    });
}



// ---------- Initialize ----------
window.addEventListener("load",()=>newPuzzle(36));

