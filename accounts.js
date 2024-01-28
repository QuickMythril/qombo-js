document.addEventListener('DOMContentLoaded', function() {
    fetchCirculatingSupply();
    fetchCurrentTimestamp();
    calculateAndDisplayDailyQortInfo();
});

document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('search-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

function handleSearch() {
    const searchQuery = document.getElementById('search-input').value;
    if (!searchQuery) return;
    if (searchQuery.startsWith('Q') && !searchQuery.includes('0') && !searchQuery.includes('O') && !searchQuery.includes('I') && !searchQuery.includes('l') && searchQuery.length >= 26 && searchQuery.length <= 35) {
        validateAddress(searchQuery);
    } else if (searchQuery.length >= 3 && searchQuery.length <= 40) {
        searchByName(searchQuery);
    }
}

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
    document.getElementById('account-details').innerHTML = '';
    Promise.all([
        fetch('/addresses/' + address).then(response => response.json()),
        fetch('/addresses/balance/' + address).then(response => response.text()),
        fetch('/names/address/' + address).then(response => response.json())
    ]).then(([addressDetails, balance, names]) => {
        let detailsHtml = `
            ${names.length > 0 ? `<p>Registered Name: ${names[0].name}</p>` : ''}
            <p>Address: ${address}</p>
            <p>Public Key: ${addressDetails.publicKey}</p>
            <p>Level: ${addressDetails.level}${addressDetails.flags === 1 ? ' (Founder)' : ''}</p>
            <p>Blocks Minted: ${addressDetails.blocksMinted}
            ${addressDetails.blocksMintedAdjustment > 0 ? ` (+${addressDetails.blocksMintedAdjustment})` : ''}
            ${addressDetails.blocksMintedPenalty > 0 ? ` (-${addressDetails.blocksMintedPenalty})` : ''}</p>
            <p>Balance: ${parseFloat(balance).toFixed(8)} QORT</p>
        `;
        document.getElementById('account-details').innerHTML = detailsHtml;
    }).catch(error => console.error('Error fetching address details:', error));
}

function searchByName(name) {
    document.getElementById('account-results').innerHTML = '';
    fetch('/names/search?query=' + name)
        .then(response => response.json())
        .then(results => {
            if (results.length > 0) {
                let resultsHtml = '';
                results.forEach(result => {
                    resultsHtml += `
                        <p>${result.owner} - ${result.name}${result.isForSale ? ' [For Sale]' : ''} - ${result.data} - ${new Date(result.registered).toLocaleString()}</p>
                    `;
                });
                document.getElementById('account-results').innerHTML = resultsHtml;
                const exactMatch = results.find(r => r.name.toLowerCase() === name.toLowerCase());
                if (exactMatch) {
                    fetchAddressDetails(exactMatch.owner);
                }
            } else {
                document.getElementById('account-results').innerHTML = '<p>No results found.</p>';
            }
        })
        .catch(error => console.error('Error searching by name:', error));
}

function fetchBlockHeight() {
    fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('block-height').textContent = data;
            fetchBlockReward(data);
        })
        .catch(error => {
            document.getElementById('block-height').textContent = `Error fetching block height: ${error}`;
            console.error('Error fetching block height:', error);
        });
}

function fetchCirculatingSupply() {
    fetch('/stats/supply/circulating')
        .then(response => response.text())
        .then(data => {
            document.getElementById('total-supply').textContent = data;
        })
        .catch(error => console.error('Error fetching circulating supply:', error));
}

function fetchBlockHeightAndCirculatingSupply() {
    return Promise.all([
        fetch('/blocks/timestamp/' + (Date.now() - (24 * 60 * 60 * 1000)))
            .then(response => response.json())
            .then(data => parseInt(document.getElementById('blocks-past-day').textContent)),
        fetch('/stats/supply/circulating')
            .then(response => response.text())
            .then(data => parseFloat(data))
    ]);
}

function fetchCurrentTimestamp() {
    fetch('/blocks/height')
        .then(response => response.text())
        .then(currentBlockHeight => {
            document.getElementById('block-height').textContent = currentBlockHeight;
            fetchBlockReward(currentBlockHeight);
            currentBlockHeight = parseInt(currentBlockHeight);
            fetch('/utils/timestamp')
                .then(response => response.text())
                .then(currentTimestamp => {
                    const oneDayAgoTimestamp = parseInt(currentTimestamp) - (24 * 60 * 60 * 1000);
                    fetch('/blocks/timestamp/' + oneDayAgoTimestamp)
                        .then(response => response.json())
                        .then(data => {
                            const oneDayAgoBlockHeight = data.height;
                            const blocksInPastDay = currentBlockHeight - oneDayAgoBlockHeight;
                            document.getElementById('blocks-past-day').textContent = blocksInPastDay;
                        })
                        .catch(error => console.error('Error fetching block height from one day ago:', error));
                })
                .catch(error => console.error('Error fetching current timestamp:', error));
        })
        .catch(error => console.error('Error fetching current block height:', error));
}

function fetchBlockReward(currentHeight) {
    let reward = 5;
    const decreaseInterval = 259200;
    if (currentHeight > decreaseInterval) {
        reward -= Math.floor((currentHeight - 1) / decreaseInterval) * 0.25;
    }
    document.getElementById('block-reward').textContent = reward.toFixed(2) + ' QORT';
}

function calculateAndDisplayDailyQortInfo() {
    fetchBlockHeightAndCirculatingSupply()
        .then(([blocksInPastDay, totalCirculatingSupply]) => {
            const dailyQort = calculateDailyQort(blocksInPastDay);
            const percentageOfTotal = calculatePercentageOfTotal(dailyQort, totalCirculatingSupply);
            document.getElementById('qort-per-day').textContent = dailyQort.toFixed(2) + ' QORT';
            document.getElementById('daily-percentage').textContent = percentageOfTotal.toFixed(2) + '%';
        })
        .catch(error => console.error('Error calculating daily QORT info:', error));
}

function calculateDailyQort(blocksInPastDay) {
    const blockReward = parseFloat(document.getElementById('block-reward').textContent.split(' ')[0]);
    return blocksInPastDay * blockReward;
}

function calculatePercentageOfTotal(dailyQort, totalCirculatingSupply) {
    return (dailyQort / totalCirculatingSupply) * 100;
}
