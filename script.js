// Notes:
// typeof qortalRequest === "function" ? showUiVersion : showGatewayVersion

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('home-page').style.display = 'block';
    fetchBlockHeight()
        .then(currentHeight => {
            fetchBlockReward(currentHeight);
            return Promise.all([
                fetchCirculatingSupply(),
                fetchDailyBlocks(),
                fetchOnlineAccounts()
            ]);
        })
        .then(() => {
            calculateDailyQort();
        })
        .catch(error => {
            console.error('An error occurred in the fetch chain:', error);
        });
});

function showSection(sectionId) {
    var sections = document.querySelectorAll('.content-section');
    sections.forEach(function(section) {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    switch (sectionId) {
        case 'blocks-page':
            initBlocksPage();
            break;
        case 'txs-page':
            initTxsPage();
            break;
        case 'trades-page':
            initTradesPage();
            break;
        case 'accounts-page':
            initAccountsPage();
            break;
        case 'apps-page':
            initAppsPage();
            break;
        case 'websites-page':
            initWebsitesPage();
            break;
        case 'polls-page':
            initPollsPage();
            break;
        case 'test-page':
            initTestPage();
            break;
    }
}
function initBlocksPage() {
    fetchAndDisplayBlocks();
    searchByBlock();
    document.getElementById('search-blocks-button').addEventListener('click', handleBlockSearch);
    document.getElementById('search-blocks-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleBlockSearch(); });
}
function initTxsPage() {
    fetchAndDisplayTxs();
    fetchUnconfirmedTransactions();
}
function initTradesPage() {
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
}
function initAccountsPage() {
    document.getElementById('search-accounts-button').addEventListener('click', handleAccountSearch('accounts'));
    document.getElementById('search-accounts-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleAccountSearch('accounts'); });
}
function initAppsPage() {
    searchByName('');
    document.getElementById('search-apps-button').addEventListener('click', handleAccountSearch('apps'));
    document.getElementById('search-apps-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleAccountSearch('apps'); });
}
function initWebsitesPage() {
    searchByName('');
    document.getElementById('search-websites-button').addEventListener('click', handleAccountSearch('websites'));
    document.getElementById('search-websites-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleAccountSearch('websites'); });
}
function initPollsPage() {
    searchPolls();
}
function initTestPage() {
    calculateFeatures();
}

/*
function toCamelCase(str) {
    return ('-' + str)
        .replace(/-(.)/g, (match, group1) => group1.toUpperCase()) // Capitalize after dashes
        .replace(/-/g, ''); // Remove all dashes }
// Example usage
const result = toCamelCase("accounts-page"); // "AccountsPage"
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
    document.getElementById('block-reward').textContent = reward.toFixed(2);
}

function fetchCirculatingSupply() {
    document.getElementById('total-supply').textContent = 'Loading...';
    return fetch('/stats/supply/circulating')
        .then(response => response.text())
        .then(data => {
            document.getElementById('total-supply').textContent = parseFloat(data).toFixed(2);
            return parseFloat(data);
        })
        .catch(error => {
            document.getElementById('total-supply').textContent = `Error fetching circulating supply: ${error}`;
            console.error('Error fetching circulating supply:', error);
            throw error;
        });
}

function fetchDailyBlocks() {
    document.getElementById('blocks-past-day').textContent = 'Loading...';
    document.getElementById('block-time').textContent = 'Loading...';
    return fetch('/blocks/height')
        .then(response => response.text())
        .then(currentBlockHeight => {
            document.getElementById('block-height').textContent = currentBlockHeight;
            return currentBlockHeight;
        })
        .then(currentBlockHeight => {
            currentBlockHeight = parseInt(currentBlockHeight);
            return fetch('/utils/timestamp')
                .then(response => response.text())
                .then(currentTimestamp => {
                    document.getElementById('current-timestamp').textContent = currentTimestamp;
                    const oneDayAgoTimestamp = parseInt(currentTimestamp) - (24 * 60 * 60 * 1000);
                    return fetch('/blocks/timestamp/' + oneDayAgoTimestamp)
                        .then(response => response.json())
                        .then(data => {
                            const oneDayAgoBlockHeight = data.height;
                            const blocksInPastDay = currentBlockHeight - oneDayAgoBlockHeight;
                            const blockTime = (24*60*60/blocksInPastDay).toFixed(2);
                            document.getElementById('block-time').textContent = blockTime;
                            document.getElementById('blocks-past-day').textContent = blocksInPastDay;
                            return blocksInPastDay;
                        });
                });
        })
        .catch(error => {
            console.error('Error in fetchDailyBlocks:', error);
        });
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

function handleAccountSearch(type) {
    const searchQuery = document.getElementById(`search-${type}-input`).value;
    if (!searchQuery) {
        searchByName('');
    }
    if (searchQuery.startsWith('Q') && !searchQuery.includes('0') && !searchQuery.includes('O') && !searchQuery.includes('I') && !searchQuery.includes('l') && searchQuery.length >= 26 && searchQuery.length <= 35) {
        validateAddress(searchQuery);
    } else if (searchQuery.length >= 0 && searchQuery.length <= 40) {
        searchByName(searchQuery);
    }
}
// END General

// Blocks Page
function fetchAndDisplayBlocks(height) {
    fetch(`/blocks/summaries?start=${height-9}&end=${height+1}`)
        .then(response => response.json())
        .then(blocks => {
            const tableBody = document.getElementById('blocks-table').getElementsByTagName('tbody')[0];
            blocks.reverse().forEach(block => {
                let row = document.createElement('tr');
                let th = document.createElement('td');
                th.className = "clickable-name";
                th.setAttribute('data-name', block.height);
                th.textContent = block.height;
                row.appendChild(th);
                let shortenedSignature = block.signature.substring(0, 4) + '...' + block.signature.substring(block.signature.length - 4);
                row.insertCell(1).textContent = shortenedSignature;
                row.insertCell(2).textContent = block.transactionCount;
                row.insertCell(3).textContent = block.onlineAccountsCount;
                let formattedTimestamp = new Date(block.timestamp).toLocaleString();
                row.insertCell(4).textContent = formattedTimestamp;                
                tableBody.appendChild(row);
            });
            document.querySelectorAll('.clickable-name').forEach(element => {
                element.addEventListener('click', function() {
                    document.body.scrollTop = document.documentElement.scrollTop = 0;
                    let target = this.getAttribute('data-name');
                    searchByBlock(target);
                });
            });
        })
        .catch(error => console.error('Error fetching blocks:', error));
}

function handleBlockSearch() {
    const currentBlockHeight = parseInt(document.getElementById('block-height').textContent);
    const searchQuery = document.getElementById('search-blocks-input').value.trim();
    const searchNumber = parseInt(searchQuery, 10);
    if (!searchQuery || isNaN(searchNumber)) return;
    if (searchNumber >= 1 && searchNumber <= currentBlockHeight) {
        searchByBlock(searchNumber);
    } else {
        document.getElementById('block-details').innerHTML = `<p>Invalid search: ${searchQuery}</p>`;
        return;
    }
}

function searchByBlock(height) {
    document.getElementById('block-details').innerHTML = '';
    fetch('/blocks/byheight/' + height)
        .then(response => response.json())
        .then(result => {
            if (result) {
                let resultHtml = '<table><tr>';
                let shortenedSignature = result.signature.substring(0, 4) + '...' + result.signature.substring(result.signature.length - 4);
                resultHtml += `<th>${result.height}</th><td>${shortenedSignature}</td><td>${result.transactionCount} Txs</td>
                <td>${result.onlineAccountsCount} Minters</td><td>${new Date(result.timestamp).toLocaleString()}</td></tr></table>`;
                if (result.transactionCount > 0) {
                    fetchBlockTxs(result.signature);
                } else {
                    const tableBody = document.getElementById('block-txs-table').getElementsByTagName('tbody')[0];
                    while (tableBody.firstChild) {
                        tableBody.removeChild(tableBody.firstChild);
                    }
                }
                document.getElementById('block-details').innerHTML = resultHtml;
            } else {
                document.getElementById('block-details').innerHTML = `<p>Block ${height} not found.</p>`;
            }
        })
        .catch(error => {
            document.getElementById('block-details').innerHTML = `<p>Error searching by block: ${error}</p>`;
            console.error('Error searching by block:', error);
        });
}

async function fetchBlockTxs(signature) {
    try {
        const response = await fetch(`/transactions/block/${signature}`);
        const txs = await response.json();
        const tableBody = document.getElementById('block-txs-table').getElementsByTagName('tbody')[0];
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        txs.sort((a, b) => b.timestamp - a.timestamp);
        for (const tx of txs) {
            let row = document.createElement('tr');
            row.insertCell(0).textContent = tx.blockHeight;
            let shortenedSignature = tx.signature.substring(0, 4) + '...' + tx.signature.substring(tx.signature.length - 4);
            row.insertCell(1).textContent = shortenedSignature;
            row.insertCell(2).textContent = tx.type;
            let nameOrAddress = await displayNameOrAddress(tx.creatorAddress);
            row.insertCell(3).innerHTML = nameOrAddress;
            row.insertCell(4).textContent = tx.fee;
            let formattedTimestamp = new Date(tx.timestamp).toLocaleString();
            row.insertCell(5).textContent = formattedTimestamp;                
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
}

async function displayNameOrAddress(address) {
    let shortenedAddress = address.substring(0, 4) + '...' + address.substring(address.length - 4);
    try {
        const response = await fetch(`/names/address/${address}`);
        const names = await response.json();
        if (names[0]) {
            return `<img src="/arbitrary/THUMBNAIL/${names[0].name}/qortal_avatar"
            style="width:24px;height:24px;"
            onerror="this.style='display:none'"
            >${names[0].name}`;
        } else {
            return `(${shortenedAddress})`;
        }
    } catch (error) {
        console.error('Error fetching name:', error);
        return `(${shortenedAddress})`;
    }
}

document.getElementById('load-more-blocks').addEventListener('click', function() {
    const tableBody = document.getElementById('blocks-table').getElementsByTagName('tbody')[0];
    const lastRow = tableBody.lastElementChild;
    if (lastRow) {
        let lastBlockHeight = parseInt(lastRow.cells[0].textContent);
        fetchAndDisplayBlocks(lastBlockHeight-1);
    } else {
        console.error('No rows in the table.');
    }
});
// END Blocks Page

// Txs Page
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

async function fetchAndDisplayTxs(height) {
    try {
        const response = await fetch(`/transactions/search?startBlock=${height-99}&blockLimit=100&confirmationStatus=CONFIRMED&limit=0`);
        const txs = await response.json();
        const tableBody = document.getElementById('recent-txs-table').getElementsByTagName('tbody')[0];
        txs.sort((a, b) => b.timestamp - a.timestamp);
        txs.forEach(async tx => {
            let row = document.createElement('tr');
            row.insertCell(0).textContent = tx.blockHeight;
            let shortenedSignature = tx.signature.substring(0, 4) + '...' + tx.signature.substring(tx.signature.length - 4);
            row.insertCell(1).textContent = shortenedSignature;
            row.insertCell(2).textContent = tx.type;
            let nameOrAddress = await displayNameOrAddress(tx.creatorAddress);
            row.insertCell(3).innerHTML = nameOrAddress;
            row.insertCell(4).textContent = tx.fee;
            let formattedTimestamp = new Date(tx.timestamp).toLocaleString();
            row.insertCell(5).textContent = formattedTimestamp;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
}

async function displayNameOrAddress(address) {
    let shortenedAddress = address.substring(0, 4) + '...' + address.substring(address.length - 4);
    try {
        const response = await fetch(`/names/address/${address}`);
        const names = await response.json();
        if (names[0]) {
            return `<img src="/arbitrary/THUMBNAIL/${names[0].name}/qortal_avatar"
            style="width:24px;height:24px;"
            onerror="this.style='display:none'"
            >${names[0].name}`;
        } else {
            return `(${shortenedAddress})`;
        }
    } catch (error) {
        console.error('Error fetching name:', error);
        return `(${shortenedAddress})`;
    }
}

document.getElementById('load-more-txs').addEventListener('click', function() {
    const tableBody = document.getElementById('recent-txs-table').getElementsByTagName('tbody')[0];
    const lastRow = tableBody.lastElementChild;
    if (lastRow) {
        let lastBlockHeight = parseInt(lastRow.cells[0].textContent);
        fetchAndDisplayTxs(lastBlockHeight-1);
    } else {
        console.error('No rows in the table.');
    }
});
// END Txs Page

// Trades Page
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

async function fetchDailyVolumes(timestamp) {
    const coins = ['LITECOIN', 'BITCOIN', 'DOGECOIN', 'RAVENCOIN', 'DIGIBYTE', 'PIRATECHAIN'];
    for (const coin of coins) {
        document.getElementById(`${coin.toLowerCase()}-spent`).textContent = 'Loading...';
        try {
            const response = await fetch(`/crosschain/trades?foreignBlockchain=${coin}&minimumTimestamp=${timestamp}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
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
                document.getElementById(`${coin.toLowerCase()}-spent`).textContent = `${dailyForeign.toFixed(8)}`;
                document.getElementById(`${coin.toLowerCase()}-bought`).textContent = `${dailyQort.toFixed(8)}`;
                document.getElementById(`${coin.toLowerCase()}-price`).textContent = `${avgPerQort.toFixed(8)}`;
            } else {
                document.getElementById(`${coin.toLowerCase()}-spent`).textContent = `0`;
                document.getElementById(`${coin.toLowerCase()}-bought`).textContent = `0`;
                document.getElementById(`${coin.toLowerCase()}-price`).textContent = `-`;
            }
        } catch (error) {
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
            row.insertCell(1).innerHTML = fromNameOrAddress;
            let toNameOrAddress = await displayNameOrAddress(trade.buyerReceivingAddress);
            row.insertCell(2).innerHTML = toNameOrAddress;
            row.insertCell(3).textContent = trade.foreignAmount;
            row.insertCell(4).textContent = (trade.foreignAmount / trade.qortAmount).toFixed(8);
            let formattedTimestamp = new Date(trade.tradeTimestamp).toLocaleString();
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
            return `<img src="/arbitrary/THUMBNAIL/${names[0].name}/qortal_avatar"
            style="width:24px;height:24px;"
            onerror="this.style='display:none'"
            >${names[0].name}`;
        } else {
            return `(${shortenedAddress})`;
        }
    } catch (error) {
        console.error('Error fetching name:', error);
        return `(${shortenedAddress})`;
    }
}

document.getElementById('load-more-trades').addEventListener('click', function() {
    const tableBody = document.getElementById('trades-table').getElementsByTagName('tbody')[0];
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
// END Trades Page

// Accounts Page
function validateAddress(address) {
    fetch('/addresses/validate/' + address)
        .then(response => response.json())
        .then(isValid => {
            if (isValid) {
                fetchAddressDetails(address);
            } else {
                alert('Invalid address.');
            }
        })
        .catch(error => console.error('Error validating address:', error));
}

function fetchAddressDetails(address) {
    document.getElementById('account-details').innerHTML = '<p>Loading...</p>';
    Promise.all([
        fetch('/addresses/' + address).then(response => response.json()),
        fetch('/addresses/balance/' + address).then(response => response.text()),
        fetch('/names/address/' + address).then(response => response.json()),
        fetch('/addresses/rewardshares?involving=' + address).then(response => response.json())
    ]).then(async ([addressDetails, balance, names, rewardShares]) => {
        let tableHtml = '<table>';
        if (names.length > 0) {
            tableHtml += `<tr><th>Registered Name</th><th><img src="/arbitrary/THUMBNAIL/${names[0].name}/qortal_avatar"
            style="width:48px;height:48px;"
            onerror="this.style.display='none'"
            >${names[0].name}</th></tr>`;
        }
        tableHtml += `
            <tr><th>Address</th><th>${address}</th></tr>
            <tr><td>Public Key</td><td>${addressDetails.publicKey}</td></tr>
            <tr><td>Level</td><td>${addressDetails.level}${addressDetails.flags === 1 ? ' (Founder)' : ''}</td></tr>
            <tr><td>Blocks Minted</td>
                <td>
                    ${addressDetails.blocksMinted}
                    ${addressDetails.blocksMintedAdjustment > 0 ? ` +${addressDetails.blocksMintedAdjustment}` : ''}
                    ${addressDetails.blocksMintedPenalty < 0 ? ` ${addressDetails.blocksMintedPenalty}` : ''}
                    ${addressDetails.blocksMintedAdjustment > 0 || addressDetails.blocksMintedPenalty < 0 ?
                    ` (Total: ${addressDetails.blocksMinted+addressDetails.blocksMintedAdjustment+addressDetails.blocksMintedPenalty})` : ''}
                </td></tr>
            <tr><td>Balance</td><td>${parseFloat(balance).toFixed(8)} QORT</td></tr>`;
        let selfShare = '';
        let shareList = [];
        let shareHtml = '';
        for (const share of rewardShares) {
            if (share.recipient === share.mintingAccount) {
                let displayName = await displayNameOrAddress(share.recipient);
                selfShare = displayName;
            } else if (address === share.mintingAccount) {
                let displayName = await displayNameOrAddress(share.recipient);
                let shareElement = `<span class="clickable-name" data-name="${share.recipient}">${displayName}</span>`;
                shareList.push(shareElement);
            } else if (address === share.recipient) {
                let displayName = await displayNameOrAddress(share.mintingAccount);
                let shareElement = `(from <span class="clickable-name" data-name="${share.mintingAccount}">${displayName}</span>)`;
                shareList.push(shareElement);
            }
        }
        shareHtml = (selfShare ? (shareList[0] ? `${selfShare} | ` : selfShare) : '') + shareList.join(' | ');
        tableHtml += `<tr><td>Active Rewardshares</td><td>${shareHtml}</td></tr></table>`;
        document.getElementById('account-details').innerHTML = tableHtml;
        document.querySelectorAll('.clickable-name').forEach(element => {
            element.addEventListener('click', function() {
                document.body.scrollTop = document.documentElement.scrollTop = 0;
                let target = this.getAttribute('data-name');
                fetchAddressDetails(target);
            });
        });
    }).catch(error => console.error('Error fetching address details:', error));
}

async function displayNameOrAddress(address) {
    let shortenedAddress = address.substring(0, 4) + '...' + address.substring(address.length - 4);
    try {
        const response = await fetch(`/names/address/${address}`);
        const names = await response.json();
        if (names[0]) {
            return `<img src="/arbitrary/THUMBNAIL/${names[0].name}/qortal_avatar"
            style="width:24px;height:24px;"
            onerror="this.style='display:none'"
            >${names[0].name}`;
        } else {
            return `(${shortenedAddress})`;
        }
    } catch (error) {
        console.error('Error fetching name:', error);
        return `(${shortenedAddress})`;
    }
}

function searchByName(name) {
    document.getElementById('account-details').innerHTML = '<p>Loading...</p>';
    document.getElementById('account-results').innerHTML = '<p>Loading...</p>';
    fetch('/names/search?query=' + name)
        .then(response => response.json())
        .then(results => {
            if (results.length > 0) {
                let tableHtml = '<table>';
                tableHtml += `
                    <tr>
                        <th>Address</th>
                        <th>Name</th>
                        <th>For Sale</th>
                        <th>Data</th>
                        <th>Registered</th>
                    </tr>
                `;
                results.forEach(result => {
                    tableHtml += `
                        <tr>
                            <td>${result.owner}</td>
                            <td class="clickable-name" data-name="${result.owner}"><img src="/arbitrary/THUMBNAIL/${result.name}/qortal_avatar"
                            style="width:24px;height:24px;"
                            onerror="this.style='display:none'"
                            >${result.name}</td>
                            <td>${result.isForSale ? 'YES' : '-'}</td>
                            <td>${result.data}</td>
                            <td>${new Date(result.registered).toLocaleString()}</td>
                        </tr>
                    `;
                });
                tableHtml += '</table>';
                document.getElementById('account-results').innerHTML = tableHtml;
                document.querySelectorAll('.clickable-name').forEach(element => {
                    element.addEventListener('click', function() {
                        document.body.scrollTop = document.documentElement.scrollTop = 0;
                        let target = this.getAttribute('data-name');
                        fetchAddressDetails(target);
                    });
                });
                const exactMatch = results.find(r => r.name.toLowerCase() === name.toLowerCase());
                if (exactMatch) {
                    fetchAddressDetails(exactMatch.owner);
                } else {
                    document.getElementById('account-details').innerHTML = '<p>No exact match found.</p>';
                }
            } else {
                document.getElementById('account-results').innerHTML = '<p>No results found.</p>';
            }
        })
        .catch(error => console.error('Error searching by name:', error));
}
// END Accounts Page

// Apps Page
function validateAddress(address) {
    fetch('/addresses/validate/' + address)
        .then(response => response.json())
        .then(isValid => {
            if (isValid) {
                fetchAddressDetails(address);
            } else {
                searchByName(address);
            }
        })
        .catch(error => console.error('Error validating address:', error));
}

function fetchAddressDetails(address) {
    Promise.all([
        fetch('/names/address/' + address).then(response => response.json())
    ]).then(([names]) => {
        if (names.length > 0) {
            searchByName(names[0].name);
        } else {
            searchByName(address);
        }
    }).catch(error => console.error('Error fetching address details:', error));
}

function searchByName(name) {
    document.getElementById('app-results').innerHTML = '<p>Searching...</p>';
    fetch('/arbitrary/resources/search?service=APP&name=' + name)
    .then(response => response.json())
    .then(results => {
        if (results.length > 0) {
            let tableHtml = '<table>';
            tableHtml += `
                <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Created</th>
                    <th>Last Updated</th>
                </tr>
            `;
            results.sort((a, b) => (b.updated || b.created) - (a.updated || a.created));
            results.forEach(result => {
                let createdString = new Date(result.created).toLocaleString()
                let updatedString = new Date(result.updated).toLocaleString()
                if (updatedString === 'Invalid Date') {
                    updatedString = 'Never'
                }
                let sizeString = '';
                if (result.size > (1024*1024)) {
                    let adjustedSize = (result.size / (1024*1024)).toFixed(2);
                    sizeString = adjustedSize + ' mb';
                } else if (result.size > 1024) {
                    let adjustedSize = (result.size / 1024).toFixed(2);
                    sizeString = adjustedSize + ' kb';
                } else {
                    sizeString = result.size + ' b'
                }
                tableHtml += `
                    <tr>
                        <td class="clickable-name" data-name="${result.name}">
                        <img src="/arbitrary/THUMBNAIL/${result.name}/qortal_avatar"
                        style="width:24px;height:24px;"
                        onerror="this.style='display:none'"
                        >${result.name}</td>
                        <td>${sizeString}</td>
                        <td>${createdString}</td>
                        <td>${updatedString}</td>
                    </tr>
                `;
            });
            tableHtml += '</table>';
            document.getElementById('app-results').innerHTML = tableHtml;
            document.querySelectorAll('.clickable-name').forEach(element => {
                element.addEventListener('click', function() {
                    let target = this.getAttribute('data-name');
                    openNewTab(target, 'APP');
                });
            });
            //const exactMatch = results.find(r => r.name.toLowerCase() === name.toLowerCase());
            //if (exactMatch) {
                // TODO - Display specific app info.
                // fetchAddressDetails(exactMatch.owner);
            //}
        } else {
            document.getElementById('app-results').innerHTML = '<p>No results found.</p>';
        }
    })
    .catch(error => {
        console.error('Error searching by name:', error);
        document.getElementById('app-results').innerHTML = `<p>Error: ${error}</p>`;
    })
}

async function openNewTab(name, service) {
    const response = await qortalRequest({
        action: 'OPEN_NEW_TAB',
        qortalLink: `qortal://${service}/${name}`
      })
}
// END Apps Page

// Websites Page
function validateAddress(address) {
    fetch('/addresses/validate/' + address)
        .then(response => response.json())
        .then(isValid => {
            if (isValid) {
                fetchAddressDetails(address);
            } else {
                searchByName(address);
            }
        })
        .catch(error => console.error('Error validating address:', error));
}

function fetchAddressDetails(address) {
    Promise.all([
        fetch('/names/address/' + address).then(response => response.json())
    ]).then(([names]) => {
        if (names.length > 0) {
            searchByName(names[0].name);
        } else {
            searchByName(address);
        }
    }).catch(error => console.error('Error fetching address details:', error));
}

function searchByName(name) {
    document.getElementById('website-results').innerHTML = '<p>Searching...</p>';
    fetch('/arbitrary/resources/search?service=WEBSITE&name=' + name)
    .then(response => response.json())
    .then(results => {
        if (results.length > 0) {
            let tableHtml = '<table>';
            tableHtml += `
                <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Created</th>
                    <th>Last Updated</th>
                </tr>
            `;
            results.sort((a, b) => (b.updated || b.created) - (a.updated || a.created));
            results.forEach(result => {
                let createdString = new Date(result.created).toLocaleString()
                let updatedString = new Date(result.updated).toLocaleString()
                if (updatedString === 'Invalid Date') {
                    updatedString = 'Never'
                }
                let sizeString = '';
                if (result.size > (1024*1024)) {
                    let adjustedSize = (result.size / (1024*1024)).toFixed(2);
                    sizeString = adjustedSize + ' mb';
                } else if (result.size > 1024) {
                    let adjustedSize = (result.size / 1024).toFixed(2);
                    sizeString = adjustedSize + ' kb';
                } else {
                    sizeString = result.size + ' b'
                }
                tableHtml += `
                    <tr>
                        <td class="clickable-name" data-name="${result.name}">
                        <img src="/arbitrary/THUMBNAIL/${result.name}/qortal_avatar"
                        style="width:24px;height:24px;"
                        onerror="this.style='display:none'"
                        >${result.name}</td>
                        <td>${sizeString}</td>
                        <td>${createdString}</td>
                        <td>${updatedString}</td>
                    </tr>
                `;
            });
            tableHtml += '</table>';
            document.getElementById('website-results').innerHTML = tableHtml;
            document.querySelectorAll('.clickable-name').forEach(element => {
                element.addEventListener('click', function() {
                    let target = this.getAttribute('data-name');
                    openNewTab(target, 'WEBSITE');
                });
            });
            //const exactMatch = results.find(r => r.name.toLowerCase() === name.toLowerCase());
            //if (exactMatch) {
                // TODO - Display specific website info.
                // fetchAddressDetails(exactMatch.owner);
            //}
        } else {
            document.getElementById('website-results').innerHTML = '<p>No results found.</p>';
        }
    })
    .catch(error => {
        console.error('Error searching by name:', error);
        document.getElementById('website-results').innerHTML = `<p>Error: ${error}</p>`;
    })
}

async function openNewTab(name, service) {
    const response = await qortalRequest({
        action: 'OPEN_NEW_TAB',
        qortalLink: `qortal://${service}/${name}`
      })
}
// END Websites Page

// Polls Page
async function searchPolls() {
    document.getElementById('poll-results').innerHTML = '<p>Searching...</p>';
    try {
        const response = await fetch('/polls');
        const results = await response.json();
        if (results && results.length > 0) {
            let tableHtml = '<table>';
            tableHtml += `
                <tr>
                    <th>Poll Name</th>
                    <th>Description</th>
                    <th>Owner</th>
                    <th>Poll Options</th>
                    <th>Published</th>
                </tr>
            `;
            results.sort((a, b) => b.published - a.published);
            for (const result of results) {
                let publishedString = new Date(result.published).toLocaleString();
                let pollOptionsString = result.pollOptions.map(option => option.optionName).join(', ');
                let displayName = await displayNameOrAddress(result.owner);
                tableHtml += `
                    <tr>
                        <td class="clickable-name" data-name="${result.pollName}">${result.pollName}</td>
                        <td>${result.description}</td>
                        <td>${displayName}</td>
                        <td>${pollOptionsString}</td>
                        <td>${publishedString}</td>
                    </tr>
                `;
            }
            tableHtml += '</table>';
            document.getElementById('poll-results').innerHTML = tableHtml;
            document.querySelectorAll('.clickable-name').forEach(element => {
                element.addEventListener('click', function() {
                    document.body.scrollTop = document.documentElement.scrollTop = 0;
                    let target = this.getAttribute('data-name');
                    fetchPoll(target);
                });
            });            
        } else {
            document.getElementById('poll-results').innerHTML = '<p>No results found.</p>';
        }
    } catch (error) {
        console.error('Error searching polls:', error);
        document.getElementById('poll-results').innerHTML = `<p>Error: ${error}</p>`;
    }
}

async function fetchPoll(pollName) {
    try {
        const pollResponse = await fetch('/polls/' + encodeURIComponent(pollName));
        const pollData = await pollResponse.json();
        const voteResponse = await fetch('/polls/votes/' + encodeURIComponent(pollName));
        const voteData = await voteResponse.json();
        const voteCountMap = new Map(voteData.voteCounts.map(item => [item.optionName, item.voteCount]));
        const voteWeightMap = new Map(voteData.voteWeights.map(item => [item.optionName, item.voteWeight]));
        pollData.pollOptions.forEach(option => {
            option.voteCount = voteCountMap.get(option.optionName) || 0;
            option.voteWeight = voteWeightMap.get(option.optionName) || 0;
        });
        let displayName = await displayNameOrAddress(pollData.owner);
        let publishedString = new Date(pollData.published).toLocaleString();
        let htmlContent = `<table><tr><th>${pollData.pollName}</th><td>${displayName}</td>`;
        htmlContent += `<td>${publishedString}</td></tr></table>`;
        htmlContent += `<table><tr><td>${pollData.description}</td></tr></table>`;
        htmlContent += `<table><tr><th>Poll Options</th>`;
        pollData.pollOptions.forEach((option, index) => {
            htmlContent += `<td>Vote <button onclick="voteOnPoll('${pollData.pollName}', ${index})">${option.optionName}</button></td>`;
        });
        htmlContent += `</tr><tr><th>Vote Counts (Total: ${voteData.totalVotes})</th>`;
        pollData.pollOptions.forEach(option => {
            let percentage = (option.voteCount/voteData.totalVotes*100).toFixed(2);
            htmlContent += `<td>${option.voteCount} (${percentage}%)</td>`;
        });
        htmlContent += `</tr><tr><th>Vote Weights (Total: ${voteData.totalWeight})</th>`;
        pollData.pollOptions.forEach(option => {
            let percentage = (option.voteWeight/voteData.totalWeight*100).toFixed(2);
            htmlContent += `<td>${option.voteWeight} (${percentage}%)</td>`;
        });
        htmlContent += `</tr></table>`;
        document.getElementById('poll-details').innerHTML = htmlContent;
    } catch (error) {
        console.error('Error fetching poll:', error);
        document.getElementById('poll-details').innerHTML = `Error: ${error}`;
    }
}

async function voteOnPoll(pollName, optionId) {
    try {
        await qortalRequest({
            action: "VOTE_ON_POLL",
            pollName: pollName,
            optionIndex: optionId,
        });
    } catch (error) {
        console.error('Error voting on poll:', error);
    }
}

async function displayNameOrAddress(address) {
    let shortenedAddress = address.substring(0, 4) + '...' + address.substring(address.length - 4);
    try {
        const response = await fetch(`/names/address/${address}`);
        const names = await response.json();
        if (names[0]) {
            return `<img src="/arbitrary/THUMBNAIL/${names[0].name}/qortal_avatar"
            style="width:24px;height:24px;"
            onerror="this.style='display:none'"
            >${names[0].name}`;
        } else {
            return `(${shortenedAddress})`;
        }
    } catch (error) {
        console.error('Error fetching name:', error);
        return `(${shortenedAddress})`;
    }
}
// END Polls Page

// Test Page
function calculateFeatures() {
    const currentTimestamp = Date.now();

    const dateDisable =  new Date(1706745000000).toLocaleString();
    document.getElementById('date-disable').textContent = dateDisable;
    const untilDisable = 1706745000000 - currentTimestamp;
    document.getElementById('until-disable').textContent = formatDuration(untilDisable);

    const dateSnapshot =  new Date(1706745600000).toLocaleString();
    document.getElementById('date-snapshot').textContent = dateSnapshot;
    const untilSnapshot = 1706745600000 - currentTimestamp;
    document.getElementById('until-snapshot').textContent = formatDuration(untilSnapshot);

    const dateEnable =  new Date(1709251200000).toLocaleString();
    document.getElementById('date-enable').textContent = dateEnable;
    const untilEnable = 1709251200000 - currentTimestamp;
    document.getElementById('until-enable').textContent = formatDuration(untilEnable);
    
    const currentBlockHeight = parseInt(document.getElementById('block-height').textContent);
    const currentBlockTime = parseFloat(document.getElementById('block-time').textContent);
    const blocksUntilFix = 1589200 - currentBlockHeight;

    const untilFix = currentBlockTime * blocksUntilFix * 1000;
    document.getElementById('until-fix').textContent = formatDuration(untilFix);
    const timestampFix = currentTimestamp + untilFix;
    document.getElementById('timestamp-fix').textContent = timestampFix;
    const dateFix = new Date(timestampFix).toLocaleString();
    document.getElementById('date-fix').textContent = dateFix;
}

function formatDuration(duration) {
    let negative = false;
    if (duration < 0) {
        negative = true;
        duration = duration * -1;
    }
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    let readableFormat = '';
    if (days > 0) {
        readableFormat += `${days} day${days>1?'s':''}${hours>0?', ':''}`;
    }
    if (hours > 0) {
        readableFormat += `${hours} hour${hours>1?'s':''}${days<1&&minutes>0?', ':''}`;
    }
    if ((minutes > 0) && (days < 1)) {
        readableFormat += `${minutes} minute${minutes>1?'s':''}${hours<1&&seconds>0?', ':''}`;
    }
    if ((seconds > 0) && (hours < 1)) {
        readableFormat += `${seconds} second${seconds>1?'s':''} `;
    }
    readableFormat = `${negative?'':'in '}${readableFormat}${negative?' ago': ''}`;
    return readableFormat.trim();
}
// END Test Page
