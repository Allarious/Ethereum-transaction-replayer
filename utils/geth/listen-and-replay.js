const replayBlock = require("./replay-block");
const sendPostAndRetry = require('../general/sendPostAndRetry')
const delay = require("../general/delay");
const getBlockNumber = require("./eth-utils/get-latest-block-number")
const getBlock = require("./eth-utils/extract-geth-block")

const serverAddress = 'http://localhost:3000'

//TODO: Mode can be better
async function listenForLatestBlockAndReplay(mode = 2, verbose = false){

    let blockNumber = 0;
    let previousBlockNumber = 0;

    loop: while(true){
        if(verbose)
            console.log("Looking for a new block...")

        blockNumber = await getBlockNumber() //Get the latest block's number from geth

        if(verbose)
            console.log("The most recent block is " + blockNumber)

        blockNumber = blockNumber - 30; //To make sure the block is confirmed

        if(verbose)
            console.log("looking at block " + blockNumber + " considering it confirmed.")

        if(verbose)
            console.log("Latest block number is (after subtracting the amount) " + blockNumber)

        if(blockNumber === previousBlockNumber){
            await handleBlockRepetition(true);
            continue loop;
        }

        if(verbose)
            console.log("fetching block " + blockNumber + "'s data.")
        // We are getting block data two times in the whole process (once fetchBlock and once here), is that ok?
        let blockData = await getBlock(blockNumber)

        if(verbose)
            console.log("Replaying Block " + blockNumber);

        let {onlyIfFailed, includeAllFailed} = handleMode(mode);

        if(debug) {
            console.log("onlyIfFailed:" + onlyIfFailed)
            console.log("includeAllFailed" + includeAllFailed)
            console.log("before replay block: blockNumber " + blockNumber + " verbose " + verbose + " onlyIfFailed " + onlyIfFailed + " includeAllFailed " + includeAllFailed)
        }

        let transactions = await replayBlock(blockNumber, verbose, onlyIfFailed, includeAllFailed);

        if(verbose) {
            console.log("Result of replaying:")
            console.log(transactions)
        }

        await postDataToServer(blockData, transactions)

        previousBlockNumber = blockNumber;
    }
}

async function postDataToServer(blockData, transactions, verbose = false){
    if(verbose) {
        console.log('sending block to db:')
        console.log(blockData)
    }
    await sendPostAndRetry(serverAddress + '/blocks', blockData);
    for (const transaction of transactions) {
        if(verbose) {
            console.log("sending transaction to db:")
            console.log(transaction)
        }
        await sendPostAndRetry(serverAddress + '/transactions', transaction);
    }
}

async function handleBlockRepetition(verbose = false){
    if(verbose) {
        console.log("Block has been processed before!")
        console.log("Sleeping for 10 seconds.");
    }
    await delay(10000);
    if(verbose)
        console.log("sleep is over! I'm awake 8-)")
}

function handleMode(mode) {
    let onlyIfFailed;
    let includeAllFailed;
    // onlyIfFailed: true, includeAllFailed: false -> 0 fastest, if failed transactions are ran true in simulation
    // onlyIfFailed: true, includeAllFailed: true -> 1 second fastest, all failed transactions, and simulate them
    // onlyIfFailed: false, includeAllFailed: false -> 2 third fastest, default most convenient! Anything that is not the same result in the simulation
    // onlyIfFailed: false, includeAllFailed: true -> 3 slowest, simulation differs or is failed on chain
    //Not great to have a switch statement!
    switch(mode) {
        case 0:
            onlyIfFailed = true;
            includeAllFailed = false;
            break;
        case 1:
            onlyIfFailed = true;
            includeAllFailed = true;
            break;
        case 2:
            onlyIfFailed = false;
            includeAllFailed = false;
            break;
        case 3:
            onlyIfFailed = false;
            includeAllFailed = true;
            break;
        default:
            onlyIfFailed = false;
            includeAllFailed = false;
    }

    return {
        onlyIfFailed,
        includeAllFailed
    }
}

module.exports = listenForLatestBlockAndReplay