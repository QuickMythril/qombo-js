// Caches to store fetched data and reduce network requests
const nameCache = {};
const hiddenPollsCache = {};
const displayNameCache = {};
const accountLevelCache = {};
const pubkeyCache = {};
let cachedTxs = [];

let appResultsMap = {};
let currentSortColumnMap = {};
let sortDirectionMap = {};
const sortDirectionsDefault = {
    'Rating': -1,       // Descending
    'Name': 1,          // Ascending
    'Size': -1,         // Descending
    'Created': -1,      // Descending
    'Last Updated': -1  // Descending
};

document.addEventListener('DOMContentLoaded', function() {
    initApplication();
    showSection('home');
});

document.getElementById('node-checkbox').addEventListener('change', changeRefreshSetting, false);

function initApplication() {
    document.getElementById('home-page').style.display = 'block';
    document.getElementById('menu-home').classList.add('active-menu');
    document.getElementById('menu-button').addEventListener('mouseover', showOverlay);
    document.getElementById('main-content').addEventListener('mouseover', hideOverlay);
    if ((typeof qortalRequest === 'undefined') || (_qdnContext === 'gateway')) {
        document.getElementById('login-button').innerHTML =
        `<a href='https://qortal.dev' target='blank'>Download</a>`;
    } else {
        document.getElementById('login-button').addEventListener('click', getUserAccount);
    }
    initHomePage();
    getNodeStatus();
    getNodeInfo();
}

let autoRefreshInterval;

function changeRefreshSetting(event) {
    var refreshing = event.target.checked;
    if (refreshing) {
        startNodeRefreshing();
    } else {
        stopNodeRefreshing();
    }
}

function startNodeRefreshing() {
    refreshNode();
    autoRefreshInterval = setInterval(refreshNode, 15000);
}
    
function stopNodeRefreshing() {
    clearInterval(autoRefreshInterval);
}

function refreshNode() {
    getNodeStatus();
    getNodeInfo();
}

function getNodeStatus() {
    fetch('/admin/status')
    .then(response => response.json())
    .then(status => {
        let nodeStatus = document.getElementById('node-status')
        nodeStatus.textContent =
            `${typeof qortalRequest !== 'function'?'Gateway: ':'Core: '}`;
        if (status.isSynchronizing === false && status.syncPercent == 100) {
            nodeStatus.textContent += `${status.isMintingPossible?'Minting':'Synced'}`;
        } else if (status.isSynchronizing === true) {
            nodeStatus.textContent += 'Syncing';
        }
        document.getElementById('node-height').textContent = `Height: ${status.height}`;
        document.getElementById('node-peers').textContent =
            `Peers: ${status.numberOfConnections}`;
    })
    .catch(error => console.error('Error getting node status:', error));
}

function getNodeInfo() {
    fetch('/admin/info')
    .then(response => response.json())
    .then(info => {
        document.getElementById('node-version').textContent = 
        `Version: ${info.buildVersion.slice(7, info.buildVersion.indexOf("-", 7))}`;
    })
    .catch(error => console.error('Error getting node info:', error));
}

function fetchQdnTotalSize() {
    document.getElementById('qdn-size').textContent = 'Loading';
    let totalSize = 0;
    fetch('/arbitrary/resources')
        .then(response => response.json())
        .then(data => {
            data.forEach(transaction => {
                const size = transaction.size;
                totalSize += size;
            });
            document.getElementById('qdn-size').textContent = formatSize(totalSize);
        })
        .catch(error => {
            document.getElementById('qdn-size').textContent = 'Error';
            console.error('Error fetching QDN size:', error);
        });
}

function fetchBlockHeight() {
    document.getElementById('home-blockheight').textContent = 'Loading';
    return fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('home-blockheight').textContent = data;
            return data;
        })
        .catch(error => {
            document.getElementById('home-blockheight').textContent = `Error fetching block height: ${error}`;
            console.error('Error fetching block height:', error);
        });
}

function fetchBlockReward(currentHeight) {
    document.getElementById('home-blockreward').textContent = 'Loading';
    let reward = 5;
    const decreaseInterval = 259200;
    if (currentHeight > decreaseInterval) {
        reward -= Math.floor((currentHeight - 1) / decreaseInterval) * 0.25;
    }
    document.getElementById('home-blockreward').textContent = `${reward.toFixed(2)} QORT`;
}

function fetchCirculatingSupply() {
    document.getElementById('home-totalsupply').textContent = 'Loading';
    return fetch('/stats/supply/circulating')
        .then(response => response.text())
        .then(data => {
            document.getElementById('home-totalsupply').textContent = `${parseFloat(data).toFixed(2)} QORT`;
            return parseFloat(data);
        })
        .catch(error => {
            document.getElementById('home-totalsupply').textContent = `Error fetching circulating supply: ${error}`;
            console.error('Error fetching circulating supply:', error);
            throw error;
        });
}

function fetchHomeDailyBlocks() {
    document.getElementById('home-blocktime').textContent = 'Loading';
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
                            document.getElementById('home-blocktime').textContent = `${blockTime} seconds`;
                            document.getElementById('home-blocksperday').textContent = blocksInPastDay;
                            return blocksInPastDay;
                        });
                });
        })
        .catch(error => {
            console.error('Error in fetchHomeDailyBlocks:', error);
        });
}

function calculateDailyQort() {
    document.getElementById('home-qortperday').textContent = 'Loading';
    const blocksInPastDay = parseInt(document.getElementById('home-blocksperday').textContent);
    const blockReward = parseFloat(document.getElementById('home-blockreward').textContent);
    const dailyQort = blocksInPastDay * blockReward;
    const totalCirculatingSupply = parseFloat(document.getElementById('home-totalsupply').textContent);
    const percentageOfTotal = (dailyQort / totalCirculatingSupply) * 100;
    const dailyQortString = `${dailyQort.toFixed(2)} QORT (${percentageOfTotal.toFixed(2)}% of total)`;
    document.getElementById('home-qortperday').textContent = dailyQortString;
}

function fetchOnlineAccounts() {
    let totalCount = 0;
    fetch('/addresses/online/levels')
        .then(response => response.json())
        .then(data => {
            const qortPerDayString = document.getElementById('home-qortperday').textContent;
            const qortPerDay = parseFloat(qortPerDayString.match(/\d+/)[0]);
            const blocksInPastDay = parseInt(document.getElementById('home-blocksperday').textContent);
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
    document.getElementById('transaction-table').innerHTML = '<tr><th>Loading</th></tr>';
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
            document.getElementById('transaction-table').innerHTML = `<tr><th>Error fetching unconfirmed txs:</th><td>${error}</td></tr>`;
            console.error('Error fetching unconfirmed transactions:', error);
        });
}

