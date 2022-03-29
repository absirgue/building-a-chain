const EC = require("elliptic").ec, ec = new EC("secp256k1");

/*
    Define transactions, a transactions is determined by the addres
    it is sent from, the address it is sent to, the amount sent, the
    gas fee paid to process this transaction, and a signature. 
    This class also takes care of signing the transactions using an elliptic curve algorithm.

    @param the difficulty of the problem to solve in order to mine this block.
*/
class Transaction {

    /*
        Create a transaction with given parameters. 
        Gas is set to 0 by default because we want it to be optional.

        @param the account transaction is sent from.
        @param the account the transaction is sent to.
        @param the amount sent.
        @param the gas fee paid.
    */
    constructor(from, to, amount, gas = 0) {
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.gas = gas;
    }

    /*
        Sign the transaction with a given key pair.

        @param the keyPair of the accoutn sending the transaction.
    */
    sign(keyPair) {
        if (keyPair.getPublic("hex") === this.from) {
            // Add gas
            this.signature = keyPair.sign(SHA256(this.from + this.to + this.amount + this.gas), "base64").toDER("hex");
        }
    }

    /*
        Check if transaction is valid in a given chain.
        The main criterias for a transaction to be valid is that the balance
        of the sending account is sufficient and that the signature is correct.

        @param the transaction to test.
        @param the chain to test this transaction for.
    */
    isValid(tx, chain) {
        return (
            tx.from &&
            tx.to &&
            tx.amount &&
            (chain.getBalance(tx.from) >= tx.amount + tx.gas || tx.from === MINT_PUBLIC_ADDRESS && tx.amount === chain.reward) &&
            ec.keyFromPublic(tx.from, "hex").verify(SHA256(tx.from + tx.to + tx.amount + tx.gas), tx.signature)
        );
    }
}

module.exports = Transaction;

