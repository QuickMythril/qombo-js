let mintershipResults = [];
let currentSortColumn = 'Last Updated'; // Default sort column
const sortDirectionsDefault = {
    'Name': 1,
    'Created': -1,
    'Last Updated': -1
};
let sortDirection = sortDirectionsDefault[currentSortColumn];

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

async function searchByName(name) {
    document.getElementById('mintership-results').innerHTML = '<p>Searching...</p>';
    try {
        const response = await fetch('/arbitrary/resources/search?service=BLOG_POST&identifier=Minter-board-card-&prefix=true&mode=ALL&reverse=true&name=' + name);
        const results = await response.json();
        if (results.length > 0) {
            mintershipResults = results;
            renderTable();
        } else {
            document.getElementById('mintership-results').innerHTML = '<p>No results found.</p>';
        }
    } catch (error) {
        console.error('Error searching by name:', error);
        document.getElementById('mintership-results').innerHTML = `<p>Error: ${error}</p>`;
    }
}

function renderTable() {
    if (mintershipResults.length > 0) {
        let tableHtml = '<table>';
        tableHtml += `
            <tr>
                <th class="sortable" data-column="Name">Name</th>
                <th class="sortable" data-column="Created">Created</th>
                <th class="sortable" data-column="Last Updated">Last Updated</th>
            </tr>
        `;
        mintershipResults.sort(compareFunction);
        mintershipResults.forEach((result) => {
            const cardName = result.name;
            let createdString = new Date(result.created).toLocaleString();
            let updatedString = new Date(result.updated).toLocaleString();
            if (updatedString === 'Invalid Date') {
                updatedString = 'Never';
            }
            tableHtml += `
                <tr>
                    <td>${cardName}</td>
                    <td>${createdString}</td>
                    <td>${updatedString}</td>
                </tr>
            `;
        });
        tableHtml += '</table>';
        document.getElementById('mintership-results').innerHTML = tableHtml;
        document.querySelectorAll('.sortable').forEach(element => {
            element.addEventListener('click', function() {
                const column = this.getAttribute('data-column');
                if (currentSortColumn === column) {
                    sortDirection *= -1;
                } else {
                    currentSortColumn = column;
                    sortDirection = sortDirectionsDefault[column];
                }
                renderTable();
            });
        });
    } else {
        document.getElementById('mintership-results').innerHTML = '<p>No results found.</p>';
    }
}

function compareFunction(a, b) {
    let aValue, bValue;
    switch(currentSortColumn) {
        case 'Name':
            return a.name.localeCompare(b.name) * sortDirection;
        case 'Created':
            aValue = new Date(a.created).getTime();
            bValue = new Date(b.created).getTime();
            return (aValue - bValue) * sortDirection;
        case 'Last Updated':
            aValue = a.updated ? new Date(a.updated).getTime() : 0;
            bValue = b.updated ? new Date(b.updated).getTime() : 0;
            return (aValue - bValue) * sortDirection;
        default:
            return 0;
    }
}