async function fetchAndCacheTxs(params, limit) {
    try {
        // Clear previous results and reset pagination
        cachedTxs = [];
        currentPage = 1;
        resultsPerPage = parseInt(limit) || 20;
        let queryParams = [];
        if (params.startBlock) {
            queryParams.push(`startBlock=${params.startBlock}`);
        }
        if (params.blockLimit) {
            queryParams.push(`blockLimit=${params.blockLimit}`);
        }
        if (params.txGroupId) {
            queryParams.push(`txGroupId=${params.txGroupId}`);
        }
        if (params.txTypes && params.txTypes.length > 0) {
            params.txTypes.forEach(type => {
                queryParams.push(`txType=${type}`);
            });
        }
        if (params.address) {
            queryParams.push(`address=${encodeURIComponent(params.address)}`);
        }
        if (params.reverse !== undefined) {
            queryParams.push(`reverse=${params.reverse}`);
        } else {
            queryParams.push(`reverse=true`);
        }
        if ((params.confirmed !== undefined) && (params.confirmed === false)) {
            queryParams.push(`confirmationStatus=UNCONFIRMED`);
        } else {
            queryParams.push(`confirmationStatus=CONFIRMED`);
        }
        if (params.offset) {
            queryParams.push(`offset=${params.offset}`);
        }
        if (limit) {
            queryParams.push(`limit=${limit}`);
        }
        const queryString = queryParams.join('&');
        const tableBody = document.getElementById('txs-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = `<tr><td colspan="7">Fetching: /transactions/search?${queryString}</td></tr>`;
        console.log(`Fetching: /transactions/search?${queryString}`);
        // Fetch transactions with limit
        const response = await fetch(`/transactions/search?${queryString}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        cachedTxs = await response.json();
        // Calculate total pages
        totalPages = Math.ceil(cachedTxs.length / resultsPerPage);
        // Display the first page
        displayTxsPage(currentPage);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        const tableBody = document.getElementById('txs-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML += `<tr><td colspan="7">Error fetching transactions: ${error.message}</td></tr>`;
    }
}

async function displayTxsPage(page) {
    const tableBody = document.getElementById('txs-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '<tr><td colspan="7">Loading</td></tr>'; // Clear previous results
    // Calculate start and end indices
    const startIndex = (page - 1) * resultsPerPage;
    const endIndex = Math.min(startIndex + resultsPerPage, cachedTxs.length);
    // Get the transactions for the current page
    const txsToDisplay = cachedTxs.slice(startIndex, endIndex);
    if (txsToDisplay.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">No transactions found.</td></tr>';
        // document.getElementById('pagination-info').textContent = `Page ${currentPage} of ${totalPages}`;
        return;
    }
    tableBody.innerHTML = ''; // Clear previous results
    // Display transactions
    for (let tx of txsToDisplay) {
        let row = document.createElement('tr');
        row.insertCell(0).textContent = tx.blockHeight;
        let shortenedSignature = tx.signature.substring(0, 4) + '...' + tx.signature.substring(tx.signature.length - 4);
        row.insertCell(1).textContent = shortenedSignature;
        row.insertCell(2).textContent = tx.type;
        let nameOrAddress = await displayNameOrAddress(tx.creatorAddress);
        row.insertCell(3).innerHTML = nameOrAddress;
        // Handle different transaction types
        switch (tx.type) {
            case 'PAYMENT':
                let payNameOrAddress = await displayNameOrAddress(tx.recipient);
                row.insertCell(4).innerHTML = `${parseFloat(tx.amount)} QORT -> ${payNameOrAddress}`;
                break;
            case 'ARBITRARY':
                row.insertCell(4).innerHTML = `${displayServiceName(tx.service)}<br>${tx.identifier}`;
                break;
            // Add other cases as needed
            default:
                row.insertCell(4).textContent = 'N/A';
                break;
        }
        row.insertCell(5).textContent = parseFloat(tx.fee);
        let formattedTimestamp = new Date(tx.timestamp).toLocaleString();
        row.insertCell(6).textContent = formattedTimestamp;
        tableBody.appendChild(row);
    }
    // Update pagination info
    // document.getElementById('pagination-info').textContent = `Page ${currentPage} of ${totalPages}`;
}

function fetchAndDisplayBlocks() {
    let height = 100
    const oldTableBody = document.getElementById('blocks-table').getElementsByTagName('tbody')[0];
    const oldLastRow = oldTableBody.lastElementChild;
    if (oldLastRow) {
        height = parseInt(oldLastRow.cells[0].textContent)-1;
    } else {
        height = parseInt(document.getElementById('node-height').textContent.slice(8));
    }
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

function searchByHeight() {
    const currentHeightText = document.getElementById('node-height').textContent.slice(8);
    const currentBlockHeight = parseInt(currentHeightText);
    const searchQuery = document.getElementById('block-input').value.trim();
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
                    fetchTxsBySignature(result.signature);
                } else {
                    const tableBody = document.getElementById('block-txs').getElementsByTagName('tbody')[0];
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

async function fetchTxsBySignature(signature) {
    try {
        const response = await fetch(`/transactions/block/${signature}`);
        const txs = await response.json();
        const tableBody = document.getElementById('block-txs').getElementsByTagName('tbody')[0];
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

async function fetchDailyVolumes(timestamp) {
    const coins = ['LITECOIN', 'BITCOIN', 'DOGECOIN', 'RAVENCOIN', 'DIGIBYTE', 'PIRATECHAIN'];
    for (const coin of coins) {
        document.getElementById(`${coin.toLowerCase()}-spent`).textContent = 'Loading';
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

async function searchPolls() {
    document.getElementById('poll-results').innerHTML = '<p>Searching...</p>';
    let userAddress = document.getElementById('user-address');

    // Start building the table header
    let tableHtml = `
        <table>
            <tr>
                <th>Poll Name</th>
                <th>Description</th>
                <th>Owner</th>
                <th>Poll Options</th>
                <th>Published</th>
            </tr>
        </table>
        <p id="loading-indicator">Loading</p>
    `;

    // Insert the initial table structure and loading indicator
    document.getElementById('poll-results').innerHTML = tableHtml;

    // Counters for shown and hidden polls
    let shownPollsCount = 0;
    let hiddenPollsCount = 0;

    try {
        const response = await fetch('/polls');
        const results = await response.json();

        if (results && results.length > 0) {
            // Sort the results by published date descending
            results.sort((a, b) => b.published - a.published);

            // Process each poll sequentially
            for (const result of results) {
                const [isHidden, displayName, creatorLevel] = await Promise.all([
                    checkHiddenPolls(result.owner, result.pollName),
                    displayNameOrAddress(result.owner),
                    fetchAccountLevel(result.owner)
                ]);

                // Update counters based on poll visibility
                if (isHidden) {
                    hiddenPollsCount++;
                } else {
                    shownPollsCount++;

                    let publishedString = new Date(result.published).toLocaleString();
                    let pollOptionsString = result.pollOptions.map(option => option.optionName).join(', ');

                    // Construct row HTML for this poll
                    let rowHtml = `
                        <tr>
                            <td><span class="clickable-name" data-name="${result.pollName}">${result.pollName}</span>`;
                    if (userAddress.textContent === shortString(result.owner)) {
                        rowHtml += `<br><button onclick="hidePoll('${result.pollName}')">Hide from Qombo</button>`;
                    }
                    rowHtml += `</td>
                        <td>${result.description}</td>
                        <td>${displayName} (Lv.${creatorLevel})</td>
                        <td>${pollOptionsString}</td>
                        <td>${publishedString}</td>
                        </tr>
                    `;

                    // Append the row to the table
                    document.querySelector('#poll-results table').insertAdjacentHTML('beforeend', rowHtml);

                    // Attach click listener for the clickable poll name
                    const clickableElement = document.querySelector(`.clickable-name[data-name="${result.pollName}"]`);
                    if (clickableElement) {
                        clickableElement.addEventListener('click', function() {
                            document.body.scrollTop = document.documentElement.scrollTop = 0;
                            let target = this.getAttribute('data-name');
                            fetchPoll(target);
                        });
                    } else {
                        console.error(`Element not found for pollName: ${result.pollName}`);
                    }
                }
                // Optional: Small delay to yield control back to the main thread
                //await new Promise(resolve => setTimeout(resolve, 0));

            }
            // Update the loading indicator after processing all polls
            document.getElementById('loading-indicator').innerHTML = `${shownPollsCount} Polls Shown, ${hiddenPollsCount} Polls Hidden`;
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
        let htmlContent = `<table><tr><th>${pollData.pollName} <button onclick="copyEmbedLink(${JSON.stringify(pollData.pollName)})">Copy Embed Link</button></th><td>${displayName}</td>`;
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
        htmlContent += `<button onclick="showVotes('${pollData.pollName}')">Show Votes</button>`;
        htmlContent += `<div id="voter-info"></div>`;
        document.getElementById('poll-details').innerHTML = htmlContent;
    } catch (error) {
        console.error('Error fetching poll:', error);
        document.getElementById('poll-details').innerHTML = `Error: ${error}`;
    }
}

async function showVotes(pollName) {
    try {
        const voteResponse = await fetch('/polls/votes/' + encodeURIComponent(pollName));
        const voteData = await voteResponse.json();

        let voterInfoHtml = '<table><tr><th>Voter</th><th>Option</th></tr>';
        for (const vote of voteData.votes) {
            let voterAddress = await pubkeyToAddress(vote.voterPublicKey);
            let voterDisplayName = await displayNameOrAddress(voterAddress);
            let optionName = vote.optionIndex;
            voterInfoHtml += `<tr><td>${voterDisplayName}</td><td>${optionName}</td></tr>`;
        }
        voterInfoHtml += '</table>';

        document.getElementById('voter-info').innerHTML = voterInfoHtml;
    } catch (error) {
        console.error('Error fetching voter information:', error);
        document.getElementById('voter-info').innerHTML = `Error: ${error}`;
    }
}

async function searchAssets() {
    document.getElementById('asset-details').textContent = 'Loading';
    try {
        const response = await fetch('/assets');
        const results = await response.json();
        let tableHtml = '<table>';
        tableHtml += `
            <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Owner</th>
                <th>Quantity</th>
            </tr>
        `;
        for (const result of results) {
            let assetQuantity = (result.isDivisible === false) ? (result.quantity / 100000000) : result.quantity;
            let assetOwner = await displayNameOrAddress(result.owner);
            tableHtml += `<tr>
                <td>${result.assetId}: ${result.name}</td>
                <td>${result.description}</td>
                <td>${assetOwner}</td>
                <td>${assetQuantity}</td>
            </tr>`;
        }
        tableHtml += '</table>';
        document.getElementById('asset-details').innerHTML = tableHtml;
    } catch (error) {
        document.getElementById('asset-details').textContent = `Error fetching assets: ${error}`;
        console.error('Error fetching assets:', error);
    }
}

function searchByNameOrAddress(searchType) {
    const searchQuery = document.getElementById(`${searchType}-input`).value;
    if (!searchQuery) {
        searchByName('', searchType);
        // fetchAnyResults(searchType);
    }
    if (searchQuery.startsWith('Q') && !searchQuery.includes('0') && !searchQuery.includes('O') && !searchQuery.includes('I') && !searchQuery.includes('l') && searchQuery.length >= 26 && searchQuery.length <= 35) {
        validateAddress(searchQuery, searchType);
    } else if (searchQuery.length >= 0 && searchQuery.length <= 40) {
        searchByName(searchQuery, searchType);
    }
}

function validateAddress(address, searchType) {
    fetch('/addresses/validate/' + address)
        .then(response => response.json())
        .then(isValid => {
            if (isValid) {
                // fetchAddressDetails(address);
                searchByAddress(address, searchType);
            } else {
                searchByName(address, searchType);
            }
        })
        .catch(error => console.error('Error validating address:', error));
}

function searchByAddress(address, searchType) {
    Promise.all([
        fetch('/names/address/' + address).then(response => response.json())
    ]).then(([names]) => {
        if (names.length > 0) {
            searchByName(names[0].name, searchType);
        } else {
            searchByName(address, searchType);
        }
    }).catch(error => console.error('Error fetching address details:', error));
}

async function searchByName(name, type) {
    if (type === 'account') {
        searchAccounts(name);
        return;
    }
    const service = type.toUpperCase();
    document.getElementById(`${type}-results`).innerHTML = '<p>Searching...</p>';
    try {
        const response = await fetch(`/arbitrary/resources/search?service=${service}&name=${name}`);
        const results = await response.json();
        if (results.length > 0) {
            appResultsMap[type] = results;
            // Fetch ratings and attach to appResultsMap
            const ratingPromises = appResultsMap[type].map(async (result) => {
                const appName = result.name;
                const pollName = `app-library-${service}-rating-${appName}`;
                let ratingInfo = {
                    appName: appName,
                    ratingText: '',
                    ratingValue: null,
                    ratingCount: null
                };
                try {
                    // Fetch poll details and votes
                    const pollVotesResponse = await fetch(`/polls/votes/${pollName}`);
                    if (pollVotesResponse.ok) {
                        const pollVotesData = await pollVotesResponse.json();
                        const voteCounts = pollVotesData.voteCounts;
                        let totalRating = 0;
                        let ratingCount = 0;
                        for (let i = 0; i < voteCounts.length; i++) {
                            const count = voteCounts[i].voteCount;
                            const optionName = voteCounts[i].optionName;
                            if (optionName.startsWith('initialValue-')) {
                                const initialValueMatch = optionName.match(/initialValue-(\d+)/);
                                if (initialValueMatch) {
                                    const initialRating = parseInt(initialValueMatch[1]);
                                    totalRating += initialRating;
                                    ratingCount += 1; // Count initial value only once
                                }
                            } else if (['1', '2', '3', '4', '5'].includes(optionName)) {
                                const ratingValue = parseInt(optionName);
                                totalRating += ratingValue * count;
                                ratingCount += count;
                            }
                        }
                        if (ratingCount > 0) {
                            const averageRating = (totalRating / ratingCount).toFixed(2);
                            ratingInfo.ratingText = `${averageRating} (${ratingCount} ratings)`;
                            ratingInfo.ratingValue = averageRating;
                            ratingInfo.ratingCount = ratingCount;
                        } else {
                            ratingInfo.ratingText = 'No ratings';
                        }
                    } else {
                        ratingInfo.ratingText = `Rate this ${service}`;
                    }
                } catch (error) {
                    console.error(`Error fetching poll for ${appName}:`, error);
                    ratingInfo.ratingText = `Rate this ${service}`;
                }
                return ratingInfo;
            });
            const ratingsArray = await Promise.all(ratingPromises);
            const ratingMap = {};
            ratingsArray.forEach((ratingInfo) => {
                ratingMap[ratingInfo.appName] = ratingInfo;
            });
            appResultsMap[type].forEach((result) => {
                const appName = result.name;
                const ratingInfo = ratingMap[appName];
                result.ratingInfo = ratingInfo;
            });
            renderTable(type);
        } else {
            document.getElementById(`${type}-results`).innerHTML = '<p>No results found.</p>';
        }
    } catch (error) {
        console.error('Error searching by name:', error);
        document.getElementById(`${type}-results`).innerHTML = `<p>Error: ${error}</p>`;
    }
}

function renderTable(type) {
    const appResults = appResultsMap[type];
    if (appResults && appResults.length > 0) {
        // Initialize sorting state if not set
        if (!currentSortColumnMap[type]) {
            currentSortColumnMap[type] = 'Last Updated';
        }
        if (sortDirectionMap[type] == null) {
            sortDirectionMap[type] = sortDirectionsDefault[currentSortColumnMap[type]];
        }
        // Build table headers with sortable columns
        let tableHtml = '<table>';
        tableHtml += `
            <tr>
                <th class="sortable" data-column="Rating">Rating</th>
                <th class="sortable" data-column="Name">Name</th>
                <th class="sortable" data-column="Size">Size</th>
                <th class="sortable" data-column="Created">Created</th>
                <th class="sortable" data-column="Last Updated">Last Updated</th>
            </tr>
        `;
        // Sort the appResults array
        appResults.sort((a, b) => compareFunction(a, b, type));
        // Build table rows
        appResults.forEach((result) => {
            const appName = result.name;
            const ratingInfo = result.ratingInfo;
            let createdString = new Date(result.created).toLocaleString();
            let updatedString = new Date(result.updated).toLocaleString();
            if (updatedString === 'Invalid Date') {
                updatedString = 'Never';
            }
            // Size formatting
            let sizeString = '';
            if (result.size >= (1024 ** 3)) {
                sizeString = (result.size / (1024 ** 3)).toFixed(2) + ' GB';
            } else if (result.size >= (1024 ** 2)) {
                sizeString = (result.size / (1024 ** 2)).toFixed(2) + ' MB';
            } else if (result.size >= 1024) {
                sizeString = (result.size / 1024).toFixed(2) + ' KB';
            } else {
                sizeString = result.size + ' B';
            }
            // Rating cell
            let ratingCell = '';
            if (ratingInfo.ratingValue !== null) {
                ratingCell = `<span class="rating-text clickable-rating" data-app-name="${appName}">${ratingInfo.ratingText}</span>`;
            } else {
                ratingCell = `<span class="rate-app clickable-rating" data-app-name="${appName}">Rate this ${type}</span>`;
            }
            // Build row HTML
            let rowHtml = '<tr>';
            rowHtml += `<td>${ratingCell}</td>`;
            if (_qdnContext === 'gateway') {
                rowHtml += `<td><a target="_blank" href="/${type}/${appName}">
                    <img src="/arbitrary/THUMBNAIL/${appName}/qortal_avatar"
                    style="width:24px;height:24px;"
                    onerror="this.style='display:none'">
                    ${appName}</a></td>`;
            } else {
                rowHtml += `<td class="clickable-name" data-name="${appName}">
                    <img src="/arbitrary/THUMBNAIL/${appName}/qortal_avatar"
                    style="width:24px;height:24px;"
                    onerror="this.style='display:none'">
                    ${appName}</td>`;
            }
            rowHtml += `<td>${sizeString}</td>
                        <td>${createdString}</td>
                        <td>${updatedString}</td>
                    </tr>`;
            tableHtml += rowHtml;
        });
        tableHtml += '</table>';
        document.getElementById(`${type}-results`).innerHTML = tableHtml;
        // Add event listeners for sorting
        document.querySelectorAll('.sortable').forEach(element => {
            element.addEventListener('click', function() {
                const column = this.getAttribute('data-column');
                if (currentSortColumnMap[type] === column) {
                    // Reverse sort direction
                    sortDirectionMap[type] *= -1;
                } else {
                    // Set new sort column and default direction
                    currentSortColumnMap[type] = column;
                    sortDirectionMap[type] = sortDirectionsDefault[column];
                }
                renderTable(type);
            });
        });
        // Add event listeners for clickable names and ratings
        document.querySelectorAll('.clickable-name').forEach(element => {
            element.addEventListener('click', function() {
                let target = this.getAttribute('data-name');
                openNewTab(target, type);
            });
        });
        document.querySelectorAll('.clickable-rating').forEach(element => {
            element.addEventListener('click', function() {
                let appName = this.getAttribute('data-app-name');
                openRatingModal(appName, type);
            });
        });
    } else {
        document.getElementById(`${type}-results`).innerHTML = '<p>No results found.</p>';
    }
}

function compareFunction(a, b, type) {
    let aValue, bValue;
    let currentSortColumn = currentSortColumnMap[type];
    let sortDirection = sortDirectionMap[type];

    switch(currentSortColumn) {
        case 'Rating':
            // Sort by ratingValue, then by ratingCount
            aValue = a.ratingInfo.ratingValue !== null ? parseFloat(a.ratingInfo.ratingValue) : -Infinity;
            bValue = b.ratingInfo.ratingValue !== null ? parseFloat(b.ratingInfo.ratingValue) : -Infinity;

            if (aValue !== bValue) {
                return (aValue - bValue) * sortDirection;
            } else {
                aValue = a.ratingInfo.ratingCount !== null ? a.ratingInfo.ratingCount : -Infinity;
                bValue = b.ratingInfo.ratingCount !== null ? b.ratingInfo.ratingCount : -Infinity;
                return (aValue - bValue) * sortDirection;
            }

        case 'Name':
            return a.name.localeCompare(b.name) * sortDirection;

        case 'Size':
            aValue = a.size;
            bValue = b.size;
            return (aValue - bValue) * sortDirection;

        case 'Created':
            aValue = new Date(a.created).getTime();
            bValue = new Date(b.created).getTime();
            return (aValue - bValue) * sortDirection;

        case 'Last Updated':
            aValue = a.updated ? new Date(a.updated).getTime() : 0;
            bValue = b.updated ? new Date(b.updated).getTime() : 0;
            return (aValue - bValue) * sortDirection;

        default:
            return 0;
    }
}

function openRatingModal(appName, type) {
    const service = type.toUpperCase();
    let modal = document.createElement('div');
    modal.classList.add('modal');
    let modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');
    let closeButton = document.createElement('span');
    closeButton.classList.add('close-button');
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
        document.body.removeChild(modal);
    };
    let title = document.createElement('h2');
    title.textContent = `Rate ${appName}`;
    let ratingForm = document.createElement('form');
    ratingForm.id = 'rating-form';
    let ratingOptions = document.createElement('div');
    ratingOptions.classList.add('rating-options');
    for (let i = 1; i <= 5; i++) {
        let label = document.createElement('label');
        label.innerHTML = `<input type="radio" name="rating" value="${i}"> ${i} Star${i > 1 ? 's' : ''}`;
        ratingOptions.appendChild(label);
    }
    let removeLabel = document.createElement('label');
    removeLabel.innerHTML = `<input type="radio" name="rating" value="remove"> Remove Rating`;
    ratingOptions.appendChild(removeLabel);
    let submitButton = document.createElement('button');
    submitButton.type = 'button';
    submitButton.textContent = 'Submit Rating';
    submitButton.onclick = () => {
        submitRating(appName, service);
    };
    ratingForm.appendChild(ratingOptions);
    ratingForm.appendChild(submitButton);
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(ratingForm);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

async function submitRating(appName, service) {
    const form = document.getElementById('rating-form');
    const selectedOption = form.querySelector('input[name="rating"]:checked');
    if (!selectedOption) {
        alert('Please select a rating.');
        return;
    }
    const ratingValue = selectedOption.value;
    const pollName = `app-library-${service}-rating-${appName}`;
    try {
        const pollResponse = await fetch(`/polls/${pollName}`);
        if (pollResponse.status === 404) {
            const initialValueOption = `initialValue-${ratingValue}`;
            let pollCreatorAddress = '';
            let userStatus = document.getElementById('user-status');
            let loginAddress = document.getElementById('login-address');
            if (userStatus.textContent === 'Not Logged In') {
                const pollOwnerResponse = await qortalRequest({
                    action: 'GET_USER_ACCOUNT',
                });
                pollCreatorAddress = pollOwnerResponse.address;
            } else {
                pollCreatorAddress = loginAddress.textContent;
            }
            
            // Create the poll with the required format for pollOptions
            await qortalRequest({
                action: "CREATE_POLL",
                pollName: pollName,
                pollDescription: `Rating for ${service} ${appName}`,
                pollOptions: [`1, 2, 3, 4, 5, ${initialValueOption}`],
                pollOwnerAddress: pollCreatorAddress
            });
            alert('Poll created and initial rating submitted.');
        } else {
            let optionIndex;
            if (ratingValue === 'remove') {
                optionIndex = 5;
            } else {
                optionIndex = parseInt(ratingValue) - 1;
            }
            // Vote on the existing poll
            await qortalRequest({
                action: "VOTE_ON_POLL",
                pollName: pollName,
                optionIndex: optionIndex
            });
            alert('Rating submitted.');
        }
        // Clean up the UI and refresh data
        document.querySelector('.modal').remove();
        handleSearch();
    } catch (error) {
        console.error('Error submitting rating:', error);
        alert('Error submitting rating. Please try again.');
    }
}

function searchAccounts(name) {
    if (!name) {
        return;
    }
    document.getElementById('account-details').innerHTML = '<p>Loading</p>';
    document.getElementById('account-results').innerHTML = '<p>Loading</p>';
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

function fetchAddressDetails(address) {
    document.getElementById('account-details').innerHTML = '<p>Loading</p>';
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
        tableHtml += `<tr><td>Active Rewardshares</td><td>${shareHtml}</td></tr>`;
        if (names.length > 0) {
            const response = await fetch(`/arbitrary/resources/search?name=${names[0].name}&includemetadata=true&exactmatchnames=true&mode=ALL`);
            const results = await response.json();
            if (results.length > 0) {
                let totalFiles = 0;
                let totalSize = 0;
                results.forEach(result => {
                    totalFiles += 1;
                    totalSize += result.size;
                });
                let totalSizeString = formatSize(totalSize);
                tableHtml += `<tr><th>QDN Content</th><th>${totalFiles} Files</th></tr><tr><td>Total Size</td><td>${totalSizeString}</td></tr>`;
            }
        }
        tableHtml += `</table>`;
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

async function fetchAccountLevel(address) {
    if (accountLevelCache[address]) {
        return accountLevelCache[address];
    }
    try {
        const response = await fetch(`/addresses/${address}`);
        const accountInfo = await response.json();
        accountLevelCache[address] = accountInfo.level;
        return accountInfo.level;
    } catch (error) {
        console.error('Error fetching account level:', error);
    }
}

/* qortalRequest Functions */
//
async function openNewTab(name, service) {
    const response = await qortalRequest({
        action: 'OPEN_NEW_TAB',
        qortalLink: `qortal://${service}/${name}`
    })
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

async function createPoll() {
    let userStatus = document.getElementById('user-status');
    let pollDetails = document.getElementById('poll-details');
    if (userStatus.textContent === 'Not Logged In') {
        pollDetails.innerHTML = '<p>Please login to create a poll.</p>';
        return;
    }
    let loginAddress = document.getElementById('login-address');
    let form = pollDetails.querySelector('form');
    if (!form) {
        let formHtml = `
            <h3>Create Poll</h3>
            <form>
                <label for="poll-name">Name:</label><br>
                <input type="text" id="poll-name" required placeholder="Example: Most Popular Q-Apps"><br>
                <label for="poll-description">Description:</label><br>
                <input type="text" id="poll-description" required placeholder="Choose which Q-App you use the most."><br>
                <label for="poll-options">Options (comma-separated):</label><br>
                <input type="text" id="poll-options" required placeholder="Q-Blog,Q-Tube,Q-Mail,None of the above"><br>
                <button type="submit">Submit</button>
            </form>
        `;
        pollDetails.innerHTML = formHtml;
        form = pollDetails.querySelector('form');
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            let pollName = document.getElementById('poll-name').value;
            let description = document.getElementById('poll-description').value;
            let inputString = document.getElementById('poll-options').value;
            let inputArray = inputString.split(',').map(option => option.trim());
            let optionsString = inputArray.join(', ');
            let optionsArray = [optionsString];
            try {
                await qortalRequest({
                    action: "CREATE_POLL",
                    pollName: pollName,
                    pollDescription: description,
                    pollOptions: optionsArray,
                    pollOwnerAddress: loginAddress.textContent
                });
                pollDetails.innerHTML += '<p>Poll created successfully!</p>';
            } catch (error) {
                console.error('Error creating poll:', error);
                pollDetails.innerHTML += `<p>Error creating poll: ${error}</p>`;
            }
        });
    } else {
        document.getElementById('poll-name').focus();
    }
}

