const { getNamedAccounts, ethers, network } = require("hardhat");
const { networkConfig } = require("../helper-hardhat-config");

const AMOUNT = ethers.utils.parseEther("0.02"); // depozitujemo 0.02 ethera


async function getWeth() {
  const { deployer } = await getNamedAccounts();
  // call the "deposit" function on the weth contract
  // da bi pozvali treba nam ✅abi(to se dodalo kad smo izvrsili hh compile) i ✅contract address
  // weth contract address: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
  /* Kako prakticno funkcionise iWeth kod: kazemo mu ajde da uzmemo ovaj web
  contract (iWeth) sa abi IWeth(sto smo dobili nakom kompajliranja) i sa ovom adresom(contract adresom weth-a)
  i povezemo sa deployerom to*/
  const iWeth = await ethers.getContractAt(
    "IWeth",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    deployer
  );
  const tx = await iWeth.deposit({value: AMOUNT})
  await tx.wait(1) // cekamo 1 blok da prodje
  // pozivamo balance funkciju na nas iWeth ERC20 token da proverimo stanje
  const wethBalance = await iWeth.balanceOf(deployer)
  console.log(`Got ${wethBalance.toString()} WETH`)
}

module.exports = { getWeth, AMOUNT };
