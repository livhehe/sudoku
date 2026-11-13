const $ = id => document.getElementById(id);
const usernameInput=$("username-input"), signinBtn=$("signin-btn"), menuSection=$("menu-section"), signinSection=$("signin-section");
const leaderboardList=$("leaderboard-list"), gameArea=$("game-area"), board=$("sudoku-board"), timerDisplay=$("timer");
const dbApi=()=>window.firebaseApp;
let currentUser=null, username="", roomId=null, roomUnsubscribe=null, roomData=null, myRole=null;
let cells=[], selectedIndex=null, givenIndices=new Set(), timerInterval=null, startTime=null, solutionBoard=[], pencilMode=false;
let soloMode=true, raceStarted=false, completionSent=false;

function makeBoard(){
  board.innerHTML=""; cells=[];
  for(let i=0;i<81;i++){
    const wrapper=document.createElement("div"); wrapper.className="cell-wrapper";
    const pencilContainer=document.createElement("div"); pencilContainer.className="pencil-container";
    for(let n=1;n<=9;n++){const p=document.createElement("div");p.className="pencil-num";p.dataset.value=n;pencilContainer.appendChild(p);}
    const input=document.createElement("input");input.maxLength=1;input.readOnly=true;
    wrapper.append(pencilContainer,input);
    wrapper.addEventListener("click",()=>{selectedIndex=i;highlightSelected(i);});
    board.appendChild(wrapper);
    cells.push({wrapper,input,number:0,pencil:new Set(),pencilContainer});
  }
}
function highlightSelected(index){
  cells.forEach((c,i)=>{c.wrapper.classList.remove("selected","related");if(i===index)c.wrapper.classList.add("selected");else if(index>=0&&(Math.floor(i/9)===Math.floor(index/9)||i%9===index%9))c.wrapper.classList.add("related");});
}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function safe(b,i,n){const r=Math.floor(i/9),c=i%9;for(let x=0;x<9;x++)if(b[r*9+x]===n||b[x*9+c]===n)return false;const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(let y=0;y<3;y++)for(let x=0;x<3;x++)if(b[(br+y)*9+bc+x]===n)return false;return true;}
function generateSolution(){const b=Array(81).fill(0);function fill(i=0){if(i===81)return true;for(const n of shuffle([1,2,3,4,5,6,7,8,9]))if(safe(b,i,n)){b[i]=n;if(fill(i+1))return true;b[i]=0;}return false;}fill();return b;}
function countSolutions(input,limit=2){const b=input.slice();let count=0;function fill(i=0){while(i<81&&b[i])i++;if(i===81){count++;return count>=limit;}for(let n=1;n<=9;n++)if(safe(b,i,n)){b[i]=n;if(fill(i+1))return true;b[i]=0;}return false;}fill();return count;}
function makePuzzle(solution,clues=36){
  const puzzle=solution.slice();
  const targetRemovals=81-clues;
  let removals=0;
  for(const index of shuffle([...Array(81).keys()])){
    const original=puzzle[index];
    puzzle[index]=0;
    if(countSolutions(puzzle,2)===1){
      removals++;
      if(removals>=targetRemovals) break;
    } else {
      puzzle[index]=original;
    }
  }
  return puzzle;
}
function renderPuzzle(puzzle,solution){
  solutionBoard=solution.slice();givenIndices.clear();completionSent=false;
  cells.forEach((cell,i)=>{cell.number=puzzle[i];cell.input.value=puzzle[i]||"";cell.pencil.clear();updatePencilDisplay(cell);cell.wrapper.classList.remove("given","mistake");if(puzzle[i]){givenIndices.add(i);cell.wrapper.classList.add("given");}});
  selectedIndex=null;highlightSelected(-1);checkMistakes();
}
function updatePencilDisplay(cell){cell.pencilContainer.querySelectorAll(".pencil-num").forEach(el=>{const n=Number(el.dataset.value);el.textContent=cell.pencil.has(n)?n:"";});}
function checkMistakes(){cells.forEach(c=>c.wrapper.classList.remove("mistake"));const a=cells.map(c=>c.number);for(let i=0;i<81;i++){const n=a[i];if(!n)continue;const r=Math.floor(i/9),c=i%9;for(let j=0;j<9;j++){if(j!==c&&a[r*9+j]===n)cells[i].wrapper.classList.add("mistake");if(j!==r&&a[j*9+c]===n)cells[i].wrapper.classList.add("mistake");}const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(let y=0;y<3;y++)for(let x=0;x<3;x++){const k=(br+y)*9+bc+x;if(k!==i&&a[k]===n)cells[i].wrapper.classList.add("mistake");}}}
function progress(){let correct=0;cells.forEach((c,i)=>{if(!givenIndices.has(i)&&c.number===solutionBoard[i])correct++;});return correct;}
function updateProgress(){if(!roomId||!raceStarted)return;const api=dbApi();const value=progress();api.updateDoc(api.doc(api.db,"rooms",roomId),{[`players.${currentUser.uid}.progress`]:value}).catch(console.error);}
function checkCompletion(){
  const complete=cells.every((c,i)=>c.number===solutionBoard[i]);
  if(!complete)return;
  stopTimer();
  if(soloMode){$("race-status").textContent="Puzzle complete! 🎉";return;}
  if(completionSent||!roomId)return;completionSent=true;
  const api=dbApi();const ref=api.doc(api.db,"rooms",roomId);
  api.runTransaction(api.db,async tx=>{const snap=await tx.get(ref);const data=snap.data();if(data.status==="running"&&!data.winnerUid)tx.update(ref,{status:"finished",winnerUid:currentUser.uid,finishedAt:Date.now()});}).catch(console.error);
}
function startTimer(at=Date.now()){
  stopTimer();startTime=at;
  timerInterval=setInterval(()=>{const s=Math.max(0,Math.floor((Date.now()-startTime)/1000));timerDisplay.textContent=`Time: ${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;},250);
}
function stopTimer(){if(timerInterval)clearInterval(timerInterval);timerInterval=null;}
function showGame(){gameArea.style.display="block";$("home-container").style.display="none";}
function showMenu(){stopTimer();gameArea.style.display="none";$("home-container").style.display="block";}
function showRaceRoom(){ $("room-panel").style.display="block";$("room-code-display").textContent=roomId||""; }
function clearRoomWatch(){if(roomUnsubscribe){roomUnsubscribe();roomUnsubscribe=null;}}
function watchRoom(){
  clearRoomWatch();const api=dbApi();const ref=api.doc(api.db,"rooms",roomId);
  roomUnsubscribe=api.onSnapshot(ref,snap=>{if(!snap.exists()){alert("This race room no longer exists.");leaveRoom(false);return;}roomData=snap.data();renderRoomState();});
}
function renderRoomState(){
  const players=Object.entries(roomData.players||{});
  $("game-difficulty").textContent=`Difficulty: ${roomData.difficulty||"Custom"}`;
  $("race-players").innerHTML=players.map(([uid,p])=>`<div>${escapeHtml(p.username)} ${uid===currentUser.uid?"(you)":""}</div>`).join("");
  const opponent=players.find(([uid])=>uid!==currentUser.uid);
  $("room-status").textContent=roomData.status==="waiting"?"Waiting for another player…":roomData.status==="countdown"?"Both players are in. Get ready!":roomData.status==="running"?"Race in progress!":roomData.status==="finished"?`${roomData.players[roomData.winnerUid]?.username||"Someone"} won!`:"Room ready";
  if(opponent){$("opponent-progress").style.display="block";const pct=Math.round(((opponent[1].progress||0)/Math.max(1,81-givenIndices.size))*100);$("opponent-progress").textContent=`${escapeHtml(opponent[1].username)}: ${pct}% complete`;}
  else $("opponent-progress").style.display="none";
  if(roomData.status==="countdown"||roomData.status==="running"||roomData.status==="finished"){
    $("controls").style.display="none";
    showGame();
    if(!raceStarted&&roomData.puzzle&&roomData.solution){soloMode=false;renderPuzzle(roomData.puzzle,roomData.solution);}
    if(roomData.status==="countdown"){
      const remaining=Math.max(0,Math.ceil((roomData.startAt-Date.now())/1000));
      $("race-status").textContent=remaining>0?`Race starts in ${remaining}…`:"GO!";
      if(remaining<=0&&!raceStarted){
        raceStarted=true;startTimer(roomData.startAt);
        const api=dbApi();
        api.updateDoc(api.doc(api.db,"rooms",roomId),{status:"running"}).catch(console.error);
      } else if(!raceStarted)setTimeout(()=>{if(roomData?.status==="countdown")renderRoomState();},250);
    } else if(roomData.status==="running"){
      if(!raceStarted){raceStarted=true;startTimer(roomData.startAt);}
      $("race-status").textContent="Solve the puzzle. First perfect board wins!";
    } else if(roomData.status==="finished"){
      stopTimer();const won=roomData.winnerUid===currentUser.uid;
      $("race-status").textContent=won?"You won! 🎉":"Race over — your opponent won!";
    }
  }
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function createRoom(clues,difficulty){
  const api=dbApi();const solution=generateSolution();const puzzle=makePuzzle(solution,clues);const code=Array.from(crypto.getRandomValues(new Uint8Array(5)),x=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x%32]).join("");
  const ref=api.doc(api.db,"rooms",code);
  await api.setDoc(ref,{code,status:"waiting",puzzle,solution,difficulty,createdAt:Date.now(),players:{[currentUser.uid]:{username,progress:0}}});
  roomId=code;myRole="host";soloMode=false;raceStarted=false;roomData=null;showRaceRoom();watchRoom();
}
async function joinRoom(code){
  code=code.trim().toUpperCase();if(!/^[A-Z2-9]{5}$/.test(code))throw new Error("Enter a valid 5-character room code.");
  const api=dbApi(),ref=api.doc(api.db,"rooms",code);
  await api.runTransaction(api.db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw new Error("Room not found. Check the code.");const data=snap.data();if(data.status!=="waiting")throw new Error("This race has already started.");const players=data.players||{};if(!players[currentUser.uid]&&Object.keys(players).length>=2)throw new Error("This room is full.");players[currentUser.uid]={username,progress:0};tx.update(ref,{players,status:"countdown",startAt:Date.now()+4000});});
  roomId=code;myRole="guest";soloMode=false;raceStarted=false;showRaceRoom();watchRoom();
}
async function leaveRoom(update=true){
  clearRoomWatch();if(update&&roomId&&currentUser){const api=dbApi();try{await api.updateDoc(api.doc(api.db,"rooms",roomId),{[`players.${currentUser.uid}.left`]:true});}catch(e){console.warn(e);}}
  roomId=null;roomData=null;raceStarted=false;completionSent=false;$("room-panel").style.display="none";$("opponent-progress").style.display="none";showMenu();
}
async function signIn(){
  username=usernameInput.value.trim();if(!username)return alert("Please enter a username.");
  try{currentUser=await window.firebaseReady;const api=dbApi();await api.setDoc(api.doc(api.db,"users",currentUser.uid),{username},{merge:true});signinSection.style.display="none";menuSection.style.display="block";$("welcome-message").textContent=`Hi, ${username}!`;loadLeaderboard();}catch(e){alert("Could not sign in: "+e.message);}
}
async function loadLeaderboard(){
  try{const api=dbApi();const q=api.query(api.collection(api.db,"users"),api.orderBy("points","desc"),api.limit(10));const snap=await api.getDocs(q);leaderboardList.innerHTML="";snap.forEach(d=>{const li=document.createElement("li");li.textContent=`${d.data().username||"Anonymous"}: ${d.data().points||0}`;leaderboardList.appendChild(li);});}catch(e){console.warn("Leaderboard unavailable:",e);}
}
function startSolo(clues=40){
  try {
    clearRoomWatch();
    roomId=null;
    roomData=null;
    soloMode=true;
    raceStarted=true;
    completionSent=false;
    if(cells.length!==81 || board.children.length!==81) makeBoard();
    showGame();
    $("game-area").style.display="flex";
    $("controls").style.display="flex";
    $("game-difficulty").textContent=`Difficulty: ${clues===40?"Easy":clues===32?"Medium":clues===26?"Hard":"Custom"}`;
    $("race-status").textContent="Generating puzzle…";
    $("opponent-progress").style.display="none";
    const sol=generateSolution();
    if(!Array.isArray(sol) || sol.length!==81 || sol.some(n=>!n)) throw new Error("The solution generator returned an incomplete board.");
    const puzzle=makePuzzle(sol,clues);
    if(!Array.isArray(puzzle) || puzzle.length!==81 || puzzle.every(n=>!n)) throw new Error("The puzzle generator returned an empty board.");
    renderPuzzle(puzzle,sol);
    $("race-status").textContent="Solo puzzle";
    startTimer();
  } catch(error) {
    console.error("Could not start solo puzzle:",error);
    $("race-status").textContent="Sorry — the puzzle couldn't be generated. Please try again.";
    alert("Could not start puzzle: "+error.message);
  }
}
signinBtn.addEventListener("click",signIn);
$("solo-btn").addEventListener("click",()=>startSolo(40));
$("share-btn").addEventListener("click",()=>{$("race-difficulty-section").style.display=$("race-difficulty-section").style.display==="none"?"block":"none";});
document.querySelectorAll(".race-difficulty-btn").forEach(btn=>btn.addEventListener("click",async()=>{try{$("race-difficulty-section").style.display="none";await createRoom(Number(btn.dataset.clues),btn.dataset.difficulty);}catch(e){alert(e.message);}}));
$("enter-code-btn").addEventListener("click",()=>$("join-section").style.display="block");
$("join-room-btn").addEventListener("click",async()=>{try{await joinRoom($("room-code-input").value);}catch(e){alert(e.message);}});
$("copy-code-btn").addEventListener("click",()=>navigator.clipboard?.writeText(roomId).then(()=>alert("Room code copied!")).catch(()=>alert("Room code: "+roomId)));
$("leave-room-btn").addEventListener("click",()=>leaveRoom());
$("home-game-btn").addEventListener("click",async()=>{if(roomId&&!soloMode){await leaveRoom();}else{stopTimer();showMenu();}});
document.querySelectorAll(".diff-btn").forEach(btn=>btn.addEventListener("click",()=>{if(soloMode)startSolo(Number(btn.dataset.clues));else alert("Difficulty is chosen when the race is created.");}));
$("pencil-btn").addEventListener("click",()=>{pencilMode=!pencilMode;$("pencil-btn").textContent=pencilMode?"Pencil: On":"Pencil: Off";});
document.querySelectorAll(".num-btn").forEach(btn=>btn.addEventListener("click",()=>{
  if(selectedIndex===null||givenIndices.has(selectedIndex)||(!soloMode&&!raceStarted))return;
  const cell=cells[selectedIndex],n=Number(btn.textContent);
  if(pencilMode){if(cell.number)return;cell.pencil.has(n)?cell.pencil.delete(n):cell.pencil.add(n);updatePencilDisplay(cell);return;}
  cell.number=n;cell.input.value=n;cell.pencil.clear();updatePencilDisplay(cell);checkMistakes();if(!soloMode)updateProgress();checkCompletion();
}));
document.querySelector(".pad-control.erase").addEventListener("click",()=>{if(selectedIndex===null||givenIndices.has(selectedIndex))return;const c=cells[selectedIndex];c.number=0;c.input.value="";c.pencil.clear();updatePencilDisplay(c);checkMistakes();if(!soloMode)updateProgress();});
window.addEventListener("beforeunload",()=>{if(roomId&&currentUser&&dbApi())dbApi().updateDoc(dbApi().doc(dbApi().db,"rooms",roomId),{[`players.${currentUser.uid}.left`]:true}).catch(()=>{});});
makeBoard();
