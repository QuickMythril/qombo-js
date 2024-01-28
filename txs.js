document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight();
    fetchUnconfirmedTransactions();
});

function fetchBlockHeight() {
    fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('block-height').textContent = data;
            fetchAndDisplayTxs(data - 99, data + 1);
        })
        .catch(error => console.error('Error fetching block height:', error));
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

async function fetchAndDisplayTxs(start, end) {
    try {
        const response = await fetch(`/transactions/search?startBlock=${start}&blockLimit=${end-start}&confirmationStatus=CONFIRMED&limit=0`);
        const txs = await response.json();
        const tableBody = document.getElementById('txs-table').getElementsByTagName('tbody')[0];
        txs.reverse().forEach(async tx => {
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
        let newStart = lastBlockHeight - 100;
        let newEnd = lastBlockHeight;
        fetchAndDisplayTxs(newStart, newEnd);
    } else {
        console.error('No rows in the table.');
    }
});

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const gmtString = date.toGMTString();
    return `${gmtString}`;
}
