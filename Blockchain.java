import java.util.ArrayList;

public class Blockchain
{
    private final ArrayList<Block> chain;
    private double nextBlockDifficulty;
    private static final int blockTime = 3000;

    public Blockchain()
    {
        // create genesis block
        chain = new ArrayList<>();
        chain.add(new Block(""+System.currentTimeMillis(), new String[]{"Hello World", "This is my genesis block."}));
        nextBlockDifficulty = 1;
    }

    public Block getLastBlock()
    {
        return chain.get(chain.size()-1);
    }

    public void addBlock(Block block) {
        Block lastBlock = getLastBlock();
        block.setPrevHash(lastBlock.getHash());
        block.mine((int) Math.round(nextBlockDifficulty));
        chain.add(block);
        changeDifficulty(block);
    }

    public void printChain()
    {
        for (Block i : chain) {
            System.out.println("prev: " + i.getPrevHash());
            System.out.println("hash: " +i.getHash());
            System.out.println();
        }
    }

    public boolean isValid()
    {
        Block prevBlock;
        Block currentBlock;
        for (int i=1; i<chain.size(); i++) {
            prevBlock = chain.get(i-1);
            currentBlock = chain.get(i);
            if (!(currentBlock.getHash().equals(currentBlock.calculateHash()) && prevBlock.getHash().equals(currentBlock.getPrevHash()))) {
                return false;
            }
        }
        return true;
    }

    private void changeDifficulty(Block lastBlockMined)
    {
        nextBlockDifficulty += 1;
        int timeToMineBlock = Integer.parseInt(lastBlockMined.getTimeStamp()) - Integer.parseInt(getLastBlock().getTimeStamp());
        if (timeToMineBlock > blockTime) {
            nextBlockDifficulty -= timeToMineBlock/blockTime;
        } else if (timeToMineBlock < blockTime) {
            nextBlockDifficulty += blockTime/timeToMineBlock;
        }
    }
}
