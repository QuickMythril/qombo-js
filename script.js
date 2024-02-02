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
    if (localTesting === true) {
        document.getElementById('node-status').textContent = '- Testing';
    }
}

/* qortalRequest Functions */
async function getUserAccount() {
    try {
        let res = await qortalRequest({
            action: "GET_USER_ACCOUNT",
        });
        // res.address
        // res.publicKey
        console.log(res);
    } catch(e) {
        console.log("Error: " + e);
    }
}
/* END qortalRequest Functions */

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
