document.addEventListener('DOMContentLoaded', function() {
    initApplication();
    initHomePage();
});

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

document.getElementById('txs-button').addEventListener('click', function() {
    fetchUnconfirmedTransactions();
    fetchQdnTotalSize();
});
document.getElementById('txs-more').addEventListener('click', function() {
    fetchTxsByHeight();
});

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

document.getElementById('volume-button').addEventListener('click', function() {
    fetchDailyVolumes(Date.now() - (24 * 60 * 60 * 1000));
});
document.getElementById('coin-dropdown').addEventListener('change', function() {
    fetchAndDisplayTrades(Date.now() - (24 * 60 * 60 * 1000), this.value);
});

document.getElementById('account-button').addEventListener('click', function() {
    searchByNameOrAddress('account');
});
document.getElementById('account-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        searchByNameOrAddress('account');
    }
});

document.getElementById('website-button').addEventListener('click', function() {
    searchByNameOrAddress('website');
});
document.getElementById('website-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        searchByNameOrAddress('website');
    }
});

document.getElementById('app-button').addEventListener('click', function() {
    searchByNameOrAddress('app');
});
document.getElementById('app-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        searchByNameOrAddress('app');
    }
});

document.getElementById('poll-button').addEventListener('click', function() {
    searchPolls();
});

document.getElementById('asset-button').addEventListener('click', function() {
    searchAssets();
});

document.getElementById('extra-button').addEventListener('click', function() {
    fetchExtrasDailyBlocks()
    .then(() => {
        calculateFeatures();
    });
});

function initApplication() {
    let localTesting = false;
    // Disable before release
    //localTesting = true; // Disable before release
    // Disable before release

    document.getElementById('home-page').style.display = 'block';
    document.getElementById('menu-home').classList.add('active-menu');
    document.getElementById('menu-button').addEventListener('mouseover', showOverlay);
    document.getElementById('main-content').addEventListener('mouseover', hideOverlay);
    if ((typeof qortalRequest === 'function') || localTesting === true) {
        document.getElementById('login-button').addEventListener('click', getUserAccount);
    } else {
        document.getElementById('login-button').innerHTML =
        `<a href='https://qortal.dev' target='blank'>Download</a>`;
    }
    getNodeStatus();
    getNodeInfo();

    if (localTesting === true) {
        document.getElementById('node-status').textContent = '- Testing';
    }
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
    document.getElementById('home-blockheight').textContent = 'Loading...';
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
    document.getElementById('home-blockreward').textContent = 'Loading...';
    let reward = 5;
    const decreaseInterval = 259200;
    if (currentHeight > decreaseInterval) {
        reward -= Math.floor((currentHeight - 1) / decreaseInterval) * 0.25;
    }
    document.getElementById('home-blockreward').textContent = `${reward.toFixed(2)} QORT`;
}

function fetchCirculatingSupply() {
    document.getElementById('home-totalsupply').textContent = 'Loading...';
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
    document.getElementById('home-blocktime').textContent = 'Loading...';
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
    document.getElementById('home-qortperday').textContent = 'Loading...';
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
                    if (level !== 9) {
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

            document.getElementById('txs-stats').innerHTML = tableHtmlUpper + tableHtmlLower;
        })
        .catch(error => {
            console.error('Error fetching unconfirmed transactions:', error);
        });
}

