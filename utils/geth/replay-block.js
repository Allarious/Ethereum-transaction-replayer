const fetchBlock = require("../etherscan/extract-etherscan-block");
const replayTransaction = require("./replay-transaction");

debug = false

async function replayBlock(blockNumber, verbose = false, onlyIfFailed = false, includeAllFailed = false){
    arrayOfBlocksTransactions = await fetchBlock(blockNumber, verbose)
    if(debug)
        console.log(arrayOfBlocksTransactions)
    results = []
    index = 0
    for (const tx of arrayOfBlocksTransactions) {
        index += 1;
        let resultOfTransactionReplay = await replayTransaction(tx, onlyIfFailed, includeAllFailed)
        if(resultOfTransactionReplay){
            results.push(resultOfTransactionReplay)
            if(verbose)
                console.log(resultOfTransactionReplay)
        }
        if(verbose)
            console.log(index)
    }
    return results
}

async function replayRecentBlocks(blockNumber, verbose, onlyIfFailed, includeAllFailed) {
    // For fast mode, onlyIfFailed: true, includeAllFailed: false
    for(let i = 0; i<10; i++){
        await replayBlock(blockNumber + i, verbose, onlyIfFailed, includeAllFailed);
    }
}

module.exports = replayBlock