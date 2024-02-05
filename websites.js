document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight()
        .then(() => {
            searchByName('');
        })
        .catch(error => {
            console.error('An error occurred in the fetch chain:', error);
        });
});

document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('search-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

function fetchBlockHeight() {
    return fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('block-height').textContent = data;
            return data;
                    })
        .catch(error => {
            console.error('Error fetching block height:', error);
            document.getElementById('block-height').textContent = `Error: ${error}`;
        });
}

function handleSearch() {
    const searchQuery = document.getElementById('search-input').value;
    if (!searchQuery) {
        searchByName('');
    }
    if (searchQuery.startsWith('Q') && !searchQuery.includes('0') && !searchQuery.includes('O') && !searchQuery.includes('I') && !searchQuery.includes('l') && searchQuery.length >= 26 && searchQuery.length <= 35) {
        validateAddress(searchQuery);
    } else if (searchQuery.length >= 0 && searchQuery.length <= 40) {
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
                searchByName(address);
            }
        })
        .catch(error => console.error('Error validating address:', error));
}

function fetchAddressDetails(address) {
    Promise.all([
        fetch('/names/address/' + address).then(response => response.json())
    ]).then(([names]) => {
        if (names.length > 0) {
            searchByName(names[0].name);
        } else {
            searchByName(address);
        }
    }).catch(error => console.error('Error fetching address details:', error));
}

function searchByName(name) {
    document.getElementById('website-results').innerHTML = '<p>Searching...</p>';
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
                let updatedString = new Date(result.updated).toLocaleString()
                if (updatedString === 'Invalid Date') {
                    updatedString = 'Never'
                }
                let sizeString = '';
                if (result.size > (1024*1024)) {
                    let adjustedSize = (result.size / (1024*1024)).toFixed(2);
                    sizeString = adjustedSize + ' mb';
                } else if (result.size > 1024) {
                    let adjustedSize = (result.size / 1024).toFixed(2);
                    sizeString = adjustedSize + ' kb';
                } else {
                    sizeString = result.size + ' b'
                }
                if (_qdnContext === 'gateway') {
                    tableHtml += `<tr>
                        <td><a href="/website/${result.name}">
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
            document.getElementById('website-results').innerHTML = tableHtml;
            document.querySelectorAll('.clickable-name').forEach(element => {
                element.addEventListener('click', function() {
                    let target = this.getAttribute('data-name');
                    openNewTab(target, 'WEBSITE');
                });
            });
            //const exactMatch = results.find(r => r.name.toLowerCase() === name.toLowerCase());
            //if (exactMatch) {
                // TODO - Display specific website info.
                // fetchAddressDetails(exactMatch.owner);
            //}
        } else {
            document.getElementById('website-results').innerHTML = '<p>No results found.</p>';
        }
    })
    .catch(error => {
        console.error('Error searching by name:', error);
        document.getElementById('website-results').innerHTML = `<p>Error: ${error}</p>`;
    })
}

async function openNewTab(name, service) {
    const response = await qortalRequest({
        action: 'OPEN_NEW_TAB',
        qortalLink: `qortal://${service}/${name}`
      })
}