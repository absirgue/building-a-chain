const crypto = require("crypto"); SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");

/*
    The Block holds data as well as metadata such has the timestamp
    when it was created, the hash of the previous hash, its hash, and its nonce.
    The nonce is calculates when minting, it is the value that allows the hash
    to feat a certain standard dependent on the PoW problem's difficulty.
*/
class Block {

    /*
        Build a block, all parameters are default for now except timestamp and data.

        @param the block's timestamp.
        @param the block's data.
    */
    constructor(timestamp = "", data = []) {
        this.timestamp = timestamp;
        this.data = data;
        this.hash = Block.getHash(this);
        this.prevHash = "";
        this.nonce = 0;
    }

    /*
        Calculate the hash of a block. The hash is the calculated by applying the 
        sha256 hash function to a string made of the hash of the prevHash 
        (essential to the blockchain's security), the block's timestamp, the block's data,
        and the block's nonce.
    */
    static getHash(block) {
        return SHA256(block.prevHash + block.timestamp + JSON.stringify(block.data) + block.nonce);
    }

    /*
        Solve the PoW problem of a certain difficulty.
        This is done by increasing the block's nonce by 1 until
        the calculated hash starts by a given number of zeros defined by the 
        difficulty.

        @param the difficulty of the problem to solve in order to mine this block.
    */
    mine(difficulty) {
        while(!this.hash.startsWith(Array(difficulty + 1).join("0"))) {
            this.nonce++;
            this.hash = Block.getHash(this);
        }
    }

    /*
        Check the validity of transactions in a block, also depending on the
        chain the block is added to. For transactions to be valid,
        they have to all be indepently valid, only one transaction is allowed
        to be sent by the minting address, and the reward for the chain must be equal
        to the reward for the block minus the gas fee for this transaction. 

        @param the chain the block is being added to.
    */
    static hasValidTransactions(block, chain) {
        let gas = 0, reward = 0;

        block.data.forEach(transaction => {
            if (transaction.from !== MINT_PUBLIC_ADDRESS) {
                gas += transaction.gas;
            } else {
                reward = transaction.amount;
            }
        });

        return (
            reward - gas === chain.reward &&
            block.data.every(transaction => transaction.isValid(transaction, chain)) && 
            block.data.filter(transaction => transaction.from === MINT_PUBLIC_ADDRESS).length === 1
        );
    }
}

module.exports = Block;