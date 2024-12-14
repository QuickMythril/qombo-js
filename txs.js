const displayNameCache = {};
let cachedTxs = [];
let currentPage = 1;
let totalPages = 1;
let resultsPerPage = 20;

document.addEventListener('DOMContentLoaded', function() {
    // Do nothing on page load to prevent unnecessary load on public nodes
});

document.getElementById('refresh-block-height').addEventListener('click', function() {
    fetchBlockHeight();
});

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

document.getElementById('prev-page').addEventListener('click', function() {
    if (currentPage > 1) {
        currentPage--;
        displayTxsPage(currentPage);
    }
});

document.getElementById('next-page').addEventListener('click', function() {
    if (currentPage < totalPages) {
        currentPage++;
        displayTxsPage(currentPage);
    }
});

function fetchBlockHeight(callback) {
    document.getElementById('block-height').textContent = 'Loading';
    fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('block-height').textContent = data;
            if (callback) {
                callback(data);
            }
        })
        .catch(error => {
            console.error('Error fetching block height:', error);
            document.getElementById('block-height').textContent = `Error: ${error}`;
        });
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
            case 'JOIN_GROUP':
            case 'LEAVE_GROUP':
                let groupName = await displayGroupName(tx.groupId);
                row.insertCell(4).innerHTML = `${tx.groupId}: ${groupName}`;
                break;
            case 'GROUP_INVITE':
                let groupInviteName = await displayGroupName(tx.groupId);
                let inviteeNameOrAddress = await displayNameOrAddress(tx.invitee);
                row.insertCell(4).innerHTML = `${inviteeNameOrAddress}<br>${tx.groupId}: ${groupInviteName}`;
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