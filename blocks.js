document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight(fetchAndDisplayBlocks);
    fetchBlockHeight(searchByBlock);
});

document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('search-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
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

function fetchAndDisplayBlocks(height) {
    fetch(`/blocks/summaries?start=${height-9}&end=${height+1}`)
        .then(response => response.json())
        .then(blocks => {
            const tableBody = document.getElementById('blocks-table').getElementsByTagName('tbody')[0];
            blocks.reverse().forEach(block => {
                let row = document.createElement('tr');
                row.insertCell(0).textContent = block.height;
                let shortenedSignature = block.signature.substring(0, 4) + '...' + block.signature.substring(block.signature.length - 4);
                row.insertCell(1).textContent = shortenedSignature;
                row.insertCell(2).textContent = block.transactionCount;
                row.insertCell(3).textContent = block.onlineAccountsCount;
                let formattedTimestamp = formatTimestamp(block.timestamp);
                row.insertCell(4).textContent = formattedTimestamp;                
                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching blocks:', error));
}

function handleSearch() {
    const currentBlockHeight = parseInt(document.getElementById('block-height').textContent);
    const searchQuery = document.getElementById('search-input').value;
    if (!searchQuery) return;
    if (+searchQuery >= 1 && +searchQuery <= +currentBlockHeight) {
        searchByBlock(+searchQuery);
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
                let resultHtml = '';
                result => {
                    let shortenedSignature = result.signature.substring(0, 4) + '...' + result.signature.substring(result.signature.length - 4);
                    resultHtml += `
                        <p>${result.height} - ${shortenedSignature} - ${result.transactionCount} Txs - ${result.onlineAccountsCount} Minters - ${new Date(result.timestamp).toLocaleString()}</p>
                    `;
                    if (result.transactionCount > 0) {
                        fetchAndDisplayTxs(result.signature);
                    }
                };
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

async function fetchAndDisplayTxs(signature) {
    try {
        const response = await fetch(`/transactions/block/${signature}`);
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
    const tableBody = document.getElementById('blocks-table').getElementsByTagName('tbody')[0];
    const lastRow = tableBody.lastElementChild;
    if (lastRow) {
        let lastBlockHeight = parseInt(lastRow.cells[0].textContent);
        fetchAndDisplayBlocks(lastBlockHeight-1);
    } else {
        console.error('No rows in the table.');
    }
});

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toGMTString();
}
