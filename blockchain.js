const EC = require("elliptic").ec, ec = new EC("secp256k1");
const Transaction = require("./transaction");
const Block = require("./block");

// Key pair used for minting, defined as such to be the same across classes.
const MINT_PRIVATE_ADDRESS = "aebc585c4f06497106e373d862d11e5cb75d4a9c8e4dbe88e6dca24629572282";
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, "hex");
const MINT_PUBLIC_KEY = MINT_KEY_PAIR.getPublic("hex");

// Public address of the key pair used for minting.
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex");
// Key pair of the account holding the intial currency release.
const HOLDER_KEY_PAIR = ec.genKeyPair();

/*
    The Blockchain class handles our chain of blocks, it can add new blocks to it
    and check its validity. It also implements a transaction pool for miners to include
    transactions in the block they are mining. The miner receives a given reward plus the
    entirety of the gas fees of the various transactions he/she includes in the block.
    
    This chain implements a Proof of Work mechanism, the difficulty of the PoW problem
    evolves so that the time to mine a block best matches a defined block time.
*/
class Blockchain {

    /*
    Build a blockchain by making its first transaction, the initial coin release,
    initializing its block array with a genesis block, and defining is parameters.
    */
    constructor() {
        const initalCoinRelease = new Transaction(MINT_PUBLIC_ADDRESS, HOLDER_KEY_PAIR.getPublic("hex"), 100000);
        this.chain = [new Block(Date.now().toString(), [initalCoinRelease])];
        this.difficulty = 1;
        this.blockTime = 30000;
        this.transactions = [];
        this.reward = 297;
    }

    /*
        @return The chain's last block.
    */
    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }

    /*
        Note: this method may seem a bit unefficient but implementing it with a map is, as
        appealing as it seems, not a good thing possible as it completely puts into question 
        the all idea of a blockchain.

        @param an account's address, the address being the public key of that account.
        @return this account's balance by going through all the blocks present in the chain and
        all the transactions they include to calculate the amount of currency held by the account.
    */
    getBalance(address) {
        let balance = 0;

        this.chain.forEach(block => {
            block.data.forEach(transaction => {
                if (transaction.from === address) {
                    balance -= transaction.amount;
                    balance -= transaction.gas
                }

                if (transaction.to === address) {
                    balance += transaction.amount;
                }
            })
        });

        return balance;
    }

    /*
        Add a block to the chain. This block is passed the hash of the last block mined
        and is mined before being added to the chain. The PoW's problem difficulty is then 
        adjusted using a very basic formula.

        @param the block to add.
    */
    addBlock(block) {
        block.prevHash = this.getLastBlock().hash;
        block.hash = Block.getHash(block);

        block.mine(this.difficulty);
        this.chain.push(block);

        this.difficulty += Date.now() - parseInt(this.getLastBlock().timestamp) < this.blockTime ? 1 : -1;
    }

    /*
        Add a transaction to the transaction pool if it is valid.

        @param the transaction to add.
    */
    addTransaction(transaction) {
        if (Transaction.isValid(transaction, this)) {
            this.transactions.push(transaction);
        }
    }

    /*
        Mine transactions by adding them to a block before adding this block to the chain.
        The miner is rewarded and this transaction is also included in the created block.
        The money for the reward is minted using the minting account (the only account able 
        to mint).

        @param the miner's address.
    */
    mineTransactions(minerAddress) {
        let gas = 0;

        this.transactions.forEach(transaction => {
            gas += transaction.gas;
        });

        const rewardTransaction = new Transaction(MINT_PUBLIC_ADDRESS, minerAddress, this.reward + gas);
        rewardTransaction.sign(MINT_KEY_PAIR);

        // Prevent people from minting coins and mine the minting transaction.
        if (this.transactions.length !== 0) this.addBlock(new Block(Date.now().toString(), [rewardTransaction, ...this.transactions]));

        this.transactions = [];
    }

    /*
        Check if the chain is valid. For a chain to be valid, the prevHash
        of one block must be equal to the hash of the previous block, the 
        block's hash must be equivalent to the hash obtained by calculating 
        this hash with the block's parameters, and the block must only have 
        valid transactions. This is checked for every block of the chain

        @param the Blockchain object to be tested, this by default.
    */
    static isValid(blockchain) {
        for (let i = 1; i < blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i];
            const prevBlock = blockchain.chain[i-1];

            if (
                currentBlock.hash !== Block.getHash(currentBlock) || 
                prevBlock.hash !== currentBlock.prevHash || 
                !Block.hasValidTransactions(currentBlock, blockchain)
            ) {
                return false;
            }
        }
        return true;
    }
}

console.log(HOLDER_KEY_PAIR.getPrivate("hex"));

const ourChain = new Blockchain();

module.exports = {Blockchain, ourChain};