async function hidePoll(pollName) {
    let userName = document.getElementById('user-status');
    try {
        const pollToHide = 'qomboHidePoll' + pollName;
        const emptyFile = new Blob([], { type: 'application/octet-stream' });
        await qortalRequest({
            action: "PUBLISH_QDN_RESOURCE",
            name: userName.textContent,
            service: "CHAIN_DATA",
            identifier: pollToHide,
            file: emptyFile
        });
        console.log('Poll hidden successfully');
    } catch (error) {
        console.error('Error hiding poll:', error);
    }
}

async function checkHiddenPolls(address, poll) {
    const cacheKey = `${address}_${poll}`;
    if (hiddenPollsCache[cacheKey] !== undefined) {
        return hiddenPollsCache[cacheKey];
    }
    let name = await fetchName(address);
    if (name === '') {
        hiddenPollsCache[cacheKey] = false;
        return false;
    }
    try {
        const response = await fetch(`/arbitrary/resources/search?name=${name}&identifier=qomboHidePoll${poll}&mode=ALL&service=CHAIN_DATA`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const results = await response.json();
        const isHidden = results.length > 0;
        hiddenPollsCache[cacheKey] = isHidden;
        return isHidden;
    } catch (error) {
        console.error('Error checking hidden polls:', error);
        hiddenPollsCache[cacheKey] = false;
        return false;
    }
}

async function copyEmbedLink(pollName) {
    try {
        const response = await qortalRequest({
            action: "CREATE_AND_COPY_EMBED_LINK",
            name: pollName,
            type: 'POLL',
            ref: 'qortal://APP/Qombo'
        });
        alert('Embed link copied to clipboard!');
    } catch (error) {
        console.error('Error copying embed link:', error);
        alert('Error copying embed link: ' + error);
    }
}

async function getUserAccount() {
    let userStatus = document.getElementById('user-status');
    let userAddress = document.getElementById('user-address');
    let loginAddress = document.getElementById('login-address');
    let loginPubkey = document.getElementById('login-pubkey');
    let userBlocks = document.getElementById('user-blocks');
    let userQort = document.getElementById('user-qort');
    let loginButton = document.getElementById('login-button');
    if (userStatus.textContent !== 'Not Logged In') {
        userAddress.textContent = '';
        loginAddress.textContent = '';
        loginPubkey.textContent = '';
        userBlocks.textContent = '';
        userQort.textContent = '';
        userStatus.textContent = 'Not Logged In';
        loginButton.textContent = 'Login';
        return;
    }
    try {
        let accountResponse = await qortalRequest({
            action: "GET_USER_ACCOUNT",
        });
        let addressResponse = accountResponse.address;
        let pubkeyResponse = accountResponse.publicKey;
        userAddress.textContent = shortString(addressResponse);
        loginAddress.textContent = addressResponse;
        loginPubkey.textContent = pubkeyResponse;
        loginButton.textContent = 'Logout';
        userStatus.textContent = 'Loading';
        userBlocks.textContent = 'Loading';
        userQort.textContent = 'Loading';
        let nameResponse = await qortalRequest({
            action: "GET_ACCOUNT_NAMES",
            address: addressResponse,
        });
        if (nameResponse[0].owner == addressResponse) {
            userStatus.textContent = nameResponse[0].name;
        } else {
            userStatus.textContent = 'No Registered Name';
        }
        let blocksResponse = await qortalRequest({
            action: "GET_ACCOUNT_DATA",
            address: addressResponse,
        });
        userBlocks.textContent = `Level ${blocksResponse.level}${blocksResponse.flags?'F':''}: ${blocksResponse.blocksMinted+blocksResponse.blocksMintedAdjustment+blocksResponse.blocksMintedPenalty}`;
        let qortResponse = await qortalRequest({
            action: "GET_BALANCE",
            address: addressResponse,
        });
        userQort.textContent = `${qortResponse.toFixed(4)} QORT`
    } catch(e) {
        console.log("Error: " + e);
    }
}

    /*const response = await qortalRequest({
        action: "GET_ACCOUNT_DATA",
        address: "QZLJV7wbaFyxaoZQsjm6rb9MWMiDzWsqM2"
    });*/

/*
const summary = await qortalRequest({
  action: "GET_DAY_SUMMARY"
});*/
//
/* END qortalRequest Functions */

/* API call Functions */
//
// admin/info
/*{
  "currentTimestamp": 1706909435115,
  "uptime": 274003583,
  "buildVersion": "qortal-4.5.0-070f14b",
  "buildTimestamp": 1706632714,
  "nodeId": "Nffn6tDp5SSMCaRnGhPAejqfkzV7hFVPDC",
  "isTestNet": false,
  "type": "full"
}*/
//
// admin/summary
/*{
  "blockCount": 1175,
  "assetsIssued": 0,
  "namesRegistered": 5,
  "transactionCountByType": {
    "PAYMENT": 44,
    "REGISTER_NAME": 5,
    "ARBITRARY": 176,
    "DEPLOY_AT": 64,
    "MESSAGE": 53,
    "AT": 53,
    "CREATE_GROUP": 1,
    "JOIN_GROUP": 6,
    "REWARD_SHARE": 70
  },
  "totalTransactionCount": 472
}*/
/*
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
*/

function showSection(sectionId, event) {
    var sections = document.querySelectorAll('.content-section');
    sections.forEach(function(section) {
        section.style.display = 'none';
    });
    var menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(function(menuItem) {
        menuItem.classList.remove('active-menu');
    });
    document.getElementById(`${sectionId}-page`).style.display = 'block';
    document.getElementById(`menu-${sectionId}`).classList.add('active-menu');
    event.preventDefault();
    switch (sectionId) {
        case 'home':
            initHomePage();
            break;
        case 'blocks':
            initBlocksPage();
            break;
        case 'txs':
            initTxsPage();
            break;
        case 'trades':
            initTradesPage();
            break;
        case 'accounts':
            initAccountsPage();
            break;
        case 'websites':
            initWebsitesPage();
            break;
        case 'apps':
            initAppsPage();
            break;
        case 'polls':
            initPollsPage();
            break;
        case 'assets':
            initAssetsPage();
            break;
        case 'extras':
            initExtrasPage();
            break;
    }
}

function initHomePage() {
    document.getElementById('home-button').addEventListener('click', function() {
        fetchBlockHeight()
            .then(currentHeight => {
                fetchBlockReward(currentHeight);
                return Promise.all([
                    fetchCirculatingSupply(),
                    fetchHomeDailyBlocks(),
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
}
function initBlocksPage() {
    document.getElementById('block-button').addEventListener('click', function() {
        searchByHeight();
    });
    document.getElementById('block-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchByHeight();
        }
    });
    document.getElementById('blocks-more').addEventListener('click', function() {
        fetchAndDisplayBlocks();
    });
}
function initTxsPage() {
    document.getElementById('refresh-qdn-size').addEventListener('click', function() {
        fetchQdnTotalSize();
    });
    document.getElementById('refresh-unconfirmed').addEventListener('click', function() {
        fetchUnconfirmedTransactions();
    });
    document.getElementById('search-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const startBlock = document.getElementById('startBlock').value;
        const blockLimit = document.getElementById('blockLimit').value;
        const txGroupId = document.getElementById('txGroupId').value;
        const txTypeSelect = document.getElementById('txType');
        const txTypes = Array.from(txTypeSelect.selectedOptions).map(option => option.value);
        const address = document.getElementById('address').value;
        const limit = document.getElementById('limit').value || 20; // Default to 20 if not specified
        const offset = document.getElementById('offset').value || 0;
        const reverse = document.getElementById('reverse').checked;
        const confirmed = document.getElementById('confirmed').checked;
        // Fetch transactions with limit
        fetchAndCacheTxs({
            startBlock,
            blockLimit,
            txGroupId,
            txTypes,
            address,
            reverse,
            confirmed,
            offset
        }, limit);
    });
    document.getElementById('refresh-recent-txs').addEventListener('click', function() {
        // Reset the form
        document.getElementById('search-form').reset();
        // Ensure reverse & confirmed are checked by default
        document.getElementById('reverse').checked = true;
        document.getElementById('confirmed').checked = true;
        // Fetch default transactions without limit
        fetchAndCacheTxs({}, 20); // Default limit is 20
    });
}
function initTradesPage() {
    document.getElementById('volume-button').addEventListener('click', function() {
        fetchDailyVolumes(Date.now() - (24 * 60 * 60 * 1000));
    });
    const coinDropdown = document.getElementById('coin-dropdown');
    coinDropdown.addEventListener('change', function() {
        fetchAndDisplayTrades(Date.now() - (24 * 60 * 60 * 1000), this.value);
    });
    document.getElementById('trades-more').addEventListener('click', function() {
        fetchAndDisplayTrades(Date.now() - (24 * 60 * 60 * 1000), coinDropdown.value);
    });
}
function initAccountsPage() {
    document.getElementById('account-button').addEventListener('click', function() {
        searchByNameOrAddress('account');
    });
    document.getElementById('account-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchByNameOrAddress('account');
        }
    });
}
function initWebsitesPage() {
    document.getElementById('website-button').addEventListener('click', function() {
        searchByNameOrAddress('website');
    });
    document.getElementById('website-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchByNameOrAddress('website');
        }
    });
}
function initAppsPage() {
    document.getElementById('app-button').addEventListener('click', function() {
        searchByNameOrAddress('app');
    });
    document.getElementById('app-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchByNameOrAddress('app');
        }
    });
}
function initPollsPage() {
    document.getElementById('poll-search-button').addEventListener('click', function() {
        searchPolls();
    });
    document.getElementById('poll-create-button').addEventListener('click', function() {
        createPoll();
    });
}
function initAssetsPage() {
    document.getElementById('asset-button').addEventListener('click', function() {
        searchAssets();
    });
}
function initExtrasPage() {
    document.getElementById('extra-button').addEventListener('click', function() {
        fetchExtrasDailyBlocks()
        .then(() => {
            calculateFeatures();
        });
    });
}

