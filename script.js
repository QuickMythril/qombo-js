document.addEventListener('DOMContentLoaded', function() {
    applyTheme();
    fetchCirculatingSupply();
    fetchCurrentTimestamp();
    fetchOnlineAccounts();
    fetchUnconfirmedTransactions();
    fetchUserData();
});

document.getElementById('login-button').addEventListener('click', function() {
    fetchUserData();
});

function applyTheme() {
    const theme = window._qdnTheme || 'light'; // Default to light if _qdnTheme is not set
    document.body.className = theme;
}

function fetchBlockHeight() {
    fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('block-height').textContent = data;
            fetchBlockReward(data);
        })
        .catch(error => console.error('Error fetching block height:', error));
}

function fetchCirculatingSupply() {
    fetch('/stats/supply/circulating')
        .then(response => response.text())
        .then(data => {
            document.getElementById('total-supply').textContent = data;
        })
        .catch(error => console.error('Error fetching circulating supply:', error));
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
    let reward = 5; // Initial reward
    const decreaseInterval = 259200; // Interval for reward decrease

    // Calculate current reward
    if (currentHeight > decreaseInterval) {
        reward -= Math.floor((currentHeight - 1) / decreaseInterval) * 0.25;
    }

    document.getElementById('block-reward').textContent = reward.toFixed(2) + ' QORT';
}

function fetchUnconfirmedTransactions() {
    fetch('/transactions/unconfirmed')
        .then(response => response.json())
        .then(data => {
            const transactionTypes = {};
            data.forEach(transaction => {
                const type = transaction.type;
                transactionTypes[type] = (transactionTypes[type] || 0) + 1;
            });

            const totalUnconfirmed = data.length;
            document.getElementById('total-unconfirmed').textContent = totalUnconfirmed;

            const transactionTypesDiv = document.getElementById('transaction-types');
            Object.keys(transactionTypes).forEach(type => {
                const p = document.createElement('p');
                p.textContent = `Type ${type}: ${transactionTypes[type]}`;
                transactionTypesDiv.appendChild(p);
            });
        })
        .catch(error => console.error('Error fetching unconfirmed transactions:', error));
}

function fetchOnlineAccounts() {
    fetch('/addresses/online/levels')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('accounts-table').getElementsByTagName('tbody')[0];
            data.forEach(account => {
                const row = tableBody.insertRow();
                const cell1 = row.insertCell(0);
                const cell2 = row.insertCell(1);
                cell1.textContent = account.level;
                cell2.textContent = account.count;
            });
        })
        .catch(error => console.error('Error fetching online accounts:', error));
}

async function fetchUserData() {
    try {
        const account = await qortalRequest({ action: "GET_USER_ACCOUNT" });
        document.getElementById('user-info').style.display = 'block';
        document.getElementById('login-prompt').style.display = 'none';
        populateUserInfo(account);
        //fetchUserWallet(account.address);
    } catch (error) {
        console.error('Error fetching user data:', error);
        document.getElementById('user-info').style.display = 'block';
        document.getElementById('user-details').style.display = 'none';
        document.getElementById('login-prompt').style.display = 'block';
    }
}

async function populateUserInfo(account) {
    document.getElementById('user-address').textContent = account.address;
    document.getElementById('user-public-key').textContent = account.publicKey;

    fetch(`/names/address/${account.address}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const userName = data[0].name;
                document.getElementById('user-name').textContent = userName;
                //fetchUserAvatar(userName);
            }
        })
        .catch(error => console.error('Error fetching user name:', error));
}

function fetchUserAvatar(userName) {
    fetch(`/arbitrary/THUMBNAIL/${userName}/qortal_avatar`)
        .then(response => response.blob())
        .then(blob => {
            if (blob.size > 0) {
                const avatarUrl = URL.createObjectURL(blob);
                const avatarImg = document.getElementById('user-avatar');
                avatarImg.src = avatarUrl;
                avatarImg.style.display = 'block';
            }
        })
        .catch(error => console.error('Error fetching user avatar:', error));
}

async function fetchUserWallet(address) {
    const walletInfoDiv = document.getElementById('wallet-info');
    walletInfoDiv.innerHTML = ''; // Clear previous wallet info
    const coins = ["QORT", "ARRR", "BTC", "LTC", "DOGE", "DGB", "RVN"];

    coins.forEach(async coin => {
        try {
            const balance = await qortalRequest({ action: "GET_USER_WALLET", coin: coin });
            if (balance !== '0') {
                const p = document.createElement('p');
                p.textContent = `${coin} Balance: ${balance}`;
                walletInfoDiv.appendChild(p);
            }
        } catch (error) {
            console.error(`Error fetching ${coin} balance:`, error);
        }
    });
}
