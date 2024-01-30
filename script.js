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
    document.getElementById('block-height').textContent = 'Loading...';
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
    document.getElementById('block-reward').textContent = 'Loading...';
    let reward = 5;
    const decreaseInterval = 259200;
    if (currentHeight > decreaseInterval) {
        reward -= Math.floor((currentHeight - 1) / decreaseInterval) * 0.25;
    }
    document.getElementById('block-reward').textContent = `${reward.toFixed(2)} QORT`;
}

function fetchCirculatingSupply() {
    document.getElementById('total-supply').textContent = 'Loading...';
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
    document.getElementById('block-time').textContent = 'Loading...';
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
    document.getElementById('qort-per-day').textContent = 'Loading...';
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
            const tierCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
            data.forEach(account => {
                totalCount += account.count;
                document.getElementById(`level-${account.level}-count`).textContent = account.count;
                if ([1, 2].includes(account.level)) tierCounts[1] += account.count;
                else if ([3, 4].includes(account.level)) tierCounts[2] += account.count;
                else if ([5, 6].includes(account.level)) tierCounts[3] += account.count;
                else if ([7, 8].includes(account.level)) tierCounts[4] += account.count;
                // This will need updated when 30 accounts reach Level 9:
                else if (account.level === 10) tierCounts[5] += account.count;
            });
            const percentages = [6, 13, 19, 26, 35];
            percentages.forEach((percent, index) => {
                const tierReward = (qortPerDay * (percent / 100)) / tierCounts[index + 1];
                for (let level = index * 2 + 1; level <= index * 2 + 2; level++) {
                    if (level !== 8 && level !== 9) {
                        document.getElementById(`level-${level}-reward`).textContent = tierReward.toFixed(4);
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
