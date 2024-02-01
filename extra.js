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
    const currentBlockHeight = parseInt(document.getElementById('block-height').textContent);
    const currentBlockTime = parseFloat(document.getElementById('block-time').textContent);

    const heightReward = Math.ceil(currentBlockHeight / 1000) * 1000
    const blocksUntilReward = heightReward - currentBlockHeight;
    document.getElementById('height-reward').textContent =
        `Next Reward = ${heightReward} (in ${blocksUntilReward} block${blocksUntilReward==1?'':'s'})`;
    const untilReward = currentBlockTime * blocksUntilReward * 1000;
    document.getElementById('until-reward').textContent = formatDuration(untilReward);
    const timestampReward = currentTimestamp + untilReward;
    document.getElementById('timestamp-reward').textContent = timestampReward;
    const dateReward = new Date(timestampReward).toLocaleString();
    document.getElementById('date-reward').textContent = dateReward;

    const dateGenesis =  new Date(1593450000000).toLocaleString();
    document.getElementById('date-genesis').textContent = dateGenesis;
    const untilGenesis = 1593450000000 - currentTimestamp;
    document.getElementById('until-genesis').textContent = formatDuration(untilGenesis);
    
    const dateNameFee1 =  new Date(1645372800000).toLocaleString();
    document.getElementById('date-name-fee1').textContent = dateNameFee1;
    const untilNameFee1 = 1645372800000 - currentTimestamp;
    document.getElementById('until-name-fee1').textContent = formatDuration(untilNameFee1);
    
    const dateNameFee2 =  new Date(1651420800000).toLocaleString();
    document.getElementById('date-name-fee2').textContent = dateNameFee2;
    const untilNameFee2 = 1651420800000 - currentTimestamp;
    document.getElementById('until-name-fee2').textContent = formatDuration(untilNameFee2);
    
    const dateRewardShares1 =  new Date(1657382400000).toLocaleString();
    document.getElementById('date-reward-shares1').textContent = dateRewardShares1;
    const untilRewardShares1 = 1657382400000 - currentTimestamp;
    document.getElementById('until-reward-shares1').textContent = formatDuration(untilRewardShares1);
    
    const dateSnapshot1 =  new Date(1670230000000).toLocaleString();
    document.getElementById('date-snapshot1').textContent = dateSnapshot1;
    const untilSnapshot1 = 1670230000000 - currentTimestamp;
    document.getElementById('until-snapshot1').textContent = formatDuration(untilSnapshot1);
    
    const blocksUntilAlgo1 = 1092400 - currentBlockHeight;
    const untilAlgo1 = currentBlockTime * blocksUntilAlgo1 * 1000;
    document.getElementById('until-algo1').textContent = formatDuration(untilAlgo1);
    const timestampAlgo1 = currentTimestamp + untilAlgo1;
    document.getElementById('timestamp-algo1').textContent = timestampAlgo1;
    const dateAlgo1 = new Date(timestampAlgo1).toLocaleString();
    document.getElementById('date-algo1').textContent = dateAlgo1;
    
    const dateUnitFee =  new Date(1692118800000).toLocaleString();
    document.getElementById('date-unit-fee').textContent = dateUnitFee;
    const untilUnitFee = 1692118800000 - currentTimestamp;
    document.getElementById('until-unit-fee').textContent = formatDuration(untilUnitFee);
    
    const dateRewardShares2 =  new Date(1698508800000).toLocaleString();
    document.getElementById('date-reward-shares2').textContent = dateRewardShares2;
    const untilRewardShares2 = 1698508800000 - currentTimestamp;
    document.getElementById('until-reward-shares2').textContent = formatDuration(untilRewardShares2);
    
    const blocksUntilBatch = 1508000 - currentBlockHeight;
    const untilBatch = currentBlockTime * blocksUntilBatch * 1000;
    document.getElementById('until-batch').textContent = formatDuration(untilBatch);
    const timestampBatch = currentTimestamp + untilBatch;
    document.getElementById('timestamp-batch').textContent = timestampBatch;
    const dateBatch = new Date(timestampBatch).toLocaleString();
    document.getElementById('date-batch').textContent = dateBatch;
    
    const dateDisable =  new Date(1706745000000).toLocaleString();
    document.getElementById('date-disable').textContent = dateDisable;
    const untilDisable = 1706745000000 - currentTimestamp;
    document.getElementById('until-disable').textContent = formatDuration(untilDisable);

    const dateSnapshot =  new Date(1706745600000).toLocaleString();
    document.getElementById('date-snapshot2').textContent = dateSnapshot;
    const untilSnapshot = 1706745600000 - currentTimestamp;
    document.getElementById('until-snapshot2').textContent = formatDuration(untilSnapshot);

    const blocksUntilFix = 1589200 - currentBlockHeight;
    const untilFix = currentBlockTime * blocksUntilFix * 1000;
    document.getElementById('until-fix').textContent = formatDuration(untilFix);
    const timestampFix = currentTimestamp + untilFix;
    document.getElementById('timestamp-fix').textContent = timestampFix;
    const dateFix = new Date(timestampFix).toLocaleString();
    document.getElementById('date-fix').textContent = dateFix;

    const dateEnable =  new Date(1709251200000).toLocaleString();
    document.getElementById('date-enable').textContent = dateEnable;
    const untilEnable = 1709251200000 - currentTimestamp;
    document.getElementById('until-enable').textContent = formatDuration(untilEnable);
    
    const blocksUntilAlgo2 = 9999999 - currentBlockHeight;
    const untilAlgo2 = currentBlockTime * blocksUntilAlgo2 * 1000;
    document.getElementById('until-algo2').textContent = formatDuration(untilAlgo2);
    const timestampAlgo2 = currentTimestamp + untilAlgo2;
    document.getElementById('timestamp-algo2').textContent = timestampAlgo2;
    const dateAlgo2 = new Date(timestampAlgo2).toLocaleString();
    document.getElementById('date-algo2').textContent = dateAlgo2;
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
    const days = Math.floor(duration / (1000 * 60 * 60 * 24) % 30.4375);
    const months = Math.floor(duration / (1000 * 60 * 60 * 24 * 30.4375) % 12);
    const years = Math.floor(duration / (1000 * 60 * 60 * 24 * 30.4375 * 12));
    let readableFormat = '';
    if (years > 0) {
        readableFormat += `${years} year${years>1?'s':''}${months>0?', ':''}`;
    }
    if (months > 0) {
        readableFormat += `${months} month${months>1?'s':''}${years<1&&days>0?', ':''}`;
    }
    if ((days > 0) && (years < 1)) {
        readableFormat += `${days} day${days>1?'s':''}${months<1&&hours>0?', ':''}`;
    }
    if ((hours > 0) && (months+years < 1)) {
        readableFormat += `${hours} hour${hours>1?'s':''}${days<1&&minutes>0?', ':''}`;
    }
    if ((minutes > 0) && (days+months+years < 1)) {
        readableFormat += `${minutes} minute${minutes>1?'s':''}${hours<1&&seconds>0?', ':''}`;
    }
    if ((seconds > 0) && (hours+days+months+years < 1)) {
        readableFormat += `${seconds} second${seconds>1?'s':''} `;
    }
    readableFormat = `${negative?'':'in '}${readableFormat}${negative?' ago': ''}`;
    return readableFormat.trim();
}
