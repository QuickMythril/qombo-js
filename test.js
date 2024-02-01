document.addEventListener('DOMContentLoaded', function() {
    fetchDailyBlocks()
        .then(() => {
            calculateFeatures();
        })
        .catch(error => {
            console.error('An error occurred in the fetch chain:', error);
        });
});

function fetchDailyBlocks() {
    document.getElementById('block-time').textContent = 'Loading...';
    return fetch('/blocks/height')
        .then(response => response.text())
        .then(currentBlockHeight => {
            document.getElementById('block-height').textContent = currentBlockHeight;
            return currentBlockHeight;
        })
        .then(currentBlockHeight => {
            currentBlockHeight = parseInt(currentBlockHeight);
            return fetch('/utils/timestamp')
                .then(response => response.text())
                .then(currentTimestamp => {
                    document.getElementById('current-timestamp').textContent = currentTimestamp;
                    const oneDayAgoTimestamp = parseInt(currentTimestamp) - (24 * 60 * 60 * 1000);
                    return fetch('/blocks/timestamp/' + oneDayAgoTimestamp)
                        .then(response => response.json())
                        .then(data => {
                            const oneDayAgoBlockHeight = data.height;
                            const blocksInPastDay = currentBlockHeight - oneDayAgoBlockHeight;
                            const blockTime = (24*60*60/blocksInPastDay).toFixed(2);
                            document.getElementById('block-time').textContent = blockTime;
                            document.getElementById('blocks-past-day').textContent = blocksInPastDay;
                            return blocksInPastDay;
                        });
                });
        })
        .catch(error => {
            console.error('Error in fetchDailyBlocks:', error);
        });
}

function calculateFeatures() {
    const currentTimestamp = Date.now();

    const dateDisable =  new Date(1706745000000).toLocaleString();
    document.getElementById('date-disable').textContent = dateDisable;
    const untilDisable = 1706745000000 - currentTimestamp;
    document.getElementById('until-disable').textContent = formatDuration(untilDisable);

    const dateSnapshot =  new Date(1706745600000).toLocaleString();
    document.getElementById('date-snapshot').textContent = dateSnapshot;
    const untilSnapshot = 1706745600000 - currentTimestamp;
    document.getElementById('until-snapshot').textContent = formatDuration(untilSnapshot);

    const dateEnable =  new Date(1709251200000).toLocaleString();
    document.getElementById('date-enable').textContent = dateEnable;
    const untilEnable = 1709251200000 - currentTimestamp;
    document.getElementById('until-enable').textContent = formatDuration(untilEnable);
    
    const currentBlockHeight = parseInt(document.getElementById('block-height').textContent);
    const currentBlockTime = parseFloat(document.getElementById('block-time').textContent);
    const blocksUntilFix = 1589200 - currentBlockHeight;

    const untilFix = currentBlockTime * blocksUntilFix * 1000;
    document.getElementById('until-fix').textContent = formatDuration(untilFix);
    const timestampFix = currentTimestamp + untilFix;
    document.getElementById('timestamp-fix').textContent = timestampFix;
    const dateFix = new Date(timestampFix).toLocaleString();
    document.getElementById('date-fix').textContent = dateFix;
}

function formatDuration(duration) {
    let negative = false;
    if (duration < 0) {
        negative = true;
        duration = duration * -1;
    }
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    let readableFormat = '';
    if (days > 0) {
        readableFormat += `${days} day${days>1?'s':''}${hours>0?', ':''}`;
    }
    if (hours > 0) {
        readableFormat += `${hours} hour${hours>1?'s':''}${days<1&&minutes>0?', ':''}`;
    }
    if ((minutes > 0) && (days < 1)) {
        readableFormat += `${minutes} minute${minutes>1?'s':''}${hours<1&&seconds>0?', ':''}`;
    }
    if ((seconds > 0) && (hours < 1)) {
        readableFormat += `${seconds} second${seconds>1?'s':''} `;
    }
    readableFormat = `${negative?'':'in '}${readableFormat}${negative?' ago': ''}`;
    return readableFormat.trim();
}
