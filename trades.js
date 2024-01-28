document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight();
    let urlCoin = getUrlParameter('coin').toUpperCase();
    let coinDropdown = document.getElementById('coin-dropdown');
    if (coinDropdown.options.namedItem(urlCoin)) {
        coinDropdown.value = urlCoin;
    } else {
        urlCoin = coinDropdown.value;
    }
    let dayAgoTimestamp = (Date.now() - (24 * 60 * 60 * 1000));
    fetchAndDisplayTrades(dayAgoTimestamp, urlCoin);
    fetchDailyVolumes(dayAgoTimestamp);
});

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function fetchBlockHeight(callback) {
    let tableHtml = '<table><tr><th>Current Block Height</th>';
    fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            tableHtml += `<td>${data}</td></tr></table>`;
            document.getElementById('info-table').innerHTML = tableHtml;
            if (callback) {
                callback(data);
            }
        })
        .catch(error => {
            console.error('Error fetching block height:', error);
            tableHtml += `<td>Error: ${error}</td></tr></table>`;
            document.getElementById('info-table').innerHTML = tableHtml;
        });
}

async function fetchDailyVolumes(timestamp) {
    const coins = ['LITECOIN', 'BITCOIN', 'DOGECOIN', 'RAVENCOIN', 'DIGIBYTE', 'PIRATECHAIN'];
    for (const coin of coins) {
        try {
            const response = await fetch(`/crosschain/trades?foreignBlockchain=${coin}&minimumTimestamp=${timestamp}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
                document.getElementById(`${coin.toLowerCase()}-volume`).textContent = `HTTP error! status: ${response.status}`;
            }
            const trades = await response.json();
            let dailyQort = 0;
            let dailyForeign = 0;
            trades.forEach(trade => {
                dailyQort += +trade.qortAmount;
                dailyForeign += +trade.foreignAmount;
            });
            if (trades.length > 0) {
                const avgPerQort = dailyForeign / dailyQort;
                document.getElementById(`${coin.toLowerCase()}-volume`).textContent = `${dailyForeign.toFixed(8)}, QORT: ${dailyQort}, 1 QORT = ${avgPerQort.toFixed(8)} ${coin}`;
            } else {
                document.getElementById(`${coin.toLowerCase()}-volume`).textContent = `N/A`;
            }
        } catch (error) {
            document.getElementById(`${coin.toLowerCase()}-volume`).textContent = `Error fetching daily volume: ${error}`;
            console.error(`Error fetching ${coin} daily volume: ${error}`);
        }
    }
}

async function fetchAndDisplayTrades(start, coin) {
    try {
        const response = await fetch(`/crosschain/trades?foreignBlockchain=${coin}&minimumTimestamp=${start}`);
        const trades = await response.json();
        const tableBody = document.getElementById('trades-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';
        trades.reverse().forEach(async trade => {
            let row = document.createElement('tr');
            row.insertCell(0).textContent = trade.qortAmount;
            let fromNameOrAddress = await displayNameOrAddress(trade.sellerAddress);
            row.insertCell(1).textContent = fromNameOrAddress;
            let toNameOrAddress = await displayNameOrAddress(trade.buyerReceivingAddress);
            row.insertCell(2).textContent = toNameOrAddress;
            row.insertCell(3).textContent = trade.foreignAmount;
            row.insertCell(4).textContent = (trade.foreignAmount / trade.qortAmount).toFixed(8);
            let formattedTimestamp = formatTimestamp(trade.tradeTimestamp);
            row.insertCell(5).textContent = formattedTimestamp;                
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error(`Error fetching ${coin} trades: ${error}`);
    }
}

async function displayNameOrAddress(address) {
    let shortenedAddress = address.substring(0, 4) + '...' + address.substring(address.length - 4);
    try {
        const response = await fetch(`/names/address/${address}`);
        const names = await response.json();
        if (names[0]) {
            return `${names[0].name}`;
        } else {
            return `(${shortenedAddress})`;
        }
    } catch (error) {
        console.error('Error fetching name:', error);
        return `(${shortenedAddress})`;
    }
}

document.getElementById('load-more').addEventListener('click', function() {
    const tableBody = document.getElementById('txs-table').getElementsByTagName('tbody')[0];
    const lastRow = tableBody.lastElementChild;
    if (lastRow) {
        let lastBlockHeight = parseInt(lastRow.cells[0].textContent);
        let newStart = lastBlockHeight - 100;
        let newEnd = lastBlockHeight;
        fetchAndDisplayTrades(newStart, newEnd);
    } else {
        console.error('No rows in the table.');
    }
});

document.getElementById('coin-dropdown').addEventListener('change', function() {
    let selectedCoin = this.value;
    let dayAgoTimestamp = (Date.now() - (24 * 60 * 60 * 1000));
    fetchAndDisplayTrades(dayAgoTimestamp, selectedCoin);
});

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toGMTString();
}
