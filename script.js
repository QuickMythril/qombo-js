document.addEventListener('DOMContentLoaded', function() {
    fetchCirculatingSupply();
    fetchCurrentTimestamp();
    fetchOnlineAccounts();
    fetchUnconfirmedTransactions();
    calculateAndDisplayDailyQortInfo();
});

function fetchBlockHeight() {
    fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('block-height').textContent = data;
            fetchBlockReward(data);
        })
        .catch(error => console.error('Error fetching block height:', error));
}

function fetchCirculatingSupply() {
    fetch('/stats/supply/circulating')
        .then(response => response.text())
        .then(data => {
            document.getElementById('total-supply').textContent = data;
        })
        .catch(error => console.error('Error fetching circulating supply:', error));
}

function fetchBlockHeightAndCirculatingSupply() {
    return Promise.all([
        fetch('/blocks/timestamp/' + (Date.now() - (24 * 60 * 60 * 1000)))
            .then(response => response.json())
            .then(data => parseInt(document.getElementById('blocks-past-day').textContent)),
        fetch('/stats/supply/circulating')
            .then(response => response.text())
            .then(data => parseFloat(data))
    ]);
}

function fetchCurrentTimestamp() {
    fetch('/blocks/height')
        .then(response => response.text())
        .then(currentBlockHeight => {
            document.getElementById('block-height').textContent = currentBlockHeight;
            fetchBlockReward(currentBlockHeight);
            currentBlockHeight = parseInt(currentBlockHeight);

            fetch('/utils/timestamp')
                .then(response => response.text())
                .then(currentTimestamp => {
                    const oneDayAgoTimestamp = parseInt(currentTimestamp) - (24 * 60 * 60 * 1000);
                    fetch('/blocks/timestamp/' + oneDayAgoTimestamp)
                        .then(response => response.json())
                        .then(data => {
                            const oneDayAgoBlockHeight = data.height;
                            const blocksInPastDay = currentBlockHeight - oneDayAgoBlockHeight;
                            document.getElementById('blocks-past-day').textContent = blocksInPastDay;
                        })
                        .catch(error => console.error('Error fetching block height from one day ago:', error));
                })
                .catch(error => console.error('Error fetching current timestamp:', error));
        })
        .catch(error => console.error('Error fetching current block height:', error));
}

function fetchBlockReward(currentHeight) {
    let reward = 5;
    const decreaseInterval = 259200;

    if (currentHeight > decreaseInterval) {
        reward -= Math.floor((currentHeight - 1) / decreaseInterval) * 0.25;
    }

    document.getElementById('block-reward').textContent = reward.toFixed(2) + ' QORT';
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
            document.getElementById('total-unconfirmed').textContent = totalUnconfirmed;

            const transactionTypesDiv = document.getElementById('transaction-types');
            Object.keys(transactionTypes).forEach(type => {
                const p = document.createElement('p');
                p.textContent = `Type ${type}: ${transactionTypes[type]}`;
                transactionTypesDiv.appendChild(p);
            });
        })
        .catch(error => console.error('Error fetching unconfirmed transactions:', error));
}

function fetchOnlineAccounts() {
    fetch('/addresses/online/levels')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('accounts-table').getElementsByTagName('tbody')[0];
            data.forEach(account => {
                const row = tableBody.insertRow();
                const cell1 = row.insertCell(0);
                const cell2 = row.insertCell(1);
                cell1.textContent = account.level;
                cell2.textContent = account.count;
            });
        })
        .catch(error => console.error('Error fetching online accounts:', error));
}

function calculateAndDisplayDailyQortInfo() {
    fetchBlockHeightAndCirculatingSupply()
        .then(([blocksInPastDay, totalCirculatingSupply]) => {
            const dailyQort = calculateDailyQort(blocksInPastDay);
            const percentageOfTotal = calculatePercentageOfTotal(dailyQort, totalCirculatingSupply);

            document.getElementById('qort-per-day').textContent = dailyQort.toFixed(2) + ' QORT';
            document.getElementById('daily-percentage').textContent = percentageOfTotal.toFixed(2) + '%';
        })
        .catch(error => console.error('Error calculating daily QORT info:', error));
}

function calculateDailyQort(blocksInPastDay) {
    const blockReward = parseFloat(document.getElementById('block-reward').textContent.split(' ')[0]);
    return blocksInPastDay * blockReward;
}

function calculatePercentageOfTotal(dailyQort, totalCirculatingSupply) {
    return (dailyQort / totalCirculatingSupply) * 100;
}
