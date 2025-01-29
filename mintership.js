let mintershipResults = [];
let currentSortColumn = 'Last Updated'; // Default sort column
const sortDirectionsDefault = {
    'Name': 1,
    'Created': -1,
    'Last Updated': -1
};
let sortDirection = sortDirectionsDefault[currentSortColumn];
let minterGroupMembers = [];
let minterAdminsLoaded = false;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await fetchBlockHeight();
        await checkMinterGroup();
        searchByName('');
    } catch (error) {
        console.error('An error occurred in the fetch chain:', error);
    }
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

function checkMinterGroup() {
    return fetch('/groups/members/694?limit=0')
        .then(response => response.json())
        .then(data => {
            minterGroupMembers = data.members;
        })
        .catch(error => {
            console.error('Error fetching minter group:', error);
        });
}

async function renderMintershipAdmins() {
    // Filter out the admins
    // (If `isAdmin` is missing for non-admins, this will skip them automatically)
    const admins = minterGroupMembers.filter(m => m.isAdmin);

    // Build just the rows (no outer <table> tags)
    let rowsHtml = "";
    for (const admin of admins) {
        let address = admin.member;
        let name = "";
        if (address === "QdSnUy6sUiEnaN87dWmE92g1uQjrvPgrWG") {
            name = "[Null Account]";
        } else {
            try {
                const res = await fetch("/names/address/" + address);
                const data = await res.json();
                if (data.length > 0) {
                    name = data[0].name;
                } else {
                    name = address;
                }
            } catch (error) {
                console.error("Error fetching admin name:", error);
                name = address;
            }
        }
        rowsHtml += `<tr>
            <td>${name}</td>
            <td>${address}</td>
        </tr>`;
    }
    // Insert those rows into the existing <tbody>
    const tbody = document.querySelector("#mintership-admins-table tbody");
    tbody.innerHTML = rowsHtml;
}

async function searchByName(name) {
    document.getElementById('mintership-results').innerHTML = '<p>Searching...</p>';
    try {
        const response = await fetch('/arbitrary/resources/search?service=BLOG_POST&identifier=Minter-board-card-&prefix=true&mode=ALL&reverse=true&name=' + name);
        const results = await response.json();
        if (results.length > 0) {
            mintershipResults = results;
            // For each result, fetch the name's details to get the owner,
            // then compare with the minterGroupMembers array to decide the status.
            for (const r of mintershipResults) {
                try {
                    const ownerResponse = await fetch(`/names/${r.name}`);
                    const ownerData = await ownerResponse.json();
                    const isInGroup = minterGroupMembers.some(m => m.member === ownerData.owner);
                    r.status = isInGroup ? 'Minter' : 'Pending';
                } catch (err) {
                    console.error('Error fetching owner data:', err);
                    r.status = 'Pending';
                }
            }
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
                <th>Status</th>
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
                    <td>${result.status}</td>
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

function toggleSection(sectionId, loadFn, loadedFlagName) {
    const section = document.getElementById(sectionId);
    if (section.style.display === 'none') {
        section.style.display = 'block';
        if (!window[loadedFlagName]) {
            loadFn();
            window[loadedFlagName] = true;
        }
    } else {
        section.style.display = 'none';
    }
}

