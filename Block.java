import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.lang.StringBuilder;
import java.security.NoSuchAlgorithmException;
import java.math.BigInteger;

public class Block
{
    private String timeStamp;
    private String[] data;
    private String hash;
    private String prevHash;
    private int nonce;
    private int difficultyWhenMined;
    private static final char[] HEX_ARRAY = "0123456789ABCDEF".toCharArray();

    public Block(String timeStamp, String[] data)
    {
        this.timeStamp = timeStamp;
        this.data = data;
        this.prevHash = "";
        this.nonce = 0;
        this.difficultyWhenMined = 0;
        this.hash = calculateHash();
    }

    public String calculateHash()
    {
        String stringToHash = timeStamp;
        for (int i=0; i<data.length; i++) {
            stringToHash += data[i];
        }
        stringToHash += prevHash;
        stringToHash += nonce;
        byte[] hashed = getSHA(stringToHash);
        String rere = bytesToHex(hashed);
        //System.out.println(rere);
        return rere;
    }

    public static byte[] getSHA(String input)
    {
        try
        {
            // Static getInstance method is called with hashing SHA
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return md.digest(input.getBytes(StandardCharsets.UTF_8));
        }
        catch (NoSuchAlgorithmException nsae)
        {
            nsae.printStackTrace();
        }

        // digest() method called
        // to calculate message digest of an input
        // and return array of byte
        return null;
    }

    public static String toHexString(byte[] hash)
    {

        // Convert byte array into signum representation
        BigInteger number = new BigInteger(1, hash);

        // Convert message digest into hex value
        StringBuilder hexString = new StringBuilder(number.toString(16));

        // Pad with leading zeros
        while (hexString.length() < 32)
        {
            hexString.insert(0, '0');
        }

        return hexString.toString();
    }

    public static String bytesToHex(byte[] bytes) {
        char[] hexChars = new char[bytes.length * 2];
        for (int j = 0; j < bytes.length; j++) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = HEX_ARRAY[v >>> 4];
            hexChars[j * 2 + 1] = HEX_ARRAY[v & 0x0F];
        }
        return new String(hexChars);
    }

    public String getHash()
    {
        return hash;
    }

    public void setPrevHash(String prevHash)
    {
        this.prevHash = prevHash;
    }

    public String getPrevHash()
    {
        return prevHash;
    }

    public void mine (int difficulty)
    {
        difficultyWhenMined = difficulty;
        String validationString = getZeroStringOfLength(difficulty);
        System.out.println(validationString);
        while(!hash.startsWith(validationString)) {
            nonce++;
            hash = calculateHash();
        }
    }

    public boolean isValid()
    {
        String validationString = getZeroStringOfLength(difficultyWhenMined);
        return hash.startsWith(validationString);
    }

    private String getZeroStringOfLength(int length)
    {
        String stringToReturn = "";
        for (int i=0; i<length; i++) {
            stringToReturn += "0";
        }
        return stringToReturn;
    }

    public String getTimeStamp()
    {
        return timeStamp;
    }
}