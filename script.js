document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('home-page').style.display = 'block';
    document.getElementById('menu-toggle').addEventListener('mouseover', showOverlay);
    document.getElementById('main-content').addEventListener('mouseover', hideOverlay);
    initHomePage();
    closeSidebar();
});

function showSection(sectionId) {
    var sections = document.querySelectorAll('.content-section');
    sections.forEach(function(section) {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    switch (sectionId) {
        case 'home-page':
            initHomePage();
            break;
        case 'txs-page':
            initBlocksPage();
            break;
        case 'txs-page':
            initTxsPage();
            break;
        case 'trades-page':
            initTradesPage();
            break;
        case 'accounts-page':
            initAccountsPage();
            break;
        case 'apps-page':
            initAppsPage();
            break;
        case 'websites-page':
            initWebsitesPage();
            break;
        case 'polls-page':
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
    var sidebar = document.getElementById('sidebar');
    var mainContent = document.getElementById('main-content');
    if (mainContent.classList.contains('main-shift')) {
        sidebar.style.width = '0';
        mainContent.classList.remove('main-shift');
    } else {
        mainContent.classList.add('main-shift');
    }
}

function showOverlay() {
    document.getElementById('sidebar').style.width = '250px';
}

function hideOverlay() {
    var sidebar = document.getElementById('sidebar');
    var mainContent = document.getElementById('main-content');
    if (mainContent.classList.contains('main-shift')) {
        sidebar.style.width = '250px';
    } else {
        sidebar.style.width = '0';
    }
}
