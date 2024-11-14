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
    document.getElementById('website-results').innerHTML = '<p>Searching...</p>';
    try {
        const response = await fetch('/arbitrary/resources/search?service=WEBSITE&name=' + name);
        const results = await response.json();
        if (results.length > 0) {
            let tableHtml = '<table>';
            tableHtml += `
                <tr>
                    <th>Rating</th>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Created</th>
                    <th>Last Updated</th>
                </tr>
            `;
            results.sort((a, b) => (b.updated || b.created) - (a.updated || a.created));
            const ratingPromises = results.map(async (result) => {
                const appName = result.name;
                const pollName = `app-library-WEBSITE-rating-${appName}`;
                let ratingInfo = {
                    ratingText: '',
                    ratingValue: null,
                    ratingCount: null
                };
                try {
                    // Fetch poll details and votes
                    const pollVotesResponse = await fetch(`/polls/votes/${pollName}`);
                    if (pollVotesResponse.ok) {
                        const pollVotesData = await pollVotesResponse.json();
                        const voteCounts = pollVotesData.voteCounts;
                        let totalRating = 0;
                        let ratingCount = 0;
                        for (let i = 0; i < voteCounts.length; i++) {
                            const count = voteCounts[i].voteCount;
                            const optionName = voteCounts[i].optionName;
                            if (optionName.startsWith('initialValue-')) {
                                const initialValueMatch = optionName.match(/initialValue-(\d+)/);
                                if (initialValueMatch) {
                                    const initialRating = parseInt(initialValueMatch[1]);
                                    totalRating += initialRating;
                                    ratingCount += 1; // Count initial value only once
                                }
                            } else if (['1', '2', '3', '4', '5'].includes(optionName)) {
                                const ratingValue = parseInt(optionName);
                                totalRating += ratingValue * count;
                                ratingCount += count;
                            }
                        }
                        if (ratingCount > 0) {
                            const averageRating = (totalRating / ratingCount).toFixed(2);
                            ratingInfo.ratingText = `${averageRating} (${ratingCount} ratings)`;
                            ratingInfo.ratingValue = averageRating;
                            ratingInfo.ratingCount = ratingCount;
                        } else {
                            ratingInfo.ratingText = 'No ratings';
                        }
                    } else {
                        ratingInfo.ratingText = 'Rate this website';
                    }
                } catch (error) {
                    console.error(`Error fetching poll for ${appName}:`, error);
                    ratingInfo.ratingText = 'Rate this website';
                }
                return ratingInfo;
            });
            const ratings = await Promise.all(ratingPromises);
            results.forEach((result, index) => {
                const ratingInfo = ratings[index];
                const appName = result.name;
                let createdString = new Date(result.created).toLocaleString();
                let updatedString = new Date(result.updated).toLocaleString();
                if (updatedString === 'Invalid Date') {
                    updatedString = 'Never';
                }
                let sizeString = '';
                if (result.size > (1024*1024)) {
                    let adjustedSize = (result.size / (1024*1024)).toFixed(2);
                    sizeString = adjustedSize + ' mb';
                } else if (result.size > 1024) {
                    let adjustedSize = (result.size / 1024).toFixed(2);
                    sizeString = adjustedSize + ' kb';
                } else {
                    sizeString = result.size + ' b';
                }
                let ratingCell = '';
                if (ratingInfo.ratingValue) {
                    ratingCell = `<span class="rating-text clickable-rating" data-app-name="${appName}">${ratingInfo.ratingText}</span>`;
                } else {
                    ratingCell = `<span class="rate-app clickable-rating" data-app-name="${appName}">Rate this website</span>`;
                }
                let rowHtml = '<tr>';
                rowHtml += `<td>${ratingCell}</td>`;
                if (_qdnContext === 'gateway') {
                    rowHtml += `<td><a target="_blank" href="/app/${appName}">
                        <img src="/arbitrary/THUMBNAIL/${appName}/qortal_avatar"
                        style="width:24px;height:24px;"
                        onerror="this.style='display:none'"
                        >${appName}</a></td>
                    `;
                } else {
                    rowHtml += `<td class="clickable-name" data-name="${appName}">
                        <img src="/arbitrary/THUMBNAIL/${appName}/qortal_avatar"
                        style="width:24px;height:24px;"
                        onerror="this.style='display:none'"
                        >${appName}</td>
                    `;
                }
                rowHtml += `<td>${sizeString}</td>
                            <td>${createdString}</td>
                            <td>${updatedString}</td>
                        </tr>
                `;
                tableHtml += rowHtml;
            });
            tableHtml += '</table>';
            document.getElementById('website-results').innerHTML = tableHtml;
            document.querySelectorAll('.clickable-name').forEach(element => {
                element.addEventListener('click', function() {
                    let target = this.getAttribute('data-name');
                    openNewTab(target, 'WEBSITE');
                });
            });
            document.querySelectorAll('.clickable-rating').forEach(element => {
                element.addEventListener('click', function() {
                    let appName = this.getAttribute('data-app-name');
                    openRatingModal(appName);
                });
            });
        } else {
            document.getElementById('website-results').innerHTML = '<p>No results found.</p>';
        }
    } catch (error) {
        console.error('Error searching by name:', error);
        document.getElementById('website-results').innerHTML = `<p>Error: ${error}</p>`;
    }
}

