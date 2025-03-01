import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Transaction } from "@solana/web3.js";
import {
  BanksClient,
  Clock,
  ProgramTestContext,
  startAnchor,
} from "solana-bankrun";

import IDL from "../target/idl/presale.json";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { BankrunProvider } from "anchor-bankrun";
import { Presale } from "../target/types/presale";
import { BN, Program } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
} from "spl-token-bankrun";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import assert from "assert";

describe("Presale Smart Contract Tests", () => {
  let user_wallet: Keypair;
  let mockChainlinkFeed: PublicKey;
  let mockChainlinkProgram: Keypair;
  let context: ProgramTestContext;
  let provider: BankrunProvider;
  let program: Program<Presale>;
  let banksClient: BanksClient;
  let owner: Keypair;
  let userProvider: BankrunProvider;
  let program2: Program<Presale>;
  let tokenMint: PublicKey;
  let usdtMint: PublicKey;
  let presaleAccount: PublicKey;
  let presaleBump: number;
  let vaultAccount: PublicKey;
  let vaultAccountBump: number;
  let usdtVaultAccount: PublicKey;
  let usdtVaultBump: number;
  let solVaultAccount: PublicKey;
  let solVaultBump: number;
  let tokenVaultAccount: PublicKey;
  let tokenVaultBump;
  let buyerTokenAta: PublicKey;
  let ownerTokenAta: PublicKey;
  let ownerUsdtAta: PublicKey;
  let currentClock: Clock;
  let start_time: anchor.BN;
  let end_time: anchor.BN;
  let stages: {
    startTime: anchor.BN;
    endTime: anchor.BN;
    price: anchor.BN;
  }[];
  let userTokenAccount: PublicKey;
  let userInfoAccount: PublicKey;
  let amountToPurchase: anchor.BN;
  let PaymentMethod: {
    USDT: {
      usdt: {};
    };
    SOL: {
      sol: {};
    };
  };

  beforeAll(async () => {
    user_wallet = new anchor.web3.Keypair();

    context = await startAnchor(
      "",
      [{ name: "presale", programId: new PublicKey(IDL.address) }],
      [
        {
          address: user_wallet.publicKey,
          info: {
            lamports: 20_000_000_000_000_000_000, // 2_000_000_000_000_000_000
            data: Buffer.alloc(0),
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
          },
        },
      ]
    );
    provider = new BankrunProvider(context);

    anchor.setProvider(provider);

    program = new Program<Presale>(IDL as Presale, provider);

    banksClient = context.banksClient;

    owner = provider.wallet.payer;

    // chainlinkFeedKey = await createMockChainlinkFeed(provider, program);

    // @ts-expect-error - Type error in spl-token-bankrun dependency
    tokenMint = await createMint(banksClient, owner, owner.publicKey, null, 9);

    // @ts-expect-error - Type error in spl-token-bankrun dependency
    usdtMint = await createMint(banksClient, owner, owner.publicKey, null, 6);

    userProvider = new BankrunProvider(context);
    userProvider.wallet = new NodeWallet(user_wallet);

    userTokenAccount = await createAssociatedTokenAccount(
      // @ts-expect-error - Type error in spl-token-bankrun dependency
      banksClient,
      owner, // payer
      usdtMint, // mint
      user_wallet.publicKey // owner
    );
    mockChainlinkFeed = new PublicKey("11111111111111111111111111111111");
    mockChainlinkProgram = new anchor.web3.Keypair();

    buyerTokenAta = await createAssociatedTokenAccount(
      // @ts-expect-error - Type error in spl-token-bankrun dependency
      banksClient,
      user_wallet, // payer
      tokenMint, // mint
      user_wallet.publicKey // owner
    );
    ownerUsdtAta = await createAssociatedTokenAccount(
      // @ts-expect-error - Type error in spl-token-bankrun dependency
      banksClient,
      owner, // payer
      usdtMint, // mint
      owner.publicKey // owner
    );

    ownerTokenAta = await createAssociatedTokenAccount(
      // @ts-expect-error - Type error in spl-token-bankrun dependency
      banksClient,
      owner, // payer
      tokenMint, // mint
      owner.publicKey // owner
    );

    program2 = new Program<Presale>(IDL as Presale, provider);

    // @ts-expect-error - Type error in @solana/web3js dependency
    [presaleAccount, presaleBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("presale")],
      program.programId
    );
    // @ts-expect-error - Type error in @solana/web3js dependency
    [vaultAccount, vaultAccountBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("presale_vault"), presaleAccount.toBuffer()],
      program.programId
    );
    // @ts-expect-error - Type error in @solana/web3js dependency
    [usdtVaultAccount, usdtVaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("usdt_vault"), vaultAccount.toBuffer()],
      program.programId
    );

    [solVaultAccount, solVaultBump] =
      // @ts-expect-error - Type error in @solana/web3js dependency
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("sol_vault"), vaultAccount.toBuffer()],
        program.programId
      );
    // @ts-expect-error - Type error in @solana/web3js dependency
    [tokenVaultAccount, tokenVaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), presaleAccount.toBuffer()],
      program.programId
    );
    // @ts-expect-error - Type error in @solana/web3js dependency
    [userInfoAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_info"),
        presaleAccount.toBuffer(),
        user_wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
    amountToPurchase = new BN(10);
    PaymentMethod = {
      USDT: { usdt: {} },
      SOL: { sol: {} },
    };
    console.log({ "mock chainlink feed": mockChainlinkFeed });
    console.log({ "mock chainlink program": mockChainlinkProgram.publicKey });
    currentClock = await banksClient.getClock();
    const now = currentClock.unixTimestamp;
    start_time = new BN(now.toString());
    end_time = new BN((now + 40n).toString());
    stages = [
      {
        startTime: start_time,
        endTime: start_time.add(new BN(10)),
        price: new BN(50_000),
      },
      {
        startTime: start_time.add(new BN(10)),
        endTime: start_time.add(new BN(20)),
        price: new BN(60_000),
      },
      {
        startTime: start_time.add(new BN(20)),
        endTime: start_time.add(new BN(30)),
        price: new BN(70_000),
      },
      {
        startTime: start_time.add(new BN(30)),
        endTime: start_time.add(new BN(40)),
        price: new BN(80_000),
      },
    ];
  });

  it("Initializes the presale", async () => {
    const tx = await program.methods
      .initializePresale(stages, start_time, new BN(end_time))
      .accounts({
        tokenMint,
        owner: owner.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: "confirmed" });

    const presaleAccountData = await program.account.presale.fetch(
      presaleAccount
    );
    assert.equal(
      presaleAccountData.owner.toString(),
      owner.publicKey.toString()
    );
    assert.equal(presaleAccountData.currentStageIndex, 0);
    assert.equal(presaleAccountData.totalTokenSold.toNumber(), 0);
  });

  it("Initializes vaults for SOL, USDT, and token", async () => {
    // Initialize the vaults (solVault, usdtVault, tokenVault)
    const tx = await program.methods
      .initializeVaults()
      .accounts({
        usdtMint,
        owner: owner.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: "confirmed" });

    const vaultAccountData = await program.account.presaleVaults.fetch(
      vaultAccount
    );
    assert.equal(
      vaultAccountData.usdtVault.toString(),
      usdtVaultAccount.toString()
    );
    console.log("Create Vault Account: ", tx);
  });

  it("it should fund ownerTokenAccount", async () => {
    const amount = new BN(600_000 * 10 ** 9);
    const mintTx = await mintTo(
      // @ts-expect-error - Type error in spl-token-bankrun dependency
      banksClient,
      owner,
      tokenMint,
      ownerTokenAta,
      owner,
      amount
    );

    console.log("mint to user usdt Account", mintTx);
  });

  it("it should fund the tokenVault", async () => {
    const amount = new BN(500_000 * 10 ** 9);
    const tx = await program.methods
      .depositPresaleTokens(new BN(amount))
      .accounts({
        tokenMint,
        owner: owner.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    // const presaleAccountData = await program.account.presale.fetch(
    //   presaleAccount
    // );

    console.log("transfer token to token_vault", tx);
  });

  it("it should fund userTokenAccount", async () => {
    const amount = 10_000 * 10 ** 6;
    const mintTx = await mintTo(
      // @ts-expect-error - Type error in spl-token-bankrun dependency
      banksClient,
      owner,
      usdtMint,
      userTokenAccount,
      owner,
      amount
    );

    console.log("mint to user usdt Account", mintTx);
  });

  it("Accumulates purchases across all payment methods sequentially", async () => {
    // First USDT purchase
    const usdtAmount1 = new BN(15_700_000);
    await program2.methods
      .buyTokens(PaymentMethod.USDT, usdtAmount1)
      .accounts({
        usdtMint,
        tokenMint,
        buyer: user_wallet.publicKey,
        chainlinkFeed: mockChainlinkFeed,
        chainlinkProgram: mockChainlinkProgram.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user_wallet])
      .rpc({ commitment: "confirmed" });

    // Second USDT purchase
    const usdtAmount2 = new BN(15_700_000);
    await program2.methods
      .buyTokens(PaymentMethod.USDT, usdtAmount2)
      .accounts({
        usdtMint,
        tokenMint,
        buyer: user_wallet.publicKey,
        chainlinkFeed: mockChainlinkFeed,
        chainlinkProgram: mockChainlinkProgram.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user_wallet])
      .rpc({ commitment: "confirmed" });

    // First SOL purchase - adds to existing USDT purchases
    const solAmount1 = new BN(90_000_000);
    await program2.methods
      .buyTokens(PaymentMethod.SOL, solAmount1)
      .accounts({
        usdtMint,
        tokenMint,
        buyer: user_wallet.publicKey,
        chainlinkFeed: mockChainlinkFeed,
        chainlinkProgram: mockChainlinkProgram.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user_wallet])
      .rpc({ commitment: "confirmed" });

    // Second SOL purchase - adds to total of all previous purchases
    const solAmount2 = new BN(70_000_000);
    await program2.methods
      .buyTokens(PaymentMethod.SOL, solAmount2)
      .accounts({
        usdtMint,
        tokenMint,
        buyer: user_wallet.publicKey,
        chainlinkFeed: mockChainlinkFeed,
        chainlinkProgram: mockChainlinkProgram.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user_wallet])
      .rpc({ commitment: "confirmed" });
  });

  it("users can claims tokens 24 hours after the End of Presale", async () => {
    await advanceTimePastPresalePeriod(context, end_time);
    let mintTx = await program2.methods
      .claimTokens()
      .accounts({
        tokenMint,
        buyer: user_wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user_wallet])
      .rpc({ commitment: "confirmed" });
    const userInfo = await program.account.userInfo.fetch(userInfoAccount);
    assert.equal(userInfo.hasClaimed, true);
    assert.equal(userInfo.amountPurchased.toNumber(), 0);

    console.log("Withdraw claim Tx Signature: ", mintTx);
  });

  it("owners can withdraw USDT proceeds from presale 24 hours after the End of Presale", async () => {
    await advanceTimePastPresalePeriod(context, end_time);
    let mintTx = await program.methods
      .withdrawProceeds(PaymentMethod.USDT)
      .accounts({
        usdtMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });
    console.log("Withdraw USDT Proceeds Tx Signature: ", mintTx);
  });
  it("owners can withdraw SOL proceeds from presale 24 hours after the End of Presale", async () => {
    await advanceTimePastPresalePeriod(context, end_time);
    let mintTx = await program.methods
      .withdrawProceeds(PaymentMethod.SOL)
      .accounts({
        usdtMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });
    console.log("Withdraw SOL Proceeds Tx Signature: ", mintTx);
  });

  it("owners can withdraw Remaining Tokens from presale 24 hours after the End of Presale", async () => {
    await advanceTimePastPresalePeriod(context, end_time);
    let mintTx = await program.methods
      .withdrawTokens()
      .accounts({
        owner: owner.publicKey,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });
    console.log("Withdraw SOL Proceeds Tx Signature: ", mintTx);
  });

  const advanceTimePastPresalePeriod = async (
    context: ProgramTestContext,
    end_time: BigInt | BN
  ) => {
    const claimTime = BigInt(end_time.toString()) + 24n * 3600n; // 24 hours after end time
    const currentClock = await context.banksClient.getClock();

    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        claimTime
      )
    );
  };
});
