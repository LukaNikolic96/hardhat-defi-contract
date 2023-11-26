require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      forking: {
        url: MAINNET_RPC_URL,
      },
    },
    sepolia: {
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      saveDeployments: true,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    outputFile: "gas-reporter.txt",
    noColors: true,
    // coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },

  solidity: {
    compilers: [
      { version: "0.8.8" },
      { version: "0.6.12" },
      { version: "0.4.19" },
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
      1:0,
    }
  },
};