async function fetchTxsByHeight() {
    let height = 100
    const oldTableBody = document.getElementById('txs-recent').getElementsByTagName('tbody')[0];
    const oldLastRow = oldTableBody.lastElementChild;
    if (oldLastRow) {
        height = parseInt(oldLastRow.cells[0].textContent)-1;
    } else {
        height = parseInt(document.getElementById('node-height').textContent.slice(8));
    }
    try {
        const response = await fetch(`/transactions/search?startBlock=${height-99}&blockLimit=100&confirmationStatus=CONFIRMED&limit=0`);
        const txs = await response.json();
        const tableBody = document.getElementById('txs-recent').getElementsByTagName('tbody')[0];
        txs.sort((a, b) => b.timestamp - a.timestamp);
        txs.forEach(async tx => {
            let row = document.createElement('tr');
            row.insertCell(0).textContent = tx.blockHeight;
            let shortenedSignature = tx.signature.substring(0, 4) + '...' + tx.signature.substring(tx.signature.length - 4);
            row.insertCell(1).textContent = shortenedSignature;
            row.insertCell(2).textContent = tx.type;
            let nameOrAddress = await displayNameOrAddress(tx.creatorAddress);
            row.insertCell(3).innerHTML = nameOrAddress;
            switch (tx.type) {
                case 'PAYMENT':
                    let payNameOrAddress = await displayNameOrAddress(tx.recipient);
                    row.insertCell(4).innerHTML = `${parseFloat(tx.amount)} QORT -> ${payNameOrAddress}`;
                    break;
                case 'ARBITRARY':
                    row.insertCell(4).innerHTML = `${displayServiceName(tx.service)}<br>${tx.identifier}`;
                    break;
                case 'REWARD_SHARE':
                    let percentage = parseFloat(tx.sharePercent)*100;
                    if (tx.creatorAddress === tx.recipient) {
                        row.insertCell(4).textContent = `${(percentage<0)?'Remove':'Add'} Self Share`;
                    } else {
                        let shareNameOrAddress = await displayNameOrAddress(tx.creatorAddress);
                        row.insertCell(4).innerHTML = `${(percentage<0)?'Remove':'Add'} ${shareNameOrAddress}`;
                    }
                    break;
                case 'JOIN_GROUP':
                    let groupName = await displayGroupName(tx.groupId);
                    row.insertCell(4).textContent = `${tx.groupId}: ${groupName}`;
                    break;
                case 'CREATE_GROUP':
                    row.insertCell(4).textContent = `${tx.groupId}: ${tx.groupName}`;
                    break;
                default:
                    break;
            }
            row.insertCell(5).textContent = parseFloat(tx.fee);
            let formattedTimestamp = new Date(tx.timestamp).toLocaleString();
            row.insertCell(6).textContent = formattedTimestamp;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
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

async function searchAssets() {
    document.getElementById('asset-details').textContent = 'Loading...';
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

function searchByName(name, type) {
    if (type === 'account') {
        searchAccounts(name);
        return;
    }
    const service = type.toUpperCase();
    document.getElementById(`${type}-results`).innerHTML = '<p>Searching...</p>';
    fetch(`/arbitrary/resources/search?service=${service}&name=${name}`)
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
                let sizeString = formatSize(result.size);
                if (_qdnContext === 'gateway') {
                    tableHtml += `<tr>
                        <td><a target="_blank" href="/${type}/${result.name}">
                        <img src="/arbitrary/THUMBNAIL/${result.name}/qortal_avatar"
                        style="width:24px;height:24px;"
                        onerror="this.style='display:none'"
                        >${result.name}</a></td>
                    `;
                } else {
                    tableHtml += `<tr>
                        <td class="clickable-name" data-name="${result.name}">
                        <img src="/arbitrary/THUMBNAIL/${result.name}/qortal_avatar"
                        style="width:24px;height:24px;"
                        onerror="this.style='display:none'"
                        >${result.name}</td>
                    `;
                }
                tableHtml += `<td>${sizeString}</td>
                        <td>${createdString}</td>
                        <td>${updatedString}</td>
                    </tr>
                `;
            });
            tableHtml += '</table>';
            document.getElementById(`${type}-results`).innerHTML = tableHtml;
            document.querySelectorAll('.clickable-name').forEach(element => {
                element.addEventListener('click', function() {
                    let target = this.getAttribute('data-name');
                    openNewTab(target, service);
                });
            });
            //const exactMatch = results.find(r => r.name.toLowerCase() === name.toLowerCase());
            //if (exactMatch) {
                // TODO - Display specific website/app info.
                // fetchAddressDetails(exactMatch.owner);
            //}
        } else {
            document.getElementById(`${type}-results`).innerHTML = '<p>No results found.</p>';
        }
    })
    .catch(error => {
        console.error('Error searching by name:', error);
        document.getElementById(`${type}-results`).innerHTML = `<p>Error: ${error}</p>`;
    })
}

function searchAccounts(name) {
    if (!name) {
        return;
    }
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

async function getUserAccount() {
    let userStatus = document.getElementById('user-status');
    let userAddress = document.getElementById('user-address');
    let userBlocks = document.getElementById('user-blocks');
    let userQort = document.getElementById('user-qort');
    let loginButton = document.getElementById('login-button');
    if (userStatus.textContent !== 'Not Logged In') {
        userAddress.textContent = '';
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
        userAddress.textContent = shortString(addressResponse);
        loginButton.textContent = 'Logout';
        userStatus.textContent = 'Loading...';
        userBlocks.textContent = 'Loading...';
        userQort.textContent = 'Loading...';
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

function showSection(sectionId) {
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
        case 'extras':
            initExtrasPage();
            break;
    }
}

function initHomePage() {
}
function initBlocksPage() {
}
function initTxsPage() {
}
function initTradesPage() {
}
function initAccountsPage() {
}
function initWebsitesPage() {
}
function initAppsPage() {
}
function initPollsPage() {
}
function initExtrasPage() {
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

async function displayNameOrAddress(address) {
    try {
        const response = await fetch(`/names/address/${address}`);
        const names = await response.json();
        if (names[0]) {
            return `<img src="/arbitrary/THUMBNAIL/${names[0].name}/qortal_avatar"
            style="width:24px;height:24px;"
            onerror="this.style='display:none'"
            >${names[0].name}`;
        } else {
            return `(${shortString(address)})`;
        }
    } catch (error) {
        console.error('Error fetching name:', error);
        return `(${shortString(address)})`;
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
    switch (serviceId) {
        case 131: return 'ATTACHMENT_PRIVATE';
        case 140: return 'FILE';
        case 200: return 'WEBSITE';
        case 410: return 'THUMBNAIL';
        case 420: return 'QCHAT_IMAGE';
        case 500: return 'VIDEO';
        case 600: return 'AUDIO';
        case 700: return 'BLOG';
        case 777: return 'BLOG_POST';
        case 778: return 'BLOG_COMMENT';
        case 800: return 'DOCUMENT';
        case 801: return 'DOCUMENT_PRIVATE';
        case 910: return 'PLAYLIST';
        case 1000: return 'APP';
        case 1110: return 'JSON';
        case 1300: return 'STORE';
        case 1810: return 'CHAIN_COMMENT';
        case 1900: return 'MAIL';
        case 1901: return 'MAIL_PRIVATE';
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
    
    const dateDisable =  new Date(1706745000000).toLocaleString();
    document.getElementById('date-disable').textContent = dateDisable;
    const untilDisable = 1706745000000 - currentTimestamp;
    document.getElementById('until-disable').textContent = formatDuration(untilDisable);

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

    const dateEnable =  new Date(1709251200000).toLocaleString();
    document.getElementById('date-enable').textContent = dateEnable;
    const untilEnable = 1709251200000 - currentTimestamp;
    document.getElementById('until-enable').textContent = formatDuration(untilEnable);
}