function toggleSidebar() {
    //TODO:  if mobile screen, don't shift.
    var sidebar = document.getElementById('sidebar');
    var mainContent = document.getElementById('main-content');
    if (mainContent.classList.contains('main-shift')) {
        sidebar.style.width = '0';
        mainContent.classList.remove('main-shift');
    } else {
        sidebar.style.width = '200px';
        mainContent.classList.add('main-shift');
    }
}

function showOverlay() {
    document.getElementById('sidebar').style.width = '200px';
}

function hideOverlay() {
    var sidebar = document.getElementById('sidebar');
    var mainContent = document.getElementById('main-content');
    if (mainContent.classList.contains('main-shift')) {
        sidebar.style.width = '200px';
    } else {
        sidebar.style.width = '0';
    }
}

async function fetchName(address) {
    if (nameCache[address]) {
        return nameCache[address];
    }
    try {
        const response = await fetch(`/names/address/${address}`);
        const names = await response.json();
        const name = names[0] ? names[0].name : '';
        nameCache[address] = name;
        return name;
    } catch (error) {
        console.error('Error fetching name:', error);
        return '';
    }
}

async function displayNameOrAddress(address) {
    if (displayNameCache[address]) {
        return displayNameCache[address];
    }
    try { 
        const response = await fetch(`/names/address/${address}`);
        const names = await response.json();
        if (names[0]) {
            const displayName = `<img src="/arbitrary/THUMBNAIL/${names[0].name}/qortal_avatar"
            style="width:24px;height:24px;"
            onerror="this.style='display:none'"
            >${names[0].name}`;
            displayNameCache[address] = displayName;
            return displayName;
        } else {
            displayNameCache[address] = address;
            return address;
        }
    } catch (error) {
        console.error('Error fetching name:', error);
        displayNameCache[address] = address;
        return address;
    }
}



