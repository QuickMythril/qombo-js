document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight()
        .then(currentHeight => {
            fetchBlockReward(currentHeight);
            return Promise.all([
                fetchCirculatingSupply(),
                fetchDailyBlocks(),
                fetchOnlineAccounts(),
                fetchUnconfirmedTransactions()
            ]);
        })
        .then(() => {
            calculateDailyQort();
        })
        .catch(error => {
            console.error('An error occurred in the fetch chain:', error);
        });
});

/*
function uiOnly() {
    if (typeof qortalRequest === "function") {
        // qortalRequest is available
    } else {
        // qortalRequest not available
    }
}
*/

function fetchBlockHeight() {
    document.getElementById('block-height').textContent = 'Loading';
    return fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('block-height').textContent = data;
            return data;
        })
        .catch(error => {
            document.getElementById('block-height').textContent = `Error fetching block height: ${error}`;
            console.error('Error fetching block height:', error);
        });
}

function fetchBlockReward(currentHeight) {
    document.getElementById('block-reward').textContent = 'Loading';
    let reward = 5;
    const decreaseInterval = 259200;
    if (currentHeight > decreaseInterval) {
        reward -= Math.floor((currentHeight - 1) / decreaseInterval) * 0.25;
    }
    document.getElementById('block-reward').textContent = `${reward.toFixed(2)} QORT`;
}

function fetchCirculatingSupply() {
    document.getElementById('total-supply').textContent = 'Loading';
    return fetch('/stats/supply/circulating')
        .then(response => response.text())
        .then(data => {
            document.getElementById('total-supply').textContent = `${parseFloat(data).toFixed(2)} QORT`;
            return parseFloat(data);
        })
        .catch(error => {
            document.getElementById('total-supply').textContent = `Error fetching circulating supply: ${error}`;
            console.error('Error fetching circulating supply:', error);
            throw error;
        });
}

function fetchDailyBlocks() {
    document.getElementById('block-time').textContent = 'Loading';
    return fetch('/blocks/height')
        .then(response => response.text())
        .then(currentBlockHeight => {
            return currentBlockHeight;
        })
        .then(currentBlockHeight => {
            currentBlockHeight = parseInt(currentBlockHeight);
            return fetch('/utils/timestamp')
                .then(response => response.text())
                .then(currentTimestamp => {
                    const oneDayAgoTimestamp = parseInt(currentTimestamp) - (24 * 60 * 60 * 1000);
                    return fetch('/blocks/timestamp/' + oneDayAgoTimestamp)
                        .then(response => response.json())
                        .then(data => {
                            const oneDayAgoBlockHeight = data.height;
                            const blocksInPastDay = currentBlockHeight - oneDayAgoBlockHeight;
                            const blockTime = Math.floor(24*60*60/blocksInPastDay);
                            document.getElementById('block-time').textContent = `${blockTime} seconds`;
                            document.getElementById('blocks-past-day').textContent = blocksInPastDay;
                            return blocksInPastDay;
                        });
                });
        })
        .catch(error => {
            console.error('Error in fetchDailyBlocks:', error);
        });
}

function calculateDailyQort() {
    document.getElementById('qort-per-day').textContent = 'Loading';
    const blocksInPastDay = parseInt(document.getElementById('blocks-past-day').textContent);
    const blockReward = parseFloat(document.getElementById('block-reward').textContent);
    const dailyQort = blocksInPastDay * blockReward;
    const totalCirculatingSupply = parseFloat(document.getElementById('total-supply').textContent);
    const percentageOfTotal = (dailyQort / totalCirculatingSupply) * 100;
    const dailyQortString = `${dailyQort.toFixed(2)} QORT (${percentageOfTotal.toFixed(2)}% of total)`;
    document.getElementById('qort-per-day').textContent = dailyQortString;
}

function fetchOnlineAccounts() {
    let totalCount = 0;
    fetch('/addresses/online/levels')
        .then(response => response.json())
        .then(data => {
            const qortPerDayString = document.getElementById('qort-per-day').textContent;
            const qortPerDay = parseFloat(qortPerDayString.match(/\d+/)[0]);
            const blocksInPastDay = parseInt(document.getElementById('blocks-past-day').textContent);
            const qortPerThousandBlocks = (qortPerDay/blocksInPastDay)*1000;
            const levelCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0};
            data.forEach(account => {
                totalCount += account.count;
                document.getElementById(`level-${account.level}-count`).textContent = account.count;
                levelCounts[account.level] += account.count;
            });
            const percentages = [6, 13, 19, 26, 32, 3];
            percentages.forEach((percent, index) => {
                const tierCount = levelCounts[(index*2)+1] + levelCounts[(index*2)+2]
                const tierReward = (qortPerThousandBlocks * (percent / 100)) / tierCount;
                for (let level = index * 2 + 1; level <= index * 2 + 2; level++) {
                    if (levelCounts[11] === 0) {
                        if ((level === 9) && (levelCounts[9] < 30)) {
                            document.getElementById(`level-${level}-reward`).textContent = '0';
                        } else if ((level === 10) && (levelCounts[9] < 30)) {
                            document.getElementById(`level-${level}-reward`).textContent = ((tierReward/32)*(32+3)).toFixed(3);
                        } else if (level === 10) {
                            document.getElementById(`level-${level}-reward`).textContent = ((tierReward/32)*(3)).toFixed(3);
                        } else if (level === 11) {
                            document.getElementById(`level-${level}-reward`).textContent = '<- F';
                        } else if (level < 11) {
                            document.getElementById(`level-${level}-reward`).textContent = tierReward.toFixed(3);
                        }
                    } else {
                        if ((level === 9 || level === 10) && (levelCounts[9]+levelCounts[10] < 30)) {
                            document.getElementById(`level-${level}-reward`).textContent = '0';
                        } else if ((level === 11) && (levelCounts[9]+levelCounts[10] < 30)) {
                            document.getElementById(`level-${level}-reward`).textContent = ((tierReward/3)*(32+3)).toFixed(3);
                        } else if (level < 12) {
                            document.getElementById(`level-${level}-reward`).textContent = tierReward.toFixed(3);
                        }
                    }
                }
            });
            document.getElementById(`total-count`).textContent = `Total: ${totalCount}`;
        })
        .catch(error => console.error('Error fetching online accounts:', error));
}

function fetchUnconfirmedTransactions() {
    fetch('/transactions/unconfirmed')
        .then(response => response.json())
        .then(data => {
            const transactionTypes = {};
            data.forEach(transaction => {
                const type = transaction.type;
                transactionTypes[type] = (transactionTypes[type] || 0) + 1;
            });
            const totalUnconfirmed = data.length;
            let tableHtmlUpper = '<table><tr><th>Tx Type:</th>';
            Object.keys(transactionTypes).forEach(type => {
                tableHtmlUpper += `<th>${type}</th>`;
            });
            tableHtmlUpper += '</tr>';
            let tableHtmlLower = `<tr><th>Total: ${totalUnconfirmed}</th>`;
            Object.keys(transactionTypes).forEach(type => {
                tableHtmlLower += `<td>${transactionTypes[type]}</td>`;
            });
            tableHtmlLower += '</tr></table>';

            document.getElementById('transaction-table').innerHTML = tableHtmlUpper + tableHtmlLower;
        })
        .catch(error => {
            document.getElementById('total-unconfirmed').textContent = `Error fetching unconfirmed transactions: ${error}`;
            console.error('Error fetching unconfirmed transactions:', error);
        });
}
