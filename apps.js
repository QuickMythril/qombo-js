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
    let tableHtml = '<table><tr><th>Current Block Height</th>';
    return fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            tableHtml += `<td>${data}</td></tr></table>`;
            document.getElementById('info-table').innerHTML = tableHtml;
            return data;
        })
        .catch(error => {
            console.error('Error fetching block height:', error);
            tableHtml += `<td>Error: ${error}</td></tr></table>`;
            document.getElementById('info-table').innerHTML = tableHtml;
        });
}

function handleSearch() {
    const searchQuery = document.getElementById('search-input').value;
    if (!searchQuery) return;
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
    document.getElementById('app-results').innerHTML = '';
    fetch('/arbitrary/resources/search?service=APP&name=' + name)
    .then(response => response.json())
    .then(results => {
        if (results.length > 0) {
            let tableHtml = '<table>';
            tableHtml += `
                <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Created</th>
                    <th>Updated</th>
                </tr>
            `;
            results.forEach(result => {
                tableHtml += `
                    <tr>
                        <td>${result.name}</td>
                        <td>${result.size}</td>
                        <td>${new Date(result.created).toLocaleString()}</td>
                        <td>${new Date(result.updated).toLocaleString()}</td>
                    </tr>
                `;
            });
            tableHtml += '</table>';
            document.getElementById('app-results').innerHTML = tableHtml;
            const exactMatch = results.find(r => r.name.toLowerCase() === name.toLowerCase());
            if (exactMatch) {
                // TODO - Display specific app info.
                // fetchAddressDetails(exactMatch.owner);
            }
        } else {
            document.getElementById('app-results').innerHTML = '<p>No results found.</p>';
        }
    })
    .catch(error => console.error('Error searching by name:', error));
}