async function pubkeyToAddress(pubkey) {
    if (pubkeyCache[pubkey]) {
        return pubkeyCache[pubkey];
    }
    try {
        const response = await fetch(`/addresses/convert/${pubkey}`);
        const address = await response.text();
        pubkeyCache[pubkey] = address;
        return address;
    } catch (error) {
        console.error('Error fetching address:', error);
        return pubkey;
    }
}

async function displayGroupName(groupId) {
    try {
        const response = await fetch(`/groups/${groupId}`);
        const groupInfo = await response.json();
        return groupInfo.groupName;
    } catch (error) {
        console.error('Error fetching group name:', error);
        return `id: ${groupId}`;
    }
}

function displayServiceName(serviceId) {
    switch (parseInt(serviceId)) {
        // Public services
        case 100: return 'ARBITRARY_DATA';
        case 120: return 'QCHAT_ATTACHMENT (1 MB)';
        case 130: return 'ATTACHMENT (50 MB)';
        case 140: return 'FILE';
        case 150: return 'FILES';
        case 160: return 'CHAIN_DATA (239 B)';
        case 200: return 'WEBSITE';
        case 400: return 'IMAGE (10 MB)';
        case 410: return 'THUMBNAIL (500 KB)';
        case 420: return 'QCHAT_IMAGE (500 KB)';
        case 500: return 'VIDEO';
        case 600: return 'AUDIO';
        case 610: return 'QCHAT_AUDIO (10 MB)';
        case 620: return 'QCHAT_VOICE (10 MB)';
        case 630: return 'VOICE (10 MB)';
        case 640: return 'PODCAST';
        case 700: return 'BLOG';
        case 777: return 'BLOG_POST';
        case 778: return 'BLOG_COMMENT (500 KB)';
        case 800: return 'DOCUMENT';
        case 900: return 'LIST';
        case 910: return 'PLAYLIST';
        case 1000: return 'APP (50 MB)';
        case 1100: return 'METADATA';
        case 1110: return 'JSON (25 KB)';
        case 1200: return 'GIF_REPOSITORY (25 MB)';
        case 1300: return 'STORE';
        case 1310: return 'PRODUCT';
        case 1330: return 'OFFER';
        case 1340: return 'COUPON';
        case 1400: return 'CODE';
        case 1410: return 'PLUGIN';
        case 1420: return 'EXTENSION';
        case 1500: return 'GAME';
        case 1510: return 'ITEM';
        case 1600: return 'NFT';
        case 1700: return 'DATABASE';
        case 1710: return 'SNAPSHOT';
        case 1800: return 'COMMENT (500 KB)';
        case 1810: return 'CHAIN_COMMENT (239 B)';
        case 1900: return 'MAIL (1 MB)';
        case 1910: return 'MESSAGE (1 MB)';
        // Private services
        case 121: return 'QCHAT_ATTACHMENT_PRIVATE (1 MB)';
        case 131: return 'ATTACHMENT_PRIVATE (50 MB)';
        case 141: return 'FILE_PRIVATE';
        case 401: return 'IMAGE_PRIVATE (10 MB)';
        case 501: return 'VIDEO_PRIVATE';
        case 601: return 'AUDIO_PRIVATE';
        case 631: return 'VOICE_PRIVATE (10 MB)';
        case 801: return 'DOCUMENT_PRIVATE';
        case 1901: return 'MAIL_PRIVATE (5 MB)';
        case 1911: return 'MESSAGE_PRIVATE (1 MB)';
        default: return `id: ${serviceId}`;
    }
}

