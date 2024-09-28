document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight()
        .then(() => {
            searchPolls();
        })
        .catch(error => {
            console.error('An error occurred in the fetch chain:', error);
        });
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

async function searchPolls() {
    document.getElementById('poll-results').innerHTML = '<p>Searching...</p>';
    try {
        const response = await fetch('/polls');
        const results = await response.json();
        if (results && results.length > 0) {
            let tableHtml = '<table>';
            tableHtml += `
                <tr>
                    <th>Poll Name</th>
                    <th>Description</th>
                    <th>Owner</th>
                    <th>Poll Options</th>
                    <th>Published</th>
                </tr>
            `;
            results.sort((a, b) => b.published - a.published);
            for (const result of results) {
                let publishedString = new Date(result.published).toLocaleString();
                let pollOptionsString = result.pollOptions.map(option => option.optionName).join(', ');
                let displayName = await displayNameOrAddress(result.owner);
                let creatorLevel = await fetchAccountLevel(result.owner);
                tableHtml += `
                    <tr>
                        <td class="clickable-name" data-name="${result.pollName}">${result.pollName}</td>
                        <td>${result.description}</td>
                        <td>${displayName} (Lv.${creatorLevel})</td>
                        <td>${pollOptionsString}</td>
                        <td>${publishedString}</td>
                    </tr>
                `;
            }
            tableHtml += '</table>';
            document.getElementById('poll-results').innerHTML = tableHtml;
            document.querySelectorAll('.clickable-name').forEach(element => {
                element.addEventListener('click', function() {
                    document.body.scrollTop = document.documentElement.scrollTop = 0;
                    let target = this.getAttribute('data-name');
                    fetchPoll(target);
                });
            });            
        } else {
            document.getElementById('poll-results').innerHTML = '<p>No results found.</p>';
        }
    } catch (error) {
        console.error('Error searching polls:', error);
        document.getElementById('poll-results').innerHTML = `<p>Error: ${error}</p>`;
    }
}

async function fetchPoll(pollName) {
    try {
        const pollResponse = await fetch('/polls/' + encodeURIComponent(pollName));
        const pollData = await pollResponse.json();
        const voteResponse = await fetch('/polls/votes/' + encodeURIComponent(pollName));
        const voteData = await voteResponse.json();
        const voteCountMap = new Map(voteData.voteCounts.map(item => [item.optionName, item.voteCount]));
        const voteWeightMap = new Map(voteData.voteWeights.map(item => [item.optionName, item.voteWeight]));
        pollData.pollOptions.forEach(option => {
            option.voteCount = voteCountMap.get(option.optionName) || 0;
            option.voteWeight = voteWeightMap.get(option.optionName) || 0;
        });
        let displayName = await displayNameOrAddress(pollData.owner);
        let publishedString = new Date(pollData.published).toLocaleString();
        let htmlContent = `<table><tr><th>${pollData.pollName}</th><td>${displayName}</td>`;
        htmlContent += `<td>${publishedString}</td></tr></table>`;
        htmlContent += `<table><tr><td>${pollData.description}</td></tr></table>`;
        htmlContent += `<table><tr><th>Poll Options</th>`;
        pollData.pollOptions.forEach((option, index) => {
            htmlContent += `<td>Vote <button onclick="voteOnPoll('${pollData.pollName}', ${index})">${option.optionName}</button></td>`;
        });
        htmlContent += `</tr><tr><th>Vote Counts (Total: ${voteData.totalVotes})</th>`;
        pollData.pollOptions.forEach(option => {
            let percentage = (option.voteCount/voteData.totalVotes*100).toFixed(2);
            htmlContent += `<td>${option.voteCount} (${percentage}%)</td>`;
        });
        htmlContent += `</tr><tr><th>Vote Weights (Total: ${voteData.totalWeight})</th>`;
        pollData.pollOptions.forEach(option => {
            let percentage = (option.voteWeight/voteData.totalWeight*100).toFixed(2);
            htmlContent += `<td>${option.voteWeight} (${percentage}%)</td>`;
        });
        htmlContent += `</tr></table>`;
        htmlContent += `<button onclick="showVotes('${pollData.pollName}')">Show Votes</button>`;
        htmlContent += `<div id="voter-info"></div>`;
        document.getElementById('poll-details').innerHTML = htmlContent;
    } catch (error) {
        console.error('Error fetching poll:', error);
        document.getElementById('poll-details').innerHTML = `Error: ${error}`;
    }
}

async function showVotes(pollName) {
    try {
        const voteResponse = await fetch('/polls/votes/' + encodeURIComponent(pollName));
        const voteData = await voteResponse.json();

        let voterInfoHtml = '<table><tr><th>Voter</th><th>Option</th></tr>';
        for (const vote of voteData.votes) {
            let voterAddress = await pubkeyToAddress(vote.voterPublicKey);
            let voterDisplayName = await displayNameOrAddress(voterAddress);
            let optionName = vote.optionIndex;
            voterInfoHtml += `<tr><td>${voterDisplayName}</td><td>${optionName}</td></tr>`;
        }
        voterInfoHtml += '</table>';

        document.getElementById('voter-info').innerHTML = voterInfoHtml;
    } catch (error) {
        console.error('Error fetching voter information:', error);
        document.getElementById('voter-info').innerHTML = `Error: ${error}`;
    }
}

async function voteOnPoll(pollName, optionId) {
    try {
        await qortalRequest({
            action: "VOTE_ON_POLL",
            pollName: pollName,
            optionIndex: optionId,
        });
    } catch (error) {
        console.error('Error voting on poll:', error);
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
            onerror="this.style='display:none'"
            >${names[0].name}`;
        } else {
            return `(${shortenedAddress})`;
        }
    } catch (error) {
        console.error('Error fetching name:', error);
        return `(${shortenedAddress})`;
    }
}

async function pubkeyToAddress(pubkey) {
    try {
        const response = await fetch(`/addresses/convert/${pubkey}`);
        const address = await response.text();
        return address;
    } catch (error) {
        console.error('Error fetching address:', error);
        return pubkey;
    }
}

async function fetchAccountLevel(address) {
    try {
        const response = await fetch(`/addresses/${address}`);
        const accountInfo = await response.json();
        return accountInfo.level;
    } catch (error) {
        console.error('Error fetching account level:', error);
    }
}
