document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight(fetchAndDisplayTxs);
    fetchUnconfirmedTransactions();
});

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
            row.insertCell(3).textContent = nameOrAddress;
            row.insertCell(4).textContent = tx.fee;
            let formattedTimestamp = formatTimestamp(tx.timestamp);
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
        fetchAndDisplayTxs(lastBlockHeight-1);
    } else {
        console.error('No rows in the table.');
    }
});

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toGMTString();
}
