require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    robinhood: {
      url: process.env.ROBINHOOD_RPC || "https://rpc.robinhoodchain.io",
      chainId: process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 1337,
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
    },
  },
};
