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

function handleSearch() {
    const currentBlockHeight = parseInt(document.getElementById('block-height').textContent);
    const searchQuery = document.getElementById('search-input').value.trim();
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
                    fetchAndDisplayTxs(result.signature);
                } else {
                    const tableBody = document.getElementById('txs-table').getElementsByTagName('tbody')[0];
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

async function fetchAndDisplayTxs(signature) {
    try {
        const response = await fetch(`/transactions/block/${signature}`);
        const txs = await response.json();
        const tableBody = document.getElementById('txs-table').getElementsByTagName('tbody')[0];
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
            onerror="this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'"
            >${names[0].name}`;
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