async function openNewTab(name, service) {
    const response = await qortalRequest({
        action: 'OPEN_NEW_TAB',
        qortalLink: `qortal://${service}/${name}`
    })
}

function openRatingModal(appName) {
    let modal = document.createElement('div');
    modal.classList.add('modal');
    let modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');
    let closeButton = document.createElement('span');
    closeButton.classList.add('close-button');
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
        document.body.removeChild(modal);
    };
    let title = document.createElement('h2');
    title.textContent = `Rate ${appName}`;
    let ratingForm = document.createElement('form');
    ratingForm.id = 'rating-form';
    let ratingOptions = document.createElement('div');
    ratingOptions.classList.add('rating-options');
    for (let i = 1; i <= 5; i++) {
        let label = document.createElement('label');
        label.innerHTML = `<input type="radio" name="rating" value="${i}"> ${i} Star${i > 1 ? 's' : ''}`;
        ratingOptions.appendChild(label);
    }
    let removeLabel = document.createElement('label');
    removeLabel.innerHTML = `<input type="radio" name="rating" value="remove"> Remove Rating`;
    ratingOptions.appendChild(removeLabel);
    let submitButton = document.createElement('button');
    submitButton.type = 'button';
    submitButton.textContent = 'Submit Rating';
    submitButton.onclick = () => {
        submitRating(appName);
    };
    ratingForm.appendChild(ratingOptions);
    ratingForm.appendChild(submitButton);
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(ratingForm);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

async function submitRating(appName) {
    const form = document.getElementById('rating-form');
    const selectedOption = form.querySelector('input[name="rating"]:checked');
    if (!selectedOption) {
        alert('Please select a rating.');
        return;
    }
    const ratingValue = selectedOption.value;
    const pollName = `app-library-WEBSITE-rating-${appName}`;
    try {
        const pollResponse = await fetch(`/polls/${pollName}`);
        if (pollResponse.status === 404) {
            const initialValueOption = `initialValue-${ratingValue}`;
            const pollOwnerResponse = await qortalRequest({
                action: 'GET_USER_ACCOUNT',
            });
            // Create the poll with the required format for pollOptions
            await qortalRequest({
                action: "CREATE_POLL",
                pollName: pollName,
                pollDescription: `Rating for WEBSITE ${appName}`,
                pollOptions: [`1, 2, 3, 4, 5, ${initialValueOption}`],
                pollOwnerAddress: pollOwnerResponse.address
            });
            alert('Poll created and initial rating submitted.');
        } else {
            let optionIndex;
            if (ratingValue === 'remove') {
                optionIndex = 5;
            } else {
                optionIndex = parseInt(ratingValue) - 1;
            }
            // Vote on the existing poll
            await qortalRequest({
                action: "VOTE_ON_POLL",
                pollName: pollName,
                optionIndex: optionIndex
            });
            alert('Rating submitted.');
        }
        // Clean up the UI and refresh data
        document.querySelector('.modal').remove();
        handleSearch();
    } catch (error) {
        console.error('Error submitting rating:', error);
        alert('Error submitting rating. Please try again.');
    }
}
