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
    document.getElementById('block-time').textContent = 'Loading';
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

    const blocksUntilReduction1 = 1 - currentBlockHeight;
    const untilReduction1 = currentBlockTime * blocksUntilReduction1 * 1000;
    document.getElementById('until-reduction1').textContent = formatDuration(untilReduction1);
    const timestampReduction1 = currentTimestamp + untilReduction1;
    document.getElementById('timestamp-reduction1').textContent = timestampReduction1;
    const dateReduction1 = new Date(timestampReduction1).toLocaleString();
    document.getElementById('date-reduction1').textContent = dateReduction1;

    const blocksUntilReduction2 = 259201 - currentBlockHeight;
    const untilReduction2 = currentBlockTime * blocksUntilReduction2 * 1000;
    document.getElementById('until-reduction2').textContent = formatDuration(untilReduction2);
    const timestampReduction2 = currentTimestamp + untilReduction2;
    document.getElementById('timestamp-reduction2').textContent = timestampReduction2;
    const dateReduction2 = new Date(timestampReduction2).toLocaleString();
    document.getElementById('date-reduction2').textContent = dateReduction2;

    const blocksUntilReduction3 = 518401 - currentBlockHeight;
    const untilReduction3 = currentBlockTime * blocksUntilReduction3 * 1000;
    document.getElementById('until-reduction3').textContent = formatDuration(untilReduction3);
    const timestampReduction3 = currentTimestamp + untilReduction3;
    document.getElementById('timestamp-reduction3').textContent = timestampReduction3;
    const dateReduction3 = new Date(timestampReduction3).toLocaleString();
    document.getElementById('date-reduction3').textContent = dateReduction3;

    const blocksUntilReduction4 = 777601 - currentBlockHeight;
    const untilReduction4 = currentBlockTime * blocksUntilReduction4 * 1000;
    document.getElementById('until-reduction4').textContent = formatDuration(untilReduction4);
    const timestampReduction4 = currentTimestamp + untilReduction4;
    document.getElementById('timestamp-reduction4').textContent = timestampReduction4;
    const dateReduction4 = new Date(timestampReduction4).toLocaleString();
    document.getElementById('date-reduction4').textContent = dateReduction4;

    const blocksUntilReduction5 = 1036801 - currentBlockHeight;
    const untilReduction5 = currentBlockTime * blocksUntilReduction5 * 1000;
    document.getElementById('until-reduction5').textContent = formatDuration(untilReduction5);
    const timestampReduction5 = currentTimestamp + untilReduction5;
    document.getElementById('timestamp-reduction5').textContent = timestampReduction5;
    const dateReduction5 = new Date(timestampReduction5).toLocaleString();
    document.getElementById('date-reduction5').textContent = dateReduction5;

    const blocksUntilReduction6 = 1296001 - currentBlockHeight;
    const untilReduction6 = currentBlockTime * blocksUntilReduction6 * 1000;
    document.getElementById('until-reduction6').textContent = formatDuration(untilReduction6);
    const timestampReduction6 = currentTimestamp + untilReduction6;
    document.getElementById('timestamp-reduction6').textContent = timestampReduction6;
    const dateReduction6 = new Date(timestampReduction6).toLocaleString();
    document.getElementById('date-reduction6').textContent = dateReduction6;

    const blocksUntilReduction7 = 1555201 - currentBlockHeight;
    const untilReduction7 = currentBlockTime * blocksUntilReduction7 * 1000;
    document.getElementById('until-reduction7').textContent = formatDuration(untilReduction7);
    const timestampReduction7 = currentTimestamp + untilReduction7;
    document.getElementById('timestamp-reduction7').textContent = timestampReduction7;
    const dateReduction7 = new Date(timestampReduction7).toLocaleString();
    document.getElementById('date-reduction7').textContent = dateReduction7;

    const blocksUntilReduction8 = 1814401 - currentBlockHeight;
    const untilReduction8 = currentBlockTime * blocksUntilReduction8 * 1000;
    document.getElementById('until-reduction8').textContent = formatDuration(untilReduction8);
    const timestampReduction8 = currentTimestamp + untilReduction8;
    document.getElementById('timestamp-reduction8').textContent = timestampReduction8;
    const dateReduction8 = new Date(timestampReduction8).toLocaleString();
    document.getElementById('date-reduction8').textContent = dateReduction8;

    const blocksUntilReduction9 = 2073601 - currentBlockHeight;
    const untilReduction9 = currentBlockTime * blocksUntilReduction9 * 1000;
    document.getElementById('until-reduction9').textContent = formatDuration(untilReduction9);
    const timestampReduction9 = currentTimestamp + untilReduction9;
    document.getElementById('timestamp-reduction9').textContent = timestampReduction9;
    const dateReduction9 = new Date(timestampReduction9).toLocaleString();
    document.getElementById('date-reduction9').textContent = dateReduction9;

    const blocksUntilReduction10 = 2332801 - currentBlockHeight;
    const untilReduction10 = currentBlockTime * blocksUntilReduction10 * 1000;
    document.getElementById('until-reduction10').textContent = formatDuration(untilReduction10);
    const timestampReduction10 = currentTimestamp + untilReduction10;
    document.getElementById('timestamp-reduction10').textContent = timestampReduction10;
    const dateReduction10 = new Date(timestampReduction10).toLocaleString();
    document.getElementById('date-reduction10').textContent = dateReduction10;

    const blocksUntilReduction11 = 2592001 - currentBlockHeight;
    const untilReduction11 = currentBlockTime * blocksUntilReduction11 * 1000;
    document.getElementById('until-reduction11').textContent = formatDuration(untilReduction11);
    const timestampReduction11 = currentTimestamp + untilReduction11;
    document.getElementById('timestamp-reduction11').textContent = timestampReduction11;
    const dateReduction11 = new Date(timestampReduction11).toLocaleString();
    document.getElementById('date-reduction11').textContent = dateReduction11;

    const blocksUntilReduction12 = 2851201 - currentBlockHeight;
    const untilReduction12 = currentBlockTime * blocksUntilReduction12 * 1000;
    document.getElementById('until-reduction12').textContent = formatDuration(untilReduction12);
    const timestampReduction12 = currentTimestamp + untilReduction12;
    document.getElementById('timestamp-reduction12').textContent = timestampReduction12;
    const dateReduction12 = new Date(timestampReduction12).toLocaleString();
    document.getElementById('date-reduction12').textContent = dateReduction12;

    const blocksUntilReduction13 = 3110401 - currentBlockHeight;
    const untilReduction13 = currentBlockTime * blocksUntilReduction13 * 1000;
    document.getElementById('until-reduction13').textContent = formatDuration(untilReduction13);
    const timestampReduction13 = currentTimestamp + untilReduction13;
    document.getElementById('timestamp-reduction13').textContent = timestampReduction13;
    const dateReduction13 = new Date(timestampReduction13).toLocaleString();
    document.getElementById('date-reduction13').textContent = dateReduction13;

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
    
    const dateCancel =  new Date(1676986362069).toLocaleString();
    document.getElementById('date-cancel').textContent = dateCancel;
    const untilCancel = 1676986362069 - currentTimestamp;
    document.getElementById('until-cancel').textContent = formatDuration(untilCancel);
    
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
    
    const dateDisable1 =  new Date(1706745000000).toLocaleString();
    document.getElementById('date-disable1').textContent = dateDisable1;
    const untilDisable1 = 1706745000000 - currentTimestamp;
    document.getElementById('until-disable1').textContent = formatDuration(untilDisable1);

    const blocksUntilFix = 1589200 - currentBlockHeight;
    const untilFix = currentBlockTime * blocksUntilFix * 1000;
    document.getElementById('until-fix').textContent = formatDuration(untilFix);
    const timestampFix = currentTimestamp + untilFix;
    document.getElementById('timestamp-fix').textContent = timestampFix;
    const dateFix = new Date(timestampFix).toLocaleString();
    document.getElementById('date-fix').textContent = dateFix;

    const dateSnapshot2 =  new Date(1708360200000).toLocaleString();
    document.getElementById('date-snapshot2').textContent = dateSnapshot2;
    const untilSnapshot2 = 1708360200000 - currentTimestamp;
    document.getElementById('until-snapshot2').textContent = formatDuration(untilSnapshot2);
    
    const blocksUntilAlgo2 = 1611200 - currentBlockHeight;
    const untilAlgo2 = currentBlockTime * blocksUntilAlgo2 * 1000;
    document.getElementById('until-algo2').textContent = formatDuration(untilAlgo2);
    const timestampAlgo2 = currentTimestamp + untilAlgo2;
    document.getElementById('timestamp-algo2').textContent = timestampAlgo2;
    const dateAlgo2 = new Date(timestampAlgo2).toLocaleString();
    document.getElementById('date-algo2').textContent = dateAlgo2;

    const dateSnapshot3 =  new Date(1708432200000).toLocaleString();
    document.getElementById('date-snapshot3').textContent = dateSnapshot3;
    const untilSnapshot3 = 1708432200000 - currentTimestamp;
    document.getElementById('until-snapshot3').textContent = formatDuration(untilSnapshot3);
    
    const blocksUntilAlgo3 = 1612200 - currentBlockHeight;
    const untilAlgo3 = currentBlockTime * blocksUntilAlgo3 * 1000;
    document.getElementById('until-algo3').textContent = formatDuration(untilAlgo3);
    const timestampAlgo3 = currentTimestamp + untilAlgo3;
    document.getElementById('timestamp-algo3').textContent = timestampAlgo3;
    const dateAlgo3 = new Date(timestampAlgo3).toLocaleString();
    document.getElementById('date-algo3').textContent = dateAlgo3;

    const dateEnable1 =  new Date(1709251200000).toLocaleString();
    document.getElementById('date-enable1').textContent = dateEnable1;
    const untilEnable1 = 1709251200000 - currentTimestamp;
    document.getElementById('until-enable1').textContent = formatDuration(untilEnable1);
    
    const blocksUntilDisable2 = 1899100 - currentBlockHeight;
    const untilDisable2 = currentBlockTime * blocksUntilDisable2 * 1000;
    document.getElementById('until-disable2').textContent = formatDuration(untilDisable2);
    const timestampDisable2 = currentTimestamp + untilDisable2;
    document.getElementById('timestamp-disable2').textContent = timestampDisable2;
    const dateDisable2 = new Date(timestampDisable2).toLocaleString();
    document.getElementById('date-disable2').textContent = dateDisable2;
    
    const blocksUntilName1 = 1900300 - currentBlockHeight;
    const untilName1 = currentBlockTime * blocksUntilName1 * 1000;
    document.getElementById('until-name1').textContent = formatDuration(untilName1);
    const timestampName1 = currentTimestamp + untilName1;
    document.getElementById('timestamp-name1').textContent = timestampName1;
    const dateName1 = new Date(timestampName1).toLocaleString();
    document.getElementById('date-name1').textContent = dateName1;
    
    const blocksUntilGroup = 1902700 - currentBlockHeight;
    const untilGroup = currentBlockTime * blocksUntilGroup * 1000;
    document.getElementById('until-group').textContent = formatDuration(untilGroup);
    const timestampGroup = currentTimestamp + untilGroup;
    document.getElementById('timestamp-group').textContent = timestampGroup;
    const dateGroup = new Date(timestampGroup).toLocaleString();
    document.getElementById('date-group').textContent = dateGroup;
    
    const blocksUntilEnable2 = 1905100 - currentBlockHeight;
    const untilEnable2 = currentBlockTime * blocksUntilEnable2 * 1000;
    document.getElementById('until-enable2').textContent = formatDuration(untilEnable2);
    const timestampEnable2 = currentTimestamp + untilEnable2;
    document.getElementById('timestamp-enable2').textContent = timestampEnable2;
    const dateEnable2 = new Date(timestampEnable2).toLocaleString();
    document.getElementById('date-enable2').textContent = dateEnable2;

    const dateDecrease =  new Date(1731958200000).toLocaleString();
    document.getElementById('date-decrease').textContent = dateDecrease;
    const untilDecrease = 1731958200000 - currentTimestamp;
    document.getElementById('until-decrease').textContent = formatDuration(untilDecrease);
    
    const blocksUntilName2 = 1935500 - currentBlockHeight;
    const untilName2 = currentBlockTime * blocksUntilName2 * 1000;
    document.getElementById('until-name2').textContent = formatDuration(untilName2);
    const timestampName2 = currentTimestamp + untilName2;
    document.getElementById('timestamp-name2').textContent = timestampName2;
    const dateName2 = new Date(timestampName2).toLocaleString();
    document.getElementById('date-name2').textContent = dateName2;
    
    const blocksUntilBatchFix = 1945900 - currentBlockHeight;
    const untilBatchFix = currentBlockTime * blocksUntilBatchFix * 1000;
    document.getElementById('until-batchfix').textContent = formatDuration(untilBatchFix);
    const timestampBatchFix = currentTimestamp + untilBatchFix;
    document.getElementById('timestamp-batchfix').textContent = timestampBatchFix;
    const dateBatchFix = new Date(timestampBatchFix).toLocaleString();
    document.getElementById('date-batchfix').textContent = dateBatchFix;
    
    const blocksUntilReplace = 9999999 - currentBlockHeight;
    const untilReplace = currentBlockTime * blocksUntilReplace * 1000;
    document.getElementById('until-replace').textContent = formatDuration(untilReplace);
    const timestampReplace = currentTimestamp + untilReplace;
    document.getElementById('timestamp-replace').textContent = timestampReplace;
    const dateReplace = new Date(timestampReplace).toLocaleString();
    document.getElementById('date-replace').textContent = dateReplace;
    
    const blocksUntilNull = 9999999 - currentBlockHeight;
    const untilNull = currentBlockTime * blocksUntilNull * 1000;
    document.getElementById('until-null').textContent = formatDuration(untilNull);
    const timestampNull = currentTimestamp + untilNull;
    document.getElementById('timestamp-null').textContent = timestampNull;
    const dateNull = new Date(timestampNull).toLocaleString();
    document.getElementById('date-null').textContent = dateNull;
    
    const blocksUntilIgnore = 9999999 - currentBlockHeight;
    const untilIgnore = currentBlockTime * blocksUntilIgnore * 1000;
    document.getElementById('until-ignore').textContent = formatDuration(untilIgnore);
    const timestampIgnore = currentTimestamp + untilIgnore;
    document.getElementById('timestamp-ignore').textContent = timestampIgnore;
    const dateIgnore = new Date(timestampIgnore).toLocaleString();
    document.getElementById('date-ignore').textContent = dateIgnore;
    
    const blocksUntilQueryFix = 9999999 - currentBlockHeight;
    const untilQueryFix = currentBlockTime * blocksUntilQueryFix * 1000;
    document.getElementById('until-queryfix').textContent = formatDuration(untilQueryFix);
    const timestampQueryFix = currentTimestamp + untilQueryFix;
    document.getElementById('timestamp-queryfix').textContent = timestampQueryFix;
    const dateQueryFix = new Date(timestampQueryFix).toLocaleString();
    document.getElementById('date-queryfix').textContent = dateQueryFix;
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