function shortString(string) {
    return `${string.slice(0,4)}...${string.slice(-4)}`;
}

function formatSize(size) {
    if (size > (1024*1024*1024*1024)) {
        return (size / (1024*1024*1024*1024)).toFixed(2) + ' TB';
    } else if (size > (1024*1024*1024)) {
        return (size / (1024*1024*1024)).toFixed(2) + ' GB';
    } else if (size > (1024*1024)) {
        return (size / (1024*1024)).toFixed(2) + ' MB';
    } else if (size > 1024) {
        return (size / 1024).toFixed(2) + ' KB';
    } else {
        return size + ' B';
    }
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
    const days = Math.floor(duration / (1000 * 60 * 60 * 24) % 30.4375);
    const months = Math.floor(duration / (1000 * 60 * 60 * 24 * 30.4375) % 12);
    const years = Math.floor(duration / (1000 * 60 * 60 * 24 * 30.4375 * 12));
    let readableFormat = '';
    if (years > 0) {
        readableFormat += `${years} year${years>1?'s':''}${months>0?', ':''}`;
    }
    if (months > 0) {
        readableFormat += `${months} month${months>1?'s':''}${years<1&&days>0?', ':''}`;
    }
    if ((days > 0) && (years < 1)) {
        readableFormat += `${days} day${days>1?'s':''}${months<1&&hours>0?', ':''}`;
    }
    if ((hours > 0) && (months+years < 1)) {
        readableFormat += `${hours} hour${hours>1?'s':''}${days<1&&minutes>0?', ':''}`;
    }
    if ((minutes > 0) && (days+months+years < 1)) {
        readableFormat += `${minutes} minute${minutes>1?'s':''}${hours<1&&seconds>0?', ':''}`;
    }
    if ((seconds > 0) && (hours+days+months+years < 1)) {
        readableFormat += `${seconds} second${seconds>1?'s':''} `;
    }
    readableFormat = `${negative?'':'in '}${readableFormat}${negative?' ago': ''}`;
    return readableFormat.trim();
}

