const displayNameCache = {};

document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight()
        .then(currentHeight => {
            fetchBlockReward(currentHeight);
            return Promise.all([
                fetchCirculatingSupply(),
                fetchDailyBlocks(),
            ]);
        })
        .then(() => {
            calculateDailyQort();
        })
        .catch(error => {
            console.error('An error occurred in the fetch chain:', error);
        });
    fetchAssets();
});

document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('search-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

async function fetchAssets() {
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

function fetchBlockHeight() {
    document.getElementById('block-height').textContent = 'Loading';
    return fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('block-height').textContent = data;
            return data;
        })
        .catch(error => {
            document.getElementById('block-height').textContent = `Error fetching block height: ${error}`;
            console.error('Error fetching block height:', error);
        });
}

function fetchBlockReward(currentHeight) {
    document.getElementById('block-reward').textContent = 'Loading';
    let reward = 5;
    const decreaseInterval = 259200;
    if (currentHeight > decreaseInterval) {
        reward -= Math.floor((currentHeight - 1) / decreaseInterval) * 0.25;
    }
    document.getElementById('block-reward').textContent = reward.toFixed(2);
}

function fetchCirculatingSupply() {
    document.getElementById('total-supply').textContent = 'Loading';
    return fetch('/stats/supply/circulating')
        .then(response => response.text())
        .then(data => {
            document.getElementById('total-supply').textContent = parseFloat(data).toFixed(2);
            return parseFloat(data);
        })
        .catch(error => {
            document.getElementById('total-supply').textContent = `Error fetching circulating supply: ${error}`;
            console.error('Error fetching circulating supply:', error);
            throw error;
        });
}

function fetchDailyBlocks() {
    document.getElementById('blocks-past-day').textContent = 'Loading';
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
                            document.getElementById('blocks-past-day').textContent = blocksInPastDay;
                            return blocksInPastDay;
                        });
                });
        })
        .catch(error => {
            console.error('Error in fetchDailyBlocks:', error);
        });
}

function calculateDailyQort() {
    document.getElementById('qort-per-day').textContent = 'Loading';
    const blocksInPastDay = parseInt(document.getElementById('blocks-past-day').textContent);
    const blockReward = parseFloat(document.getElementById('block-reward').textContent);
    const dailyQort = blocksInPastDay * blockReward;
    const totalCirculatingSupply = parseFloat(document.getElementById('total-supply').textContent);
    const percentageOfTotal = (dailyQort / totalCirculatingSupply) * 100;
    const dailyQortString = `${dailyQort.toFixed(2)} QORT (${percentageOfTotal.toFixed(2)}% of total)`;
    document.getElementById('qort-per-day').textContent = dailyQortString;
}

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

/*
async function fetchContent(name) {
    try {
        document.getElementById('account-details').innerHTML += '<p>Loading QDN...</p>';
        const response = await fetch(`/arbitrary/resources/search?name=${name}&includemetadata=true&exactmatchnames=true&mode=ALL`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const results = response.json();
        if (results.length > 0) {
            let totalFiles = 0;
            let totalSize = 0;
            results.forEach(result => {
                totalFiles += 1;
                totalSize += result.size;
                let sizeString = formatSize(result.size);
            });
            let totalSizeString = formatSize(totalSize);
        }
        let tableHtml = `<table>
            <tr><th>QDN Content</th><th>${totalFiles} Files</th></tr>
            <tr><td>Total Size</td><td>${totalSizeString}</td></tr>
        </table>`;
        document.getElementById('account-details').innerHTML += tableHtml;
    } catch (error) {
        console.error('Error fetching content:', error);
    }
}
*/

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

function searchByName(name) {
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