const EC = require("elliptic").ec, ec = new EC("secp256k1");
const crypto = require("crypto"); SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");

const Transaction = require("./transaction");
const Block = require("./block");
const {Blockchain, ourChain} = require("./blockchain");

const MINT_PRIVATE_ADDRESS = "aebc585c4f06497106e373d862d11e5cb75d4a9c8e4dbe88e6dca24629572282";
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, "hex");
const MINT_PUBLIC_KEY = MINT_KEY_PAIR.getPublic("hex");

const privateKey = "f2eb95728ce3f07d7df417f28263a3bd6b2ee5ab781449875e41bc7bab54f0bc";
const keyPair = ec.keyFromPrivate(privateKey, "hex");
const publicKey = keyPair.getPublic("hex");

const PORT = 3000;
const PEERS = [];
const MY_ADDRESS = "ws://localhost:3000";
const server = new WS.Server({ port: PORT });

let opened = [], connected = [];
let check = [];
let checked = [];
let checking = false;
let tempChain = new Blockchain();

console.log("Listening on PORT", PORT);

server.on("connection", async (socket, req) => {
    socket.on("message", message => {
        const _message = JSON.parse(message);

        console.log(_message);

        switch(_message.type) {
            case "TYPE_REPLACE_CHAIN":
                const [ newBlock, newDiff ] = _message.data;

                const ourTx = [...JeChain.transactions.map(tx => JSON.stringify(tx))];
                const theirTx = [...newBlock.data.filter(tx => tx.from !== MINT_PUBLIC_ADDRESS).map(tx => JSON.stringify(tx))];
                const n = theirTx.length;

                if (newBlock.prevHash !== JeChain.getLastBlock().prevHash) {
                    for (let i = 0; i < n; i++) {
                        const index = ourTx.indexOf(theirTx[0]);

                        if (index === -1) break;
                        
                        ourTx.splice(index, 1);
                        theirTx.splice(0, 1);
                    }

                    if (
                        theirTx.length === 0 &&
                        SHA256(JeChain.getLastBlock().hash + newBlock.timestamp + JSON.stringify(newBlock.data) + newBlock.nonce) === newBlock.hash &&
                        newBlock.hash.startsWith("000" + Array(Math.round(Math.log(JeChain.difficulty) / Math.log(16) + 1)).join("0")) &&
                        Block.hasValidTransactions(newBlock, JeChain) &&
                        (parseInt(newBlock.timestamp) > parseInt(JeChain.getLastBlock().timestamp) || JeChain.getLastBlock().timestamp === "") &&
                        parseInt(newBlock.timestamp) < Date.now() &&
                        JeChain.getLastBlock().hash === newBlock.prevHash &&
                        (newDiff + 1 === JeChain.difficulty || newDiff - 1 === JeChain.difficulty)
                    ) {
                        JeChain.chain.push(newBlock);
                        JeChain.difficulty = newDiff;
                        JeChain.transactions = [...ourTx.map(tx => JSON.parse(tx))];
                    }
                } else if (!checked.includes(JSON.stringify([newBlock.prevHash, JeChain.chain[JeChain.chain.length-2].timestamp || ""]))) {
                    checked.push(JSON.stringify([JeChain.getLastBlock().prevHash, JeChain.chain[JeChain.chain.length-2].timestamp || ""]));

                    const position = JeChain.chain.length - 1;

                    checking = true;

                    sendMessage(produceMessage("TYPE_REQUEST_CHECK", MY_ADDRESS));

                    setTimeout(() => {
                        checking = false;

                        let mostAppeared = check[0];

                        check.forEach(group => {
                            if (check.filter(_group => _group === group).length > check.filter(_group => _group === mostAppeared).length) {
                                mostAppeared = group;
                            }
                        })

                        const group = JSON.parse(mostAppeared)

                        JeChain.chain[position] = group[0];
                        JeChain.transactions = [...group[1]];
                        JeChain.difficulty = group[2];

                        check.splice(0, check.length);
                    }, 5000);
                }

                break;

            case "TYPE_REQUEST_CHECK":
                opened.filter(node => node.address === _message.data)[0].socket.send(
                    JSON.stringify(produceMessage(
                        "TYPE_SEND_CHECK",
                        JSON.stringify([JeChain.getLastBlock(), JeChain.transactions, JeChain.difficulty])
                    ))
                );

                break;

            case "TYPE_SEND_CHECK":
                if (checking) check.push(_message.data);

                break;

            case "TYPE_CREATE_TRANSACTION":
                const transaction = _message.data;

                JeChain.addTransaction(transaction);

                break;

            case "TYPE_SEND_CHAIN":
                const { block, finished } = _message.data;

                if (!finished) {
                    tempChain.chain.push(block);
                } else {
                    tempChain.chain.push(block);
                    if (Blockchain.isValid(tempChain)) {
                        JeChain.chain = tempChain.chain;
                    }
                    tempChain = new Blockchain();
                }

                break;

            case "TYPE_REQUEST_CHAIN":
                const socket = opened.filter(node => node.address === _message.data)[0].socket;
                
                for (let i = 1; i < JeChain.chain.length; i++) {
                    socket.send(JSON.stringify(produceMessage(
                        "TYPE_SEND_CHAIN",
                        {
                            block: JeChain.chain[i],
                            finished: i === JeChain.chain.length - 1
                        }
                    )));
                }

                break;

            case "TYPE_REQUEST_INFO":
                opened.filter(node => node.address === _message.data)[0].socket.send(JSON.stringify(produceMessage(
                    "TYPE_SEND_INFO",
                    [JeChain.difficulty, JeChain.transactions]
                )));

                break;

            case "TYPE_SEND_INFO":
                [ JeChain.difficulty, JeChain.transactions ] = _message.data;
                
                break;

            case "TYPE_HANDSHAKE":
                const nodes = _message.data;

                nodes.forEach(node => connect(node))
        }
    });
})

async function connect(address) {
	if (!connected.find(peerAddress => peerAddress === address) && address !== MY_ADDRESS) {
		const socket = new WS(address);

		socket.on("open", () => {
			socket.send(JSON.stringify(produceMessage("TYPE_HANDSHAKE", [MY_ADDRESS, ...connected])));

			opened.forEach(node => node.socket.send(JSON.stringify(produceMessage("TYPE_HANDSHAKE", [address]))));

			if (!opened.find(peer => peer.address === address) && address !== MY_ADDRESS) {
				opened.push({ socket, address });
			}

			if (!connected.find(peerAddress => peerAddress === address) && address !== MY_ADDRESS) {
				connected.push(address);
			}
		});

		socket.on("close", () => {
			opened.splice(connected.indexOf(address), 1);
			connected.splice(connected.indexOf(address), 1);
		});
	}
}

function produceMessage(type, data) {
	return { type, data };
}

function sendMessage(message) {
	opened.forEach(node => {
		node.socket.send(JSON.stringify(message));
	})
}

process.on("uncaughtException", err => console.log(err));

PEERS.forEach(peer => connect(peer));