function fetchExtrasDailyBlocks() {
    return fetch('/blocks/height')
        .then(response => response.text())
        .then(currentBlockHeight => {
            document.getElementById('extras-height').textContent = currentBlockHeight;
            return currentBlockHeight;
        })
        .then(currentBlockHeight => {
            currentBlockHeight = parseInt(currentBlockHeight);
            return fetch('/utils/timestamp')
                .then(response => response.text())
                .then(currentTimestamp => {
                    document.getElementById('extras-currenttime').textContent = currentTimestamp;
                    const oneDayAgoTimestamp = parseInt(currentTimestamp) - (24 * 60 * 60 * 1000);
                    return fetch('/blocks/timestamp/' + oneDayAgoTimestamp)
                        .then(response => response.json())
                        .then(data => {
                            const oneDayAgoBlockHeight = data.height;
                            const blocksInPastDay = currentBlockHeight - oneDayAgoBlockHeight;
                            const blockTime = (24*60*60/blocksInPastDay).toFixed(2);
                            document.getElementById('extras-blocktime').textContent = blockTime;
                            document.getElementById('extras-blocksperday').textContent = blocksInPastDay;
                            return blocksInPastDay;
                        });
                });
        })
        .catch(error => {
            console.error('Error in fetchExtrasDailyBlocks:', error);
        });
}

