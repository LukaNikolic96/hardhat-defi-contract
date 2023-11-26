const { getWeth, AMOUNT } = require("../scripts/getWeth.js");
const { networkConfig } = require("../helper-hardhat-config");
const { getNamedAccounts, ethers } = require("hardhat");

async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();

  // Lending Pool address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
  // Lending Pool: to smo dobili dole u kod i kopirali iz aave dokumentaciju

  const lendingPool = await getLendingPool(deployer);
  console.log(`LendingPool address ${lendingPool.address}`);

  // deposit
  // prvo uzimamo web token adresu
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  // onda kad je uzmemo treba da odobrimo approveERC20 je funkcija za to
  /* dajemo lendingPool dozvolu da izvuce nase web tokene iz naseg naloga, zatim
  dajemo kolicinu koju smo prethodno odredili u AMOUNT, odobravamo i to ce da uradi nas deployer sve*/
  await approveERC20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
  // kad se to zavrsi onda krecemo s depozitovanje
  console.log("Depositing...");
  /* sta sve treba za depozit:
   function deposit(address asset(adresu imovine koju cemo da depozitujemo - wethTokenAddress), uint256 amount(kolicinu AMOUNT), address onBehalfOf(adresu onoga ko iziskuje da se to obavi u ovom slucaju smo mi-deployer), uint16 referralCode(za sad je to 0 jer se ne koristi))*/
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log("Deposited!");

  // Borrow!
  // treba da znamo kolko smo pozajmili, kolko imamo u collateral, kolko mozemo da pozajmimo
  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    deployer
  );
  // ocemo da pozajmimo DAI i treba da znamo koji je conversion rate na DAI
  const daiPrice = await getDaiPrice();
  // konvertujemo u DAI
  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber()); // koristimo 0.95 jer ocemo da pozajmimo 95% od maximuma koji mozemo
  console.log(`You can borrow ${amountDaiToBorrow} DAI`);
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );
  // i sad napokon pozajmljujemo
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  // za pozajmljvanje nam treba adresa tokena(daiTokenaddress), odakle uzimamo(lendingPool), kolicinu u wei(amountDaiToBorrowWei) i adresu togo ko uzima(deployer)
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
  // koristiomo opet borrow user data da vidimo stanje kad pozajmimo
  await getBorrowUserData(lendingPool, deployer);
  // repay
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);
  // i takodje opet pritujemo data nakon toga
  await getBorrowUserData(lendingPool, deployer);
}

async function repay(amount, daiAddress, lendingPool, account) {
  // da bi izvrsili repay prvo moramo da approvujemo da se posalje nazad DAI u aave
  // za dozvolu nam treba addresa iz koje placamo, adresa gde idu tokeni, kolicina i nalog ko ih salje
  await approveERC20(daiAddress, lendingPool.address, amount, account);
  const repayTx = await lendingPool.repay(daiAddress, amount, 2, account); // opet 2 stavljamo jer s 1 ne radi
  await repayTx.wait(1);
  console.log("Repayed!");
}
async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
  /* za boorov nam treba adresa(daiAddress, amount, interestRateMode - (1 stable ,2 variable), referal to je 0
  onBehalfOf to je account i iz lengindPool uzimamo */
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrow,
    2,
    0,
    account
  );
  await borrowTx.wait(1);
  console.log("You'we borrowed!");
}

async function getDaiPrice() {
  // ovo ne konektujemo s deployer account zato sto ne saljemo nikakve transakcije nego samo citamo cene
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  );
  /* kad ga wrapujemo u zagrade umesto await daiEthPriceFeed.latestRoundData() to radimo zato sto ocemo da izvucemo samo neke odredjene stave
  iz tog koda u ovom slucaju je br 1 jer izvlacimo samo answer iz te funkcije*/
  const price = (await daiEthPriceFeed.latestRoundData())[1];
  console.log(`The DAI/ETH price is ${price.toString()}`);
  return price;
}
async function getBorrowUserData(lendingPool, account) {
  // sve ove pojmove sto izvlazimo ima u aave dokumentaciju ne izmisljamo ih
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
  console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
  console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`);
  return { availableBorrowsETH, totalDebtETH };
}

async function getLendingPool(account) {
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  );
  const lendingPoolAddress =
    await lendingPoolAddressesProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );
  return lendingPool;
}
async function approveERC20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
