document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('home-page').style.display = 'block';
    initHomePage();
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
        case 'test-page':
            initTestPage();
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
