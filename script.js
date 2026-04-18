const SLOT_MULTIPLIERS = [3, 1.5, 0.8, 0.5, 0.8, 1.5, 3];
const GAME_ROWS = 7;
let balance = 1000;
let isDropping = false;
let simChart = null;
let theoryData = [-0.415625, -0.415625, -0.415625, -0.415625];

//Return amount of money with dollar sign function 
function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}


function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

//Random Slot Logic. How many rights are we taking?
function getRandomSlot() {
  let rights = 0;

  for (let row = 0; row < GAME_ROWS - 1; row += 1) {
    if (Math.random() >= 0.5) {
      rights += 1;
    }
  }

  return rights;
}

//Board default state
function clearBoardState() {
  document.querySelectorAll(".peg.active").forEach((peg) => peg.classList.remove("active"));
  document.querySelectorAll(".slot-pocket.active-slot").forEach((slot) => slot.classList.remove("active-slot"));
}

function updateHomeStats(slot, message) {
  setText("balanceDisplay", formatMoney(balance));
  setText("slotDisplay", slot === null ? "Waiting..." : `Slot ${slot + 1} (x${SLOT_MULTIPLIERS[slot]})`);
  setText("resultMessage", message);
}

function animateBallPath(finalSlot) {
  return new Promise((resolve) => {
    let currentColumn = 0;
    const pathColumns = [0];

    for (let row = 1; row < GAME_ROWS; row += 1) {
      const remainingRows = GAME_ROWS - row;
      const needsMoreRights = finalSlot - currentColumn;
      const goRight = needsMoreRights > 0 && (remainingRows === needsMoreRights || Math.random() >= 0.5);

      if (goRight) {
        currentColumn += 1;
      }

      pathColumns.push(currentColumn);
    }

    pathColumns.forEach((col, row) => {
      window.setTimeout(() => {
        const peg = document.querySelector(`.peg[data-row="${row}"][data-col="${col}"]`);

        if (peg) {
          peg.classList.add("active");
        }
      }, row * 260);
    });

    window.setTimeout(() => {
      const slot = document.querySelector(`.slot-pocket[data-slot="${finalSlot}"]`);

      if (slot) {
        slot.classList.add("active-slot");
      }

      resolve();
    }, pathColumns.length * 260 + 60);
  });
}

async function handleDrop() {
  const betInput = document.getElementById("betInput");

  if (!betInput || isDropping) {
    return;
  }

  const bet = Number(betInput.value);

  if (!Number.isFinite(bet) || bet <= 0) {
    updateHomeStats(null, "Enter a valid bet to drop the ball.");
    return;
  }

  if (bet > balance) {
    updateHomeStats(null, "That bet is bigger than your current balance.");
    return;
  }

  isDropping = true;
  clearBoardState();
  updateHomeStats(null, "Ball in motion...");

  const finalSlot = getRandomSlot();
  await animateBallPath(finalSlot);

  const payout = bet * SLOT_MULTIPLIERS[finalSlot];
  balance = balance - bet + payout;
  updateHomeStats(finalSlot, `Landed in slot ${finalSlot + 1}. You won ${formatMoney(payout)}.`);
  isDropping = false;
}

function initializeHomePage() {
  const dropButton = document.getElementById("dropBtn");

  if (!dropButton) {
    return;
  }

  updateHomeStats(null, "Ready for the next drop.");
  dropButton.addEventListener("click", handleDrop);
}

initializeHomePage();



function simulate(bet,totalRuns) {
    
    let profit = 0;

    for (let i = 0; i < totalRuns; i++) {
        let finalSlot = getRandomSlot();
        let payout = bet * SLOT_MULTIPLIERS[finalSlot];
        profit = profit - bet + payout;
    }

    return profit;
}

function runSimulation() {
    let bet = Number(document.getElementById("betInput").value);
    let totalRuns = Number(document.getElementById("simInput").value);

    if(bet <= 0) {
        document.getElementById("simResult").innerHTML = "Please, try a valid bet amount..."
        return;
    }
    if (totalRuns > 1000000 || totalRuns <=0 || !Number.isInteger(totalRuns)) {
        document.getElementById("simResult").innerHTML = "Please enter a positive integer up to 1,000,000." 
        return;
    }

    let checkpoints =  makeCheckpoints(totalRuns);
    if (!Array.isArray(checkpoints)) {
       document.getElementById("simResult").innerHTML = checkpoints;
       return; 
    }

    let avgPoints = simulateAtCheckpoints(bet, checkpoints);
    let finalAvg = avgPoints[avgPoints.length - 1];
    let netProfit = finalAvg * totalRuns;
    let avg = finalAvg;
    let theoreticalEV = computeTheoreticalEV();
    let theoryData = checkpoints.map(() => theoreticalEV);


    document.getElementById("simResult").innerHTML =
        `After ${totalRuns} games:<br>
         Net result: $${netProfit.toFixed(2)}<br>
         Avg per game: $${avg.toFixed(2)}<br>
         Theoretical avg per game: $${theoreticalEV.toFixed(4)}`;
    
    drawChart(checkpoints, avgPoints, theoryData);
}

const startBtn = document.getElementById("startBtn");
startBtn.addEventListener("click", runSimulation);

function makeCheckpoints(maxRuns) {
    if(maxRuns >= 1000000){
        return "Max. allowed runs are 1,000,000. Please, try a smaller number";
    }

    let current = 10; 
    let checkpoints = []; 
    
    while (current <= maxRuns) {
        checkpoints.push(current);
        current *=10; 
    }

    if (checkpoints[checkpoints.length - 1] != maxRuns) {
        checkpoints.push(maxRuns); 
    }
    return checkpoints;
}

function simulateAtCheckpoints(bet, checkpoints) {
    let avgPoints = [];
    let profit = 0;
    let checkpointIndex = 0;
    let lastCheckpoint = checkpoints[checkpoints.length - 1];

    for (let i = 1; i <= lastCheckpoint; i++) {
        let finalSlot = getRandomSlot();
        let payout = bet * SLOT_MULTIPLIERS[finalSlot];
        profit = profit - bet + payout;

        if (checkpointIndex < checkpoints.length && i === checkpoints[checkpointIndex]) {
            avgPoints.push((profit / i) / bet);
            checkpointIndex++;
        }
    }

    return avgPoints;
}

function drawChart(labels, monteCarloData, theoryData) {
    const ctx = document.getElementById("simChart");

    if (simChart) {
        simChart.destroy();
    }

    simChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Monte Carlo Average",
                    data: monteCarloData,
                    borderWidth: 2,
                    tension: 0.2,
                    pointRadius: 3,
                    borderColor: "cyan"
                },
                {
                    label: "Theoretical EV",
                    data: theoryData,
                    borderWidth: 2,
                    tension: 0.2,
                    pointRadius: 3,
                    borderDash: [5, 5],
                    borderColor: "red"
                }
            ]
        },
        options: {
        scales: {
            x: {
                type: 'logarithmic',
                title: {
                    display: true,
                    text: 'Number of Simulations (log scale)'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Average Profit per Game'
                }
            }
        }
    }
    });
}

function computeTheoreticalEV() {
    const weights = [1, 6, 15, 20, 15, 6, 1];
    const total = 64;

    let expectedPayout = 0;

    for (let i = 0; i < SLOT_MULTIPLIERS.length; i++) {
        expectedPayout += SLOT_MULTIPLIERS[i] * weights[i];
    }

    expectedPayout /= total;

    return expectedPayout - 1; 
}
