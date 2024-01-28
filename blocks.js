document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight();
});

function fetchBlockHeight() {
    fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('block-height').textContent = data;
            fetchAndDisplayBlocks(data - 9, data + 1);
        })
        .catch(error => {
            document.getElementById('block-height').textContent = `Error fetching block height: ${error}`;
            console.error('Error fetching block height:', error);
        });
}

function fetchAndDisplayBlocks(start, end) {
    fetch(`/blocks/summaries?start=${start}&end=${end}`)
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

document.getElementById('load-more').addEventListener('click', function() {
    const tableBody = document.getElementById('blocks-table').getElementsByTagName('tbody')[0];
    const lastRow = tableBody.lastElementChild;
    if (lastRow) {
        let lastBlockHeight = parseInt(lastRow.cells[0].textContent);
        let newStart = lastBlockHeight - 10;
        let newEnd = lastBlockHeight;
        fetchAndDisplayBlocks(newStart, newEnd);
    } else {
        console.error('No rows in the table.');
    }
});

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const gmtString = date.toGMTString();
    return `${gmtString}`;
}