function calculateFeatures() {
    const currentTimestamp = Date.now();
    const currentBlockHeight = parseInt(document.getElementById('extras-height').textContent);
    const currentBlockTime = parseFloat(document.getElementById('extras-blocktime').textContent);

    const heightReward = Math.ceil(currentBlockHeight / 1000) * 1000
    const blocksUntilReward = heightReward - currentBlockHeight;
    document.getElementById('height-reward').textContent =
        `Next Reward = ${heightReward} (in ${blocksUntilReward} block${blocksUntilReward==1?'':'s'})`;
    const untilReward = currentBlockTime * blocksUntilReward * 1000;
    document.getElementById('until-reward').textContent = formatDuration(untilReward);
    const timestampReward = currentTimestamp + untilReward;
    document.getElementById('timestamp-reward').textContent = timestampReward;
    const dateReward = new Date(timestampReward).toLocaleString();
    document.getElementById('date-reward').textContent = dateReward;

    const blocksUntilReduction1 = 1 - currentBlockHeight;
    const untilReduction1 = currentBlockTime * blocksUntilReduction1 * 1000;
    document.getElementById('until-reduction1').textContent = formatDuration(untilReduction1);
    const timestampReduction1 = currentTimestamp + untilReduction1;
    document.getElementById('timestamp-reduction1').textContent = timestampReduction1;
    const dateReduction1 = new Date(timestampReduction1).toLocaleString();
    document.getElementById('date-reduction1').textContent = dateReduction1;

    const blocksUntilReduction2 = 259201 - currentBlockHeight;
    const untilReduction2 = currentBlockTime * blocksUntilReduction2 * 1000;
    document.getElementById('until-reduction2').textContent = formatDuration(untilReduction2);
    const timestampReduction2 = currentTimestamp + untilReduction2;
    document.getElementById('timestamp-reduction2').textContent = timestampReduction2;
    const dateReduction2 = new Date(timestampReduction2).toLocaleString();
    document.getElementById('date-reduction2').textContent = dateReduction2;

    const blocksUntilReduction3 = 518401 - currentBlockHeight;
    const untilReduction3 = currentBlockTime * blocksUntilReduction3 * 1000;
    document.getElementById('until-reduction3').textContent = formatDuration(untilReduction3);
    const timestampReduction3 = currentTimestamp + untilReduction3;
    document.getElementById('timestamp-reduction3').textContent = timestampReduction3;
    const dateReduction3 = new Date(timestampReduction3).toLocaleString();
    document.getElementById('date-reduction3').textContent = dateReduction3;

    const blocksUntilReduction4 = 777601 - currentBlockHeight;
    const untilReduction4 = currentBlockTime * blocksUntilReduction4 * 1000;
    document.getElementById('until-reduction4').textContent = formatDuration(untilReduction4);
    const timestampReduction4 = currentTimestamp + untilReduction4;
    document.getElementById('timestamp-reduction4').textContent = timestampReduction4;
    const dateReduction4 = new Date(timestampReduction4).toLocaleString();
    document.getElementById('date-reduction4').textContent = dateReduction4;

    const blocksUntilReduction5 = 1036801 - currentBlockHeight;
    const untilReduction5 = currentBlockTime * blocksUntilReduction5 * 1000;
    document.getElementById('until-reduction5').textContent = formatDuration(untilReduction5);
    const timestampReduction5 = currentTimestamp + untilReduction5;
    document.getElementById('timestamp-reduction5').textContent = timestampReduction5;
    const dateReduction5 = new Date(timestampReduction5).toLocaleString();
    document.getElementById('date-reduction5').textContent = dateReduction5;

    const blocksUntilReduction6 = 1296001 - currentBlockHeight;
    const untilReduction6 = currentBlockTime * blocksUntilReduction6 * 1000;
    document.getElementById('until-reduction6').textContent = formatDuration(untilReduction6);
    const timestampReduction6 = currentTimestamp + untilReduction6;
    document.getElementById('timestamp-reduction6').textContent = timestampReduction6;
    const dateReduction6 = new Date(timestampReduction6).toLocaleString();
    document.getElementById('date-reduction6').textContent = dateReduction6;

    const blocksUntilReduction7 = 1555201 - currentBlockHeight;
    const untilReduction7 = currentBlockTime * blocksUntilReduction7 * 1000;
    document.getElementById('until-reduction7').textContent = formatDuration(untilReduction7);
    const timestampReduction7 = currentTimestamp + untilReduction7;
    document.getElementById('timestamp-reduction7').textContent = timestampReduction7;
    const dateReduction7 = new Date(timestampReduction7).toLocaleString();
    document.getElementById('date-reduction7').textContent = dateReduction7;

    const blocksUntilReduction8 = 1814401 - currentBlockHeight;
    const untilReduction8 = currentBlockTime * blocksUntilReduction8 * 1000;
    document.getElementById('until-reduction8').textContent = formatDuration(untilReduction8);
    const timestampReduction8 = currentTimestamp + untilReduction8;
    document.getElementById('timestamp-reduction8').textContent = timestampReduction8;
    const dateReduction8 = new Date(timestampReduction8).toLocaleString();
    document.getElementById('date-reduction8').textContent = dateReduction8;

    const blocksUntilReduction9 = 2073601 - currentBlockHeight;
    const untilReduction9 = currentBlockTime * blocksUntilReduction9 * 1000;
    document.getElementById('until-reduction9').textContent = formatDuration(untilReduction9);
    const timestampReduction9 = currentTimestamp + untilReduction9;
    document.getElementById('timestamp-reduction9').textContent = timestampReduction9;
    const dateReduction9 = new Date(timestampReduction9).toLocaleString();
    document.getElementById('date-reduction9').textContent = dateReduction9;

    const blocksUntilReduction10 = 2332801 - currentBlockHeight;
    const untilReduction10 = currentBlockTime * blocksUntilReduction10 * 1000;
    document.getElementById('until-reduction10').textContent = formatDuration(untilReduction10);
    const timestampReduction10 = currentTimestamp + untilReduction10;
    document.getElementById('timestamp-reduction10').textContent = timestampReduction10;
    const dateReduction10 = new Date(timestampReduction10).toLocaleString();
    document.getElementById('date-reduction10').textContent = dateReduction10;

    const blocksUntilReduction11 = 2592001 - currentBlockHeight;
    const untilReduction11 = currentBlockTime * blocksUntilReduction11 * 1000;
    document.getElementById('until-reduction11').textContent = formatDuration(untilReduction11);
    const timestampReduction11 = currentTimestamp + untilReduction11;
    document.getElementById('timestamp-reduction11').textContent = timestampReduction11;
    const dateReduction11 = new Date(timestampReduction11).toLocaleString();
    document.getElementById('date-reduction11').textContent = dateReduction11;

    const blocksUntilReduction12 = 2851201 - currentBlockHeight;
    const untilReduction12 = currentBlockTime * blocksUntilReduction12 * 1000;
    document.getElementById('until-reduction12').textContent = formatDuration(untilReduction12);
    const timestampReduction12 = currentTimestamp + untilReduction12;
    document.getElementById('timestamp-reduction12').textContent = timestampReduction12;
    const dateReduction12 = new Date(timestampReduction12).toLocaleString();
    document.getElementById('date-reduction12').textContent = dateReduction12;

    const blocksUntilReduction13 = 3110401 - currentBlockHeight;
    const untilReduction13 = currentBlockTime * blocksUntilReduction13 * 1000;
    document.getElementById('until-reduction13').textContent = formatDuration(untilReduction13);
    const timestampReduction13 = currentTimestamp + untilReduction13;
    document.getElementById('timestamp-reduction13').textContent = timestampReduction13;
    const dateReduction13 = new Date(timestampReduction13).toLocaleString();
    document.getElementById('date-reduction13').textContent = dateReduction13;

    const dateGenesis =  new Date(1593450000000).toLocaleString();
    document.getElementById('date-genesis').textContent = dateGenesis;
    const untilGenesis = 1593450000000 - currentTimestamp;
    document.getElementById('until-genesis').textContent = formatDuration(untilGenesis);
    
    const dateNameFee1 =  new Date(1645372800000).toLocaleString();
    document.getElementById('date-name-fee1').textContent = dateNameFee1;
    const untilNameFee1 = 1645372800000 - currentTimestamp;
    document.getElementById('until-name-fee1').textContent = formatDuration(untilNameFee1);
    
    const dateNameFee2 =  new Date(1651420800000).toLocaleString();
    document.getElementById('date-name-fee2').textContent = dateNameFee2;
    const untilNameFee2 = 1651420800000 - currentTimestamp;
    document.getElementById('until-name-fee2').textContent = formatDuration(untilNameFee2);
    
    const dateRewardShares1 =  new Date(1657382400000).toLocaleString();
    document.getElementById('date-reward-shares1').textContent = dateRewardShares1;
    const untilRewardShares1 = 1657382400000 - currentTimestamp;
    document.getElementById('until-reward-shares1').textContent = formatDuration(untilRewardShares1);
    
    const dateSnapshot1 =  new Date(1670230000000).toLocaleString();
    document.getElementById('date-snapshot1').textContent = dateSnapshot1;
    const untilSnapshot1 = 1670230000000 - currentTimestamp;
    document.getElementById('until-snapshot1').textContent = formatDuration(untilSnapshot1);
    
    const blocksUntilAlgo1 = 1092400 - currentBlockHeight;
    const untilAlgo1 = currentBlockTime * blocksUntilAlgo1 * 1000;
    document.getElementById('until-algo1').textContent = formatDuration(untilAlgo1);
    const timestampAlgo1 = currentTimestamp + untilAlgo1;
    document.getElementById('timestamp-algo1').textContent = timestampAlgo1;
    const dateAlgo1 = new Date(timestampAlgo1).toLocaleString();
    document.getElementById('date-algo1').textContent = dateAlgo1;
    
    const dateCancel =  new Date(1676986362069).toLocaleString();
    document.getElementById('date-cancel').textContent = dateCancel;
    const untilCancel = 1676986362069 - currentTimestamp;
    document.getElementById('until-cancel').textContent = formatDuration(untilCancel);
    
    const dateUnitFee =  new Date(1692118800000).toLocaleString();
    document.getElementById('date-unit-fee').textContent = dateUnitFee;
    const untilUnitFee = 1692118800000 - currentTimestamp;
    document.getElementById('until-unit-fee').textContent = formatDuration(untilUnitFee);
    
    const dateRewardShares2 =  new Date(1698508800000).toLocaleString();
    document.getElementById('date-reward-shares2').textContent = dateRewardShares2;
    const untilRewardShares2 = 1698508800000 - currentTimestamp;
    document.getElementById('until-reward-shares2').textContent = formatDuration(untilRewardShares2);
    
    const blocksUntilBatch = 1508000 - currentBlockHeight;
    const untilBatch = currentBlockTime * blocksUntilBatch * 1000;
    document.getElementById('until-batch').textContent = formatDuration(untilBatch);
    const timestampBatch = currentTimestamp + untilBatch;
    document.getElementById('timestamp-batch').textContent = timestampBatch;
    const dateBatch = new Date(timestampBatch).toLocaleString();
    document.getElementById('date-batch').textContent = dateBatch;
    
    const dateDisable1 =  new Date(1706745000000).toLocaleString();
    document.getElementById('date-disable1').textContent = dateDisable1;
    const untilDisable1 = 1706745000000 - currentTimestamp;
    document.getElementById('until-disable1').textContent = formatDuration(untilDisable1);

    const blocksUntilFix = 1589200 - currentBlockHeight;
    const untilFix = currentBlockTime * blocksUntilFix * 1000;
    document.getElementById('until-fix').textContent = formatDuration(untilFix);
    const timestampFix = currentTimestamp + untilFix;
    document.getElementById('timestamp-fix').textContent = timestampFix;
    const dateFix = new Date(timestampFix).toLocaleString();
    document.getElementById('date-fix').textContent = dateFix;

    const dateSnapshot2 =  new Date(1708360200000).toLocaleString();
    document.getElementById('date-snapshot2').textContent = dateSnapshot2;
    const untilSnapshot2 = 1708360200000 - currentTimestamp;
    document.getElementById('until-snapshot2').textContent = formatDuration(untilSnapshot2);
    
    const blocksUntilAlgo2 = 1611200 - currentBlockHeight;
    const untilAlgo2 = currentBlockTime * blocksUntilAlgo2 * 1000;
    document.getElementById('until-algo2').textContent = formatDuration(untilAlgo2);
    const timestampAlgo2 = currentTimestamp + untilAlgo2;
    document.getElementById('timestamp-algo2').textContent = timestampAlgo2;
    const dateAlgo2 = new Date(timestampAlgo2).toLocaleString();
    document.getElementById('date-algo2').textContent = dateAlgo2;

    const dateSnapshot3 =  new Date(1708432200000).toLocaleString();
    document.getElementById('date-snapshot3').textContent = dateSnapshot3;
    const untilSnapshot3 = 1708432200000 - currentTimestamp;
    document.getElementById('until-snapshot3').textContent = formatDuration(untilSnapshot3);
    
    const blocksUntilAlgo3 = 1612200 - currentBlockHeight;
    const untilAlgo3 = currentBlockTime * blocksUntilAlgo3 * 1000;
    document.getElementById('until-algo3').textContent = formatDuration(untilAlgo3);
    const timestampAlgo3 = currentTimestamp + untilAlgo3;
    document.getElementById('timestamp-algo3').textContent = timestampAlgo3;
    const dateAlgo3 = new Date(timestampAlgo3).toLocaleString();
    document.getElementById('date-algo3').textContent = dateAlgo3;

    const dateEnable1 =  new Date(1709251200000).toLocaleString();
    document.getElementById('date-enable1').textContent = dateEnable1;
    const untilEnable1 = 1709251200000 - currentTimestamp;
    document.getElementById('until-enable1').textContent = formatDuration(untilEnable1);
    
    const blocksUntilDisable2 = 1899100 - currentBlockHeight;
    const untilDisable2 = currentBlockTime * blocksUntilDisable2 * 1000;
    document.getElementById('until-disable2').textContent = formatDuration(untilDisable2);
    const timestampDisable2 = currentTimestamp + untilDisable2;
    document.getElementById('timestamp-disable2').textContent = timestampDisable2;
    const dateDisable2 = new Date(timestampDisable2).toLocaleString();
    document.getElementById('date-disable2').textContent = dateDisable2;
    
    const blocksUntilName1 = 1900300 - currentBlockHeight;
    const untilName1 = currentBlockTime * blocksUntilName1 * 1000;
    document.getElementById('until-name1').textContent = formatDuration(untilName1);
    const timestampName1 = currentTimestamp + untilName1;
    document.getElementById('timestamp-name1').textContent = timestampName1;
    const dateName1 = new Date(timestampName1).toLocaleString();
    document.getElementById('date-name1').textContent = dateName1;
    
    const blocksUntilGroup = 1902700 - currentBlockHeight;
    const untilGroup = currentBlockTime * blocksUntilGroup * 1000;
    document.getElementById('until-group').textContent = formatDuration(untilGroup);
    const timestampGroup = currentTimestamp + untilGroup;
    document.getElementById('timestamp-group').textContent = timestampGroup;
    const dateGroup = new Date(timestampGroup).toLocaleString();
    document.getElementById('date-group').textContent = dateGroup;
    
    const blocksUntilEnable2 = 1905100 - currentBlockHeight;
    const untilEnable2 = currentBlockTime * blocksUntilEnable2 * 1000;
    document.getElementById('until-enable2').textContent = formatDuration(untilEnable2);
    const timestampEnable2 = currentTimestamp + untilEnable2;
    document.getElementById('timestamp-enable2').textContent = timestampEnable2;
    const dateEnable2 = new Date(timestampEnable2).toLocaleString();
    document.getElementById('date-enable2').textContent = dateEnable2;

    const dateDecrease =  new Date(1731958200000).toLocaleString();
    document.getElementById('date-decrease').textContent = dateDecrease;
    const untilDecrease = 1731958200000 - currentTimestamp;
    document.getElementById('until-decrease').textContent = formatDuration(untilDecrease);
    
    const blocksUntilName2 = 1935500 - currentBlockHeight;
    const untilName2 = currentBlockTime * blocksUntilName2 * 1000;
    document.getElementById('until-name2').textContent = formatDuration(untilName2);
    const timestampName2 = currentTimestamp + untilName2;
    document.getElementById('timestamp-name2').textContent = timestampName2;
    const dateName2 = new Date(timestampName2).toLocaleString();
    document.getElementById('date-name2').textContent = dateName2;
}