document.addEventListener('DOMContentLoaded', function() {
    initApplication();
    initHomePage();
});

function initApplication() {
    let localTesting = false;
    // Disable before release
    //localTesting = true; // Disable before release
    // Disable before release

    document.getElementById('home-page').style.display = 'block';
    document.getElementById('menu-home').classList.add('active-menu');
    document.getElementById('menu-button').addEventListener('mouseover', showOverlay);
    document.getElementById('main-content').addEventListener('mouseover', hideOverlay);
    if ((typeof qortalRequest === 'function') || localTesting === true) {
        document.getElementById('login-button').addEventListener('click', getUserAccount);
    } else {
        document.getElementById('login-button').innerHTML =
        `<a href='https://qortal.dev' target='blank'>Download</a>`;
    }
    getNodeStatus();
    getNodeInfo();

    if (localTesting === true) {
        document.getElementById('node-status').textContent = '- Testing';
    }
}

function getNodeStatus() {
    fetch('/admin/status')
    .then(response => response.json())
    .then(status => {
        let nodeStatus = document.getElementById('node-status')
        nodeStatus.textContent =
            `${typeof qortalRequest !== 'function'?'Gateway: ':'Core: '}`;
        if (status.isSynchronizing === false && status.syncPercent == 100) {
            nodeStatus.textContent += `${status.isMintingPossible?'Minting':'Synced'}`;
        } else if (status.isSynchronizing === true) {
            nodeStatus.textContent += 'Syncing';
        }
        document.getElementById('node-height').textContent = `Height: ${status.height}`;
        document.getElementById('node-peers').textContent =
            `Peers: ${status.numberOfConnections}`;
    })
    .catch(error => console.error('Error getting node status:', error));
}

function getNodeInfo() {
    fetch('/admin/info')
    .then(response => response.json())
    .then(info => {
        document.getElementById('node-version').textContent = 
        `Version: ${info.buildVersion.slice(7, info.buildVersion.indexOf("-", 7))}`;
    })
    .catch(error => console.error('Error getting node info:', error));
}

/* qortalRequest Functions */
//
async function getUserAccount() {
    let userStatus = document.getElementById('user-status');
    let userAddress = document.getElementById('user-address');
    let userBlocks = document.getElementById('user-blocks');
    let userQort = document.getElementById('user-qort');
    let loginButton = document.getElementById('login-button');
    if (userStatus.textContent !== 'Not Logged In') {
        userAddress.textContent = '';
        userBlocks.textContent = '';
        userQort.textContent = '';
        userStatus.textContent = 'Not Logged In';
        loginButton.textContent = 'Login';
        return;
    }
    try {
        let accountResponse = await qortalRequest({
            action: "GET_USER_ACCOUNT",
        });
        let addressResponse = accountResponse.address;
        userAddress.textContent = shortString(addressResponse);
        loginButton.textContent = 'Logout';
        userStatus.textContent = 'Loading...';
        userBlocks.textContent = 'Loading...';
        userQort.textContent = 'Loading...';
        let nameResponse = await qortalRequest({
            action: "GET_ACCOUNT_NAMES",
            address: addressResponse,
        });
        if (nameResponse[0].owner == addressResponse) {
            userStatus.textContent = nameResponse[0].name;
        } else {
            userStatus.textContent = 'No Registered Name';
        }
        let blocksResponse = await qortalRequest({
            action: "GET_ACCOUNT_DATA",
            address: addressResponse,
        });
        userBlocks.textContent = `Level ${blocksResponse.level}${blocksResponse.flags?'F':''}: ${blocksResponse.blocksMinted+blocksResponse.blocksMintedAdjustment+blocksResponse.blocksMintedPenalty}`;
        let qortResponse = await qortalRequest({
            action: "GET_BALANCE",
            address: addressResponse,
        });
        userQort.textContent = `${qortResponse.toFixed(4)} QORT`
    } catch(e) {
        console.log("Error: " + e);
    }
}

    /*const response = await qortalRequest({
        action: "GET_ACCOUNT_DATA",
        address: "QZLJV7wbaFyxaoZQsjm6rb9MWMiDzWsqM2"
    });*/

/*
const summary = await qortalRequest({
  action: "GET_DAY_SUMMARY"
});*/
//
/* END qortalRequest Functions */

/* API call Functions */
//
// admin/info
/*{
  "currentTimestamp": 1706909435115,
  "uptime": 274003583,
  "buildVersion": "qortal-4.5.0-070f14b",
  "buildTimestamp": 1706632714,
  "nodeId": "Nffn6tDp5SSMCaRnGhPAejqfkzV7hFVPDC",
  "isTestNet": false,
  "type": "full"
}*/
//
// admin/summary
/*{
  "blockCount": 1175,
  "assetsIssued": 0,
  "namesRegistered": 5,
  "transactionCountByType": {
    "PAYMENT": 44,
    "REGISTER_NAME": 5,
    "ARBITRARY": 176,
    "DEPLOY_AT": 64,
    "MESSAGE": 53,
    "AT": 53,
    "CREATE_GROUP": 1,
    "JOIN_GROUP": 6,
    "REWARD_SHARE": 70
  },
  "totalTransactionCount": 472
}*/
/*
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
*/

function showSection(sectionId) {
    var sections = document.querySelectorAll('.content-section');
    sections.forEach(function(section) {
        section.style.display = 'none';
    });
    var menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(function(menuItem) {
        menuItem.classList.remove('active-menu');
    });
    document.getElementById(`${sectionId}-page`).style.display = 'block';
    document.getElementById(`menu-${sectionId}`).classList.add('active-menu');
    switch (sectionId) {
        case 'home':
            initHomePage();
            break;
        case 'blocks':
            initBlocksPage();
            break;
        case 'txs':
            initTxsPage();
            break;
        case 'trades':
            initTradesPage();
            break;
        case 'accounts':
            initAccountsPage();
            break;
        case 'apps':
            initAppsPage();
            break;
        case 'websites':
            initWebsitesPage();
            break;
        case 'polls':
            initPollsPage();
            break;
    }
}

function initHomePage() {
}
function initBlocksPage() {
}
function initTxsPage() {
}
function initTradesPage() {
}
function initAccountsPage() {
}
function initAppsPage() {
}
function initWebsitesPage() {
}
function initPollsPage() {
}

function toggleSidebar() {
    //TODO:  if mobile screen, don't shift.
    var sidebar = document.getElementById('sidebar');
    var mainContent = document.getElementById('main-content');
    if (mainContent.classList.contains('main-shift')) {
        sidebar.style.width = '0';
        mainContent.classList.remove('main-shift');
    } else {
        sidebar.style.width = '200px';
        mainContent.classList.add('main-shift');
    }
}

function showOverlay() {
    document.getElementById('sidebar').style.width = '200px';
}

function hideOverlay() {
    var sidebar = document.getElementById('sidebar');
    var mainContent = document.getElementById('main-content');
    if (mainContent.classList.contains('main-shift')) {
        sidebar.style.width = '200px';
    } else {
        sidebar.style.width = '0';
    }
}

function shortString(string) {
    return `${string.slice(0,4)}...${string.slice(-4)}`;
}