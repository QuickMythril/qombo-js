const displayNameCache = {};

document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight(fetchAndDisplayTxs);
    fetchUnconfirmedTransactions();
    fetchQdnTotalSize();
});

function fetchBlockHeight(callback) {
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
        const tableBody = document.getElementById('txs-table').getElementsByTagName('tbody')[0];
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

async function displayNameOrAddress(address) {
    if (displayNameCache[address]) {
        return displayNameCache[address];
    }
    let shortenedAddress = address.substring(0, 4) + '...' + address.substring(address.length - 4);
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
            displayNameCache[address] = `(${shortenedAddress})`;
            return `(${shortenedAddress})`;
        }
    } catch (error) {
        console.error('Error fetching name:', error);
        displayNameCache[address] = `(${shortenedAddress})`;
        return `(${shortenedAddress})`;
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

document.getElementById('load-more').addEventListener('click', function() {
    const tableBody = document.getElementById('txs-table').getElementsByTagName('tbody')[0];
    const lastRow = tableBody.lastElementChild;
    if (lastRow) {
        let lastBlockHeight = parseInt(lastRow.cells[0].textContent);
        fetchAndDisplayTxs(lastBlockHeight-1);
    } else {
        console.error('No rows in the table.');
    }
});

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